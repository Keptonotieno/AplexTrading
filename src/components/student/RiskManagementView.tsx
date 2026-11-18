import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import {
  calculatePositionSizing,
  formatCurrency,
  formatPlainCurrency,
  getAccountContractScale,
  INSTRUMENT_SPECS,
} from '../../lib/forexCalculations';
import { acknowledgeViolation } from '../../services/mentorshipService';
import type { TradeDirection } from '../../types/domain';

export const RiskManagementView: React.FC = () => {
  const { activeAccount, riskPolicy, riskViolations, metrics } = useMentorship();

  const [instrument, setInstrument] = useState('EURUSD');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [balance, setBalance] = useState(
    activeAccount?.currentBalance ? String(activeAccount.currentBalance) : ''
  );
  const [riskPercent, setRiskPercent] = useState(String(riskPolicy.maxRiskPerTradePercent || 1));
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  useEffect(() => {
    if (activeAccount?.currentBalance) {
      setBalance(String(activeAccount.currentBalance));
    }
  }, [activeAccount?.id, activeAccount?.currentBalance]);

  useEffect(() => {
    if (riskPolicy?.maxRiskPerTradePercent) {
      setRiskPercent(String(riskPolicy.maxRiskPerTradePercent));
    }
  }, [riskPolicy?.maxRiskPerTradePercent]);

  const calc = useMemo(
    () =>
      calculatePositionSizing({
        instrument,
        direction,
        accountBalance: Number(balance) || 0,
        riskPercent: Number(riskPercent) || 0,
        entryPrice: Number(entryPrice) || 0,
        stopLoss: Number(stopLoss) || 0,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
        accountType: activeAccount?.accountType,
        customContractScale: activeAccount?.customContractScale,
      }),
    [
      instrument,
      direction,
      balance,
      riskPercent,
      entryPrice,
      stopLoss,
      takeProfit,
      activeAccount?.accountType,
      activeAccount?.customContractScale,
    ]
  );

  const spec = INSTRUMENT_SPECS[instrument];
  const exceedsPerTrade = Number(riskPercent) > riskPolicy.maxRiskPerTradePercent;
  const currency = activeAccount?.currency || 'USD';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Risk Management & Position Sizing
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Instrument-specific contract calculations, live exposure monitoring, and mentorship policy compliance
        </p>
      </div>

      {/* Live Risk Exposure & Drawdown Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {(() => {
          const dailyUsedPct =
            riskPolicy.maxDailyLossPercent > 0
              ? Math.min(100, (metrics.dailyLossPercent / riskPolicy.maxDailyLossPercent) * 100)
              : 0;
          const dailyRemaining = Math.max(0, riskPolicy.maxDailyLossPercent - metrics.dailyLossPercent);
          const ddUsedPct =
            riskPolicy.maxDrawdownPercent > 0
              ? Math.min(100, (metrics.maxDrawdownPercent / riskPolicy.maxDrawdownPercent) * 100)
              : 0;
          const ddRemaining = Math.max(0, riskPolicy.maxDrawdownPercent - metrics.maxDrawdownPercent);
          const openUsedPct =
            riskPolicy.maxOpenExposurePercent > 0
              ? Math.min(100, (metrics.openExposurePercent / riskPolicy.maxOpenExposurePercent) * 100)
              : 0;
          const streakPct =
            riskPolicy.maxConsecutiveLosses > 0
              ? Math.min(100, (metrics.currentConsecutiveLosses / riskPolicy.maxConsecutiveLosses) * 100)
              : 0;

          return (
            <>
              <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Daily Loss Monitor</span>
                  <span className="font-mono">Limit: {riskPolicy.maxDailyLossPercent}%</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-2xl font-bold font-mono tabular-nums ${
                      metrics.dailyLossPercent >= riskPolicy.maxDailyLossPercent
                        ? 'text-red-500'
                        : metrics.dailyLossPercent >= riskPolicy.maxDailyLossPercent * 0.7
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                    }`}
                  >
                    {metrics.dailyLossPercent.toFixed(2)}%
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Buffer: {dailyRemaining.toFixed(2)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      dailyUsedPct >= 90 ? 'bg-red-500' : dailyUsedPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${dailyUsedPct}%` }}
                  />
                </div>
                <div className="text-xs font-mono text-slate-500">
                  Today P/L: {formatCurrency(metrics.todayNetPnl, currency)}
                </div>
              </div>

              <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Open Risk Exposure</span>
                  <span className="font-mono">Limit: {riskPolicy.maxOpenExposurePercent}%</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-2xl font-bold font-mono tabular-nums ${
                      metrics.openExposurePercent > riskPolicy.maxOpenExposurePercent
                        ? 'text-amber-500'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {metrics.openExposurePercent.toFixed(2)}%
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {metrics.openTradesCount} open
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      openUsedPct >= 100 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${openUsedPct}%` }}
                  />
                </div>
                <div className="text-xs font-mono text-slate-500">
                  Headroom: {Math.max(0, riskPolicy.maxOpenExposurePercent - metrics.openExposurePercent).toFixed(2)}%
                </div>
              </div>

              <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Max Drawdown</span>
                  <span className="font-mono">Limit: {riskPolicy.maxDrawdownPercent}%</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-2xl font-bold font-mono tabular-nums ${
                      metrics.maxDrawdownPercent >= riskPolicy.maxDrawdownPercent
                        ? 'text-red-500'
                        : metrics.maxDrawdownPercent >= riskPolicy.maxDrawdownPercent * 0.75
                        ? 'text-amber-500'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {metrics.maxDrawdownPercent.toFixed(2)}%
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Buffer: {ddRemaining.toFixed(2)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      ddUsedPct >= 90 ? 'bg-red-500' : ddUsedPct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${ddUsedPct}%` }}
                  />
                </div>
                <div className="text-xs font-mono text-slate-500">
                  Current: {metrics.currentDrawdownPercent.toFixed(2)}% · Peak {formatPlainCurrency(metrics.peakEquity, currency)}
                </div>
              </div>

              <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Consecutive Losses</span>
                  <span className="font-mono">Limit: {riskPolicy.maxConsecutiveLosses}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-2xl font-bold font-mono tabular-nums ${
                      metrics.currentConsecutiveLosses >= riskPolicy.maxConsecutiveLosses
                        ? 'text-amber-500'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {metrics.currentConsecutiveLosses}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {metrics.currentConsecutiveWins > 0
                      ? `${metrics.currentConsecutiveWins}W streak`
                      : `Max L: ${metrics.maxConsecutiveLosses}`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      streakPct >= 100 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${streakPct}%` }}
                  />
                </div>
                <div className="text-xs font-mono text-slate-500">
                  Compliance: {metrics.riskComplianceRate.toFixed(0)}%
                </div>
              </div>
            </>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Interactive Position Size Calculator */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-500" />
              Position Size & Lot Calculator
            </h2>
            {spec && (
              <span className="text-xs font-mono text-slate-500">
                Contract: {(spec.contractSize * getAccountContractScale(activeAccount?.accountType, activeAccount?.customContractScale)).toLocaleString()} · Pip: {spec.pipSize}
                {activeAccount?.accountType === 'cent'
                  ? ' (Cent)'
                  : activeAccount?.accountType === 'custom'
                  ? ` (${activeAccount.customTypeLabel || 'Custom'})`
                  : ''}
              </span>
            )}
          </div>

          {exceedsPerTrade && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Configured risk ({riskPercent}%) exceeds the programme guideline of {riskPolicy.maxRiskPerTradePercent}% per trade.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Instrument</label>
              <select
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              >
                {Object.keys(INSTRUMENT_SPECS).map((sym) => (
                  <option key={sym} value={sym}>
                    {sym} ({INSTRUMENT_SPECS[sym].category})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Direction</label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800">
                {(['BUY', 'SELL'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={`py-1 text-xs font-semibold rounded-md ${
                      direction === d
                        ? d === 'BUY'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600 text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Account Balance ({currency})</label>
              <input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="Enter balance"
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Risk Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Entry Price</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="0.00000"
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Stop-Loss Price</label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="0.00000"
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs text-slate-500 mb-1.5">Take-Profit Price (Optional)</label>
              <input
                type="number"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Optional target price"
                className="w-full px-3.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          {!calc.valid ? (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              {entryPrice || stopLoss
                ? calc.incompleteReason
                : 'Enter your account balance, entry price, and stop-loss price above to calculate recommended lot size and risk exposure.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-blue-600/10 border border-blue-500/20 space-y-1">
                <div className="text-xs text-slate-500 dark:text-slate-400">Recommended Lot Size</div>
                <div className="text-xl font-bold font-mono tabular-nums text-blue-500">
                  {calc.recommendedLotSize?.toFixed(2)} Lots
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {calc.recommendedUnits?.toLocaleString()} units
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-xs text-slate-500">Monetary Risk</div>
                <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatPlainCurrency(calc.actualRiskAmount, currency)}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {calc.stopLossPips} pips · ${calc.pipValuePerLot}/pip/lot
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-xs text-slate-500">Risk-to-Reward</div>
                <div className="text-xl font-bold font-mono tabular-nums text-emerald-500">
                  {calc.riskRewardRatio ? `1 : ${calc.riskRewardRatio}` : '—'}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {calc.projectedRewardAmount ? formatCurrency(calc.projectedRewardAmount, currency) : 'Set TP to project'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Programme Policy & Violation History */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              {riskPolicy.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Educational programme guidelines configured by your mentor. Exceeding thresholds automatically logs a review incident.
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Max Risk Per Trade</span>
                <span className="font-mono font-semibold">{riskPolicy.maxRiskPerTradePercent}%</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Daily Loss Threshold</span>
                <span className="font-mono font-semibold">{riskPolicy.maxDailyLossPercent}%</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Max Drawdown Threshold</span>
                <span className="font-mono font-semibold">{riskPolicy.maxDrawdownPercent}%</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Max Open Exposure</span>
                <span className="font-mono font-semibold">{riskPolicy.maxOpenExposurePercent}%</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Consecutive Loss Pause Limit</span>
                <span className="font-mono font-semibold">{riskPolicy.maxConsecutiveLosses} losses</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Risk Violation Log ({riskViolations.length})
            </h2>
            {riskViolations.length === 0 ? (
              <div className="py-4 text-xs text-emerald-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Zero risk policy breaches recorded.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {riskViolations.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-red-500">{v.policyRule}</span>
                      <span className="font-mono text-slate-400 whitespace-nowrap">
                        {formatFirestoreDate(v.createdAt)}
                      </span>
                    </div>
                    {!v.acknowledged && (
                      <button
                        type="button"
                        onClick={() => acknowledgeViolation(v.id)}
                        className="text-[11px] text-blue-500 hover:underline"
                      >
                        Acknowledge Incident
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
