import type {
  AccountTransaction,
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

export function getInstrumentSpec(symbol: string): InstrumentSpec | null {
  const normalized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return INSTRUMENT_SPECS[normalized] ?? null;
}

export function getPipValuePerLot(symbol: string, entryPrice?: number): number | null {
  const spec = getInstrumentSpec(symbol);
  if (!spec) return null;

  if (spec.quoteCurrency === 'USD') {
    return spec.contractSize * spec.pipSize;
  }

  if (spec.baseCurrency === 'USD' && entryPrice && entryPrice > 0) {
    return (spec.contractSize * spec.pipSize) / entryPrice;
  }

  return spec.defaultPipValuePerLotUSD;
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
      pipValuePerLot: getPipValuePerLot(input.instrument, input.entryPrice),
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
      pipValuePerLot: getPipValuePerLot(input.instrument, input.entryPrice),
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
      pipValuePerLot: getPipValuePerLot(input.instrument, input.entryPrice),
      plannedRiskAmount: round2(input.accountBalance * (input.riskPercent / 100)),
      recommendedLotSize: null,
      recommendedUnits: null,
      actualRiskAmount: null,
      actualRiskPercent: null,
      riskRewardRatio: null,
      projectedRewardAmount: null,
    };
  }

  const slDistance = Math.abs(input.entryPrice - input.stopLoss);
  const stopLossPips = round2(slDistance / spec.pipSize);
  const pipValuePerLot = getPipValuePerLot(input.instrument, input.entryPrice);

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
  const recommendedUnits = Math.round(recommendedLotSize * spec.contractSize);

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

  return {
    valid: true,
    stopLossPips,
    takeProfitPips,
    pipValuePerLot: round2(pipValuePerLot),
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
}): {
  grossPnl: number | undefined;
  netPnl: number | undefined;
  rMultiple: number | undefined;
  plannedRiskAmount: number;
} {
  const plannedRiskAmount = round2(params.accountBalanceAtEntry * (params.plannedRiskPercent / 100));
  const pipValue = getPipValuePerLot(params.instrument, params.entryPrice);
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
  initialCapital: number;
  totalDeposits: number;
  totalWithdrawals: number;
  adjustedCapitalBase: number;
  currentAccountBalance: number;
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
  currentConsecutiveLosses: number;
  maxDrawdownPercent: number;
  maxDrawdownAmount: number;
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
  monthlyPnl: Array<{
    month: string;
    netPnl: number;
    trades: number;
  }>;
  scores: {
    riskManagement: number;
    discipline: number;
    consistency: number;
    profitability: number;
    journalCompletion: number;
    overall: number;
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

  // Open Risk Exposure & Today's Daily Loss %
  const openExposurePercent = round2(
    openTrades.reduce((sum, t) => sum + (t.plannedRiskPercent || 0), 0)
  );

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayNetPnl = closedTrades
    .filter((t) => (t.closedAt || t.openedAt).slice(0, 10) === todayIso)
    .reduce((sum, t) => sum + (t.netPnl ?? 0), 0);
  const dailyLossPercent =
    todayNetPnl < 0 && currentAccountBalance > 0
      ? round2((Math.abs(todayNetPnl) / currentAccountBalance) * 100)
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

  // Instrument & Strategy breakdowns
  const instMap = new Map<string, { trades: number; wins: number; netPnl: number }>();
  const stratMap = new Map<string, { trades: number; wins: number; netPnl: number }>();
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

  const monthlyPnl = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      netPnl: round2(v.netPnl),
      trades: v.trades,
    }));

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
    initialCapital: round2(initialCapital),
    totalDeposits: round2(totalDeposits),
    totalWithdrawals: round2(totalWithdrawals),
    adjustedCapitalBase: round2(adjustedCapitalBase),
    currentAccountBalance,
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
    currentConsecutiveLosses: curLossStreak,
    maxDrawdownPercent,
    maxDrawdownAmount,
    avgDurationHours,
    riskComplianceRate,
    openExposurePercent,
    dailyLossPercent,
    bestInstrument,
    weakestInstrument,
    equitySeries,
    instrumentBreakdown,
    strategyBreakdown,
    monthlyPnl,
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
