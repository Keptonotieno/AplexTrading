import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  isAllowedAdminEmail,
  OperationType,
} from '../lib/firebase';
import {
  computePortfolioMetrics,
  DEFAULT_RISK_POLICY,
  DEFAULT_SYSTEM_SETTINGS,
  type PortfolioMetrics,
} from '../lib/forexCalculations';
import { ensureAdminDefaults, syncLeaderboardEntry } from '../services/mentorshipService';
import { toIsoString } from '../lib/firestore-helpers';
import type {
  AccountTransaction,
  AnnouncementItem,
  AssignmentSubmission,
  AuditLog,
  ChallengeCycle,
  ChallengeParticipant,
  LeaderboardEntry,
  LearningMaterial,
  MentorReview,
  NotificationItem,
  PrivateUserInfo,
  PsychologyAssessment,
  RiskPolicy,
  RiskViolation,
  StudentProfile,
  SystemSettings,
  TradeEditLog,
  TradeRecord,
  TradeReview,
  TradeScreenshot,
  TradingAccount,
  UserAccount,
} from '../types/domain';

interface MentorshipContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  loadingData: boolean;
  needsOnboarding: boolean;
  isVerifiedAdmin: boolean;
  workspaceMode: 'student' | 'admin';
  setWorkspaceMode: (mode: 'student' | 'admin') => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Current user's records
  userAccount: UserAccount | null;
  privateInfo: PrivateUserInfo | null;
  studentProfile: StudentProfile | null;
  tradingAccounts: TradingAccount[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  activeAccount: TradingAccount | null;
  transactions: AccountTransaction[];
  trades: TradeRecord[];
  tradeEditLogs: TradeEditLog[];
  screenshots: TradeScreenshot[];
  tradeReviews: TradeReview[];
  riskViolations: RiskViolation[];
  psychologyAssessments: PsychologyAssessment[];
  myChallenges: ChallengeParticipant[];
  myMentorReviews: MentorReview[];
  myAssignments: AssignmentSubmission[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;

  // Shared programme records
  riskPolicy: RiskPolicy;
  systemSettings: SystemSettings;
  challengeCycles: ChallengeCycle[];
  learningMaterials: LearningMaterial[];
  announcements: AnnouncementItem[];
  leaderboardEntries: LeaderboardEntry[];

  // Computed financial metrics for current student (for active account or all accounts)
  metrics: PortfolioMetrics;

  // Admin-only collections (populated only when isVerifiedAdmin && workspaceMode === 'admin')
  adminUsers: UserAccount[];
  adminProfiles: StudentProfile[];
  adminAllTrades: TradeRecord[];
  adminAllTradeEditLogs: TradeEditLog[];
  adminAllAccounts: TradingAccount[];
  adminAllTransactions: AccountTransaction[];
  adminAllScreenshots: TradeScreenshot[];
  adminAllTradeReviews: TradeReview[];
  adminAllViolations: RiskViolation[];
  adminAllPsychology: PsychologyAssessment[];
  adminAllParticipants: ChallengeParticipant[];
  adminAllAssignments: AssignmentSubmission[];
  adminAllMentorReviews: MentorReview[];
  adminAuditLogs: AuditLog[];

  logout: () => Promise<void>;
}

const MentorshipContext = createContext<MentorshipContextValue | null>(null);

export function MentorshipProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [isAdminDoc, setIsAdminDoc] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('fm_theme') : null;
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('fm_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // Student state
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [userAccountChecked, setUserAccountChecked] = useState(false);
  const [privateInfo, setPrivateInfo] = useState<PrivateUserInfo | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [tradingAccounts, setTradingAccounts] = useState<TradingAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('all');
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [tradeEditLogs, setTradeEditLogs] = useState<TradeEditLog[]>([]);
  const [screenshots, setScreenshots] = useState<TradeScreenshot[]>([]);
  const [tradeReviews, setTradeReviews] = useState<TradeReview[]>([]);
  const [riskViolations, setRiskViolations] = useState<RiskViolation[]>([]);
  const [psychologyAssessments, setPsychologyAssessments] = useState<PsychologyAssessment[]>([]);
  const [myChallenges, setMyChallenges] = useState<ChallengeParticipant[]>([]);
  const [myMentorReviews, setMyMentorReviews] = useState<MentorReview[]>([]);
  const [myAssignments, setMyAssignments] = useState<AssignmentSubmission[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Shared programme state
  const [riskPolicy, setRiskPolicy] = useState<RiskPolicy>({
    ...DEFAULT_RISK_POLICY,
    updatedBy: 'system',
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    ...DEFAULT_SYSTEM_SETTINGS,
    updatedBy: 'system',
  });
  const [challengeCycles, setChallengeCycles] = useState<ChallengeCycle[]>([]);
  const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);

  // Admin state
  const [adminUsers, setAdminUsers] = useState<UserAccount[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<StudentProfile[]>([]);
  const [adminAllTrades, setAdminAllTrades] = useState<TradeRecord[]>([]);
  const [adminAllTradeEditLogs, setAdminAllTradeEditLogs] = useState<TradeEditLog[]>([]);
  const [adminAllAccounts, setAdminAllAccounts] = useState<TradingAccount[]>([]);
  const [adminAllTransactions, setAdminAllTransactions] = useState<AccountTransaction[]>([]);
  const [adminAllScreenshots, setAdminAllScreenshots] = useState<TradeScreenshot[]>([]);
  const [adminAllTradeReviews, setAdminAllTradeReviews] = useState<TradeReview[]>([]);
  const [adminAllViolations, setAdminAllViolations] = useState<RiskViolation[]>([]);
  const [adminAllPsychology, setAdminAllPsychology] = useState<PsychologyAssessment[]>([]);
  const [adminAllParticipants, setAdminAllParticipants] = useState<ChallengeParticipant[]>([]);
  const [adminAllAssignments, setAdminAllAssignments] = useState<AssignmentSubmission[]>([]);
  const [adminAllMentorReviews, setAdminAllMentorReviews] = useState<MentorReview[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AuditLog[]>([]);
  const autoRoutedAdminUidRef = useRef<string | null>(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setUserAccount(null);
        setPrivateInfo(null);
        setStudentProfile(null);
        setTradingAccounts([]);
        setTrades([]);
        setTransactions([]);
        setScreenshots([]);
        setTradeReviews([]);
        setRiskViolations([]);
        setPsychologyAssessments([]);
        setMyChallenges([]);
        setMyMentorReviews([]);
        setMyAssignments([]);
        setNotifications([]);
        setIsAdminDoc(false);
        setWorkspaceModeState('student');
        autoRoutedAdminUidRef.current = null;
        setUserAccountChecked(true);
        setLoadingData(false);
      } else {
        setUserAccountChecked(false);
        setLoadingData(true);
      }
    });
    return () => unsub();
  }, []);

  const [workspaceModeState, setWorkspaceModeState] = useState<'student' | 'admin'>('student');

  const isVerifiedAdmin = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      (isAllowedAdminEmail(firebaseUser.email) || isAdminDoc)
  );

  const setWorkspaceMode = useCallback(
    (mode: 'student' | 'admin') => {
      if (mode === 'admin' && !isVerifiedAdmin) {
        setWorkspaceModeState('student');
        return;
      }
      setWorkspaceModeState(mode);
    },
    [isVerifiedAdmin]
  );

  const workspaceMode: 'student' | 'admin' = isVerifiedAdmin ? workspaceModeState : 'student';

  // Bootstrap admin defaults when verified admin signs in, and auto-enter Admin Console on verified admin sign-in
  useEffect(() => {
    if (authReady && firebaseUser && firebaseUser.emailVerified && isAllowedAdminEmail(firebaseUser.email)) {
      ensureAdminDefaults(
        firebaseUser.uid,
        firebaseUser.email || 'keptonotieno@gmail.com',
        firebaseUser.displayName || 'Lead Mentor'
      ).catch(() => {});
    }
  }, [authReady, firebaseUser]);

  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const requestedAdmin =
      typeof window !== 'undefined' && sessionStorage.getItem('fm_requested_admin') === '1';

    if (isVerifiedAdmin) {
      if (requestedAdmin) {
        sessionStorage.removeItem('fm_requested_admin');
        autoRoutedAdminUidRef.current = firebaseUser.uid;
        setWorkspaceModeState('admin');
      } else if (
        autoRoutedAdminUidRef.current !== firebaseUser.uid &&
        (isAllowedAdminEmail(firebaseUser.email) || (userAccountChecked && !userAccount))
      ) {
        autoRoutedAdminUidRef.current = firebaseUser.uid;
        setWorkspaceModeState('admin');
      }
    } else if (requestedAdmin && userAccountChecked) {
      sessionStorage.removeItem('fm_requested_admin');
      setWorkspaceModeState('student');
    }
  }, [authReady, firebaseUser, isVerifiedAdmin, userAccountChecked, userAccount]);

  // Core user & student listeners (attached only when authReady && firebaseUser && emailVerified)
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const uid = firebaseUser.uid;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'admins', uid),
        (snap) => setIsAdminDoc(snap.exists()),
        () => setIsAdminDoc(false)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          setUserAccount(snap.exists() ? (snap.data() as UserAccount) : null);
          setUserAccountChecked(true);
          setLoadingData(false);
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid, 'private', 'info'),
        (snap) => setPrivateInfo(snap.exists() ? (snap.data() as PrivateUserInfo) : null),
        (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'studentProfiles', uid),
        (snap) => setStudentProfile(snap.exists() ? (snap.data() as StudentProfile) : null),
        (err) => handleFirestoreError(err, OperationType.GET, `studentProfiles/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'tradingAccounts'), where('userId', '==', uid)),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as TradingAccount);
          setTradingAccounts(list);
          setActiveAccountId((prev) => {
            if (prev === 'all' && list.length > 0) return 'all';
            if (prev !== 'all' && !list.some((a) => a.id === prev)) return 'all';
            return prev;
          });
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'tradingAccounts')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'accountTransactions'), where('userId', '==', uid)),
        (snap) => setTransactions(snap.docs.map((d) => d.data() as AccountTransaction)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'accountTransactions')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'trades'), where('userId', '==', uid)),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as TradeRecord);
          list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
          setTrades(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'trades')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'tradeEditLogs'), where('userId', '==', uid)),
        (snap) => setTradeEditLogs(snap.docs.map((d) => d.data() as TradeEditLog)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'tradeEditLogs')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'tradeScreenshots'), where('userId', '==', uid)),
        (snap) => setScreenshots(snap.docs.map((d) => d.data() as TradeScreenshot)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'tradeScreenshots')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'tradeReviews'), where('studentId', '==', uid)),
        (snap) => setTradeReviews(snap.docs.map((d) => d.data() as TradeReview)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'tradeReviews')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'riskViolations'), where('userId', '==', uid)),
        (snap) => setRiskViolations(snap.docs.map((d) => d.data() as RiskViolation)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'riskViolations')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'psychologyAssessments'), where('userId', '==', uid)),
        (snap) => setPsychologyAssessments(snap.docs.map((d) => d.data() as PsychologyAssessment)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'psychologyAssessments')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'challengeParticipants'), where('userId', '==', uid)),
        (snap) => setMyChallenges(snap.docs.map((d) => d.data() as ChallengeParticipant)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'challengeParticipants')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'mentorReviews'), where('studentId', '==', uid)),
        (snap) => setMyMentorReviews(snap.docs.map((d) => d.data() as MentorReview)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'mentorReviews')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'assignments'), where('userId', '==', uid)),
        (snap) => setMyAssignments(snap.docs.map((d) => d.data() as AssignmentSubmission)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'assignments')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'notifications'), where('recipientId', '==', uid)),
        (snap) => setNotifications(snap.docs.map((d) => d.data() as NotificationItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    // Shared programme collections
    unsubs.push(
      onSnapshot(
        doc(db, 'riskPolicies', 'default'),
        (snap) => {
          if (snap.exists()) setRiskPolicy(snap.data() as RiskPolicy);
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'riskPolicies/default')
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'systemSettings', 'default'),
        (snap) => {
          if (snap.exists()) setSystemSettings(snap.data() as SystemSettings);
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'systemSettings/default')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'challengeCycles'), orderBy('startDate', 'desc')),
        (snap) => setChallengeCycles(snap.docs.map((d) => d.data() as ChallengeCycle)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'challengeCycles')
      )
    );

    unsubs.push(
      onSnapshot(
        isVerifiedAdmin
          ? collection(db, 'learningMaterials')
          : query(collection(db, 'learningMaterials'), where('published', '==', true)),
        (snap) => {
          const mats = snap.docs.map((d) => d.data() as LearningMaterial);
          mats.sort((a, b) => a.orderIndex - b.orderIndex);
          setLearningMaterials(mats);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'learningMaterials')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'announcements'),
        (snap) => setAnnouncements(snap.docs.map((d) => d.data() as AnnouncementItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'announcements')
      )
    );

    unsubs.push(
      onSnapshot(
        isVerifiedAdmin
          ? collection(db, 'leaderboardEntries')
          : query(collection(db, 'leaderboardEntries'), where('optedIn', '==', true)),
        (snap) => setLeaderboardEntries(snap.docs.map((d) => d.data() as LeaderboardEntry)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'leaderboardEntries')
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser, isVerifiedAdmin]);

  // Admin-only collection listeners (strictly guarded by isVerifiedAdmin && workspaceMode === 'admin')
  useEffect(() => {
    if (!authReady || !firebaseUser || !isVerifiedAdmin || workspaceMode !== 'admin') {
      return;
    }

    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        collection(db, 'users'),
        (snap) => setAdminUsers(snap.docs.map((d) => d.data() as UserAccount)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'studentProfiles'),
        (snap) => setAdminProfiles(snap.docs.map((d) => d.data() as StudentProfile)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'studentProfiles')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'trades'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as TradeRecord);
          list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
          setAdminAllTrades(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'trades')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'tradeEditLogs'),
        (snap) => setAdminAllTradeEditLogs(snap.docs.map((d) => d.data() as TradeEditLog)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'tradeEditLogs')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'tradingAccounts'),
        (snap) => setAdminAllAccounts(snap.docs.map((d) => d.data() as TradingAccount)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'tradingAccounts')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'accountTransactions'),
        (snap) => setAdminAllTransactions(snap.docs.map((d) => d.data() as AccountTransaction)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'accountTransactions')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'tradeScreenshots'),
        (snap) => setAdminAllScreenshots(snap.docs.map((d) => d.data() as TradeScreenshot)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'tradeScreenshots')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'tradeReviews'),
        (snap) => setAdminAllTradeReviews(snap.docs.map((d) => d.data() as TradeReview)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'tradeReviews')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'riskViolations'),
        (snap) => setAdminAllViolations(snap.docs.map((d) => d.data() as RiskViolation)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'riskViolations')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'psychologyAssessments'),
        (snap) => setAdminAllPsychology(snap.docs.map((d) => d.data() as PsychologyAssessment)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'psychologyAssessments')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'challengeParticipants'),
        (snap) => setAdminAllParticipants(snap.docs.map((d) => d.data() as ChallengeParticipant)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'challengeParticipants')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'assignments'),
        (snap) => setAdminAllAssignments(snap.docs.map((d) => d.data() as AssignmentSubmission)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'assignments')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'mentorReviews'),
        (snap) => setAdminAllMentorReviews(snap.docs.map((d) => d.data() as MentorReview)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'mentorReviews')
      )
    );
    unsubs.push(
      onSnapshot(
        collection(db, 'auditLogs'),
        (snap) => {
          const logs = snap.docs.map((d) => d.data() as AuditLog);
          logs.sort((a, b) => toIsoString(b.createdAt).localeCompare(toIsoString(a.createdAt)));
          setAdminAuditLogs(logs);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser, isVerifiedAdmin, workspaceMode]);

  const activeAccount = useMemo(() => {
    if (tradingAccounts.length === 0) return null;
    if (activeAccountId === 'all') {
      return tradingAccounts.find((a) => a.isDefault) || tradingAccounts[0];
    }
    return tradingAccounts.find((a) => a.id === activeAccountId) || tradingAccounts[0];
  }, [tradingAccounts, activeAccountId]);

  const filteredTrades = useMemo(
    () =>
      activeAccountId === 'all'
        ? trades
        : trades.filter((t) => t.accountId === activeAccountId),
    [trades, activeAccountId]
  );

  const filteredAccounts = useMemo(
    () =>
      activeAccountId === 'all'
        ? tradingAccounts
        : tradingAccounts.filter((a) => a.id === activeAccountId),
    [tradingAccounts, activeAccountId]
  );

  const filteredTransactions = useMemo(
    () =>
      activeAccountId === 'all'
        ? transactions
        : transactions.filter((tx) => tx.accountId === activeAccountId),
    [transactions, activeAccountId]
  );

  const metrics = useMemo(
    () =>
      computePortfolioMetrics({
        trades: filteredTrades,
        accounts: filteredAccounts,
        transactions: filteredTransactions,
        violations: riskViolations,
        assessments: psychologyAssessments,
        settings: systemSettings,
      }),
    [filteredTrades, filteredAccounts, filteredTransactions, riskViolations, psychologyAssessments, systemSettings]
  );

  // Sync student leaderboard metrics automatically when opted-in and profile exists
  const globalMetrics = useMemo(
    () =>
      computePortfolioMetrics({
        trades,
        accounts: tradingAccounts,
        transactions,
        violations: riskViolations,
        assessments: psychologyAssessments,
        settings: systemSettings,
      }),
    [trades, tradingAccounts, transactions, riskViolations, psychologyAssessments, systemSettings]
  );

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || !studentProfile) return;
    syncLeaderboardEntry({
      userId: firebaseUser.uid,
      displayAlias: studentProfile.fullName,
      optedIn: studentProfile.publicLeaderboardOptIn,
      metrics: globalMetrics,
    }).catch(() => {});
  }, [
    firebaseUser,
    studentProfile?.fullName,
    studentProfile?.publicLeaderboardOptIn,
    globalMetrics.closedTradesCount,
    globalMetrics.netPnl,
    globalMetrics.scores.overall,
  ]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const needsOnboarding = Boolean(
    authReady && firebaseUser && firebaseUser.emailVerified && userAccountChecked && !userAccount
  );

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <MentorshipContext.Provider
      value={{
        firebaseUser,
        authReady,
        loadingData,
        needsOnboarding,
        isVerifiedAdmin,
        workspaceMode,
        setWorkspaceMode,
        theme,
        toggleTheme,
        userAccount,
        privateInfo,
        studentProfile,
        tradingAccounts,
        activeAccountId,
        setActiveAccountId,
        activeAccount,
        transactions,
        trades,
        tradeEditLogs,
        screenshots,
        tradeReviews,
        riskViolations,
        psychologyAssessments,
        myChallenges,
        myMentorReviews,
        myAssignments,
        notifications,
        unreadNotificationsCount,
        riskPolicy,
        systemSettings,
        challengeCycles,
        learningMaterials,
        announcements,
        leaderboardEntries,
        metrics,
        adminUsers,
        adminProfiles,
        adminAllTrades,
        adminAllTradeEditLogs,
        adminAllAccounts,
        adminAllTransactions,
        adminAllScreenshots,
        adminAllTradeReviews,
        adminAllViolations,
        adminAllPsychology,
        adminAllParticipants,
        adminAllAssignments,
        adminAllMentorReviews,
        adminAuditLogs,
        logout,
      }}
    >
      {children}
    </MentorshipContext.Provider>
  );
}

export function useMentorship() {
  const ctx = useContext(MentorshipContext);
  if (!ctx) {
    throw new Error('useMentorship must be used inside MentorshipProvider');
  }
  return ctx;
}
