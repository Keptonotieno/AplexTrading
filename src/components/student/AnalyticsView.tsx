import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Plus,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMentorship } from '../../context/MentorshipContext';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import { formatCurrency, formatPlainCurrency } from '../../lib/forexCalculations';
import { createTradingAccount, recordAccountTransaction } from '../../services/mentorshipService';
import type { TradingAccount } from '../../types/domain';

export const AnalyticsView: React.FC = () => {
  const {
    firebaseUser,
    tradingAccounts,
    activeAccount,
    transactions,
    trades,
    metrics,
    theme,
  } = useMentorship();

  const [tab, setTab] = useState<'performance' | 'accounts' | 'calendar'>('performance');
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<TradingAccount['accountType']>('demo');
  const [accCurrency, setAccCurrency] = useState<TradingAccount['currency']>('USD');
  const [accBalance, setAccBalance] = useState('');
  const [accBroker, setAccBroker] = useState('');

  const [txAccountId, setTxAccountId] = useState(activeAccount?.id || tradingAccounts[0]?.id || '');
  const [txType, setTxType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const currency = activeAccount?.currency || 'USD';

  const calendarDays = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number }>();
    trades
      .filter((t) => t.status === 'closed' && typeof t.netPnl === 'number')
      .forEach((t) => {
        const day = (t.closedAt || t.openedAt).slice(0, 10);
        const cur = map.get(day) || { pnl: 0, count: 0 };
        cur.pnl += t.netPnl ?? 0;
        cur.count++;
        map.set(day, cur);
      });
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 35);
  }, [trades]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !accName.trim()) return;
    setBusy(true);
    try {
      await createTradingAccount({
        userId: firebaseUser.uid,
        name: accName.trim(),
        currency: accCurrency,
        brokerName: accBroker.trim() || undefined,
        accountType: accType,
        initialBalance: Number(accBalance) || 0,
        isDefault: tradingAccounts.length === 0,
      });
      setAccName('');
      setAccBalance('');
      setAccBroker('');
      setShowNewAccount(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRecordTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAcc = tradingAccounts.find((a) => a.id === txAccountId) || tradingAccounts[0];
    if (!firebaseUser || !targetAcc || !(Number(txAmount) > 0)) return;
    setBusy(true);
    try {
      await recordAccountTransaction({
        userId: firebaseUser.uid,
        account: targetAcc,
        type: txType,
        amount: Number(txAmount),
        notes: txNotes.trim() || undefined,
        occurredAt: new Date(txDate).toISOString(),
      });
      setTxAmount('');
      setTxNotes('');
    } finally {
      setBusy(false);
    }
  };

  const gridColor = theme === 'dark' ? '#1E293B' : '#E2E8F0';
  const tickColor = theme === 'dark' ? '#94A3B8' : '#64748B';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Performance Analytics & Capital
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Capital-adjusted returns strictly separated from deposits/withdrawals · Real database telemetry
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
          {([
            ['performance', 'Analytics'],
            ['accounts', 'Accounts & Capital'],
            ['calendar', 'Trading Calendar'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === id
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'performance' && (
        <>
          {/* Detailed Quantitative Scorecard */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              ['Gross Profit', formatCurrency(metrics.totalGrossProfit, currency), 'text-emerald-500'],
              ['Gross Loss', formatCurrency(-metrics.totalGrossLoss, currency), 'text-red-500'],
              ['Net Trading P/L', formatCurrency(metrics.netPnl, currency), metrics.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500'],
              ['Profit Factor', metrics.profitFactor !== null ? metrics.profitFactor.toFixed(2) : '—', 'text-slate-900 dark:text-white'],
              ['Expectancy', formatCurrency(metrics.expectancy, currency), metrics.expectancy >= 0 ? 'text-emerald-500' : 'text-red-500'],
              ['Avg R-Multiple', metrics.avgRMultiple !== null ? `${metrics.avgRMultiple.toFixed(2)}R` : '—', 'text-blue-500'],
              ['Avg Win', formatCurrency(metrics.avgWin, currency), 'text-emerald-500'],
              ['Avg Loss', formatCurrency(-metrics.avgLoss, currency), 'text-red-500'],
              ['Max Drawdown', `${metrics.maxDrawdownPercent.toFixed(2)}%`, 'text-red-500'],
              ['Win / Loss Streak', `${metrics.maxConsecutiveWins}W / ${metrics.maxConsecutiveLosses}L`, 'text-slate-900 dark:text-white'],
              ['Avg Duration', metrics.avgDurationHours !== null ? `${metrics.avgDurationHours.toFixed(1)}h` : '—', 'text-slate-900 dark:text-white'],
              ['Overall Score', `${metrics.scores.overall.toFixed(0)} / 100`, 'text-blue-500'],
            ].map(([label, val, tone]) => (
              <div
                key={label}
                className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4"
              >
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
                <div className={`text-base font-bold font-mono tabular-nums mt-1.5 ${tone}`}>{val}</div>
              </div>
            ))}
          </div>

          {/* Equity Curve & Drawdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Equity Curve Progression
              </h2>
              <div className="h-60">
                {metrics.equitySeries.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.equitySeries}>
                      <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: tickColor }}
                        tickFormatter={(d) => formatFirestoreDate(d).replace(/, \d{4}$/, '')}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: tickColor }}
                        tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                      />
                      <Tooltip
                        formatter={(v: unknown) => [formatPlainCurrency(Number(v), currency), 'Equity']}
                        labelFormatter={(l) => formatFirestoreDate(l)}
                      />
                      <Area type="monotone" dataKey="equity" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.18} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Record closed trades to generate equity curve data.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Drawdown Depth (%)
              </h2>
              <div className="h-60">
                {metrics.equitySeries.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.equitySeries}>
                      <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: tickColor }}
                        tickFormatter={(d) => formatFirestoreDate(d).replace(/, \d{4}$/, '')}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: tickColor }}
                        tickFormatter={(v) => `${v}%`}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                      />
                      <Tooltip formatter={(v: unknown) => [`${v}%`, 'Drawdown']} />
                      <Area type="monotone" dataKey="drawdownPercent" stroke="#EF4444" fill="#EF4444" fillOpacity={0.18} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Drawdown chart populates once closed trades exist.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instrument & Strategy Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Instrument Performance (Net P/L)
              </h2>
              <div className="h-56">
                {metrics.instrumentBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.instrumentBreakdown}>
                      <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="instrument" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} width={54} />
                      <Tooltip formatter={(v: unknown) => [formatCurrency(Number(v), currency), 'Net P/L']} />
                      <Bar dataKey="netPnl" radius={[4, 4, 0, 0]}>
                        {metrics.instrumentBreakdown.map((entry, idx) => (
                          <Cell key={idx} fill={entry.netPnl >= 0 ? '#10B981' : '#EF4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No instrument breakdown available yet.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Strategy Performance Breakdown
              </h2>
              {metrics.strategyBreakdown.length === 0 ? (
                <p className="text-xs text-slate-500 py-16 text-center">
                  Log closed trades to compare win rate and profitability by strategy.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="pb-2">Strategy</th>
                        <th className="pb-2 text-right">Trades</th>
                        <th className="pb-2 text-right">Win Rate</th>
                        <th className="pb-2 text-right">Net P/L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {metrics.strategyBreakdown.map((s) => (
                        <tr key={s.strategy}>
                          <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {s.strategy}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums">{s.trades}</td>
                          <td className="py-2.5 text-right font-mono tabular-nums">{s.winRate}%</td>
                          <td
                            className={`py-2.5 text-right font-mono tabular-nums font-semibold ${
                              s.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}
                          >
                            {formatCurrency(s.netPnl, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'accounts' && (
        <div className="space-y-6">
          {/* Capital Separation Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="text-xs text-slate-500">Initial Capital</div>
              <div className="text-lg font-bold font-mono tabular-nums mt-1.5">
                {formatPlainCurrency(metrics.initialCapital, currency)}
              </div>
            </div>
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="text-xs text-slate-500">Deposits / Withdrawals</div>
              <div className="text-lg font-bold font-mono tabular-nums mt-1.5 text-blue-500">
                +{formatPlainCurrency(metrics.totalDeposits, currency)} / -{formatPlainCurrency(metrics.totalWithdrawals, currency)}
              </div>
            </div>
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="text-xs text-slate-500">Realized Trading P/L</div>
              <div className={`text-lg font-bold font-mono tabular-nums mt-1.5 ${metrics.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(metrics.netPnl, currency)}
              </div>
            </div>
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="text-xs text-slate-500">Current Reported Balance</div>
              <div className="text-lg font-bold font-mono tabular-nums mt-1.5">
                {formatPlainCurrency(metrics.currentAccountBalance, currency)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
            {/* Accounts List & Add Account */}
            <div className="lg:col-span-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  Trading Accounts ({tradingAccounts.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNewAccount((v) => !v)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Account
                </button>
              </div>

              {showNewAccount && (
                <form
                  onSubmit={handleCreateAccount}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      placeholder="Account label (e.g. Prop Phase 1)"
                      className="col-span-2 px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                    />
                    <select
                      value={accType}
                      onChange={(e) => setAccType(e.target.value as TradingAccount['accountType'])}
                      className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                    >
                      <option value="demo">Demo</option>
                      <option value="live">Live Personal</option>
                      <option value="prop_challenge">Prop Challenge</option>
                      <option value="funded">Funded</option>
                    </select>
                    <select
                      value={accCurrency}
                      onChange={(e) => setAccCurrency(e.target.value as TradingAccount['currency'])}
                      className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={accBalance}
                      onChange={(e) => setAccBalance(e.target.value)}
                      placeholder="Initial balance"
                      className="px-3 py-2 text-xs font-mono rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                    />
                    <input
                      type="text"
                      value={accBroker}
                      onChange={(e) => setAccBroker(e.target.value)}
                      placeholder="Broker name (descriptive)"
                      className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Create Account
                  </button>
                </form>
              )}

              <div className="space-y-2.5">
                {tradingAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {acc.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {acc.accountType.replace('_', ' ')} · {acc.currency}
                        {acc.brokerName ? ` · ${acc.brokerName}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {formatPlainCurrency(acc.currentBalance, acc.currency)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Init: {formatPlainCurrency(acc.initialBalance, acc.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Record Deposit / Withdrawal */}
            <div className="lg:col-span-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Record Deposit or Withdrawal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Capital transfers adjust your balance accurately without distorting trading win rate or profit factor.
              </p>

              <form onSubmit={handleRecordTx} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={txAccountId || tradingAccounts[0]?.id || ''}
                  onChange={(e) => setTxAccountId(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                >
                  {tradingAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as 'deposit' | 'withdrawal')}
                  className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                >
                  <option value="deposit">Deposit (+)</option>
                  <option value="withdrawal">Withdrawal (-)</option>
                </select>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="Amount"
                  className="px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                />
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="px-3 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                />
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="Reference note (optional)"
                  className="sm:col-span-2 px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                />
                <button
                  type="submit"
                  disabled={busy || tradingAccounts.length === 0}
                  className="sm:col-span-2 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Record Capital Transaction
                </button>
              </form>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2 max-h-56 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-xs text-slate-500">No deposits or withdrawals recorded.</p>
                ) : (
                  transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60"
                    >
                      <div className="flex items-center gap-2">
                        {tx.type === 'deposit' ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span className="capitalize font-medium">{tx.type}</span>
                        <span className="text-slate-500">{formatFirestoreDate(tx.occurredAt)}</span>
                      </div>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          tx.type === 'deposit' ? 'text-emerald-500' : 'text-amber-500'
                        }`}
                      >
                        {tx.type === 'deposit' ? '+' : '-'}
                        {formatPlainCurrency(tx.amount, currency)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Daily Trading Activity Calendar
            </h2>
          </div>

          {calendarDays.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">
              Close trades to populate your daily profit/loss calendar.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {calendarDays.map(([date, info]) => (
                <div
                  key={date}
                  className={`p-3 rounded-lg border text-xs ${
                    info.pnl > 0
                      ? 'bg-emerald-500/10 border-emerald-500/25'
                      : info.pnl < 0
                      ? 'bg-red-500/10 border-red-500/25'
                      : 'bg-slate-50 dark:bg-[#0B111E] border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {date}
                  </div>
                  <div
                    className={`font-mono font-bold tabular-nums mt-1 ${
                      info.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {formatCurrency(info.pnl, currency)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {info.count} trade{info.count === 1 ? '' : 's'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
