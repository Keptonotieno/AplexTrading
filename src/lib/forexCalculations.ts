import type {
  AccountTransaction,
  ChallengeCycle,
  ChallengeParticipant,
  PsychologyAssessment,
  RiskPolicy,
  RiskViolation,
  SystemSettings,
  TradeDirection,
  TradeRecord,
  TradingAccount,
} from '../types/domain';

export interface InstrumentSpec {
  symbol: string;
  label: string;
  category: 'Major FX' | 'Cross FX' | 'Metals' | 'Indices';
  contractSize: number;
  pipSize: number;
  priceDecimals: number;
  quoteCurrency: string;
  baseCurrency: string;
  defaultPipValuePerLotUSD: number;
}

export const INSTRUMENT_SPECS: Record<string, InstrumentSpec> = {
  EURUSD: {
    symbol: 'EURUSD',
    label: 'EUR/USD',
    category: 'Major FX',
    contractSize: 100000,
    pipSize: 0.0001,
    priceDecimals: 5,
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    defaultPipValuePerLotUSD: 10,
  },
  GBPUSD: {
    symbol: 'GBPUSD',
    label: 'GBP/USD',
    category: 'Major FX',
    contractSize: 100000,
    pipSize: 0.0001,
    priceDecimals: 5,
    baseCurrency: 'GBP',
    quoteCurrency: 'USD',
    defaultPipValuePerLotUSD: 10,
  },
  AUDUSD: {
    symbol: 'AUDUSD',
    label: 'AUD/USD',
    category: 'Major FX',
    contractSize: 100000,
    pipSize: 0.0001,
    priceDecimals: 5,
    baseCurrency: 'AUD',
    quoteCurrency: 'USD',
    defaultPipValuePerLotUSD: 10,
  },
  NZDUSD: {
    symbol: 'NZDUSD',
    label: 'NZD/USD',
    category: 'Major FX',
    contractSize: 100000,
    pipSize: 0.0001,
    priceDecimals: 5,
    baseCurrency: 'NZD',
    quoteCurrency: 'USD',
    defaultPipValuePerLotUSD: 10,
  },
  USDJPY: {
    symbol: 'USDJPY',
    label: 'USD/JPY',
    category: 'Major FX',
    contractSize: 100000,
    pipSize: 0.01,
    priceDecimals: 3,
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    defaultPipValuePerLotUSD: 6.67,
  },
  USDCAD: {
    symbol: 'USDCAD',
    label: 'USD/CAD',
    category: 'Major FX',
    contractSize: 100000,
    pipSize: 0.0001,
    priceDecimals: 5,
    baseCurrency: 'USD',
    quoteCurrency: 'CAD',
    defaultPipValuePerLotUSD: 7.35,
  },
  USDCHF: {
    symbol: 'USDCHF',
    label: 'USD/CHF',
    category: 'Major FX',
    contractSize: 100000,
    pipSize: 0.0001,
    priceDecimals: 5,
    baseCurrency: 'USD',
    quoteCurrency: 'CHF',
    defaultPipValuePerLotUSD: 11.2,
  },
  EURGBP: {
    symbol: 'EURGBP',
    label: 'EUR/GBP',
    category: 'Cross FX',
    contractSize: 100000,
    pipSize: 0.0001,
    priceDecimals: 5,
    baseCurrency: 'EUR',
    quoteCurrency: 'GBP',
    defaultPipValuePerLotUSD: 12.7,
  },
  EURJPY: {
    symbol: 'EURJPY',
    label: 'EUR/JPY',
    category: 'Cross FX',
    contractSize: 100000,
    pipSize: 0.01,
    priceDecimals: 3,
    baseCurrency: 'EUR',
    quoteCurrency: 'JPY',
    defaultPipValuePerLotUSD: 6.67,
  },
  GBPJPY: {
    symbol: 'GBPJPY',
    label: 'GBP/JPY',
    category: 'Cross FX',
    contractSize: 100000,
    pipSize: 0.01,
    priceDecimals: 3,
    baseCurrency: 'GBP',
    quoteCurrency: 'JPY',
    defaultPipValuePerLotUSD: 6.67,
  },
  AUDJPY: {
    symbol: 'AUDJPY',
    label: 'AUD/JPY',
    category: 'Cross FX',
    contractSize: 100000,
    pipSize: 0.01,
    priceDecimals: 3,
    baseCurrency: 'AUD',
    quoteCurrency: 'JPY',
    defaultPipValuePerLotUSD: 6.67,
  },
  XAUUSD: {
    symbol: 'XAUUSD',
    label: 'XAU/USD (Gold)',
    category: 'Metals',
    contractSize: 100,
    pipSize: 0.1,
    priceDecimals: 2,
    baseCurrency: 'XAU',
    quoteCurrency: 'USD',
    defaultPipValuePerLotUSD: 10,
  },
  XAGUSD: {
    symbol: 'XAGUSD',
    label: 'XAG/USD (Silver)',
    category: 'Metals',
    contractSize: 5000,
    pipSize: 0.01,
    priceDecimals: 3,
    baseCurrency: 'XAG',
    quoteCurrency: 'USD',
    defaultPipValuePerLotUSD: 50,
  },
  US30: {
    symbol: 'US30',
    label: 'US30 (Dow)',
    category: 'Indices',
    contractSize: 1,
    pipSize: 1,
    priceDecimals: 1,
    baseCurrency: 'US30',
    quoteCurrency: 'USD',
    defaultPipValuePerLotUSD: 1,
  },
  NAS100: {
    symbol: 'NAS100',
    label: 'NAS100 (Nasdaq)',
    category: 'Indices',
    contractSize: 1,
    pipSize: 1,
    priceDecimals: 1,
    baseCurrency: 'NAS100',
    quoteCurrency: 'USD',
    defaultPipValuePerLotUSD: 1,
  },
};

export const STRATEGY_OPTIONS = [
  'Supply and Demand',
  'Support and Resistance',
  'Liquidity Sweeps',
  'Order Blocks',
  'Fair Value Gaps',
  'Market Structure Shift',
  'Break of Structure',
  'Change of Character',
  'Trend Continuation',
];

export const TIMEFRAME_OPTIONS = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'] as const;

export const SETUP_GRADE_OPTIONS = ['A+', 'A', 'B', 'C'] as const;

export const MISTAKE_TAG_OPTIONS = [
  'FOMO Entry',
  'Moved Stop-Loss',
  'Oversized Lot',
  'Early Exit',
  'Counter-Trend',
  'News Volatility',
  'Overtrading',
  'Revenge Trade',
] as const;

export const DEFAULT_RISK_POLICY: Omit<RiskPolicy, 'updatedBy' | 'updatedAt'> = {
  id: 'default',
  name: 'Standard Mentorship Risk Policy',
  maxRiskPerTradePercent: 1.0,
  maxDailyLossPercent: 2.0,
  maxDrawdownPercent: 6.0,
  maxConsecutiveLosses: 3,
  maxOpenExposurePercent: 3.0,
};

export const DEFAULT_SYSTEM_SETTINGS: Omit<SystemSettings, 'updatedBy' | 'updatedAt'> = {
  id: 'default',
  programmeName: 'Forex Mentorship',
  challengeDefaultDays: 30,
  weightRiskManagement: 30,
  weightDiscipline: 25,
  weightConsistency: 20,
  weightProfitability: 15,
  weightJournalCompletion: 10,
  requireMentorApproval: false,
  minTradesForLeaderboard: 5,
};

export interface AccountTypeSpec {
  type: TradingAccount['accountType'];
  label: string;
  shortLabel: string;
  minInitialBalance: number;
  contractScale: number;
  description: string;
}

export const ACCOUNT_TYPE_SPECS: Record<TradingAccount['accountType'], AccountTypeSpec> = {
  standard: {
    type: 'standard',
    label: 'Standard Account (Min $50)',
    shortLabel: 'Standard',
    minInitialBalance: 50,
    contractScale: 1,
    description: 'Standard contract size (100,000 units/lot). Minimum starting balance of $50.',
  },
  cent: {
    type: 'cent',
    label: 'Cent Account (Min $10)',
    shortLabel: 'Cent Account',
    minInitialBalance: 10,
    contractScale: 0.01,
    description: 'Micro-lot contract scale (1,000 units/lot, 1/100th standard). Start from $10.',
  },
  demo: {
    type: 'demo',
    label: 'Demo Practice (Min $10)',
    shortLabel: 'Demo',
    minInitialBalance: 10,
    contractScale: 1,
    description: 'Simulated practice environment. Minimum starting balance of $10.',
  },
  live: {
    type: 'live',
    label: 'Live Standard (Min $50)',
    shortLabel: 'Live Standard',
    minInitialBalance: 50,
    contractScale: 1,
    description: 'Live personal broker account. Minimum starting balance of $50.',
  },
  prop_challenge: {
    type: 'prop_challenge',
    label: 'Prop Challenge (Min $50)',
    shortLabel: 'Prop Challenge',
    minInitialBalance: 50,
    contractScale: 1,
    description: 'Evaluation account monitored against profit targets and drawdown caps. Minimum $50.',
  },
  funded: {
    type: 'funded',
    label: 'Funded Account (Min $50)',
    shortLabel: 'Funded',
    minInitialBalance: 50,
    contractScale: 1,
    description: 'Verified funded trading allocation. Minimum starting balance of $50.',
  },
  custom: {
    type: 'custom',
    label: 'Custom Account (Min $1)',
    shortLabel: 'Custom',
    minInitialBalance: 1,
    contractScale: 1,
    description: 'Fully customizable trading account: define your own tier name, contract scale (Standard 1x, Mini 0.1x, Cent 0.01x, or custom), currency, and starting balance.',
  },
};

export function getMinimumInitialBalance(accountType: TradingAccount['accountType']): number {
  return ACCOUNT_TYPE_SPECS[accountType]?.minInitialBalance ?? 50;
}

export function getAccountContractScale(
  accountType?: TradingAccount['accountType'],
  customContractScale?: number
): number {
  if (
    typeof customContractScale === 'number' &&
    Number.isFinite(customContractScale) &&
    customContractScale > 0
  ) {
    return customContractScale;
  }
  return accountType ? ACCOUNT_TYPE_SPECS[accountType]?.contractScale ?? 1 : 1;
}

export function formatAccountTypeLabel(
  accountType: TradingAccount['accountType'],
  customTypeLabel?: string
): string {
  if (accountType === 'custom' && customTypeLabel?.trim()) {
    return customTypeLabel.trim();
  }
  return ACCOUNT_TYPE_SPECS[accountType]?.shortLabel ?? accountType.replace('_', ' ');
}

export function getInstrumentSpec(symbol: string): InstrumentSpec | null {
  const normalized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return INSTRUMENT_SPECS[normalized] ?? null;
}

export function getPipValuePerLot(
  symbol: string,
  entryPrice?: number,
  accountType?: TradingAccount['accountType'],
  customContractScale?: number
): number | null {
  const spec = getInstrumentSpec(symbol);
  if (!spec) return null;

  const scale = getAccountContractScale(accountType, customContractScale);

  if (spec.quoteCurrency === 'USD') {
    return spec.contractSize * spec.pipSize * scale;
  }

  if (spec.baseCurrency === 'USD' && entryPrice && entryPrice > 0) {
    return ((spec.contractSize * spec.pipSize) / entryPrice) * scale;
  }

  return spec.defaultPipValuePerLotUSD * scale;
}

export interface PositionCalculationInput {
  instrument: string;
  direction: TradeDirection;
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  lotSizeOverride?: number;
  accountType?: TradingAccount['accountType'];
  customContractScale?: number;
}

export interface PositionCalculationResult {
  valid: boolean;
  incompleteReason?: string;
  stopLossPips: number | null;
  takeProfitPips: number | null;
  pipValuePerLot: number | null;
  plannedRiskAmount: number | null;
  recommendedLotSize: number | null;
  recommendedUnits: number | null;
  actualRiskAmount: number | null;
  actualRiskPercent: number | null;
  riskRewardRatio: number | null;
  projectedRewardAmount: number | null;
}

export function calculatePositionSizing(input: PositionCalculationInput): PositionCalculationResult {
  const spec = getInstrumentSpec(input.instrument);
  if (!spec) {
    return {
      valid: false,
      incompleteReason: `Contract specification unavailable for ${input.instrument || 'selected instrument'}.`,
      stopLossPips: null,
      takeProfitPips: null,
      pipValuePerLot: null,
      plannedRiskAmount: input.accountBalance > 0 && input.riskPercent >= 0
        ? round2(input.accountBalance * (input.riskPercent / 100))
        : null,
      recommendedLotSize: null,
      recommendedUnits: null,
      actualRiskAmount: null,
      actualRiskPercent: null,
      riskRewardRatio: null,
      projectedRewardAmount: null,
    };
  }

  if (!(input.accountBalance > 0) || !(input.entryPrice > 0) || !(input.stopLoss > 0)) {
    return {
      valid: false,
      incompleteReason: 'Enter positive account balance, entry price, and stop-loss price.',
      stopLossPips: null,
      takeProfitPips: null,
      pipValuePerLot: getPipValuePerLot(
        input.instrument,
        input.entryPrice,
        input.accountType,
        input.customContractScale
      ),
      plannedRiskAmount: null,
      recommendedLotSize: null,
      recommendedUnits: null,
      actualRiskAmount: null,
      actualRiskPercent: null,
      riskRewardRatio: null,
      projectedRewardAmount: null,
    };
  }

  // Validate SL direction
  if (input.direction === 'BUY' && input.stopLoss >= input.entryPrice) {
    return {
      valid: false,
      incompleteReason: 'For BUY positions, stop-loss must be below entry price.',
      stopLossPips: null,
      takeProfitPips: null,
      pipValuePerLot: getPipValuePerLot(
        input.instrument,
        input.entryPrice,
        input.accountType,
        input.customContractScale
      ),
      plannedRiskAmount: round2(input.accountBalance * (input.riskPercent / 100)),
      recommendedLotSize: null,
      recommendedUnits: null,
      actualRiskAmount: null,
      actualRiskPercent: null,
      riskRewardRatio: null,
      projectedRewardAmount: null,
    };
  }
  if (input.direction === 'SELL' && input.stopLoss <= input.entryPrice) {
    return {
      valid: false,
      incompleteReason: 'For SELL positions, stop-loss must be above entry price.',
      stopLossPips: null,
      takeProfitPips: null,
      pipValuePerLot: getPipValuePerLot(
        input.instrument,
        input.entryPrice,
        input.accountType,
        input.customContractScale
      ),
      plannedRiskAmount: round2(input.accountBalance * (input.riskPercent / 100)),
      recommendedLotSize: null,
      recommendedUnits: null,
      actualRiskAmount: null,
      actualRiskPercent: null,
      riskRewardRatio: null,
      projectedRewardAmount: null,
    };
  }

  const contractScale = getAccountContractScale(input.accountType, input.customContractScale);
  const slDistance = Math.abs(input.entryPrice - input.stopLoss);
  const stopLossPips = round2(slDistance / spec.pipSize);
  const pipValuePerLot = getPipValuePerLot(
    input.instrument,
    input.entryPrice,
    input.accountType,
    input.customContractScale
  );

  if (!pipValuePerLot || stopLossPips <= 0) {
    return {
      valid: false,
      incompleteReason: 'Unable to derive non-zero stop distance or pip value.',
      stopLossPips: null,
      takeProfitPips: null,
      pipValuePerLot,
      plannedRiskAmount: null,
      recommendedLotSize: null,
      recommendedUnits: null,
      actualRiskAmount: null,
      actualRiskPercent: null,
      riskRewardRatio: null,
      projectedRewardAmount: null,
    };
  }

  const plannedRiskAmount = round2(input.accountBalance * (input.riskPercent / 100));
  const rawLots = plannedRiskAmount / (stopLossPips * pipValuePerLot);
  const recommendedLotSize = Math.max(0.01, Math.floor(rawLots * 100) / 100);
  const recommendedUnits = Math.round(recommendedLotSize * spec.contractSize * contractScale);

  const effectiveLots = input.lotSizeOverride && input.lotSizeOverride > 0 ? input.lotSizeOverride : recommendedLotSize;
  const actualRiskAmount = round2(effectiveLots * stopLossPips * pipValuePerLot);
  const actualRiskPercent = round2((actualRiskAmount / input.accountBalance) * 100);

  let takeProfitPips: number | null = null;
  let riskRewardRatio: number | null = null;
  let projectedRewardAmount: number | null = null;

  if (input.takeProfit && input.takeProfit > 0) {
    const validTp =
      (input.direction === 'BUY' && input.takeProfit > input.entryPrice) ||
      (input.direction === 'SELL' && input.takeProfit < input.entryPrice);
    if (validTp) {
      const tpDistance = Math.abs(input.takeProfit - input.entryPrice);
      takeProfitPips = round2(tpDistance / spec.pipSize);
      riskRewardRatio = round2(tpDistance / slDistance);
      projectedRewardAmount = round2(effectiveLots * takeProfitPips * pipValuePerLot);
    }
  }

  const displayPipValue =
    pipValuePerLot < 1
      ? Math.round((pipValuePerLot + Number.EPSILON) * 10000) / 10000
      : round2(pipValuePerLot);

  return {
    valid: true,
    stopLossPips,
    takeProfitPips,
    pipValuePerLot: displayPipValue,
    plannedRiskAmount,
    recommendedLotSize,
    recommendedUnits,
    actualRiskAmount,
    actualRiskPercent,
    riskRewardRatio,
    projectedRewardAmount,
  };
}

export function calculateRealizedTradeMetrics(params: {
  instrument: string;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  exitPrice?: number;
  lotSize: number;
  accountBalanceAtEntry: number;
  plannedRiskPercent: number;
  commission?: number;
  swap?: number;
  grossPnlOverride?: number;
  accountType?: TradingAccount['accountType'];
  customContractScale?: number;
}): {
  grossPnl: number | undefined;
  netPnl: number | undefined;
  rMultiple: number | undefined;
  plannedRiskAmount: number;
} {
  const plannedRiskAmount = round2(params.accountBalanceAtEntry * (params.plannedRiskPercent / 100));
  const pipValue = getPipValuePerLot(
    params.instrument,
    params.entryPrice,
    params.accountType,
    params.customContractScale
  );
  const spec = getInstrumentSpec(params.instrument);

  let grossPnl = params.grossPnlOverride;
  if (grossPnl === undefined && params.exitPrice && params.exitPrice > 0 && spec && pipValue) {
    const priceDiff =
      params.direction === 'BUY'
        ? params.exitPrice - params.entryPrice
        : params.entryPrice - params.exitPrice;
    const pips = priceDiff / spec.pipSize;
    grossPnl = round2(pips * pipValue * params.lotSize);
  }

  if (grossPnl === undefined) {
    return { grossPnl: undefined, netPnl: undefined, rMultiple: undefined, plannedRiskAmount };
  }

  const commission = params.commission ?? 0;
  const swap = params.swap ?? 0;
  const netPnl = round2(grossPnl - commission - swap);

  let rMultiple: number | undefined;
  if (plannedRiskAmount > 0) {
    rMultiple = round2(netPnl / plannedRiskAmount);
  } else {
    const slDist = Math.abs(params.entryPrice - params.stopLoss);
    if (slDist > 0 && params.exitPrice && params.exitPrice > 0) {
      const exitDist =
        params.direction === 'BUY'
          ? params.exitPrice - params.entryPrice
          : params.entryPrice - params.exitPrice;
      rMultiple = round2(exitDist / slDist);
    }
  }

  return { grossPnl, netPnl, rMultiple, plannedRiskAmount };
}

export interface PeriodSummary {
  label: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  avgRMultiple: number | null;
  profitFactor: number | null;
  complianceRate: number;
}

export interface PortfolioMetrics {
  totalTrades: number;
  closedTradesCount: number;
  openTradesCount: number;
  plannedTradesCount: number;
  draftTradesCount: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  totalGrossProfit: number;
  totalGrossLoss: number;
  netPnl: number;
  todayNetPnl: number;
  initialCapital: number;
  totalDeposits: number;
  totalWithdrawals: number;
  adjustedCapitalBase: number;
  currentAccountBalance: number;
  peakEquity: number;
  accountGrowthPercent: number;
  winRate: number;
  lossRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  expectancy: number;
  avgRMultiple: number | null;
  avgRiskPercent: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  currentConsecutiveWins: number;
  currentConsecutiveLosses: number;
  maxDrawdownPercent: number;
  maxDrawdownAmount: number;
  currentDrawdownPercent: number;
  currentDrawdownAmount: number;
  avgDurationHours: number | null;
  riskComplianceRate: number;
  openExposurePercent: number;
  dailyLossPercent: number;
  bestInstrument: string | null;
  weakestInstrument: string | null;
  equitySeries: Array<{
    date: string;
    label: string;
    equity: number;
    balance: number;
    drawdownPercent: number;
    tradePnl: number;
  }>;
  instrumentBreakdown: Array<{
    instrument: string;
    trades: number;
    wins: number;
    winRate: number;
    netPnl: number;
  }>;
  strategyBreakdown: Array<{
    strategy: string;
    trades: number;
    wins: number;
    winRate: number;
    netPnl: number;
  }>;
  sessionBreakdown: Array<{
    session: string;
    trades: number;
    wins: number;
    winRate: number;
    netPnl: number;
    avgRMultiple: number | null;
  }>;
  dayOfWeekBreakdown: Array<{
    day: string;
    trades: number;
    wins: number;
    winRate: number;
    netPnl: number;
  }>;
  timeframeBreakdown: Array<{
    timeframe: string;
    trades: number;
    wins: number;
    winRate: number;
    netPnl: number;
  }>;
  monthlyPnl: Array<{
    month: string;
    netPnl: number;
    trades: number;
  }>;
  periodComparison: {
    current30d: PeriodSummary;
    prior30d: PeriodSummary;
    thisMonth: PeriodSummary;
    lastMonth: PeriodSummary;
  };
  scores: {
    riskManagement: number;
    discipline: number;
    consistency: number;
    profitability: number;
    journalCompletion: number;
    overall: number;
  };
}

function summarizePeriod(label: string, subset: TradeRecord[]): PeriodSummary {
  const closed = subset.filter((t) => t.status === 'closed' && typeof t.netPnl === 'number');
  const wins = closed.filter((t) => (t.netPnl ?? 0) > 0.005);
  const losses = closed.filter((t) => (t.netPnl ?? 0) < -0.005);
  const grossProfit = wins.reduce((s, t) => s + (t.netPnl ?? 0), 0);
  const grossLoss = losses.reduce((s, t) => s + Math.abs(t.netPnl ?? 0), 0);
  const netPnl = round2(closed.reduce((s, t) => s + (t.netPnl ?? 0), 0));
  const rTrades = closed.filter((t) => typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple));
  const avgRMultiple =
    rTrades.length > 0
      ? round2(rTrades.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / rTrades.length)
      : null;
  const nonDraft = subset.filter((t) => t.status !== 'draft');
  const compliant = nonDraft.filter((t) => !t.riskViolation);

  return {
    label,
    trades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length > 0 ? round2((wins.length / closed.length) * 100) : 0,
    netPnl,
    avgRMultiple,
    profitFactor: grossLoss > 0 ? round2(grossProfit / grossLoss) : null,
    complianceRate: nonDraft.length > 0 ? round2((compliant.length / nonDraft.length) * 100) : 100,
  };
}

export function computePortfolioMetrics(params: {
  trades: TradeRecord[];
  accounts: TradingAccount[];
  transactions: AccountTransaction[];
  violations: RiskViolation[];
  assessments: PsychologyAssessment[];
  settings?: Partial<SystemSettings>;
}): PortfolioMetrics {
  const { trades, accounts, transactions, violations, assessments, settings } = params;

  const initialCapital = accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
  const totalDeposits = transactions
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = transactions
    .filter((t) => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const closedTrades = trades
    .filter((t) => t.status === 'closed' && typeof t.netPnl === 'number')
    .sort((a, b) => new Date(a.closedAt || a.openedAt).getTime() - new Date(b.closedAt || b.openedAt).getTime());

  const openTrades = trades.filter((t) => t.status === 'open');
  const plannedTrades = trades.filter((t) => t.status === 'planned');
  const draftTrades = trades.filter((t) => t.status === 'draft');

  let totalGrossProfit = 0;
  let totalGrossLoss = 0;
  let netPnl = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;

  let curWinStreak = 0;
  let maxConsecutiveWins = 0;
  let curLossStreak = 0;
  let maxConsecutiveLosses = 0;

  let rSum = 0;
  let rCount = 0;
  let durationSumHours = 0;
  let durationCount = 0;

  for (const t of closedTrades) {
    const pnl = t.netPnl ?? 0;
    netPnl += pnl;

    if (pnl > 0.005) {
      winningTrades++;
      totalGrossProfit += pnl;
      curWinStreak++;
      curLossStreak = 0;
      if (curWinStreak > maxConsecutiveWins) maxConsecutiveWins = curWinStreak;
    } else if (pnl < -0.005) {
      losingTrades++;
      totalGrossLoss += Math.abs(pnl);
      curLossStreak++;
      curWinStreak = 0;
      if (curLossStreak > maxConsecutiveLosses) maxConsecutiveLosses = curLossStreak;
    } else {
      breakevenTrades++;
      curWinStreak = 0;
      curLossStreak = 0;
    }

    if (typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple)) {
      rSum += t.rMultiple;
      rCount++;
    }

    if (t.openedAt && t.closedAt) {
      const diffMs = new Date(t.closedAt).getTime() - new Date(t.openedAt).getTime();
      if (diffMs > 0) {
        durationSumHours += diffMs / (1000 * 60 * 60);
        durationCount++;
      }
    }
  }

  const closedCount = closedTrades.length;
  const winRate = closedCount > 0 ? round2((winningTrades / closedCount) * 100) : 0;
  const lossRate = closedCount > 0 ? round2((losingTrades / closedCount) * 100) : 0;
  const avgWin = winningTrades > 0 ? round2(totalGrossProfit / winningTrades) : 0;
  const avgLoss = losingTrades > 0 ? round2(totalGrossLoss / losingTrades) : 0;
  const profitFactor =
    totalGrossLoss > 0 ? round2(totalGrossProfit / totalGrossLoss) : totalGrossProfit > 0 ? null : null;
  const expectancy =
    closedCount > 0
      ? round2((winRate / 100) * avgWin - (lossRate / 100) * avgLoss)
      : 0;
  const avgRMultiple = rCount > 0 ? round2(rSum / rCount) : null;
  const avgDurationHours = durationCount > 0 ? round2(durationSumHours / durationCount) : null;

  const avgRiskPercent =
    trades.length > 0
      ? round2(trades.reduce((sum, t) => sum + (t.plannedRiskPercent || 0), 0) / trades.length)
      : 0;

  // Capital-adjusted account growth (strictly separating deposits/withdrawals from trading P/L)
  const netCapitalFlows = totalDeposits - totalWithdrawals;
  const adjustedCapitalBase = initialCapital + Math.max(0, netCapitalFlows);
  const currentAccountBalance = round2(initialCapital + netCapitalFlows + netPnl);
  const accountGrowthPercent =
    adjustedCapitalBase > 0 ? round2((netPnl / adjustedCapitalBase) * 100) : 0;

  // Chronological Equity Curve & Max Drawdown
  const equitySeries: PortfolioMetrics['equitySeries'] = [];
  let runningTradingEquity = initialCapital;
  let runningBalance = initialCapital;
  let peakEquity = initialCapital;
  let maxDrawdownAmount = 0;
  let maxDrawdownPercent = 0;

  // Combine transactions and closed trades chronologically for balance vs pure trading equity
  type TimelineEvent =
    | { kind: 'trade'; date: string; pnl: number; label: string }
    | { kind: 'tx'; date: string; delta: number; label: string };

  const events: TimelineEvent[] = [
    ...closedTrades.map((t) => ({
      kind: 'trade' as const,
      date: t.closedAt || t.openedAt,
      pnl: t.netPnl ?? 0,
      label: `${t.instrument} ${t.direction}`,
    })),
    ...transactions.map((tx) => ({
      kind: 'tx' as const,
      date: tx.occurredAt,
      delta: tx.type === 'deposit' ? tx.amount : -tx.amount,
      label: tx.type === 'deposit' ? 'Deposit' : 'Withdrawal',
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (accounts.length > 0) {
    equitySeries.push({
      date: events[0]?.date || new Date().toISOString(),
      label: 'Start',
      equity: round2(initialCapital),
      balance: round2(initialCapital),
      drawdownPercent: 0,
      tradePnl: 0,
    });
  }

  for (const ev of events) {
    if (ev.kind === 'trade') {
      runningTradingEquity += ev.pnl;
      runningBalance += ev.pnl;
    } else {
      runningBalance += ev.delta;
      // Capital injection shifts peak reference proportionally without counting as trading profit
      runningTradingEquity += ev.delta;
      if (ev.delta > 0) peakEquity += ev.delta;
    }

    if (runningTradingEquity > peakEquity) {
      peakEquity = runningTradingEquity;
    }

    const ddAmt = Math.max(0, peakEquity - runningTradingEquity);
    const ddPct = peakEquity > 0 ? round2((ddAmt / peakEquity) * 100) : 0;
    if (ddAmt > maxDrawdownAmount) maxDrawdownAmount = round2(ddAmt);
    if (ddPct > maxDrawdownPercent) maxDrawdownPercent = ddPct;

    equitySeries.push({
      date: ev.date,
      label: ev.label,
      equity: round2(runningTradingEquity),
      balance: round2(runningBalance),
      drawdownPercent: ddPct,
      tradePnl: ev.kind === 'trade' ? round2(ev.pnl) : 0,
    });
  }

  const currentDrawdownAmount = round2(Math.max(0, peakEquity - runningTradingEquity));
  const currentDrawdownPercent =
    peakEquity > 0 ? round2((currentDrawdownAmount / peakEquity) * 100) : 0;

  // Open Risk Exposure & Today's Daily Loss %
  const openExposurePercent = round2(
    openTrades.reduce((sum, t) => sum + (t.plannedRiskPercent || 0), 0)
  );

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayNetPnl = round2(
    closedTrades
      .filter((t) => (t.closedAt || t.openedAt).slice(0, 10) === todayIso)
      .reduce((sum, t) => sum + (t.netPnl ?? 0), 0)
  );
  const startOfDayBalance = round2(currentAccountBalance - todayNetPnl);
  const dailyLossBase = startOfDayBalance > 0 ? startOfDayBalance : currentAccountBalance;
  const dailyLossPercent =
    todayNetPnl < 0 && dailyLossBase > 0
      ? round2((Math.abs(todayNetPnl) / dailyLossBase) * 100)
      : 0;

  // Risk compliance
  const nonDraftTradesCount = trades.filter((t) => t.status !== 'draft').length;
  const compliantTradesCount = trades.filter((t) => t.status !== 'draft' && !t.riskViolation).length;
  const riskComplianceRate =
    nonDraftTradesCount > 0
      ? round2((compliantTradesCount / nonDraftTradesCount) * 100)
      : violations.length === 0
      ? 100
      : 80;

  // Instrument, Strategy, Session, Day-of-week & Timeframe breakdowns
  const instMap = new Map<string, { trades: number; wins: number; netPnl: number }>();
  const stratMap = new Map<string, { trades: number; wins: number; netPnl: number }>();
  const sessionMap = new Map<
    string,
    { trades: number; wins: number; netPnl: number; rSum: number; rCount: number }
  >();
  const dowOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowMap = new Map<string, { trades: number; wins: number; netPnl: number }>();
  const tfMap = new Map<string, { trades: number; wins: number; netPnl: number }>();
  const monthMap = new Map<string, { netPnl: number; trades: number }>();

  for (const t of closedTrades) {
    const pnl = t.netPnl ?? 0;
    const isWin = pnl > 0.005;

    const iCur = instMap.get(t.instrument) || { trades: 0, wins: 0, netPnl: 0 };
    iCur.trades++;
    if (isWin) iCur.wins++;
    iCur.netPnl += pnl;
    instMap.set(t.instrument, iCur);

    const sCur = stratMap.get(t.strategy) || { trades: 0, wins: 0, netPnl: 0 };
    sCur.trades++;
    if (isWin) sCur.wins++;
    sCur.netPnl += pnl;
    stratMap.set(t.strategy, sCur);

    const sesCur = sessionMap.get(t.session) || {
      trades: 0,
      wins: 0,
      netPnl: 0,
      rSum: 0,
      rCount: 0,
    };
    sesCur.trades++;
    if (isWin) sesCur.wins++;
    sesCur.netPnl += pnl;
    if (typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple)) {
      sesCur.rSum += t.rMultiple;
      sesCur.rCount++;
    }
    sessionMap.set(t.session, sesCur);

    const dObj = new Date(t.closedAt || t.openedAt);
    const dayLabel = Number.isNaN(dObj.getTime()) ? 'Mon' : dowNames[dObj.getDay()];
    const dCur = dowMap.get(dayLabel) || { trades: 0, wins: 0, netPnl: 0 };
    dCur.trades++;
    if (isWin) dCur.wins++;
    dCur.netPnl += pnl;
    dowMap.set(dayLabel, dCur);

    const tfKey = t.timeframe || 'Unspecified';
    const tfCur = tfMap.get(tfKey) || { trades: 0, wins: 0, netPnl: 0 };
    tfCur.trades++;
    if (isWin) tfCur.wins++;
    tfCur.netPnl += pnl;
    tfMap.set(tfKey, tfCur);

    const mKey = (t.closedAt || t.openedAt).slice(0, 7);
    const mCur = monthMap.get(mKey) || { netPnl: 0, trades: 0 };
    mCur.netPnl += pnl;
    mCur.trades++;
    monthMap.set(mKey, mCur);
  }

  const instrumentBreakdown = Array.from(instMap.entries())
    .map(([instrument, v]) => ({
      instrument,
      trades: v.trades,
      wins: v.wins,
      winRate: round2((v.wins / v.trades) * 100),
      netPnl: round2(v.netPnl),
    }))
    .sort((a, b) => b.netPnl - a.netPnl);

  const strategyBreakdown = Array.from(stratMap.entries())
    .map(([strategy, v]) => ({
      strategy,
      trades: v.trades,
      wins: v.wins,
      winRate: round2((v.wins / v.trades) * 100),
      netPnl: round2(v.netPnl),
    }))
    .sort((a, b) => b.netPnl - a.netPnl);

  const sessionBreakdown = Array.from(sessionMap.entries())
    .map(([session, v]) => ({
      session,
      trades: v.trades,
      wins: v.wins,
      winRate: round2((v.wins / v.trades) * 100),
      netPnl: round2(v.netPnl),
      avgRMultiple: v.rCount > 0 ? round2(v.rSum / v.rCount) : null,
    }))
    .sort((a, b) => b.netPnl - a.netPnl);

  const dayOfWeekBreakdown = dowOrder
    .filter((day) => dowMap.has(day))
    .map((day) => {
      const v = dowMap.get(day)!;
      return {
        day,
        trades: v.trades,
        wins: v.wins,
        winRate: round2((v.wins / v.trades) * 100),
        netPnl: round2(v.netPnl),
      };
    });

  const timeframeBreakdown = Array.from(tfMap.entries())
    .map(([timeframe, v]) => ({
      timeframe,
      trades: v.trades,
      wins: v.wins,
      winRate: round2((v.wins / v.trades) * 100),
      netPnl: round2(v.netPnl),
    }))
    .sort((a, b) => b.netPnl - a.netPnl);

  const monthlyPnl = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      netPnl: round2(v.netPnl),
      trades: v.trades,
    }));

  // Period-over-period comparisons (30d vs prior 30d; this month vs last month)
  const nowDate = new Date();
  const nowMs = nowDate.getTime();
  const ms30d = 30 * 86400000;
  const current30dTrades = trades.filter((t) => {
    const ts = new Date(t.closedAt || t.openedAt).getTime();
    return ts >= nowMs - ms30d && ts <= nowMs;
  });
  const prior30dTrades = trades.filter((t) => {
    const ts = new Date(t.closedAt || t.openedAt).getTime();
    return ts >= nowMs - ms30d * 2 && ts < nowMs - ms30d;
  });
  const thisMonthKey = nowDate.toISOString().slice(0, 7);
  const prevMonthDate = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() - 1, 1));
  const lastMonthKey = prevMonthDate.toISOString().slice(0, 7);
  const thisMonthTrades = trades.filter(
    (t) => (t.closedAt || t.openedAt).slice(0, 7) === thisMonthKey
  );
  const lastMonthTrades = trades.filter(
    (t) => (t.closedAt || t.openedAt).slice(0, 7) === lastMonthKey
  );

  const periodComparison = {
    current30d: summarizePeriod('Last 30 Days', current30dTrades),
    prior30d: summarizePeriod('Prior 30 Days', prior30dTrades),
    thisMonth: summarizePeriod(thisMonthKey, thisMonthTrades),
    lastMonth: summarizePeriod(lastMonthKey, lastMonthTrades),
  };

  const bestInstrument = instrumentBreakdown[0]?.instrument ?? null;
  const weakestInstrument =
    instrumentBreakdown.length > 0
      ? instrumentBreakdown[instrumentBreakdown.length - 1].instrument
      : null;

  // 5-Pillar Scoring System (30% Risk, 25% Discipline, 20% Consistency, 15% Profitability, 10% Journal)
  const wRisk = settings?.weightRiskManagement ?? 30;
  const wDisc = settings?.weightDiscipline ?? 25;
  const wCons = settings?.weightConsistency ?? 20;
  const wProf = settings?.weightProfitability ?? 15;
  const wJour = settings?.weightJournalCompletion ?? 10;
  const totalW = wRisk + wDisc + wCons + wProf + wJour || 100;

  const riskScore = Math.max(0, Math.min(100, riskComplianceRate - violations.length * 2));

  const planFollowedCount = trades.filter((t) => t.planFollowed).length;
  const disciplineBase = trades.length > 0 ? (planFollowedCount / trades.length) * 100 : 0;
  const psychPositive =
    assessments.length > 0
      ? (assessments.filter((a) => a.followsStrategy && a.riskCalculated && !a.revengeTendency).length /
          assessments.length) *
        100
      : disciplineBase;
  const disciplineScore = round2(trades.length > 0 ? disciplineBase * 0.65 + psychPositive * 0.35 : 0);

  // Consistency: steady trading + controlled drawdown + positive expectancy
  const ddPenalty = Math.min(40, maxDrawdownPercent * 4);
  const consistencyScore =
    closedCount > 0 ? round2(Math.max(0, Math.min(100, 75 + (winRate >= 45 ? 15 : 0) - ddPenalty))) : 0;

  // Risk-adjusted profitability (based on avg R-multiple and growth)
  const rFactorScore =
    avgRMultiple !== null ? Math.max(0, Math.min(100, 50 + avgRMultiple * 20)) : 0;
  const profitabilityScore =
    closedCount > 0
      ? round2(Math.max(0, Math.min(100, rFactorScore * 0.7 + (accountGrowthPercent > 0 ? 30 : 10))))
      : 0;

  // Journal completion: justification + observations + lessons learned filled
  const fullyJournaledCount = trades.filter(
    (t) =>
      (t.entryJustification?.trim().length ?? 0) >= 10 &&
      (t.observations?.trim().length ?? 0) >= 5
  ).length;
  const journalCompletion =
    trades.length > 0 ? round2((fullyJournaledCount / trades.length) * 100) : 0;

  const overallScore = round2(
    (riskScore * wRisk +
      disciplineScore * wDisc +
      consistencyScore * wCons +
      profitabilityScore * wProf +
      journalCompletion * wJour) /
      totalW
  );

  return {
    totalTrades: trades.length,
    closedTradesCount: closedCount,
    openTradesCount: openTrades.length,
    plannedTradesCount: plannedTrades.length,
    draftTradesCount: draftTrades.length,
    winningTrades,
    losingTrades,
    breakevenTrades,
    totalGrossProfit: round2(totalGrossProfit),
    totalGrossLoss: round2(totalGrossLoss),
    netPnl: round2(netPnl),
    todayNetPnl,
    initialCapital: round2(initialCapital),
    totalDeposits: round2(totalDeposits),
    totalWithdrawals: round2(totalWithdrawals),
    adjustedCapitalBase: round2(adjustedCapitalBase),
    currentAccountBalance,
    peakEquity: round2(peakEquity),
    accountGrowthPercent,
    winRate,
    lossRate,
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
    avgRMultiple,
    avgRiskPercent,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    currentConsecutiveWins: curWinStreak,
    currentConsecutiveLosses: curLossStreak,
    maxDrawdownPercent,
    maxDrawdownAmount,
    currentDrawdownPercent,
    currentDrawdownAmount,
    avgDurationHours,
    riskComplianceRate,
    openExposurePercent,
    dailyLossPercent,
    bestInstrument,
    weakestInstrument,
    equitySeries,
    instrumentBreakdown,
    strategyBreakdown,
    sessionBreakdown,
    dayOfWeekBreakdown,
    timeframeBreakdown,
    monthlyPnl,
    periodComparison,
    scores: {
      riskManagement: round2(riskScore),
      discipline: disciplineScore,
      consistency: consistencyScore,
      profitability: profitabilityScore,
      journalCompletion,
      overall: overallScore,
    },
  };
}

export interface ChallengeProgressReport {
  cycleId: string;
  enrolled: boolean;
  openingBalance: number;
  currentBalance: number;
  targetBalance: number;
  netPnl: number;
  growthPercent: number;
  targetCompletionPercent: number;
  remainingToTargetAmount: number;
  tradesCount: number;
  winsCount: number;
  winRate: number;
  tradingDaysCount: number;
  daysElapsed: number;
  daysRemaining: number;
  cycleMaxDrawdownPercent: number;
  cycleCurrentDrawdownPercent: number;
  drawdownBufferRemainingPercent: number;
  todayLossPercent: number;
  dailyLossBufferRemainingPercent: number;
  ruleViolationsCount: number;
  challengeState: 'Not Joined' | 'Passed' | 'Breached' | 'At Risk' | 'On Track';
  cycleEquityCurve: Array<{
    label: string;
    date: string;
    balance: number;
    targetBalance: number;
    drawdownPercent: number;
  }>;
}

export function computeChallengeProgress(params: {
  cycle: ChallengeCycle;
  participation?: ChallengeParticipant;
  account?: TradingAccount;
  trades: TradeRecord[];
  riskPolicy: RiskPolicy;
}): ChallengeProgressReport {
  const { cycle, participation, account, trades, riskPolicy } = params;
  const openingBalance =
    participation?.openingBalance ?? account?.currentBalance ?? account?.initialBalance ?? 0;
  const targetBalance = round2(openingBalance * (1 + cycle.targetGrowthPercent / 100));

  const cycleTrades = trades
    .filter((t) => t.challengeCycleId === cycle.id && t.status !== 'draft')
    .sort(
      (a, b) =>
        new Date(a.closedAt || a.openedAt).getTime() -
        new Date(b.closedAt || b.openedAt).getTime()
    );
  const closedTrades = cycleTrades.filter(
    (t) => t.status === 'closed' && typeof t.netPnl === 'number'
  );

  let runningBalance = openingBalance;
  let peak = openingBalance;
  let maxDdPct = 0;

  const cycleEquityCurve: ChallengeProgressReport['cycleEquityCurve'] = [];
  if (openingBalance > 0) {
    cycleEquityCurve.push({
      label: 'Start',
      date: cycle.startDate.slice(0, 10),
      balance: round2(openingBalance),
      targetBalance,
      drawdownPercent: 0,
    });
  }

  for (const t of closedTrades) {
    runningBalance += t.netPnl ?? 0;
    if (runningBalance > peak) peak = runningBalance;
    const ddPct = peak > 0 ? round2(((peak - runningBalance) / peak) * 100) : 0;
    if (ddPct > maxDdPct) maxDdPct = ddPct;
    cycleEquityCurve.push({
      label: `${t.instrument} ${t.direction}`,
      date: (t.closedAt || t.openedAt).slice(0, 10),
      balance: round2(runningBalance),
      targetBalance,
      drawdownPercent: ddPct,
    });
  }

  const netPnl = round2(closedTrades.reduce((s, t) => s + (t.netPnl ?? 0), 0));
  const currentBalance = round2(openingBalance + netPnl);
  const growthPercent =
    openingBalance > 0 ? round2((netPnl / openingBalance) * 100) : 0;
  const targetCompletionPercent =
    cycle.targetGrowthPercent > 0
      ? round2(Math.max(0, Math.min(100, (growthPercent / cycle.targetGrowthPercent) * 100)))
      : 0;
  const remainingToTargetAmount = round2(Math.max(0, targetBalance - currentBalance));
  const cycleCurrentDrawdownPercent =
    peak > 0 ? round2(Math.max(0, ((peak - runningBalance) / peak) * 100)) : 0;
  const drawdownBufferRemainingPercent = round2(
    Math.max(0, cycle.maxDrawdownPercent - maxDdPct)
  );

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayPnl = closedTrades
    .filter((t) => (t.closedAt || t.openedAt).slice(0, 10) === todayIso)
    .reduce((s, t) => s + (t.netPnl ?? 0), 0);
  const startDayBal = currentBalance - todayPnl;
  const todayLossPercent =
    todayPnl < 0 && startDayBal > 0 ? round2((Math.abs(todayPnl) / startDayBal) * 100) : 0;
  const dailyLossBufferRemainingPercent = round2(
    Math.max(0, riskPolicy.maxDailyLossPercent - todayLossPercent)
  );

  const winsCount = closedTrades.filter((t) => (t.netPnl ?? 0) > 0.005).length;
  const winRate =
    closedTrades.length > 0 ? round2((winsCount / closedTrades.length) * 100) : 0;
  const tradingDaysCount = new Set(
    closedTrades.map((t) => (t.closedAt || t.openedAt).slice(0, 10))
  ).size;

  const startMs = new Date(cycle.startDate).getTime();
  const totalDays = cycle.durationDays || 30;
  const daysElapsed = Math.max(1, Math.min(totalDays, Math.floor((Date.now() - startMs) / 86400000) + 1));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const ruleViolationsCount = cycleTrades.filter(
    (t) => t.riskViolation || t.plannedRiskPercent > cycle.maxRiskPerTradePercent
  ).length;

  let challengeState: ChallengeProgressReport['challengeState'] = 'On Track';
  if (!participation) {
    challengeState = 'Not Joined';
  } else if (
    maxDdPct >= cycle.maxDrawdownPercent ||
    todayLossPercent >= riskPolicy.maxDailyLossPercent
  ) {
    challengeState = 'Breached';
  } else if (growthPercent >= cycle.targetGrowthPercent) {
    challengeState = 'Passed';
  } else if (
    drawdownBufferRemainingPercent <= 1.5 ||
    dailyLossBufferRemainingPercent <= 0.5 ||
    ruleViolationsCount > 0
  ) {
    challengeState = 'At Risk';
  }

  return {
    cycleId: cycle.id,
    enrolled: Boolean(participation),
    openingBalance: round2(openingBalance),
    currentBalance,
    targetBalance,
    netPnl,
    growthPercent,
    targetCompletionPercent,
    remainingToTargetAmount,
    tradesCount: closedTrades.length,
    winsCount,
    winRate,
    tradingDaysCount,
    daysElapsed,
    daysRemaining,
    cycleMaxDrawdownPercent: maxDdPct,
    cycleCurrentDrawdownPercent,
    drawdownBufferRemainingPercent,
    todayLossPercent,
    dailyLossBufferRemainingPercent,
    ruleViolationsCount,
    challengeState,
    cycleEquityCurve,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(val: number | undefined | null, currency = 'USD'): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return '—';
  const sign = val > 0 ? '+' : val < 0 ? '-' : '';
  const abs = Math.abs(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sign}${symbol}${abs}`;
}

export function formatPlainCurrency(val: number | undefined | null, currency = 'USD'): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return '—';
  const abs = Math.abs(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${val < 0 ? '-' : ''}${symbol}${abs}`;
}

export interface SetupEdgeSummary {
  label: string;
  instrument: string;
  direction: TradeDirection;
  session: string;
  strategy: string;
  timeframe: string;
  trades: number;
  winRate: number;
  avgRMultiple: number | null;
  netPnl: number;
}

export interface ManualRecordInsights {
  totalNonDraftTrades: number;
  closedTradesAnalyzed: number;
  documentationRate: number;
  planAdherenceRate: number;
  readinessLabel: 'Building Baseline' | 'Pattern Emerging' | 'High-Confidence Model';
  topSetup: SetupEdgeSummary | null;
  avoidSetup: SetupEdgeSummary | null;
  bestSession: { session: string; winRate: number; trades: number; netPnl: number } | null;
  bestEmotion: { emotion: string; winRate: number; trades: number } | null;
  topMistake: { tag: string; count: number; netPnl: number } | null;
  predictedNextWinRate: number | null;
  predictedExpectedR: number | null;
  predictionHeadline: string;
  predictionGuidance: string[];
}

export function computeManualRecordInsights(params: {
  trades: TradeRecord[];
  assessments: PsychologyAssessment[];
  riskPolicy: RiskPolicy;
}): ManualRecordInsights {
  const { trades, assessments, riskPolicy } = params;
  const nonDraft = trades.filter((t) => t.status !== 'draft');
  const closed = nonDraft.filter((t) => t.status === 'closed' && typeof t.netPnl === 'number');

  const documentedCount = nonDraft.filter(
    (t) =>
      (t.entryJustification?.trim().length ?? 0) >= 8 &&
      Boolean(t.strategy) &&
      Boolean(t.session)
  ).length;
  const documentationRate =
    nonDraft.length > 0 ? round2((documentedCount / nonDraft.length) * 100) : 0;

  const planFollowedCount = nonDraft.filter((t) => t.planFollowed).length;
  const planAdherenceRate =
    nonDraft.length > 0 ? round2((planFollowedCount / nonDraft.length) * 100) : 100;

  const readinessLabel: ManualRecordInsights['readinessLabel'] =
    closed.length >= 10
      ? 'High-Confidence Model'
      : closed.length >= 3
      ? 'Pattern Emerging'
      : 'Building Baseline';

  if (closed.length === 0) {
    return {
      totalNonDraftTrades: nonDraft.length,
      closedTradesAnalyzed: 0,
      documentationRate,
      planAdherenceRate,
      readinessLabel: 'Building Baseline',
      topSetup: null,
      avoidSetup: null,
      bestSession: null,
      bestEmotion: null,
      topMistake: null,
      predictedNextWinRate: null,
      predictedExpectedR: null,
      predictionHeadline:
        nonDraft.length > 0
          ? 'Open or planned manual setups logged — close your trades to activate outcome predictions.'
          : 'Log your trades manually with strategy, session, emotion, and notes so the system can learn your edge.',
      predictionGuidance: [
        `Keep per-trade risk at or below ${riskPolicy.maxRiskPerTradePercent}% while building your baseline.`,
        'Record Entry Justification, Setup Grade, and Execution Emotion on each trade for accurate predictions.',
      ],
    };
  }

  // Group by Strategy + Session + Instrument (and fallback Strategy + Session)
  const setupBuckets = new Map<
    string,
    {
      instrument: string;
      direction: TradeDirection;
      session: string;
      strategy: string;
      timeframe: string;
      trades: number;
      wins: number;
      netPnl: number;
      rSum: number;
      rCount: number;
    }
  >();

  const sessionMap = new Map<string, { trades: number; wins: number; netPnl: number }>();
  const emotionMap = new Map<string, { trades: number; wins: number; netPnl: number }>();
  const mistakeMap = new Map<string, { count: number; netPnl: number }>();

  for (const t of closed) {
    const pnl = t.netPnl ?? 0;
    const isWin = pnl > 0.005;
    const tf = t.timeframe || 'H1';
    const key = `${t.instrument}|${t.direction}|${t.session}|${t.strategy}|${tf}`;
    const cur = setupBuckets.get(key) || {
      instrument: t.instrument,
      direction: t.direction,
      session: t.session,
      strategy: t.strategy,
      timeframe: tf,
      trades: 0,
      wins: 0,
      netPnl: 0,
      rSum: 0,
      rCount: 0,
    };
    cur.trades++;
    if (isWin) cur.wins++;
    cur.netPnl += pnl;
    if (typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple)) {
      cur.rSum += t.rMultiple;
      cur.rCount++;
    }
    setupBuckets.set(key, cur);

    const sCur = sessionMap.get(t.session) || { trades: 0, wins: 0, netPnl: 0 };
    sCur.trades++;
    if (isWin) sCur.wins++;
    sCur.netPnl += pnl;
    sessionMap.set(t.session, sCur);

    if (t.emotionTag) {
      const eCur = emotionMap.get(t.emotionTag) || { trades: 0, wins: 0, netPnl: 0 };
      eCur.trades++;
      if (isWin) eCur.wins++;
      eCur.netPnl += pnl;
      emotionMap.set(t.emotionTag, eCur);
    }

    for (const tag of t.mistakeTags || []) {
      const mCur = mistakeMap.get(tag) || { count: 0, netPnl: 0 };
      mCur.count++;
      mCur.netPnl += pnl;
      mistakeMap.set(tag, mCur);
    }
  }

  const setups: SetupEdgeSummary[] = Array.from(setupBuckets.values()).map((v) => {
    const winRate = round2((v.wins / v.trades) * 100);
    const avgR = v.rCount > 0 ? round2(v.rSum / v.rCount) : null;
    return {
      label: `${v.instrument} ${v.direction} · ${v.session} · ${v.strategy} (${v.timeframe})`,
      instrument: v.instrument,
      direction: v.direction,
      session: v.session,
      strategy: v.strategy,
      timeframe: v.timeframe,
      trades: v.trades,
      winRate,
      avgRMultiple: avgR,
      netPnl: round2(v.netPnl),
    };
  });

  const sortedBest = [...setups].sort((a, b) => {
    if (b.netPnl !== a.netPnl) return b.netPnl - a.netPnl;
    return b.winRate - a.winRate;
  });
  const topSetup = sortedBest[0] || null;
  const losingSetups = setups.filter((s) => s.netPnl < 0).sort((a, b) => a.netPnl - b.netPnl);
  const avoidSetup = losingSetups[0] || null;

  const bestSessionArr = Array.from(sessionMap.entries())
    .map(([session, v]) => ({
      session,
      trades: v.trades,
      winRate: round2((v.wins / v.trades) * 100),
      netPnl: round2(v.netPnl),
    }))
    .sort((a, b) => b.netPnl - a.netPnl);
  const bestSession = bestSessionArr[0] || null;

  const bestEmotionArr = Array.from(emotionMap.entries())
    .map(([emotion, v]) => ({
      emotion,
      trades: v.trades,
      winRate: round2((v.wins / v.trades) * 100),
      netPnl: round2(v.netPnl),
    }))
    .sort((a, b) => b.winRate - a.winRate || b.netPnl - a.netPnl);
  const bestEmotion = bestEmotionArr[0]
    ? { emotion: bestEmotionArr[0].emotion, winRate: bestEmotionArr[0].winRate, trades: bestEmotionArr[0].trades }
    : null;

  const topMistakeArr = Array.from(mistakeMap.entries())
    .map(([tag, v]) => ({ tag, count: v.count, netPnl: round2(v.netPnl) }))
    .sort((a, b) => b.count - a.count || a.netPnl - b.netPnl);
  const topMistake = topMistakeArr[0] || null;

  // Compute forward prediction metrics weighted toward plan-followed and recent setups
  const recentWindow = closed.slice(0, 15);
  const plannedClean = recentWindow.filter((t) => t.planFollowed && !t.riskViolation);
  const refSet = plannedClean.length >= 2 ? plannedClean : recentWindow;
  const refWins = refSet.filter((t) => (t.netPnl ?? 0) > 0.005).length;
  const predictedNextWinRate = round2((refWins / refSet.length) * 100);
  const rVals = refSet
    .map((t) => t.rMultiple)
    .filter((r): r is number => typeof r === 'number' && Number.isFinite(r));
  const predictedExpectedR =
    rVals.length > 0 ? round2(rVals.reduce((s, r) => s + r, 0) / rVals.length) : null;

  const recentRevenge = assessments.slice(0, 5).some((a) => a.revengeTendency || a.fomoLevel >= 7);

  const predictionGuidance: string[] = [];
  if (topSetup && topSetup.netPnl > 0) {
    predictionGuidance.push(
      `Highest-probability setup from your records: ${topSetup.instrument} ${topSetup.direction} during ${topSetup.session} using ${topSetup.strategy} (${topSetup.winRate}% win rate across ${topSetup.trades} trade${topSetup.trades === 1 ? '' : 's'}).`
    );
  }
  if (bestEmotion) {
    predictionGuidance.push(
      `Your best execution mindset is "${bestEmotion.emotion}" (${bestEmotion.winRate}% win rate).`
    );
  }
  if (topMistake) {
    predictionGuidance.push(
      `Primary risk to next trade outcome: "${topMistake.tag}" (${topMistake.count}x, ${formatCurrency(topMistake.netPnl)} impact). Avoid entering if this trigger appears.`
    );
  }
  if (recentRevenge) {
    predictionGuidance.push(
      'Recent psychology check-in flagged elevated FOMO or revenge urge — wait for full confirmation before sizing in.'
    );
  }
  if (documentationRate < 70) {
    predictionGuidance.push(
      `Only ${documentationRate}% of your manual records include full entry reasoning — adding clear market-structure notes sharpens pattern predictions.`
    );
  }
  if (predictionGuidance.length === 0) {
    predictionGuidance.push(
      `Consistent manual logging (${documentationRate}% documented, ${planAdherenceRate}% plan adherence). Continue prioritizing Grade A+/A setups.`
    );
  }

  const predictionHeadline =
    topSetup && topSetup.netPnl > 0
      ? `Prioritize ${topSetup.instrument} ${topSetup.direction} (${topSetup.session} · ${topSetup.strategy}) — ${predictedNextWinRate}% projected disciplined hit rate.`
      : `Current baseline reads ${predictedNextWinRate}% win probability across ${closed.length} closed manual record${closed.length === 1 ? '' : 's'}.`;

  return {
    totalNonDraftTrades: nonDraft.length,
    closedTradesAnalyzed: closed.length,
    documentationRate,
    planAdherenceRate,
    readinessLabel,
    topSetup,
    avoidSetup,
    bestSession,
    bestEmotion,
    topMistake,
    predictedNextWinRate,
    predictedExpectedR,
    predictionHeadline,
    predictionGuidance,
  };
}

export interface PlannedSetupPrediction {
  hasEnoughHistory: boolean;
  sampleCount: number;
  matchScopeLabel: string;
  predictedWinRate: number | null;
  expectedRMultiple: number | null;
  verdict: 'Favorable Setup' | 'Neutral / Mixed' | 'Caution Advised' | 'Insufficient History';
  notes: string[];
}

export function evaluatePlannedSetupPrediction(params: {
  trades: TradeRecord[];
  instrument: string;
  direction: TradeDirection;
  session: string;
  timeframe?: string;
  strategy: string;
  emotionTag?: string;
  plannedRiskPercent: number;
  riskPolicy: RiskPolicy;
}): PlannedSetupPrediction {
  const {
    trades,
    instrument,
    direction,
    session,
    strategy,
    emotionTag,
    plannedRiskPercent,
    riskPolicy,
  } = params;

  const closed = trades.filter((t) => t.status === 'closed' && typeof t.netPnl === 'number');
  if (closed.length === 0) {
    return {
      hasEnoughHistory: false,
      sampleCount: 0,
      matchScopeLabel: 'No closed manual trades yet',
      predictedWinRate: null,
      expectedRMultiple: null,
      verdict: 'Insufficient History',
      notes: [
        'Log and close trades manually so the system learns your hit rate for each pair, session, and strategy.',
      ],
    };
  }

  const exactMatches = closed.filter(
    (t) =>
      t.instrument === instrument &&
      t.direction === direction &&
      t.strategy === strategy
  );
  const pairOrStrategyMatches = closed.filter(
    (t) => t.instrument === instrument || t.strategy === strategy
  );
  const activePool =
    exactMatches.length >= 2
      ? exactMatches
      : pairOrStrategyMatches.length >= 2
      ? pairOrStrategyMatches
      : closed;

  const matchScopeLabel =
    exactMatches.length >= 2
      ? `${exactMatches.length} prior ${instrument} ${direction} · ${strategy} records`
      : pairOrStrategyMatches.length >= 2
      ? `${pairOrStrategyMatches.length} prior ${instrument} / ${strategy} records`
      : `${closed.length} total closed manual records`;

  const wins = activePool.filter((t) => (t.netPnl ?? 0) > 0.005).length;
  const predictedWinRate = round2((wins / activePool.length) * 100);
  const rList = activePool
    .map((t) => t.rMultiple)
    .filter((r): r is number => typeof r === 'number' && Number.isFinite(r));
  const expectedRMultiple =
    rList.length > 0 ? round2(rList.reduce((s, r) => s + r, 0) / rList.length) : null;

  const notes: string[] = [];

  const sessionSubset = closed.filter((t) => t.session === session);
  if (sessionSubset.length >= 2) {
    const sesWins = sessionSubset.filter((t) => (t.netPnl ?? 0) > 0.005).length;
    const sesWr = round2((sesWins / sessionSubset.length) * 100);
    notes.push(`${session} session history: ${sesWr}% win rate across ${sessionSubset.length} trades.`);
  }

  if (emotionTag) {
    const emoSubset = closed.filter((t) => t.emotionTag === emotionTag);
    if (emoSubset.length >= 2) {
      const emoWins = emoSubset.filter((t) => (t.netPnl ?? 0) > 0.005).length;
      const emoWr = round2((emoWins / emoSubset.length) * 100);
      notes.push(
        `When feeling "${emotionTag}", your recorded win rate is ${emoWr}% (${emoSubset.length} trades).`
      );
    } else if (['anxious', 'frustrated', 'overconfident', 'fatigued'].includes(emotionTag)) {
      notes.push(
        `Caution: Logging "${emotionTag}" carries elevated rule-deviation risk — confirm checklist before entry.`
      );
    }
  }

  if (plannedRiskPercent > riskPolicy.maxRiskPerTradePercent) {
    notes.push(
      `Planned risk (${plannedRiskPercent}%) exceeds your ${riskPolicy.maxRiskPerTradePercent}% policy cap.`
    );
  }

  let verdict: PlannedSetupPrediction['verdict'] = 'Neutral / Mixed';
  if (
    plannedRiskPercent > riskPolicy.maxRiskPerTradePercent ||
    (predictedWinRate < 40 && activePool.length >= 3) ||
    (expectedRMultiple !== null && expectedRMultiple < 0 && activePool.length >= 3) ||
    (emotionTag && ['frustrated', 'anxious', 'fatigued'].includes(emotionTag))
  ) {
    verdict = 'Caution Advised';
  } else if (
    predictedWinRate >= 55 &&
    (expectedRMultiple === null || expectedRMultiple >= 0.4)
  ) {
    verdict = 'Favorable Setup';
  }

  if (notes.length === 0) {
    notes.push(
      `Historical win rate on ${matchScopeLabel} is ${predictedWinRate}%${
        expectedRMultiple !== null ? ` with avg ${expectedRMultiple}R` : ''
      }.`
    );
  }

  return {
    hasEnoughHistory: true,
    sampleCount: activePool.length,
    matchScopeLabel,
    predictedWinRate,
    expectedRMultiple,
    verdict,
    notes,
  };
}
