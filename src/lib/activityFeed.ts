import { toIsoString } from './firestore-helpers';
import { formatAccountTypeLabel, formatCurrency, formatPlainCurrency } from './forexCalculations';
import type {
  AccountTransaction,
  AssignmentSubmission,
  AuditLog,
  ChallengeCycle,
  ChallengeParticipant,
  MentorReview,
  PsychologyAssessment,
  RiskViolation,
  StudentProfile,
  TradeEditLog,
  TradeRecord,
  TradeReview,
  TradeScreenshot,
  TradingAccount,
  UserAccount,
} from '../types/domain';

export type ActivityCategory =
  | 'trades'
  | 'charts'
  | 'capital'
  | 'psychology'
  | 'risk'
  | 'learning'
  | 'challenges'
  | 'profile'
  | 'admin';

export interface UserActivityItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail?: string;
  category: ActivityCategory;
  actionLabel: string;
  summary: string;
  targetId?: string;
  source: 'audit' | 'record';
}

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  trades: 'Trades',
  charts: 'Chart Analysis',
  capital: 'Accounts & Capital',
  psychology: 'Psychology',
  risk: 'Risk Alerts',
  learning: 'Learning Centre',
  challenges: 'Challenges',
  profile: 'Profile & Access',
  admin: 'Mentor & Admin',
};

function mapAuditAction(action: string, targetType: string): {
  category: ActivityCategory;
  actionLabel: string;
} {
  switch (action) {
    case 'trade_created':
      return { category: 'trades', actionLabel: 'Trade Logged' };
    case 'trade_journal_edited':
      return { category: 'trades', actionLabel: 'Trade Edited' };
    case 'trade_draft_deleted':
      return { category: 'trades', actionLabel: 'Draft Deleted' };
    case 'trade_screenshot_uploaded':
      return { category: 'charts', actionLabel: 'Chart Uploaded' };
    case 'trade_screenshot_updated':
      return { category: 'charts', actionLabel: 'Chart Notes Edited' };
    case 'trade_screenshot_deleted':
      return { category: 'charts', actionLabel: 'Chart Removed' };
    case 'trading_account_created':
      return { category: 'capital', actionLabel: 'Account Created' };
    case 'account_deposit':
      return { category: 'capital', actionLabel: 'Capital Deposit' };
    case 'account_withdrawal':
      return { category: 'capital', actionLabel: 'Capital Withdrawal' };
    case 'psychology_checkin_logged':
      return { category: 'psychology', actionLabel: 'Psychology Check-In' };
    case 'risk_violation_acknowledged':
      return { category: 'risk', actionLabel: 'Violation Acknowledged' };
    case 'risk_policy_updated':
      return { category: 'admin', actionLabel: 'Risk Policy Updated' };
    case 'challenge_enrolled':
      return { category: 'challenges', actionLabel: 'Challenge Joined' };
    case 'challenge_cycle_created':
      return { category: 'admin', actionLabel: 'Challenge Created' };
    case 'challenge_cycle_updated':
      return { category: 'admin', actionLabel: 'Challenge Updated' };
    case 'assignment_submitted':
      return { category: 'learning', actionLabel: 'Exercise Submitted' };
    case 'assignment_reviewed':
      return { category: 'admin', actionLabel: 'Assignment Reviewed' };
    case 'learning_material_published':
      return { category: 'admin', actionLabel: 'Lesson Published' };
    case 'student_profile_created':
      return { category: 'profile', actionLabel: 'Profile Registered' };
    case 'profile_updated':
    case 'private_info_updated':
    case 'leaderboard_privacy_updated':
      return { category: 'profile', actionLabel: 'Profile Updated' };
    case 'user_role_changed':
    case 'admin_privilege_granted':
    case 'admin_privilege_revoked':
      return { category: 'admin', actionLabel: 'Role Updated' };
    case 'student_status_active':
      return { category: 'admin', actionLabel: 'Student Approved' };
    case 'student_status_pending':
      return { category: 'admin', actionLabel: 'Student Pending' };
    case 'student_status_suspended':
      return { category: 'admin', actionLabel: 'Student Suspended' };
    case 'trade_review_submitted':
      return { category: 'admin', actionLabel: 'Trade Reviewed' };
    case 'announcement_published':
      return { category: 'admin', actionLabel: 'Announcement Published' };
    case 'mentor_notification_sent':
      return { category: 'admin', actionLabel: 'Direct Message Sent' };
    case 'mentor_report_generated':
      return { category: 'admin', actionLabel: 'Evaluation Report' };
    case 'system_settings_updated':
      return { category: 'admin', actionLabel: 'Settings Updated' };
    default: {
      if (targetType === 'trade') return { category: 'trades', actionLabel: action.replace(/_/g, ' ') };
      if (targetType === 'tradeScreenshot') return { category: 'charts', actionLabel: action.replace(/_/g, ' ') };
      if (targetType === 'tradingAccount') return { category: 'capital', actionLabel: action.replace(/_/g, ' ') };
      if (targetType === 'psychology') return { category: 'psychology', actionLabel: action.replace(/_/g, ' ') };
      if (targetType === 'riskViolation') return { category: 'risk', actionLabel: action.replace(/_/g, ' ') };
      if (targetType === 'assignment') return { category: 'learning', actionLabel: action.replace(/_/g, ' ') };
      if (targetType === 'challengeCycle') return { category: 'challenges', actionLabel: action.replace(/_/g, ' ') };
      if (targetType === 'student' || targetType === 'user') return { category: 'profile', actionLabel: action.replace(/_/g, ' ') };
      return { category: 'admin', actionLabel: action.replace(/_/g, ' ') };
    }
  }
}

export function buildAllUserActivities(params: {
  profiles: StudentProfile[];
  users: UserAccount[];
  auditLogs: AuditLog[];
  trades: TradeRecord[];
  tradeEditLogs: TradeEditLog[];
  screenshots: TradeScreenshot[];
  accounts: TradingAccount[];
  transactions: AccountTransaction[];
  psychology: PsychologyAssessment[];
  violations: RiskViolation[];
  participants: ChallengeParticipant[];
  assignments: AssignmentSubmission[];
  tradeReviews: TradeReview[];
  mentorReviews: MentorReview[];
  cycles: ChallengeCycle[];
}): UserActivityItem[] {
  const profileMap = new Map<string, StudentProfile>();
  params.profiles.forEach((p) => profileMap.set(p.uid, p));

  const userMap = new Map<string, UserAccount>();
  params.users.forEach((u) => userMap.set(u.uid, u));

  const accountMap = new Map<string, TradingAccount>();
  params.accounts.forEach((a) => accountMap.set(a.id, a));

  const cycleMap = new Map<string, ChallengeCycle>();
  params.cycles.forEach((c) => cycleMap.set(c.id, c));

  const resolveUserName = (uid: string, fallbackEmail?: string) => {
    const p = profileMap.get(uid);
    if (p?.fullName) return p.fullName;
    const u = userMap.get(uid);
    if (u?.displayName) return u.displayName;
    if (fallbackEmail) return fallbackEmail;
    return `User ${uid.slice(0, 8)}`;
  };

  const items: UserActivityItem[] = [];

  // Track which domain records are already represented by auditLogs so historical
  // pre-audit records still appear without duplicating new audited operations.
  const auditedTradeCreates = new Set<string>();
  const auditedTradeEdits = new Set<string>();
  const auditedShots = new Set<string>();
  const auditedAccounts = new Set<string>();
  const auditedPsych = new Set<string>();
  const auditedViolations = new Set<string>();
  const auditedAssignments = new Set<string>();
  const auditedChallengeJoins = new Set<string>();

  for (const log of params.auditLogs) {
    const { category, actionLabel } = mapAuditAction(log.action, log.targetType);
    const ts = toIsoString(log.createdAt);

    if (log.action === 'trade_created' && log.targetId) auditedTradeCreates.add(log.targetId);
    if (log.action === 'trade_journal_edited' && log.targetId) auditedTradeEdits.add(log.targetId);
    if (log.action === 'trade_screenshot_uploaded' && log.targetId) auditedShots.add(log.targetId);
    if (log.action === 'trading_account_created' && log.targetId) auditedAccounts.add(log.targetId);
    if (log.action === 'psychology_checkin_logged' && log.targetId) auditedPsych.add(log.targetId);
    if (log.action === 'risk_violation_acknowledged' && log.targetId) auditedViolations.add(log.targetId);
    if (log.action === 'assignment_submitted' && log.targetId) auditedAssignments.add(log.targetId);
    if (log.action === 'challenge_enrolled' && log.targetId) {
      auditedChallengeJoins.add(`${log.targetId}_${log.actorId}`);
    }

    items.push({
      id: `audit_${log.id}`,
      timestamp: ts,
      userId: log.actorId,
      userName: resolveUserName(log.actorId, log.actorEmail),
      userEmail: log.actorEmail,
      category,
      actionLabel,
      summary: log.details || `${actionLabel} on ${log.targetType}`,
      targetId: log.targetId,
      source: 'audit',
    });
  }

  for (const t of params.trades) {
    if (!auditedTradeCreates.has(t.id)) {
      const pnlPart = t.netPnl !== undefined ? ` · Net ${formatCurrency(t.netPnl)}` : '';
      items.push({
        id: `trd_${t.id}`,
        timestamp: toIsoString(t.createdAt) || t.openedAt,
        userId: t.userId,
        userName: resolveUserName(t.userId),
        category: 'trades',
        actionLabel: 'Trade Logged',
        summary: `${t.instrument} ${t.direction} (${t.status}, ${t.lotSize} lots, ${t.strategy})${pnlPart}`,
        targetId: t.id,
        source: 'record',
      });
    }
  }

  for (const edit of params.tradeEditLogs) {
    if (!auditedTradeEdits.has(edit.tradeId)) {
      items.push({
        id: `tedit_${edit.id}`,
        timestamp: toIsoString(edit.createdAt),
        userId: edit.editorId || edit.userId,
        userName: resolveUserName(edit.editorId || edit.userId),
        category: 'trades',
        actionLabel: 'Trade Edited',
        summary: edit.summary,
        targetId: edit.tradeId,
        source: 'record',
      });
    }
  }

  for (const shot of params.screenshots) {
    if (!auditedShots.has(shot.id)) {
      items.push({
        id: `shot_${shot.id}`,
        timestamp: toIsoString(shot.createdAt),
        userId: shot.userId,
        userName: resolveUserName(shot.userId),
        category: 'charts',
        actionLabel: 'Chart Uploaded',
        summary: `Uploaded ${shot.stage.replace(/_/g, ' ')} chart (${shot.fileName})${shot.caption ? ` · ${shot.caption}` : ''}`,
        targetId: shot.tradeId,
        source: 'record',
      });
    }
  }

  for (const acc of params.accounts) {
    if (!auditedAccounts.has(acc.id)) {
      items.push({
        id: `acct_${acc.id}`,
        timestamp: toIsoString(acc.createdAt),
        userId: acc.userId,
        userName: resolveUserName(acc.userId),
        category: 'capital',
        actionLabel: 'Account Created',
        summary: `Created ${formatAccountTypeLabel(acc.accountType, acc.customTypeLabel)} account "${acc.name}" (${formatPlainCurrency(acc.initialBalance, acc.currency)})`,
        targetId: acc.id,
        source: 'record',
      });
    }
  }

  const auditedTxTimestamps = params.auditLogs
    .filter((l) => l.action === 'account_deposit' || l.action === 'account_withdrawal')
    .map((l) => `${l.actorId}:${l.targetId || ''}:${toIsoString(l.createdAt).slice(0, 16)}`);
  const auditedTxKeySet = new Set(auditedTxTimestamps);

  for (const tx of params.transactions) {
    const txKey = `${tx.userId}:${tx.accountId}:${toIsoString(tx.createdAt).slice(0, 16)}`;
    if (!auditedTxKeySet.has(txKey)) {
      const acc = accountMap.get(tx.accountId);
      const curr = acc?.currency || 'USD';
      items.push({
        id: `tx_${tx.id}`,
        timestamp: toIsoString(tx.createdAt) || tx.occurredAt,
        userId: tx.userId,
        userName: resolveUserName(tx.userId),
        category: 'capital',
        actionLabel: tx.type === 'deposit' ? 'Capital Deposit' : 'Capital Withdrawal',
        summary: `${tx.type === 'deposit' ? 'Deposited' : 'Withdrew'} ${formatPlainCurrency(tx.amount, curr)} on "${acc?.name || tx.accountId}"${tx.notes ? ` · ${tx.notes}` : ''}`,
        targetId: tx.accountId,
        source: 'record',
      });
    }
  }

  for (const psy of params.psychology) {
    if (!auditedPsych.has(psy.id)) {
      items.push({
        id: `psy_${psy.id}`,
        timestamp: toIsoString(psy.createdAt),
        userId: psy.userId,
        userName: resolveUserName(psy.userId),
        category: 'psychology',
        actionLabel: 'Psychology Check-In',
        summary: `${psy.phase.replace('_', ' ')} check-in: ${psy.emotionalState} (Confidence ${psy.confidenceLevel}/10, FOMO ${psy.fomoLevel}/10)`,
        targetId: psy.id,
        source: 'record',
      });
    }
  }

  for (const v of params.violations) {
    items.push({
      id: `viol_${v.id}`,
      timestamp: toIsoString(v.createdAt),
      userId: v.userId,
      userName: resolveUserName(v.userId),
      category: 'risk',
      actionLabel: v.severity === 'breach' ? 'Risk Breach' : 'Risk Warning',
      summary: `${v.policyRule}${v.acknowledged ? ' (Acknowledged)' : ' (Unacknowledged)'}`,
      targetId: v.tradeId || v.id,
      source: 'record',
    });
  }

  for (const part of params.participants) {
    const key = `${part.cycleId}_${part.userId}`;
    if (!auditedChallengeJoins.has(key)) {
      const cyc = cycleMap.get(part.cycleId);
      items.push({
        id: `part_${part.id}`,
        timestamp: toIsoString(part.joinedAt),
        userId: part.userId,
        userName: part.studentName || resolveUserName(part.userId),
        category: 'challenges',
        actionLabel: 'Challenge Joined',
        summary: `Enrolled in "${cyc?.title || part.cycleId}" (Opening ${formatPlainCurrency(part.openingBalance)})`,
        targetId: part.cycleId,
        source: 'record',
      });
    }
  }

  for (const sub of params.assignments) {
    if (!auditedAssignments.has(sub.id)) {
      items.push({
        id: `sub_${sub.id}`,
        timestamp: toIsoString(sub.createdAt),
        userId: sub.userId,
        userName: sub.studentName || resolveUserName(sub.userId),
        category: 'learning',
        actionLabel: 'Exercise Submitted',
        summary: `Submitted "${sub.materialTitle}" (${sub.status}${sub.quizScore !== undefined ? `, score ${sub.quizScore}%` : ''})`,
        targetId: sub.id,
        source: 'record',
      });
    }
  }

  const auditedReviewTargets = new Set(
    params.auditLogs.filter((l) => l.action === 'trade_review_submitted' && l.targetId).map((l) => l.targetId as string)
  );
  for (const rev of params.tradeReviews) {
    if (!auditedReviewTargets.has(rev.tradeId)) {
      items.push({
        id: `rev_${rev.id}`,
        timestamp: toIsoString(rev.createdAt),
        userId: rev.mentorId,
        userName: rev.mentorName || resolveUserName(rev.mentorId),
        category: 'admin',
        actionLabel: 'Trade Reviewed',
        summary: `Reviewed ${resolveUserName(rev.studentId)}'s trade (${rev.assessment.replace(/_/g, ' ')}, ${rev.rating}/5)`,
        targetId: rev.tradeId,
        source: 'record',
      });
    }
  }

  const auditedReportTargets = new Set(
    params.auditLogs.filter((l) => l.action === 'mentor_report_generated' && l.targetId).map((l) => l.targetId as string)
  );
  for (const mrep of params.mentorReviews) {
    if (!auditedReportTargets.has(mrep.studentId)) {
      items.push({
        id: `mrep_${mrep.id}`,
        timestamp: toIsoString(mrep.createdAt),
        userId: mrep.mentorId,
        userName: mrep.mentorName || resolveUserName(mrep.mentorId),
        category: 'admin',
        actionLabel: 'Evaluation Report',
        summary: `Generated ${mrep.periodType} report "${mrep.periodLabel}" for ${mrep.studentName}`,
        targetId: mrep.studentId,
        source: 'record',
      });
    }
  }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return items;
}
