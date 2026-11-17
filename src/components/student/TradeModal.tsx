import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, X } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import {
  calculatePositionSizing,
  calculateRealizedTradeMetrics,
  evaluatePlannedSetupPrediction,
  formatAccountTypeLabel,
  formatCurrency,
  formatPlainCurrency,
  INSTRUMENT_SPECS,
  MISTAKE_TAG_OPTIONS,
  SETUP_GRADE_OPTIONS,
  STRATEGY_OPTIONS,
  TIMEFRAME_OPTIONS,
} from '../../lib/forexCalculations';
import { saveTradeRecord } from '../../services/mentorshipService';
import type {
  EmotionalState,
  TradeDirection,
  TradeRecord,
  TradeSession,
  TradeStatus,
} from '../../types/domain';

const TRADE_EMOTIONS: EmotionalState[] = [
  'calm',
  'focused',
  'anxious',
  'frustrated',
  'overconfident',
  'hesitant',
  'fatigued',
];

interface Props {
  open: boolean;
  onClose: () => void;
  existingTrade?: TradeRecord | null;
}

export const TradeModal: React.FC<Props> = ({ open, onClose, existingTrade }) => {
  const { firebaseUser, tradingAccounts, activeAccount, riskPolicy, trades, challengeCycles } =
    useMentorship();

  const [accountId, setAccountId] = useState(activeAccount?.id || tradingAccounts[0]?.id || '');
  const [challengeCycleId, setChallengeCycleId] = useState('');
  const [instrument, setInstrument] = useState('EURUSD');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [status, setStatus] = useState<TradeStatus>('closed');
  const [session, setSession] = useState<TradeSession>('London');
  const [timeframe, setTimeframe] = useState('H1');
  const [strategy, setStrategy] = useState(STRATEGY_OPTIONS[0]);
  const [setupGrade, setSetupGrade] = useState<'A+' | 'A' | 'B' | 'C' | ''>('A');
  const [emotionTag, setEmotionTag] = useState<EmotionalState | ''>('calm');
  const [mistakeTags, setMistakeTags] = useState<string[]>([]);
  const [partialCloseNotes, setPartialCloseNotes] = useState('');
  const [marketCondition, setMarketCondition] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [plannedRiskPercent, setPlannedRiskPercent] = useState('1.0');
  const [commission, setCommission] = useState('0');
  const [swap, setSwap] = useState('0');
  const [grossPnlOverride, setGrossPnlOverride] = useState('');
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().slice(0, 16));
  const [closedAt, setClosedAt] = useState(new Date().toISOString().slice(0, 16));
  const [entryJustification, setEntryJustification] = useState('');
  const [exitJustification, setExitJustification] = useState('');
  const [observations, setObservations] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [planFollowed, setPlanFollowed] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (existingTrade) {
      setAccountId(existingTrade.accountId);
      setChallengeCycleId(existingTrade.challengeCycleId || '');
      setInstrument(existingTrade.instrument);
      setDirection(existingTrade.direction);
      setStatus(existingTrade.status);
      setSession(existingTrade.session);
      setTimeframe(existingTrade.timeframe || 'H1');
      setStrategy(existingTrade.strategy);
      setSetupGrade(existingTrade.setupGrade || '');
      setEmotionTag(existingTrade.emotionTag || '');
      setMistakeTags(existingTrade.mistakeTags || []);
      setPartialCloseNotes(existingTrade.partialCloseNotes || '');
      setMarketCondition(existingTrade.marketCondition || 'Trending');
      setEntryPrice(String(existingTrade.entryPrice));
      setStopLoss(String(existingTrade.stopLoss));
      setTakeProfit(existingTrade.takeProfit ? String(existingTrade.takeProfit) : '');
      setExitPrice(existingTrade.exitPrice ? String(existingTrade.exitPrice) : '');
      setLotSize(String(existingTrade.lotSize));
      setPlannedRiskPercent(String(existingTrade.plannedRiskPercent));
      setCommission(String(existingTrade.commission ?? 0));
      setSwap(String(existingTrade.swap ?? 0));
      setGrossPnlOverride(existingTrade.grossPnl !== undefined ? String(existingTrade.grossPnl) : '');
      setOpenedAt(existingTrade.openedAt.slice(0, 16));
      setClosedAt(existingTrade.closedAt ? existingTrade.closedAt.slice(0, 16) : '');
      setEntryJustification(existingTrade.entryJustification || '');
      setExitJustification(existingTrade.exitJustification || '');
      setObservations(existingTrade.observations || '');
      setLessonsLearned(existingTrade.lessonsLearned || '');
      setPlanFollowed(existingTrade.planFollowed);
    } else {
      const defAcc = activeAccount || tradingAccounts[0];
      setAccountId(defAcc?.id || '');
      const activeCyc = challengeCycles.find((c) => c.status === 'active');
      setChallengeCycleId(activeCyc?.id || '');
      setInstrument('EURUSD');
      setDirection('BUY');
      setStatus('closed');
      setSession('London');
      setTimeframe('H1');
      setStrategy(STRATEGY_OPTIONS[0]);
      setSetupGrade('A');
      setEmotionTag('calm');
      setMistakeTags([]);
      setPartialCloseNotes('');
      setMarketCondition('');
      setEntryPrice('');
      setStopLoss('');
      setTakeProfit('');
      setExitPrice('');
      setLotSize('');
      setPlannedRiskPercent(String(riskPolicy.maxRiskPerTradePercent || 1.0));
      setCommission('0');
      setSwap('0');
      setGrossPnlOverride('');
      setOpenedAt(new Date().toISOString().slice(0, 16));
      setClosedAt(new Date().toISOString().slice(0, 16));
      setEntryJustification('');
      setExitJustification('');
      setObservations('');
      setLessonsLearned('');
      setPlanFollowed(true);
    }
  }, [open, existingTrade, activeAccount, tradingAccounts, challengeCycles, riskPolicy]);

  const selectedAccount = useMemo(
    () => tradingAccounts.find((a) => a.id === accountId) || tradingAccounts[0],
    [tradingAccounts, accountId]
  );

  const accountBalance = existingTrade
    ? existingTrade.accountBalanceAtEntry
    : selectedAccount?.currentBalance || 0;

  const sizing = useMemo(
    () =>
      calculatePositionSizing({
        instrument,
        direction,
        accountBalance,
        riskPercent: Number(plannedRiskPercent) || 0,
        entryPrice: Number(entryPrice) || 0,
        stopLoss: Number(stopLoss) || 0,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
        lotSizeOverride: Number(lotSize) || undefined,
        accountType: selectedAccount?.accountType,
      }),
    [
      instrument,
      direction,
      accountBalance,
      plannedRiskPercent,
      entryPrice,
      stopLoss,
      takeProfit,
      lotSize,
      selectedAccount?.accountType,
    ]
  );

  const realizedPreview = useMemo(
    () =>
      calculateRealizedTradeMetrics({
        instrument,
        direction,
        entryPrice: Number(entryPrice) || 0,
        stopLoss: Number(stopLoss) || 0,
        exitPrice: exitPrice ? Number(exitPrice) : undefined,
        lotSize: Number(lotSize) || 0,
        accountBalanceAtEntry: accountBalance,
        plannedRiskPercent: Number(plannedRiskPercent) || 0,
        commission: Number(commission) || 0,
        swap: Number(swap) || 0,
        grossPnlOverride: grossPnlOverride !== '' ? Number(grossPnlOverride) : undefined,
        accountType: selectedAccount?.accountType,
      }),
    [
      instrument,
      direction,
      entryPrice,
      stopLoss,
      exitPrice,
      lotSize,
      accountBalance,
      plannedRiskPercent,
      commission,
      swap,
      grossPnlOverride,
      selectedAccount?.accountType,
    ]
  );

  const setupPrediction = useMemo(
    () =>
      evaluatePlannedSetupPrediction({
        trades,
        instrument,
        direction,
        session,
        timeframe,
        strategy,
        emotionTag: emotionTag || undefined,
        plannedRiskPercent: Number(plannedRiskPercent) || 0,
        riskPolicy,
      }),
    [trades, instrument, direction, session, timeframe, strategy, emotionTag, plannedRiskPercent, riskPolicy]
  );

  const riskWarning =
    Number(plannedRiskPercent) > riskPolicy.maxRiskPerTradePercent ||
    (sizing.actualRiskPercent !== null && sizing.actualRiskPercent > riskPolicy.maxRiskPerTradePercent);

  if (!open) return null;

  const toggleMistakeTag = (tag: string) => {
    setMistakeTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : prev.length < 10 ? [...prev, tag] : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !selectedAccount) {
      setError('Create a trading account first before logging a trade.');
      return;
    }
    if (!(Number(entryPrice) > 0) || !(Number(stopLoss) > 0) || !(Number(lotSize) > 0)) {
      setError('Entry price, stop-loss, and lot size must be positive numbers.');
      return;
    }
    if (status === 'closed' && !exitPrice && grossPnlOverride === '') {
      setError('For closed trades, enter an Exit Price or Gross P/L.');
      return;
    }

    if (!(accountBalance > 0)) {
      setError('Selected trading account must have a positive balance.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveTradeRecord({
        existingTrade: existingTrade || undefined,
        userId: firebaseUser.uid,
        account: selectedAccount,
        riskPolicy,
        allUserTrades: trades,
        riskRewardRatio: sizing.riskRewardRatio ?? undefined,
        form: {
          challengeCycleId: challengeCycleId || undefined,
          instrument,
          direction,
          entryPrice: Number(entryPrice),
          stopLoss: Number(stopLoss),
          takeProfit: takeProfit ? Number(takeProfit) : undefined,
          exitPrice: exitPrice ? Number(exitPrice) : undefined,
          lotSize: Number(lotSize),
          accountBalanceAtEntry: accountBalance,
          plannedRiskPercent: Number(plannedRiskPercent) || 0,
          commission: Number(commission) || 0,
          swap: Number(swap) || 0,
          grossPnlOverride: grossPnlOverride !== '' ? Number(grossPnlOverride) : undefined,
          session,
          timeframe: timeframe || undefined,
          strategy,
          setupGrade: setupGrade || undefined,
          emotionTag: emotionTag || undefined,
          mistakeTags,
          partialCloseNotes: partialCloseNotes.trim() || undefined,
          marketCondition,
          status,
          openedAt: new Date(openedAt).toISOString(),
          closedAt: status === 'closed' && closedAt ? new Date(closedAt).toISOString() : undefined,
          entryJustification,
          exitJustification,
          observations,
          lessonsLearned,
          planFollowed,
        },
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save trade record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {existingTrade ? `Edit Trade · ${existingTrade.instrument}` : 'Log Manual Trade Record'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {existingTrade
                ? `Edits preserve an immutable audit trail (Edit #${existingTrade.editCount + 1}).`
                : 'Broker-independent manual entry with automated pip, risk, and R-multiple calculations.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {riskWarning && status !== 'draft' && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Risk Policy Threshold Warning:</span> Your planned or lot-adjusted risk exceeds the programme threshold of{' '}
                {riskPolicy.maxRiskPerTradePercent}% per trade. Saving this trade will log a risk violation and notify your mentor.
              </div>
            </div>
          )}

          {/* Account, Instrument, Direction, Status, Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Trading Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={Boolean(existingTrade)}
                className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                {tradingAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} · {formatAccountTypeLabel(acc.accountType)} ({formatPlainCurrency(acc.currentBalance, acc.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Instrument
              </label>
              <select
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                {Object.keys(INSTRUMENT_SPECS).map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800">
                {(['BUY', 'SELL'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setDirection(dir)}
                    className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      direction === dir
                        ? dir === 'BUY'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600 text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TradeStatus)}
                className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                <option value="planned">Planned</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Challenge Cycle
              </label>
              <select
                value={challengeCycleId}
                onChange={(e) => setChallengeCycleId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">None / General</option>
                {challengeCycles.map((cyc) => (
                  <option key={cyc.id} value={cyc.id}>
                    {cyc.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prices, Risk, Lot Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Entry Price *</label>
              <input
                type="number"
                step="any"
                required
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="0.00000"
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Stop-Loss *</label>
              <input
                type="number"
                step="any"
                required
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="0.00000"
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Take-Profit</label>
              <input
                type="number"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Optional"
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                Exit Price {status === 'closed' ? '*' : ''}
              </label>
              <input
                type="number"
                step="any"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder="0.00000"
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Planned Risk %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                value={plannedRiskPercent}
                onChange={(e) => setPlannedRiskPercent(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400">Lot Size *</label>
                {sizing.recommendedLotSize && (
                  <button
                    type="button"
                    onClick={() => setLotSize(String(sizing.recommendedLotSize))}
                    className="text-xs text-blue-500 hover:underline font-mono"
                  >
                    Use {sizing.recommendedLotSize}
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Live Automated Calculation Strip */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-slate-500 flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5" />
                Stop Distance
              </div>
              <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {sizing.stopLossPips !== null ? `${sizing.stopLossPips} pips` : 'Incomplete'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">TP Distance</div>
              <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {sizing.takeProfitPips !== null ? `${sizing.takeProfitPips} pips` : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Pip Value (1.00 lot)</div>
              <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {sizing.pipValuePerLot !== null ? `$${sizing.pipValuePerLot.toFixed(2)}/pip` : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Monetary Risk</div>
              <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {sizing.actualRiskAmount !== null
                  ? `${formatCurrency(-sizing.actualRiskAmount)} (${sizing.actualRiskPercent}%)`
                  : 'Incomplete'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Planned R:R</div>
              <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {sizing.riskRewardRatio !== null ? `1 : ${sizing.riskRewardRatio}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Projected Reward</div>
              <div className="font-mono font-semibold tabular-nums text-emerald-500 mt-0.5">
                {sizing.projectedRewardAmount !== null ? formatCurrency(sizing.projectedRewardAmount) : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Realized Net P/L</div>
              <div
                className={`font-mono font-semibold tabular-nums mt-0.5 ${
                  realizedPreview.netPnl === undefined
                    ? 'text-slate-400'
                    : realizedPreview.netPnl >= 0
                    ? 'text-emerald-500'
                    : 'text-red-500'
                }`}
              >
                {realizedPreview.netPnl !== undefined ? formatCurrency(realizedPreview.netPnl) : 'Pending'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Realized R-Multiple</div>
              <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                {realizedPreview.rMultiple !== undefined ? `${realizedPreview.rMultiple}R` : '—'}
              </div>
            </div>
          </div>

          {/* Session, Timeframe, Strategy, Setup Grade, Emotion, Timestamps, Commission/Swap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Trading Session</label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value as TradeSession)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                <option value="London">London</option>
                <option value="New York">New York</option>
                <option value="Overlap">London / NY Overlap</option>
                <option value="Tokyo">Tokyo</option>
                <option value="Sydney">Sydney</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Chart Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                {TIMEFRAME_OPTIONS.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Trading Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                {STRATEGY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Setup Grade</label>
              <select
                value={setupGrade}
                onChange={(e) => setSetupGrade(e.target.value as 'A+' | 'A' | 'B' | 'C' | '')}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Unspecified</option>
                {SETUP_GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Execution Emotion</label>
              <select
                value={emotionTag}
                onChange={(e) => setEmotionTag(e.target.value as EmotionalState | '')}
                className="w-full px-3 py-2 text-xs capitalize rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Unspecified</option>
                {TRADE_EMOTIONS.map((em) => (
                  <option key={em} value={em}>
                    {em}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Market Conditions</label>
              <input
                type="text"
                value={marketCondition}
                onChange={(e) => setMarketCondition(e.target.value)}
                placeholder="Trending / Ranging / High Volatility"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Opened Date & Time</label>
              <input
                type="datetime-local"
                required
                value={openedAt}
                onChange={(e) => setOpenedAt(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {status === 'closed' && (
              <>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Closed Date & Time</label>
                  <input
                    type="datetime-local"
                    value={closedAt}
                    onChange={(e) => setClosedAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Gross P/L Override (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={grossPnlOverride}
                    onChange={(e) => setGrossPnlOverride(e.target.value)}
                    placeholder="Auto from exit price"
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Commission ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Swap ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={swap}
                    onChange={(e) => setSwap(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </>
            )}
          </div>

          {/* Live Historical Record Reader & Setup Prediction Guidance */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                Setup Prediction from Your Manual Records
              </span>
              <span
                className={`font-semibold ${
                  setupPrediction.verdict === 'Favorable Setup'
                    ? 'text-emerald-500'
                    : setupPrediction.verdict === 'Caution Advised'
                    ? 'text-amber-500'
                    : 'text-blue-500'
                }`}
              >
                {setupPrediction.verdict}
                {setupPrediction.predictedWinRate !== null
                  ? ` · ${setupPrediction.predictedWinRate}% Hist. Win Rate`
                  : ''}
                {setupPrediction.expectedRMultiple !== null
                  ? ` · ${setupPrediction.expectedRMultiple}R Avg`
                  : ''}
              </span>
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              Basis: {setupPrediction.matchScopeLabel}
            </div>
            <ul className="space-y-1 text-slate-600 dark:text-slate-300">
              {setupPrediction.notes.map((n, idx) => (
                <li key={idx}>· {n}</li>
              ))}
            </ul>
          </div>

          {/* Mistake Tagging & Partial Close Notes */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                Execution Mistakes (Optional — select any that occurred)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {MISTAKE_TAG_OPTIONS.map((tag) => {
                  const active = mistakeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleMistakeTag(tag)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                        active
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                          : 'bg-slate-50 dark:bg-[#0B111E] border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Partial Close / Trade Management Notes (Optional)
              </label>
              <input
                type="text"
                value={partialCloseNotes}
                onChange={(e) => setPartialCloseNotes(e.target.value)}
                placeholder="e.g. Closed 50% at +1.5R, moved SL to breakeven..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Journal Reasoning & Discipline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Entry Justification (Market Structure / Confirmation)
              </label>
              <textarea
                rows={2}
                value={entryJustification}
                onChange={(e) => setEntryJustification(e.target.value)}
                placeholder="Explain HTF bias, liquidity sweep, BOS/CHoCH, or entry trigger..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Exit Justification
              </label>
              <textarea
                rows={2}
                value={exitJustification}
                onChange={(e) => setExitJustification(e.target.value)}
                placeholder="Hit full target, trailed stop, or manual exit reason..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Personal Observations
              </label>
              <textarea
                rows={2}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Execution discipline, patience, spread/slippage notes..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Lessons Learned
              </label>
              <textarea
                rows={2}
                value={lessonsLearned}
                onChange={(e) => setLessonsLearned(e.target.value)}
                placeholder="Key takeaway to reinforce or refine..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={planFollowed}
                onChange={(e) => setPlanFollowed(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
              />
              I followed my written trading plan and risk rules for this trade
            </label>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
              >
                {saving ? 'Saving Record...' : existingTrade ? 'Save Changes (Logged)' : 'Save Trade Record'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
