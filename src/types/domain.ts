export type UserRole = 'student' | 'mentor';
export type AccountStatus = 'active' | 'pending' | 'suspended';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'funded';
export type TradeDirection = 'BUY' | 'SELL';
export type TradeSession = 'London' | 'New York' | 'Tokyo' | 'Sydney' | 'Overlap';
export type TradeStatus = 'planned' | 'open' | 'closed' | 'draft';
export type ScreenshotStage =
  | 'before_entry'
  | 'entry_confirmation'
  | 'stop_loss'
  | 'take_profit'
  | 'after_trade'
  | 'annotated';

export type ReviewAssessment =
  | 'exemplary'
  | 'compliant'
  | 'needs_clarification'
  | 'rule_violation';

export type EmotionalState =
  | 'calm'
  | 'focused'
  | 'anxious'
  | 'frustrated'
  | 'overconfident'
  | 'hesitant'
  | 'fatigued';

export interface UserAccount {
  uid: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
  publicLeaderboardOptIn: boolean;
  photoUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PrivateUserInfo {
  uid: string;
  email: string;
  phone?: string;
  country: string;
  updatedAt?: unknown;
}

export interface StudentProfile {
  uid: string;
  fullName: string;
  experienceLevel: ExperienceLevel;
  preferredInstruments: string[];
  brokerName?: string;
  publicLeaderboardOptIn: boolean;
  completedLessonIds: string[];
  status: AccountStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TradingAccount {
  id: string;
  userId: string;
  name: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF';
  brokerName?: string;
  accountType: 'cent' | 'standard' | 'demo' | 'live' | 'prop_challenge' | 'funded' | 'custom';
  customTypeLabel?: string;
  customContractScale?: number;
  initialBalance: number;
  currentBalance: number;
  isDefault: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AccountTransaction {
  id: string;
  userId: string;
  accountId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  notes?: string;
  occurredAt: string;
  createdAt?: unknown;
}

export interface TradeRecord {
  id: string;
  userId: string;
  accountId: string;
  challengeCycleId?: string;
  instrument: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  exitPrice?: number;
  lotSize: number;
  accountBalanceAtEntry: number;
  plannedRiskPercent: number;
  plannedRiskAmount?: number;
  riskRewardRatio?: number;
  grossPnl?: number;
  commission?: number;
  swap?: number;
  netPnl?: number;
  rMultiple?: number;
  session: TradeSession;
  strategy: string;
  marketCondition?: string;
  status: TradeStatus;
  openedAt: string;
  closedAt?: string;
  timeframe?: string;
  setupGrade?: 'A+' | 'A' | 'B' | 'C';
  emotionTag?: EmotionalState;
  mistakeTags?: string[];
  partialCloseNotes?: string;
  entryJustification?: string;
  exitJustification?: string;
  observations?: string;
  lessonsLearned?: string;
  planFollowed: boolean;
  riskViolation: boolean;
  editCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TradeEditLog {
  id: string;
  tradeId: string;
  userId: string;
  editorId: string;
  summary: string;
  previousStatus: string;
  newStatus: string;
  previousNetPnl?: number;
  newNetPnl?: number;
  createdAt?: unknown;
}

export interface TradeScreenshot {
  id: string;
  tradeId: string;
  userId: string;
  stage: ScreenshotStage;
  imageUrl: string;
  caption?: string;
  marketStructureNotes?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt?: unknown;
}

export interface TradeReview {
  id: string;
  tradeId: string;
  studentId: string;
  mentorId: string;
  mentorName: string;
  assessment: ReviewAssessment;
  rating: number;
  comment: string;
  clarificationRequested: boolean;
  recommendations?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RiskPolicy {
  id: string;
  name: string;
  maxRiskPerTradePercent: number;
  maxDailyLossPercent: number;
  maxDrawdownPercent: number;
  maxConsecutiveLosses: number;
  maxOpenExposurePercent: number;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface RiskViolation {
  id: string;
  userId: string;
  tradeId?: string;
  policyRule: string;
  thresholdValue: number;
  actualValue: number;
  severity: 'warning' | 'breach';
  acknowledged: boolean;
  createdAt?: unknown;
}

export interface PsychologyAssessment {
  id: string;
  userId: string;
  tradeId?: string;
  phase: 'pre_trade' | 'post_trade';
  emotionalState: EmotionalState;
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
  createdAt?: unknown;
}

export interface ChallengeCycle {
  id: string;
  title: string;
  description?: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'closed';
  targetGrowthPercent: number;
  maxDrawdownPercent: number;
  maxRiskPerTradePercent: number;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ChallengeParticipant {
  id: string;
  cycleId: string;
  userId: string;
  studentName: string;
  accountId: string;
  openingBalance: number;
  currentBalance: number;
  closingBalance?: number;
  netPnl: number;
  growthPercent: number;
  tradesCount: number;
  winsCount: number;
  maxDrawdownPercent: number;
  riskScore: number;
  disciplineScore: number;
  consistencyScore: number;
  overallScore: number;
  mentorEvaluation?: string;
  status: 'active' | 'completed' | 'withdrawn';
  joinedAt?: unknown;
  updatedAt?: unknown;
}

export interface MentorReview {
  id: string;
  studentId: string;
  studentName: string;
  mentorId: string;
  mentorName: string;
  periodType: 'weekly' | 'monthly' | 'challenge';
  periodLabel: string;
  cycleId?: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  netPnl: number;
  accountGrowthPercent: number;
  winRate: number;
  avgRiskPercent: number;
  maxDrawdownPercent: number;
  bestInstrument?: string;
  weakestInstrument?: string;
  commonMistakes?: string;
  riskViolationsCount: number;
  psychologyObservations?: string;
  improvementsRequired?: string;
  mentorRecommendations: string;
  createdAt?: unknown;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface LearningMaterial {
  id: string;
  title: string;
  category: string;
  type: 'lesson' | 'video' | 'quiz' | 'exercise';
  durationMinutes: number;
  difficulty: 'foundation' | 'intermediate' | 'advanced';
  summary: string;
  content?: string;
  videoUrl?: string;
  quizQuestions?: QuizQuestion[];
  published: boolean;
  orderIndex: number;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AssignmentSubmission {
  id: string;
  materialId: string;
  materialTitle: string;
  userId: string;
  studentName: string;
  responseText?: string;
  quizScore?: number;
  status: 'submitted' | 'reviewed';
  mentorFeedback?: string;
  reviewedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  type:
    | 'mentor_feedback'
    | 'risk_violation'
    | 'weekly_review'
    | 'challenge'
    | 'lesson'
    | 'announcement'
    | 'reminder';
  title: string;
  message: string;
  linkTab?: string;
  read: boolean;
  createdAt?: unknown;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  category: 'community' | 'challenge' | 'education' | 'session';
  pinned: boolean;
  sessionDate?: string;
  authorId: string;
  authorName: string;
  createdAt?: unknown;
}

export interface LeaderboardEntry {
  userId: string;
  displayAlias: string;
  growthPercent: number;
  winRate: number;
  consistencyScore: number;
  riskScore: number;
  disciplineScore: number;
  overallScore: number;
  improvementDelta: number;
  eligibleTradesCount: number;
  optedIn: boolean;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  createdAt?: unknown;
}

export interface SystemSettings {
  id: string;
  programmeName: string;
  challengeDefaultDays: number;
  weightRiskManagement: number;
  weightDiscipline: number;
  weightConsistency: number;
  weightProfitability: number;
  weightJournalCompletion: number;
  requireMentorApproval: boolean;
  minTradesForLeaderboard: number;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface DailyTradingSummary {
  id: string;
  userId: string;
  accountId?: string;
  summaryDate: string;
  pair: string;
  currency: TradingAccount['currency'];
  pnl: number;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
