import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { logAuditEvent, queueAuditLogInBatch } from '../lib/auditLogger';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cleanPayload, generateSafeId, truncateStr, tsNow } from '../lib/firestore-helpers';
import {
  calculateRealizedTradeMetrics,
  computePortfolioMetrics,
  DEFAULT_RISK_POLICY,
  DEFAULT_SYSTEM_SETTINGS,
  formatAccountTypeLabel,
  getMinimumInitialBalance,
  round2,
} from '../lib/forexCalculations';
import type {
  AccountTransaction,
  AnnouncementItem,
  AssignmentSubmission,
  ChallengeCycle,
  ChallengeParticipant,
  LearningMaterial,
  MentorReview,
  NotificationItem,
  PrivateUserInfo,
  PsychologyAssessment,
  RiskPolicy,
  RiskViolation,
  StudentProfile,
  SystemSettings,
  TradeRecord,
  TradeReview,
  TradeScreenshot,
  TradingAccount,
  UserAccount,
  UserRole,
} from '../types/domain';

export async function recordAuditLog(params: {
  actorId: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
}) {
  return logAuditEvent(params);
}

export async function completeStudentOnboarding(params: {
  uid: string;
  email: string;
  fullName: string;
  phone?: string;
  country: string;
  experienceLevel: StudentProfile['experienceLevel'];
  preferredInstruments: string[];
  brokerName?: string;
  isMentorBootstrap: boolean;
  initialAccountName: string;
  initialAccountType: TradingAccount['accountType'];
  initialCustomTypeLabel?: string;
  initialCustomContractScale?: number;
  initialCurrency: TradingAccount['currency'];
  initialBalance: number;
  photoUrl?: string;
}) {
  const batch = writeBatch(db);
  const safeName = truncateStr(params.fullName, 120) || 'Trader';
  const accountId = generateSafeId('acct');

  const userDoc: Record<string, unknown> = cleanPayload({
    uid: params.uid,
    displayName: safeName,
    role: params.isMentorBootstrap ? 'mentor' : 'student',
    status: 'active',
    publicLeaderboardOptIn: false,
    photoUrl: truncateStr(params.photoUrl, 500),
    createdAt: tsNow(),
    updatedAt: tsNow(),
  });

  const privateDoc: Record<string, unknown> = cleanPayload({
    uid: params.uid,
    email: truncateStr(params.email, 254) || 'trader@example.com',
    phone: truncateStr(params.phone, 32),
    country: truncateStr(params.country, 80) || 'Global',
    updatedAt: tsNow(),
  });

  const profileDoc: Record<string, unknown> = cleanPayload({
    uid: params.uid,
    fullName: safeName,
    experienceLevel: params.experienceLevel,
    preferredInstruments: params.preferredInstruments.slice(0, 15),
    brokerName: truncateStr(params.brokerName, 80),
    publicLeaderboardOptIn: false,
    completedLessonIds: [],
    status: 'active',
    createdAt: tsNow(),
    updatedAt: tsNow(),
  });

  const minBal = getMinimumInitialBalance(params.initialAccountType);
  const parsedBalance = round2(Number(params.initialBalance) || 0);
  if (parsedBalance < minBal) {
    throw new Error(
      `${formatAccountTypeLabel(params.initialAccountType, params.initialCustomTypeLabel)} accounts require a minimum starting balance of $${minBal}.`
    );
  }

  const parsedScale =
    params.initialCustomContractScale !== undefined &&
    Number.isFinite(params.initialCustomContractScale) &&
    params.initialCustomContractScale > 0 &&
    params.initialCustomContractScale <= 100
      ? Number(params.initialCustomContractScale)
      : undefined;

  const accountDoc: Record<string, unknown> = cleanPayload({
    id: accountId,
    userId: params.uid,
    name: truncateStr(params.initialAccountName, 80) || 'Primary Trading Account',
    currency: params.initialCurrency,
    brokerName: truncateStr(params.brokerName, 80),
    accountType: params.initialAccountType,
    customTypeLabel:
      params.initialAccountType === 'custom'
        ? truncateStr(params.initialCustomTypeLabel, 60)
        : undefined,
    customContractScale:
      params.initialAccountType === 'custom' ? parsedScale ?? 1 : undefined,
    initialBalance: parsedBalance,
    currentBalance: parsedBalance,
    isDefault: true,
    createdAt: tsNow(),
    updatedAt: tsNow(),
  });

  batch.set(doc(db, 'users', params.uid), userDoc);
  batch.set(doc(db, 'users', params.uid, 'private', 'info'), privateDoc);
  batch.set(doc(db, 'studentProfiles', params.uid), profileDoc);
  batch.set(doc(db, 'tradingAccounts', accountId), accountDoc);
  queueAuditLogInBatch(batch, {
    actorId: params.uid,
    actorEmail: params.email,
    action: 'student_profile_created',
    targetType: 'user',
    targetId: params.uid,
    details: `Registered ${safeName} (${params.isMentorBootstrap ? 'mentor' : 'student'}) with initial account ${accountDoc.name}`,
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${params.uid}`);
  }
}

export async function ensureAdminDefaults(uid: string, email: string, displayName: string) {
  try {
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(
        adminRef,
        cleanPayload({
          uid,
          email: truncateStr(email, 254),
          displayName: truncateStr(displayName, 120) || 'Mentor Admin',
          grantedBy: 'bootstrap',
          createdAt: tsNow(),
        })
      );
    }

    const policyRef = doc(db, 'riskPolicies', 'default');
    const policySnap = await getDoc(policyRef);
    if (!policySnap.exists()) {
      await setDoc(
        policyRef,
        cleanPayload({
          ...DEFAULT_RISK_POLICY,
          updatedBy: uid,
          updatedAt: tsNow(),
        })
      );
    }

    const settingsRef = doc(db, 'systemSettings', 'default');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(
        settingsRef,
        cleanPayload({
          ...DEFAULT_SYSTEM_SETTINGS,
          updatedBy: uid,
          updatedAt: tsNow(),
        })
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'systemSettings/default');
  }
}

export async function updateStudentProfile(params: {
  uid: string;
  fullName: string;
  experienceLevel: StudentProfile['experienceLevel'];
  preferredInstruments: string[];
  brokerName?: string;
  publicLeaderboardOptIn: boolean;
  phone?: string;
  country: string;
  email: string;
  completedLessonIds?: string[];
}) {
  const batch = writeBatch(db);
  const safeName = truncateStr(params.fullName, 120) || 'Trader';

  batch.update(
    doc(db, 'users', params.uid),
    cleanPayload({
      displayName: safeName,
      publicLeaderboardOptIn: params.publicLeaderboardOptIn,
      updatedAt: tsNow(),
    })
  );

  const profileUpdate: Record<string, unknown> = cleanPayload({
    fullName: safeName,
    experienceLevel: params.experienceLevel,
    preferredInstruments: params.preferredInstruments.slice(0, 15),
    brokerName: truncateStr(params.brokerName, 80) ?? '',
    publicLeaderboardOptIn: params.publicLeaderboardOptIn,
    updatedAt: tsNow(),
  });
  if (params.completedLessonIds) {
    profileUpdate.completedLessonIds = params.completedLessonIds.slice(0, 100);
  }
  batch.update(doc(db, 'studentProfiles', params.uid), profileUpdate);

  batch.set(
    doc(db, 'users', params.uid, 'private', 'info'),
    cleanPayload({
      uid: params.uid,
      email: truncateStr(params.email, 254),
      phone: truncateStr(params.phone, 32),
      country: truncateStr(params.country, 80) || 'Global',
      updatedAt: tsNow(),
    })
  );

  queueAuditLogInBatch(batch, {
    actorId: auth.currentUser?.uid || params.uid,
    actorEmail: params.email,
    action: 'profile_updated',
    targetType: 'student',
    targetId: params.uid,
    details: `Updated student profile for ${safeName} (exp: ${params.experienceLevel}, opt-in: ${params.publicLeaderboardOptIn}, country: ${params.country})`,
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `studentProfiles/${params.uid}`);
  }
}

export async function createTradingAccount(params: {
  userId: string;
  name: string;
  currency: TradingAccount['currency'];
  brokerName?: string;
  accountType: TradingAccount['accountType'];
  customTypeLabel?: string;
  customContractScale?: number;
  initialBalance: number;
  isDefault: boolean;
  existingAccounts?: TradingAccount[];
}) {
  const id = generateSafeId('acct');
  const minBal = getMinimumInitialBalance(params.accountType);
  const bal = round2(Number(params.initialBalance) || 0);
  if (bal < minBal) {
    throw new Error(
      `${formatAccountTypeLabel(params.accountType, params.customTypeLabel)} accounts require a minimum starting balance of $${minBal}.`
    );
  }
  const parsedScale =
    params.customContractScale !== undefined &&
    Number.isFinite(params.customContractScale) &&
    params.customContractScale > 0 &&
    params.customContractScale <= 100
      ? Number(params.customContractScale)
      : undefined;

  const batch = writeBatch(db);
  if (params.isDefault && params.existingAccounts?.length) {
    for (const acc of params.existingAccounts) {
      if (acc.isDefault && acc.userId === params.userId) {
        batch.update(doc(db, 'tradingAccounts', acc.id), {
          isDefault: false,
          updatedAt: tsNow(),
        });
      }
    }
  }

  const safeName = truncateStr(params.name, 80) || 'Trading Account';
  const safeCustomLabel =
    params.accountType === 'custom' ? truncateStr(params.customTypeLabel, 60) : undefined;
  batch.set(
    doc(db, 'tradingAccounts', id),
    cleanPayload({
      id,
      userId: params.userId,
      name: safeName,
      currency: params.currency,
      brokerName: truncateStr(params.brokerName, 80),
      accountType: params.accountType,
      customTypeLabel: safeCustomLabel,
      customContractScale: params.accountType === 'custom' ? parsedScale ?? 1 : undefined,
      initialBalance: bal,
      currentBalance: bal,
      isDefault: params.isDefault,
      createdAt: tsNow(),
      updatedAt: tsNow(),
    })
  );
  queueAuditLogInBatch(batch, {
    actorId: params.userId,
    action: 'trading_account_created',
    targetType: 'tradingAccount',
    targetId: id,
    details: `Created ${formatAccountTypeLabel(params.accountType, safeCustomLabel)} account "${safeName}" (${params.currency} ${bal})`,
  });
  try {
    await batch.commit();
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `tradingAccounts/${id}`);
  }
}

export async function updateTradingAccount(params: {
  userId: string;
  account: TradingAccount;
  name: string;
  currency: TradingAccount['currency'];
  brokerName?: string;
  accountType: TradingAccount['accountType'];
  customTypeLabel?: string;
  customContractScale?: number;
  isDefault: boolean;
  existingAccounts?: TradingAccount[];
}) {
  const safeName = truncateStr(params.name, 80);
  if (!safeName) {
    throw new Error('Trading account name is required.');
  }
  const parsedScale =
    params.customContractScale !== undefined &&
    Number.isFinite(params.customContractScale) &&
    params.customContractScale > 0 &&
    params.customContractScale <= 100
      ? Number(params.customContractScale)
      : undefined;

  const batch = writeBatch(db);
  if (params.isDefault && params.existingAccounts?.length) {
    for (const acc of params.existingAccounts) {
      if (acc.id !== params.account.id && acc.isDefault && acc.userId === params.userId) {
        batch.update(doc(db, 'tradingAccounts', acc.id), {
          isDefault: false,
          updatedAt: tsNow(),
        });
      }
    }
  }

  const safeBroker = truncateStr(params.brokerName, 80);
  const safeCustomLabel =
    params.accountType === 'custom' ? truncateStr(params.customTypeLabel, 60) : undefined;

  const updatePayload: Record<string, unknown> = {
    name: safeName,
    currency: params.currency,
    accountType: params.accountType,
    brokerName: safeBroker ? safeBroker : deleteField(),
    customTypeLabel: safeCustomLabel ? safeCustomLabel : deleteField(),
    customContractScale:
      params.accountType === 'custom' ? parsedScale ?? 1 : deleteField(),
    isDefault: params.isDefault,
    updatedAt: tsNow(),
  };

  batch.update(doc(db, 'tradingAccounts', params.account.id), updatePayload);
  queueAuditLogInBatch(batch, {
    actorId: params.userId,
    action: 'trading_account_updated',
    targetType: 'tradingAccount',
    targetId: params.account.id,
    details: `Customized account "${safeName}" (${formatAccountTypeLabel(params.accountType, safeCustomLabel)}, ${params.currency}${params.accountType === 'custom' ? `, ${parsedScale ?? 1}x scale` : ''})`,
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tradingAccounts/${params.account.id}`);
  }
}

export async function recordAccountTransaction(params: {
  userId: string;
  account: TradingAccount;
  type: 'deposit' | 'withdrawal';
  amount: number;
  notes?: string;
  occurredAt: string;
}) {
  const id = generateSafeId('tx');
  const amt = Math.max(0.01, round2(params.amount));
  const delta = params.type === 'deposit' ? amt : -amt;
  const newBalance = round2(params.account.currentBalance + delta);

  const batch = writeBatch(db);
  batch.set(
    doc(db, 'accountTransactions', id),
    cleanPayload({
      id,
      userId: params.userId,
      accountId: params.account.id,
      type: params.type,
      amount: amt,
      notes: truncateStr(params.notes, 300),
      occurredAt: params.occurredAt.slice(0, 40),
      createdAt: tsNow(),
    })
  );
  batch.update(
    doc(db, 'tradingAccounts', params.account.id),
    cleanPayload({
      currentBalance: newBalance,
      updatedAt: tsNow(),
    })
  );
  queueAuditLogInBatch(batch, {
    actorId: params.userId,
    action: params.type === 'deposit' ? 'account_deposit' : 'account_withdrawal',
    targetType: 'tradingAccount',
    targetId: params.account.id,
    details: `${params.type === 'deposit' ? 'Deposited' : 'Withdrew'} ${params.account.currency} ${amt} on "${params.account.name}" (new balance: ${newBalance})${params.notes ? ` · ${truncateStr(params.notes, 120)}` : ''}`,
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `accountTransactions/${id}`);
  }
}

export async function saveTradeRecord(params: {
  existingTrade?: TradeRecord;
  userId: string;
  account: TradingAccount;
  riskPolicy: RiskPolicy;
  allUserTrades: TradeRecord[];
  form: {
    challengeCycleId?: string;
    instrument: string;
    direction: TradeRecord['direction'];
    entryPrice: number;
    stopLoss: number;
    takeProfit?: number;
    exitPrice?: number;
    lotSize: number;
    accountBalanceAtEntry: number;
    plannedRiskPercent: number;
    commission?: number;
    swap?: number;
    grossPnlOverride?: number;
    session: TradeRecord['session'];
    strategy: string;
    marketCondition?: string;
    status: TradeRecord['status'];
    openedAt: string;
    closedAt?: string;
    timeframe?: string;
    setupGrade?: TradeRecord['setupGrade'];
    emotionTag?: TradeRecord['emotionTag'];
    mistakeTags?: string[];
    partialCloseNotes?: string;
    entryJustification?: string;
    exitJustification?: string;
    observations?: string;
    lessonsLearned?: string;
    planFollowed: boolean;
  };
  riskRewardRatio?: number;
}): Promise<{ tradeId: string; violationsTriggered: string[] }> {
  const { existingTrade, userId, account, riskPolicy, allUserTrades, form, riskRewardRatio } = params;
  const isEdit = Boolean(existingTrade);
  const tradeId = existingTrade ? existingTrade.id : generateSafeId('trd');

  const realized = calculateRealizedTradeMetrics({
    instrument: form.instrument,
    direction: form.direction,
    entryPrice: form.entryPrice,
    stopLoss: form.stopLoss,
    exitPrice: form.exitPrice,
    lotSize: form.lotSize,
    accountBalanceAtEntry: form.accountBalanceAtEntry,
    plannedRiskPercent: form.plannedRiskPercent,
    commission: form.commission,
    swap: form.swap,
    grossPnlOverride: form.grossPnlOverride,
    accountType: account.accountType,
    customContractScale: account.customContractScale,
  });

  const violationsTriggered: string[] = [];
  if (form.status !== 'draft') {
    if (form.plannedRiskPercent > riskPolicy.maxRiskPerTradePercent) {
      violationsTriggered.push(
        `Risk per trade (${form.plannedRiskPercent}%) exceeded programme limit (${riskPolicy.maxRiskPerTradePercent}%)`
      );
    }

    // Check daily realized loss including this trade if closed today
    if (form.status === 'closed' && realized.netPnl !== undefined && realized.netPnl < 0) {
      const targetDay = (form.closedAt || form.openedAt).slice(0, 10);
      const priorDayLoss = allUserTrades
        .filter(
          (t) =>
            t.id !== tradeId &&
            t.status === 'closed' &&
            (t.closedAt || t.openedAt).slice(0, 10) === targetDay
        )
        .reduce((sum, t) => sum + (t.netPnl ?? 0), 0);
      const totalDayNet = priorDayLoss + realized.netPnl;
      if (totalDayNet < 0 && form.accountBalanceAtEntry > 0) {
        const dayLossPct = round2((Math.abs(totalDayNet) / form.accountBalanceAtEntry) * 100);
        if (dayLossPct > riskPolicy.maxDailyLossPercent) {
          violationsTriggered.push(
            `Daily loss (${dayLossPct}%) exceeded programme threshold (${riskPolicy.maxDailyLossPercent}%)`
          );
        }
      }
    }
  }

  const riskViolation = violationsTriggered.length > 0;
  const batch = writeBatch(db);

  const payload = cleanPayload({
    id: tradeId,
    userId,
    accountId: account.id,
    challengeCycleId: truncateStr(form.challengeCycleId, 128),
    instrument: form.instrument.toUpperCase().slice(0, 20),
    direction: form.direction,
    entryPrice: form.entryPrice,
    stopLoss: form.stopLoss,
    takeProfit: form.takeProfit && form.takeProfit > 0 ? form.takeProfit : undefined,
    exitPrice: form.exitPrice && form.exitPrice > 0 ? form.exitPrice : undefined,
    lotSize: form.lotSize,
    accountBalanceAtEntry: form.accountBalanceAtEntry,
    plannedRiskPercent: form.plannedRiskPercent,
    plannedRiskAmount: realized.plannedRiskAmount,
    riskRewardRatio: riskRewardRatio && riskRewardRatio > 0 ? riskRewardRatio : undefined,
    grossPnl: form.status === 'closed' ? realized.grossPnl : undefined,
    commission: form.commission ?? 0,
    swap: form.swap ?? 0,
    netPnl: form.status === 'closed' ? realized.netPnl : undefined,
    rMultiple: form.status === 'closed' ? realized.rMultiple : undefined,
    session: form.session,
    strategy: truncateStr(form.strategy, 80) || 'Supply and Demand',
    marketCondition: truncateStr(form.marketCondition, 80),
    status: form.status,
    openedAt: form.openedAt.slice(0, 40),
    closedAt: form.closedAt ? form.closedAt.slice(0, 40) : undefined,
    timeframe: truncateStr(form.timeframe, 20),
    setupGrade: form.setupGrade,
    emotionTag: form.emotionTag,
    mistakeTags: form.mistakeTags ? form.mistakeTags.slice(0, 8) : undefined,
    partialCloseNotes: truncateStr(form.partialCloseNotes, 500),
    entryJustification: truncateStr(form.entryJustification, 2000),
    exitJustification: truncateStr(form.exitJustification, 2000),
    observations: truncateStr(form.observations, 2000),
    lessonsLearned: truncateStr(form.lessonsLearned, 2000),
    planFollowed: form.planFollowed,
    riskViolation,
    editCount: existingTrade ? existingTrade.editCount + 1 : 0,
    createdAt: existingTrade ? existingTrade.createdAt : tsNow(),
    updatedAt: tsNow(),
  });

  if (isEdit && existingTrade) {
    batch.set(doc(db, 'trades', tradeId), payload);
    const logId = generateSafeId('edit');
    batch.set(
      doc(db, 'tradeEditLogs', logId),
      cleanPayload({
        id: logId,
        tradeId,
        userId,
        editorId: auth.currentUser?.uid || userId,
        summary: `Updated ${form.instrument} (${existingTrade.status} -> ${form.status})`,
        previousStatus: existingTrade.status,
        newStatus: form.status,
        previousNetPnl: existingTrade.netPnl,
        newNetPnl: realized.netPnl,
        createdAt: tsNow(),
      })
    );
    queueAuditLogInBatch(batch, {
      actorId: auth.currentUser?.uid || userId,
      action: 'trade_journal_edited',
      targetType: 'trade',
      targetId: tradeId,
      details: `Edited ${form.instrument} ${form.direction} journal entry`,
      changes: {
        status: { before: existingTrade.status, after: form.status },
        lotSize: { before: existingTrade.lotSize, after: form.lotSize },
        netPnl: { before: existingTrade.netPnl, after: realized.netPnl },
      },
    });
  } else {
    batch.set(doc(db, 'trades', tradeId), payload);
    queueAuditLogInBatch(batch, {
      actorId: auth.currentUser?.uid || userId,
      action: 'trade_created',
      targetType: 'trade',
      targetId: tradeId,
      details: `Created ${form.instrument} ${form.direction} (${form.status}, ${form.lotSize} lots)`,
    });
  }

  // Update trading account balance accurately if closed trade P/L changed
  const prevNet = existingTrade?.status === 'closed' ? existingTrade.netPnl ?? 0 : 0;
  const newNet = form.status === 'closed' ? realized.netPnl ?? 0 : 0;
  const pnlDelta = round2(newNet - prevNet);
  if (pnlDelta !== 0) {
    batch.update(
      doc(db, 'tradingAccounts', account.id),
      cleanPayload({
        currentBalance: round2(account.currentBalance + pnlDelta),
        updatedAt: tsNow(),
      })
    );
  }

  // Log any risk violations + notify student
  for (const ruleMsg of violationsTriggered) {
    const vId = generateSafeId('viol');
    const isPerTrade = ruleMsg.includes('Risk per trade');
    batch.set(
      doc(db, 'riskViolations', vId),
      cleanPayload({
        id: vId,
        userId,
        tradeId,
        policyRule: truncateStr(ruleMsg, 120) || 'Risk Policy Breach',
        thresholdValue: isPerTrade ? riskPolicy.maxRiskPerTradePercent : riskPolicy.maxDailyLossPercent,
        actualValue: isPerTrade ? form.plannedRiskPercent : form.plannedRiskPercent,
        severity: 'breach',
        acknowledged: false,
        createdAt: tsNow(),
      })
    );

    const nId = generateSafeId('notif');
    batch.set(
      doc(db, 'notifications', nId),
      cleanPayload({
        id: nId,
        recipientId: userId,
        type: 'risk_violation',
        title: 'Risk Rule Threshold Exceeded',
        message: truncateStr(ruleMsg, 600) || 'A risk threshold was exceeded.',
        linkTab: 'risk',
        read: false,
        createdAt: tsNow(),
      })
    );
  }

  try {
    await batch.commit();
    return { tradeId, violationsTriggered };
  } catch (err) {
    handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, `trades/${tradeId}`);
  }
}

export async function deleteDraftTrade(tradeId: string) {
  try {
    await deleteDoc(doc(db, 'trades', tradeId));
    await logAuditEvent({
      action: 'trade_draft_deleted',
      targetType: 'trade',
      targetId: tradeId,
      details: 'Deleted draft trade journal record',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `trades/${tradeId}`);
  }
}

export async function saveTradeScreenshot(params: {
  tradeId: string;
  userId: string;
  stage: TradeScreenshot['stage'];
  imageUrl: string;
  caption?: string;
  marketStructureNotes?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}) {
  const id = generateSafeId('shot');
  try {
    await setDoc(
      doc(db, 'tradeScreenshots', id),
      cleanPayload({
        id,
        tradeId: params.tradeId,
        userId: params.userId,
        stage: params.stage,
        imageUrl: params.imageUrl.slice(0, 500),
        caption: truncateStr(params.caption, 400),
        marketStructureNotes: truncateStr(params.marketStructureNotes, 1500),
        fileName: truncateStr(params.fileName, 180) || 'chart.png',
        mimeType: params.mimeType,
        fileSize: params.fileSize,
        createdAt: tsNow(),
      })
    );
    await logAuditEvent({
      actorId: params.userId,
      action: 'trade_screenshot_uploaded',
      targetType: 'tradeScreenshot',
      targetId: id,
      details: `Uploaded ${params.stage} chart screenshot for trade ${params.tradeId}`,
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `tradeScreenshots/${id}`);
  }
}

export async function updateTradeScreenshotNotes(params: {
  screenshotId: string;
  stage: TradeScreenshot['stage'];
  caption?: string;
  marketStructureNotes?: string;
}) {
  try {
    await updateDoc(doc(db, 'tradeScreenshots', params.screenshotId), {
      stage: params.stage,
      caption: truncateStr(params.caption, 400) || '',
      marketStructureNotes: truncateStr(params.marketStructureNotes, 1500) || '',
    });
    await logAuditEvent({
      action: 'trade_screenshot_updated',
      targetType: 'tradeScreenshot',
      targetId: params.screenshotId,
      details: `Updated screenshot stage (${params.stage}) and technical notes`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tradeScreenshots/${params.screenshotId}`);
  }
}

export async function deleteTradeScreenshot(screenshotId: string, imageUrl?: string) {
  try {
    await deleteDoc(doc(db, 'tradeScreenshots', screenshotId));
    if (imageUrl && imageUrl.startsWith('/api/screenshots/')) {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      if (token) {
        await fetch(imageUrl, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
    await logAuditEvent({
      action: 'trade_screenshot_deleted',
      targetType: 'tradeScreenshot',
      targetId: screenshotId,
      details: 'Removed trade chart screenshot',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tradeScreenshots/${screenshotId}`);
  }
}

export async function savePsychologyAssessment(params: {
  userId: string;
  tradeId?: string;
  phase: PsychologyAssessment['phase'];
  emotionalState: PsychologyAssessment['emotionalState'];
  confidenceLevel: number;
  fomoLevel: number;
  revengeTendency: boolean;
  followsStrategy: boolean;
  riskCalculated: boolean;
  planFollowed?: boolean;
  stopLossRespected?: boolean;
  closedEmotionally?: boolean;
  overtradingOccurred?: boolean;
  notes?: string;
  lessonsLearned?: string;
}) {
  const id = generateSafeId('psy');
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'psychologyAssessments', id),
    cleanPayload({
      id,
      userId: params.userId,
      tradeId: truncateStr(params.tradeId, 128),
      phase: params.phase,
      emotionalState: params.emotionalState,
      confidenceLevel: params.confidenceLevel,
      fomoLevel: params.fomoLevel,
      revengeTendency: params.revengeTendency,
      followsStrategy: params.followsStrategy,
      riskCalculated: params.riskCalculated,
      planFollowed: params.planFollowed,
      stopLossRespected: params.stopLossRespected,
      closedEmotionally: params.closedEmotionally,
      overtradingOccurred: params.overtradingOccurred,
      notes: truncateStr(params.notes, 1500),
      lessonsLearned: truncateStr(params.lessonsLearned, 1500),
      createdAt: tsNow(),
    })
  );
  queueAuditLogInBatch(batch, {
    actorId: params.userId,
    action: 'psychology_checkin_logged',
    targetType: 'psychology',
    targetId: id,
    details: `Logged ${params.phase.replace('_', ' ')} check-in (${params.emotionalState}, confidence ${params.confidenceLevel}/10, FOMO ${params.fomoLevel}/10)`,
  });
  try {
    await batch.commit();
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `psychologyAssessments/${id}`);
  }
}

export async function acknowledgeViolation(violationId: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'riskViolations', violationId), { acknowledged: true });
  if (auth.currentUser?.uid) {
    queueAuditLogInBatch(batch, {
      actorId: auth.currentUser.uid,
      action: 'risk_violation_acknowledged',
      targetType: 'riskViolation',
      targetId: violationId,
      details: 'Acknowledged risk rule violation alert',
    });
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `riskViolations/${violationId}`);
  }
}

export async function markNotificationRead(notificationId: string, read = true) {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function enrollInChallengeCycle(params: {
  cycle: ChallengeCycle;
  userId: string;
  studentName: string;
  account: TradingAccount;
  metrics: ReturnType<typeof computePortfolioMetrics>;
}) {
  const id = `${params.cycle.id}_${params.userId}`.slice(0, 120);
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'challengeParticipants', id),
    cleanPayload({
      id,
      cycleId: params.cycle.id,
      userId: params.userId,
      studentName: truncateStr(params.studentName, 120) || 'Student',
      accountId: params.account.id,
      openingBalance: params.account.currentBalance,
      currentBalance: params.account.currentBalance,
      netPnl: 0,
      growthPercent: 0,
      tradesCount: 0,
      winsCount: 0,
      maxDrawdownPercent: 0,
      riskScore: params.metrics.scores.riskManagement,
      disciplineScore: params.metrics.scores.discipline,
      consistencyScore: params.metrics.scores.consistency,
      overallScore: params.metrics.scores.overall,
      status: 'active',
      joinedAt: tsNow(),
      updatedAt: tsNow(),
    })
  );
  queueAuditLogInBatch(batch, {
    actorId: params.userId,
    action: 'challenge_enrolled',
    targetType: 'challengeCycle',
    targetId: params.cycle.id,
    details: `Enrolled in challenge "${params.cycle.title}" with account "${params.account.name}"`,
  });
  try {
    await batch.commit();
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `challengeParticipants/${id}`);
  }
}

export async function syncLeaderboardEntry(params: {
  userId: string;
  displayAlias: string;
  optedIn: boolean;
  metrics: ReturnType<typeof computePortfolioMetrics>;
}) {
  try {
    await setDoc(
      doc(db, 'leaderboardEntries', params.userId),
      cleanPayload({
        userId: params.userId,
        displayAlias: truncateStr(params.displayAlias, 80) || 'Trader',
        growthPercent: params.metrics.accountGrowthPercent,
        winRate: params.metrics.winRate,
        consistencyScore: params.metrics.scores.consistency,
        riskScore: params.metrics.scores.riskManagement,
        disciplineScore: params.metrics.scores.discipline,
        overallScore: params.metrics.scores.overall,
        improvementDelta: round2(params.metrics.avgRMultiple ?? 0),
        eligibleTradesCount: params.metrics.closedTradesCount,
        optedIn: params.optedIn,
        updatedAt: tsNow(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `leaderboardEntries/${params.userId}`);
  }
}

export async function submitAssignmentOrQuiz(params: {
  material: LearningMaterial;
  userId: string;
  studentName: string;
  responseText?: string;
  quizScore?: number;
}) {
  const id = generateSafeId('sub');
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'assignments', id),
    cleanPayload({
      id,
      materialId: params.material.id,
      materialTitle: truncateStr(params.material.title, 140) || 'Exercise',
      userId: params.userId,
      studentName: truncateStr(params.studentName, 120) || 'Student',
      responseText: truncateStr(params.responseText, 4000),
      quizScore: params.quizScore,
      status: 'submitted',
      createdAt: tsNow(),
      updatedAt: tsNow(),
    })
  );
  queueAuditLogInBatch(batch, {
    actorId: params.userId,
    action: 'assignment_submitted',
    targetType: 'assignment',
    targetId: id,
    details: `Submitted ${params.material.type} "${params.material.title}"${params.quizScore !== undefined ? ` (score: ${params.quizScore}%)` : ''}`,
  });
  try {
    await batch.commit();
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `assignments/${id}`);
  }
}

// =========================================================================
// Mentor / Administrator Operations
// =========================================================================

export async function adminUpdateStudentStatus(params: {
  studentId: string;
  status: StudentProfile['status'];
  actorId: string;
  actorEmail?: string;
}) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', params.studentId), { status: params.status, updatedAt: tsNow() });
  batch.update(doc(db, 'studentProfiles', params.studentId), { status: params.status, updatedAt: tsNow() });

  const notifId = generateSafeId('notif');
  batch.set(
    doc(db, 'notifications', notifId),
    cleanPayload({
      id: notifId,
      recipientId: params.studentId,
      type: 'announcement',
      title: 'Account Status Updated',
      message: `Your mentorship account status has been set to ${params.status}.`,
      linkTab: 'settings',
      read: false,
      createdAt: tsNow(),
    })
  );

  queueAuditLogInBatch(batch, {
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    action: `student_status_${params.status}`,
    targetType: 'student',
    targetId: params.studentId,
    details: `Updated student status to ${params.status}`,
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${params.studentId}`);
  }
}

export async function adminUpdateUserRole(params: {
  targetUser: UserAccount;
  newRole: UserRole;
  targetEmail?: string;
  actorId: string;
  actorEmail?: string;
}) {
  if (params.targetUser.uid === params.actorId && params.newRole !== 'mentor') {
    throw new Error('Administrators cannot demote their own active session role.');
  }

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', params.targetUser.uid), {
    role: params.newRole,
    updatedAt: tsNow(),
  });

  if (params.newRole === 'mentor') {
    batch.set(
      doc(db, 'admins', params.targetUser.uid),
      cleanPayload({
        uid: params.targetUser.uid,
        email: truncateStr(params.targetEmail, 254) || 'mentor@example.com',
        displayName: truncateStr(params.targetUser.displayName, 120) || 'Mentor Admin',
        grantedBy: params.actorId,
        createdAt: tsNow(),
      })
    );
  } else {
    batch.delete(doc(db, 'admins', params.targetUser.uid));
  }

  const notifId = generateSafeId('notif');
  batch.set(
    doc(db, 'notifications', notifId),
    cleanPayload({
      id: notifId,
      recipientId: params.targetUser.uid,
      type: 'announcement',
      title: 'Account Role Updated',
      message: `Your platform role has been updated to ${params.newRole === 'mentor' ? 'Mentor / Admin' : 'Student'}.`,
      linkTab: 'settings',
      read: false,
      createdAt: tsNow(),
    })
  );

  queueAuditLogInBatch(batch, {
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    action: 'user_role_changed',
    targetType: 'user',
    targetId: params.targetUser.uid,
    details: `Changed role for ${params.targetUser.displayName}`,
    changes: {
      role: { before: params.targetUser.role, after: params.newRole },
    },
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${params.targetUser.uid}`);
  }
}

export async function adminSubmitTradeReview(params: {
  trade: TradeRecord;
  mentorId: string;
  mentorName: string;
  assessment: TradeReview['assessment'];
  rating: number;
  comment: string;
  clarificationRequested: boolean;
  recommendations?: string;
}) {
  const id = generateSafeId('trev');
  const batch = writeBatch(db);

  batch.set(
    doc(db, 'tradeReviews', id),
    cleanPayload({
      id,
      tradeId: params.trade.id,
      studentId: params.trade.userId,
      mentorId: params.mentorId,
      mentorName: truncateStr(params.mentorName, 120) || 'Mentor',
      assessment: params.assessment,
      rating: Math.max(1, Math.min(5, params.rating)),
      comment: truncateStr(params.comment, 2000) || 'Reviewed.',
      clarificationRequested: params.clarificationRequested,
      recommendations: truncateStr(params.recommendations, 1000),
      createdAt: tsNow(),
      updatedAt: tsNow(),
    })
  );

  const notifId = generateSafeId('notif');
  batch.set(
    doc(db, 'notifications', notifId),
    cleanPayload({
      id: notifId,
      recipientId: params.trade.userId,
      type: 'mentor_feedback',
      title: `Mentor Feedback on ${params.trade.instrument}`,
      message: truncateStr(params.comment, 500) || 'Your mentor reviewed your trade.',
      linkTab: 'analysis',
      read: false,
      createdAt: tsNow(),
    })
  );

  try {
    await batch.commit();
    await recordAuditLog({
      actorId: params.mentorId,
      action: 'trade_review_submitted',
      targetType: 'trade',
      targetId: params.trade.id,
      details: `Assessment: ${params.assessment}, Rating: ${params.rating}/5`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `tradeReviews/${id}`);
  }
}

export async function adminSaveRiskPolicy(policy: Omit<RiskPolicy, 'updatedAt'>) {
  const batch = writeBatch(db);
  const policyId = policy.id || 'default';
  batch.set(
    doc(db, 'riskPolicies', policyId),
    cleanPayload({
      ...policy,
      id: policyId,
      updatedAt: tsNow(),
    })
  );
  queueAuditLogInBatch(batch, {
    actorId: policy.updatedBy,
    action: 'risk_policy_updated',
    targetType: 'riskPolicy',
    targetId: policyId,
    details: `Risk/trade ${policy.maxRiskPerTradePercent}%, Daily ${policy.maxDailyLossPercent}%, Max DD ${policy.maxDrawdownPercent}%, Open Exp ${policy.maxOpenExposurePercent}%`,
  });
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'riskPolicies/default');
  }
}

export async function adminSaveChallengeCycle(params: {
  existing?: ChallengeCycle;
  title: string;
  description?: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  status: ChallengeCycle['status'];
  targetGrowthPercent: number;
  maxDrawdownPercent: number;
  maxRiskPerTradePercent: number;
  actorId: string;
}) {
  const id = params.existing?.id || generateSafeId('cyc');
  try {
    await setDoc(
      doc(db, 'challengeCycles', id),
      cleanPayload({
        id,
        title: truncateStr(params.title, 120) || '30-Day Trading Challenge',
        description: truncateStr(params.description, 800),
        durationDays: params.durationDays,
        startDate: params.startDate.slice(0, 40),
        endDate: params.endDate.slice(0, 40),
        status: params.status,
        targetGrowthPercent: params.targetGrowthPercent,
        maxDrawdownPercent: params.maxDrawdownPercent,
        maxRiskPerTradePercent: params.maxRiskPerTradePercent,
        createdBy: params.existing?.createdBy || params.actorId,
        createdAt: params.existing?.createdAt || tsNow(),
        updatedAt: tsNow(),
      })
    );
    await recordAuditLog({
      actorId: params.actorId,
      action: params.existing ? 'challenge_cycle_updated' : 'challenge_cycle_created',
      targetType: 'challengeCycle',
      targetId: id,
      details: `${params.title} (${params.durationDays} days, status: ${params.status})`,
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `challengeCycles/${id}`);
  }
}

export async function adminSaveLearningMaterial(params: {
  existing?: LearningMaterial;
  title: string;
  category: string;
  type: LearningMaterial['type'];
  durationMinutes: number;
  difficulty: LearningMaterial['difficulty'];
  summary: string;
  content?: string;
  videoUrl?: string;
  quizQuestions?: LearningMaterial['quizQuestions'];
  published: boolean;
  orderIndex: number;
  actorId: string;
}) {
  const id = params.existing?.id || generateSafeId('mat');
  try {
    await setDoc(
      doc(db, 'learningMaterials', id),
      cleanPayload({
        id,
        title: truncateStr(params.title, 140) || 'Lesson',
        category: truncateStr(params.category, 60) || 'Risk Management',
        type: params.type,
        durationMinutes: Math.max(1, params.durationMinutes),
        difficulty: params.difficulty,
        summary: truncateStr(params.summary, 500) || '',
        content: truncateStr(params.content, 8000),
        videoUrl: truncateStr(params.videoUrl, 500),
        quizQuestions: params.quizQuestions?.slice(0, 20),
        published: params.published,
        orderIndex: params.orderIndex,
        createdBy: params.existing?.createdBy || params.actorId,
        createdAt: params.existing?.createdAt || tsNow(),
        updatedAt: tsNow(),
      })
    );
    await logAuditEvent({
      actorId: params.actorId,
      action: 'learning_material_published',
      targetType: 'learningMaterial',
      targetId: id,
      details: `${params.existing ? 'Updated' : 'Published'} ${params.type} "${params.title}" (${params.category})`,
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `learningMaterials/${id}`);
  }
}

export async function adminReviewAssignment(params: {
  submission: AssignmentSubmission;
  mentorId: string;
  mentorFeedback: string;
}) {
  const batch = writeBatch(db);
  batch.update(
    doc(db, 'assignments', params.submission.id),
    cleanPayload({
      status: 'reviewed',
      mentorFeedback: truncateStr(params.mentorFeedback, 1500),
      reviewedBy: params.mentorId,
      updatedAt: tsNow(),
    })
  );
  const notifId = generateSafeId('notif');
  batch.set(
    doc(db, 'notifications', notifId),
    cleanPayload({
      id: notifId,
      recipientId: params.submission.userId,
      type: 'lesson',
      title: `Assignment Reviewed: ${params.submission.materialTitle}`,
      message: truncateStr(params.mentorFeedback, 500) || 'Your mentor reviewed your submission.',
      linkTab: 'learning',
      read: false,
      createdAt: tsNow(),
    })
  );
  try {
    await batch.commit();
    await logAuditEvent({
      actorId: params.mentorId,
      action: 'assignment_reviewed',
      targetType: 'assignment',
      targetId: params.submission.id,
      details: `Reviewed submission "${params.submission.materialTitle}" for ${params.submission.studentName}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `assignments/${params.submission.id}`);
  }
}

export async function adminPublishAnnouncement(params: {
  title: string;
  body: string;
  category: AnnouncementItem['category'];
  pinned: boolean;
  sessionDate?: string;
  authorId: string;
  authorName: string;
}) {
  const id = generateSafeId('ann');
  try {
    await setDoc(
      doc(db, 'announcements', id),
      cleanPayload({
        id,
        title: truncateStr(params.title, 140) || 'Announcement',
        body: truncateStr(params.body, 3000) || '',
        category: params.category,
        pinned: params.pinned,
        sessionDate: truncateStr(params.sessionDate, 40),
        authorId: params.authorId,
        authorName: truncateStr(params.authorName, 120) || 'Mentor',
        createdAt: tsNow(),
      })
    );
    await logAuditEvent({
      actorId: params.authorId,
      action: 'announcement_published',
      targetType: 'announcement',
      targetId: id,
      details: `Published ${params.category} announcement: ${params.title}`,
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `announcements/${id}`);
  }
}

export async function adminSaveMentorReport(params: Omit<MentorReview, 'id' | 'createdAt'>) {
  const id = generateSafeId('mrep');
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'mentorReviews', id),
    cleanPayload({
      ...params,
      id,
      createdAt: tsNow(),
    })
  );
  const notifId = generateSafeId('notif');
  batch.set(
    doc(db, 'notifications', notifId),
    cleanPayload({
      id: notifId,
      recipientId: params.studentId,
      type: 'weekly_review',
      title: `New ${params.periodType} Performance Report`,
      message: `${params.periodLabel}: ${params.mentorRecommendations.slice(0, 180)}`,
      linkTab: 'settings',
      read: false,
      createdAt: tsNow(),
    })
  );
  queueAuditLogInBatch(batch, {
    actorId: params.mentorId,
    action: 'mentor_report_generated',
    targetType: 'student',
    targetId: params.studentId,
    details: `${params.periodType} report (${params.periodLabel}) generated`,
  });
  try {
    await batch.commit();
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `mentorReviews/${id}`);
  }
}

export async function adminSaveSystemSettings(settings: Omit<SystemSettings, 'updatedAt'>) {
  const batch = writeBatch(db);
  const settingId = settings.id || 'default';
  batch.set(
    doc(db, 'systemSettings', settingId),
    cleanPayload({
      ...settings,
      id: settingId,
      updatedAt: tsNow(),
    })
  );
  queueAuditLogInBatch(batch, {
    actorId: settings.updatedBy,
    action: 'system_settings_updated',
    targetType: 'systemSettings',
    targetId: settingId,
    details: `Scoring weights: Risk ${settings.weightRiskManagement}%, Disc ${settings.weightDiscipline}%, Cons ${settings.weightConsistency}%, Prof ${settings.weightProfitability}%, Journal ${settings.weightJournalCompletion}%`,
  });
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'systemSettings/default');
  }
}

export async function adminSendNotification(params: {
  recipientId: string;
  type: NotificationItem['type'];
  title: string;
  message: string;
  linkTab?: string;
}) {
  const id = generateSafeId('notif');
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'notifications', id),
    cleanPayload({
      id,
      recipientId: params.recipientId,
      type: params.type,
      title: truncateStr(params.title, 140) || 'Update',
      message: truncateStr(params.message, 600) || '',
      linkTab: truncateStr(params.linkTab, 60),
      read: false,
      createdAt: tsNow(),
    })
  );
  if (auth.currentUser?.uid) {
    queueAuditLogInBatch(batch, {
      actorId: auth.currentUser.uid,
      action: 'mentor_notification_sent',
      targetType: 'student',
      targetId: params.recipientId,
      details: `Sent ${params.type} message: "${truncateStr(params.title, 80) || 'Update'}"`,
    });
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `notifications/${id}`);
  }
}

export async function fetchPrivateUserInfo(userId: string): Promise<PrivateUserInfo | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'private', 'info'));
    return snap.exists() ? (snap.data() as PrivateUserInfo) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/private/info`);
  }
}

export async function fetchTradeEditLogs(tradeId: string, userId: string) {
  try {
    const q = query(
      collection(db, 'tradeEditLogs'),
      where('tradeId', '==', tradeId),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'tradeEditLogs');
  }
}
