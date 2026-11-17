import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, X } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import {
  calculatePositionSizing,
  calculateRealizedTradeMetrics,
  formatCurrency,
  INSTRUMENT_SPECS,
  STRATEGY_OPTIONS,
} from '../../lib/forexCalculations';
import { saveTradeRecord } from '../../services/mentorshipService';
import type { TradeDirection, TradeRecord, TradeSession, TradeStatus } from '../../types/domain';

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
  const [strategy, setStrategy] = useState(STRATEGY_OPTIONS[0]);
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
      setStrategy(existingTrade.strategy);
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
      setStrategy(STRATEGY_OPTIONS[0]);
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
      }),
    [instrument, direction, accountBalance, plannedRiskPercent, entryPrice, stopLoss, takeProfit, lotSize]
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
    ]
  );

  const riskWarning =
    Number(plannedRiskPercent) > riskPolicy.maxRiskPerTradePercent ||
    (sizing.actualRiskPercent !== null && sizing.actualRiskPercent > riskPolicy.maxRiskPerTradePercent);

  if (!open) return null;

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
          strategy,
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

          {/* Account, Cycle, Instrument, Direction, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Trading Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={Boolean(existingTrade)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                {tradingAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (${acc.currentBalance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Instrument
              </label>
              <select
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                {Object.keys(INSTRUMENT_SPECS).map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800">
                {(['BUY', 'SELL'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setDirection(dir)}
                    className={`py-1 text-xs font-semibold rounded-md transition-colors ${
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
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TradeStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                <option value="planned">Planned</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Challenge Cycle
              </label>
              <select
                value={challengeCycleId}
                onChange={(e) => setChallengeCycleId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Entry Price *</label>
              <input
                type="number"
                step="any"
                required
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="0.00000"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
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
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
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
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
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
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
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
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-500 dark:text-slate-400">Lot Size *</label>
                {sizing.recommendedLotSize && (
                  <button
                    type="button"
                    onClick={() => setLotSize(String(sizing.recommendedLotSize))}
                    className="text-[11px] text-blue-500 hover:underline font-mono"
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
                className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Live Automated Calculation Strip */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
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

          {/* Session, Strategy, Market Condition, Timestamps, Commission/Swap */}
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
