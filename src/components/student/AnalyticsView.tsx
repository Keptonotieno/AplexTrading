import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BrainCircuit,
  Calendar,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  Plus,
  SlidersHorizontal,
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
import { auth } from '../../lib/firebase';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import {
  ACCOUNT_TYPE_SPECS,
  computeManualRecordInsights,
  ENROLLMENT_AMOUNT_PRESETS,
  formatAccountTypeLabel,
  formatCurrency,
  formatPlainCurrency,
  getMinimumInitialBalance,
  type PeriodSummary,
} from '../../lib/forexCalculations';
import {
  createTradingAccount,
  recordAccountTransaction,
  updateTradingAccount,
} from '../../services/mentorshipService';
import type { TradingAccount } from '../../types/domain';

interface AiPatternReport {
  summary: string;
  predictions?: {
    nextTradeOutlook: string;
    recommendedSetupFocus: string;
    projectedWinRateRange: string;
    riskWatchTrigger: string;
    recordQualityFeedback: string;
  };
  strengths: string[];
  patterns: Array<{
    title: string;
    category: 'execution' | 'risk' | 'timing' | 'psychology' | 'strategy';
    severity: 'positive' | 'caution' | 'critical';
    evidence: string;
    recommendation: string;
  }>;
  psychologyInsights: string[];
  actionPlan: string[];
}

export const AnalyticsView: React.FC = () => {
  const {
    firebaseUser,
    studentProfile,
    tradingAccounts,
    activeAccount,
    transactions,
    trades,
    psychologyAssessments,
    riskViolations,
    riskPolicy,
    metrics,
    theme,
  } = useMentorship();

  const [tab, setTab] = useState<'performance' | 'accounts' | 'calendar' | 'ai'>('performance');
  const [comparisonMode, setComparisonMode] = useState<'30d' | 'month'>('30d');
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<TradingAccount['accountType']>('standard');
  const [accCustomLabel, setAccCustomLabel] = useState('');
  const [accScalePreset, setAccScalePreset] = useState<'1' | '0.1' | '0.01' | 'custom'>('1');
  const [accCustomScale, setAccCustomScale] = useState('1');
  const [accCurrency, setAccCurrency] = useState<TradingAccount['currency']>('USD');
  const [accBalance, setAccBalance] = useState('');
  const [accBroker, setAccBroker] = useState('');
  const [accIsDefault, setAccIsDefault] = useState(false);
  const [accError, setAccError] = useState<string | null>(null);

  const [txAccountId, setTxAccountId] = useState(activeAccount?.id || tradingAccounts[0]?.id || '');
  const [txType, setTxType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  // Interactive Monthly Calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // AI Pattern Recognition state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<AiPatternReport | null>(null);
  const [aiMeta, setAiMeta] = useState<{ generatedAt: string; tradesAnalyzed: number } | null>(null);

  const manualInsights = useMemo(
    () =>
      computeManualRecordInsights({
        trades,
        assessments: psychologyAssessments,
        riskPolicy,
      }),
    [trades, psychologyAssessments, riskPolicy]
  );

  const currency = activeAccount?.currency || 'USD';

  const dayTradeMap = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number; wins: number; items: typeof trades }>();
    trades
      .filter((t) => t.status !== 'draft')
      .forEach((t) => {
        const day = (t.closedAt || t.openedAt).slice(0, 10);
        const cur = map.get(day) || { pnl: 0, count: 0, wins: 0, items: [] };
        if (t.status === 'closed' && typeof t.netPnl === 'number') {
          cur.pnl += t.netPnl;
          if (t.netPnl > 0.005) cur.wins += 1;
        }
        cur.count += 1;
        cur.items.push(t);
        map.set(day, cur);
      });
    return map;
  }, [trades]);

  const calendarGrid = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Mon = 0 .. Sun = 6
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: Array<{ iso: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ iso: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ iso: `${year}-${mm}-${dd}`, dayNum: d });
    }

    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const activeMonthDays = Array.from(dayTradeMap.entries()).filter(([k]) =>
      k.startsWith(monthPrefix)
    );
    const monthNetPnl = activeMonthDays.reduce((s, [, v]) => s + v.pnl, 0);
    const bestDay = activeMonthDays.reduce<{ date: string; pnl: number } | null>(
      (best, [date, v]) => (!best || v.pnl > best.pnl ? { date, pnl: v.pnl } : best),
      null
    );
    const worstDay = activeMonthDays.reduce<{ date: string; pnl: number } | null>(
      (worst, [date, v]) => (!worst || v.pnl < worst.pnl ? { date, pnl: v.pnl } : worst),
      null
    );

    const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return {
      cells,
      monthLabel,
      tradingDaysCount: activeMonthDays.length,
      monthNetPnl,
      bestDay,
      worstDay,
    };
  }, [calendarMonth, dayTradeMap]);

  const selectedDayTrades = useMemo(
    () => dayTradeMap.get(selectedCalendarDate)?.items || [],
    [dayTradeMap, selectedCalendarDate]
  );

  const nonDraftCount = useMemo(
    () => trades.filter((t) => t.status !== 'draft').length,
    [trades]
  );

  const handleRunAiPatternAnalysis = async () => {
    setAiError(null);
    if (nonDraftCount === 0) {
      setAiError('Log at least one planned, open, or closed trade in your Trading Journal before running AI pattern analysis.');
      return;
    }
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      setAiError('Authentication token unavailable. Please sign in again.');
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/pattern-recognition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentName: studentProfile?.fullName || firebaseUser?.displayName || 'Trader',
          trades,
          assessments: psychologyAssessments,
          violations: riskViolations,
          metrics,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || `Analysis request failed (${res.status})`);
      }
      const analysis = (payload?.analysis ?? payload) as AiPatternReport;
      setAiReport(analysis);
      setAiMeta(
        payload?.generatedAt
          ? {
              generatedAt: String(payload.generatedAt),
              tradesAnalyzed: Number(payload.tradesAnalyzed || nonDraftCount),
            }
          : null
      );
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate AI pattern analysis.');
    } finally {
      setAiLoading(false);
    }
  };

  const openNewAccountForm = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('standard');
    setAccCustomLabel('');
    setAccScalePreset('1');
    setAccCustomScale('1');
    setAccCurrency('USD');
    setAccBalance('');
    setAccBroker('');
    setAccIsDefault(tradingAccounts.length === 0);
    setAccError(null);
    setShowNewAccount((v) => !v || Boolean(editingAccount));
  };

  const openEditAccountForm = (acc: TradingAccount) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.accountType);
    setAccCustomLabel(acc.customTypeLabel || '');
    const scaleStr = acc.customContractScale !== undefined ? String(acc.customContractScale) : '1';
    if (scaleStr === '1' || scaleStr === '0.1' || scaleStr === '0.01') {
      setAccScalePreset(scaleStr);
      setAccCustomScale(scaleStr);
    } else {
      setAccScalePreset('custom');
      setAccCustomScale(scaleStr);
    }
    setAccCurrency(acc.currency);
    setAccBalance(String(acc.initialBalance));
    setAccBroker(acc.brokerName || '');
    setAccIsDefault(acc.isDefault);
    setAccError(null);
    setShowNewAccount(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !accName.trim()) return;

    const resolvedScale =
      accType === 'custom'
        ? accScalePreset === 'custom'
          ? Number(accCustomScale)
          : Number(accScalePreset)
        : undefined;

    if (
      accType === 'custom' &&
      (!Number.isFinite(resolvedScale) || (resolvedScale ?? 0) <= 0 || (resolvedScale ?? 0) > 100)
    ) {
      setAccError('Custom contract scale must be a positive multiplier between 0.001 and 100.');
      return;
    }

    setBusy(true);
    setAccError(null);
    try {
      if (editingAccount) {
        await updateTradingAccount({
          userId: firebaseUser.uid,
          account: editingAccount,
          name: accName.trim(),
          currency: accCurrency,
          brokerName: accBroker.trim() || undefined,
          accountType: accType,
          customTypeLabel: accType === 'custom' ? accCustomLabel.trim() || undefined : undefined,
          customContractScale: resolvedScale,
          isDefault: accIsDefault,
          existingAccounts: tradingAccounts,
        });
      } else {
        const minRequired = getMinimumInitialBalance(accType);
        const parsedBal = Number(accBalance);
        if (!Number.isFinite(parsedBal) || parsedBal < minRequired) {
          setAccError(
            `${formatAccountTypeLabel(accType, accCustomLabel)} accounts require a minimum starting capital of $${minRequired}.00.`
          );
          setBusy(false);
          return;
        }
        await createTradingAccount({
          userId: firebaseUser.uid,
          name: accName.trim(),
          currency: accCurrency,
          brokerName: accBroker.trim() || undefined,
          accountType: accType,
          customTypeLabel: accType === 'custom' ? accCustomLabel.trim() || undefined : undefined,
          customContractScale: resolvedScale,
          initialBalance: parsedBal,
          isDefault: accIsDefault || tradingAccounts.length === 0,
          existingAccounts: tradingAccounts,
        });
      }
      setEditingAccount(null);
      setAccName('');
      setAccCustomLabel('');
      setAccScalePreset('1');
      setAccCustomScale('1');
      setAccBalance('');
      setAccBroker('');
      setShowNewAccount(false);
    } catch (err: unknown) {
      setAccError(err instanceof Error ? err.message : 'Unable to save trading account.');
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

  const activePeriodPair: [PeriodSummary, PeriodSummary] =
    comparisonMode === '30d'
      ? [metrics.periodComparison.current30d, metrics.periodComparison.prior30d]
      : [metrics.periodComparison.thisMonth, metrics.periodComparison.lastMonth];

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
            Capital-adjusted returns, historical period comparisons, monthly calendar, and AI pattern analysis
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
          {([
            ['performance', 'Analytics'],
            ['accounts', 'Accounts & Capital'],
            ['calendar', 'Trading Calendar'],
            ['ai', 'Patterns & Prediction'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
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
                className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                <div className={`text-lg font-bold font-mono tabular-nums mt-2 ${tone}`}>{val}</div>
              </div>
            ))}
          </div>

          {/* Historical Performance Comparisons */}
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Historical Performance Comparison
                </h2>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setComparisonMode('30d')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                    comparisonMode === '30d'
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Last 30d vs Prior 30d
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonMode('month')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                    comparisonMode === 'month'
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  This Month vs Last Month
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {(() => {
                const [cur, prev] = activePeriodPair;
                const wrDelta = Number((cur.winRate - prev.winRate).toFixed(1));
                const pnlDelta = cur.netPnl - prev.netPnl;
                const compDelta = Number((cur.complianceRate - prev.complianceRate).toFixed(1));
                const pfCur = cur.profitFactor !== null ? cur.profitFactor.toFixed(2) : '—';
                const pfPrev = prev.profitFactor !== null ? prev.profitFactor.toFixed(2) : '—';
                const rCur = cur.avgRMultiple !== null ? `${cur.avgRMultiple.toFixed(2)}R` : '—';
                const rPrev = prev.avgRMultiple !== null ? `${prev.avgRMultiple.toFixed(2)}R` : '—';

                const items = [
                  {
                    label: 'Net P/L',
                    current: formatCurrency(cur.netPnl, currency),
                    previous: formatCurrency(prev.netPnl, currency),
                    delta: `${pnlDelta >= 0 ? '+' : ''}${formatCurrency(pnlDelta, currency).replace(/^\+/, '')}`,
                    positive: pnlDelta >= 0,
                  },
                  {
                    label: 'Win Rate',
                    current: `${cur.winRate}%`,
                    previous: `${prev.winRate}%`,
                    delta: `${wrDelta >= 0 ? '+' : ''}${wrDelta}%`,
                    positive: wrDelta >= 0,
                  },
                  {
                    label: 'Closed Trades',
                    current: String(cur.trades),
                    previous: String(prev.trades),
                    delta: `${cur.trades - prev.trades >= 0 ? '+' : ''}${cur.trades - prev.trades}`,
                    positive: true,
                  },
                  {
                    label: 'Profit Factor',
                    current: pfCur,
                    previous: pfPrev,
                    delta:
                      cur.profitFactor !== null && prev.profitFactor !== null
                        ? `${cur.profitFactor - prev.profitFactor >= 0 ? '+' : ''}${(cur.profitFactor - prev.profitFactor).toFixed(2)}`
                        : '—',
                    positive:
                      cur.profitFactor !== null && prev.profitFactor !== null
                        ? cur.profitFactor >= prev.profitFactor
                        : true,
                  },
                  {
                    label: 'Avg R-Multiple',
                    current: rCur,
                    previous: rPrev,
                    delta:
                      cur.avgRMultiple !== null && prev.avgRMultiple !== null
                        ? `${cur.avgRMultiple - prev.avgRMultiple >= 0 ? '+' : ''}${(cur.avgRMultiple - prev.avgRMultiple).toFixed(2)}R`
                        : '—',
                    positive:
                      cur.avgRMultiple !== null && prev.avgRMultiple !== null
                        ? cur.avgRMultiple >= prev.avgRMultiple
                        : true,
                  },
                  {
                    label: 'Risk Compliance',
                    current: `${cur.complianceRate}%`,
                    previous: `${prev.complianceRate}%`,
                    delta: `${compDelta >= 0 ? '+' : ''}${compDelta}%`,
                    positive: compDelta >= 0,
                  },
                ];

                return items.map((item) => (
                  <div
                    key={item.label}
                    className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">{item.label}</span>
                      <span
                        className={`text-xs font-mono font-semibold ${
                          item.delta === '—'
                            ? 'text-slate-400'
                            : item.positive
                            ? 'text-emerald-500'
                            : 'text-red-500'
                        }`}
                      >
                        {item.delta}
                      </span>
                    </div>
                    <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {item.current}
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      {prev.label}: {item.previous}
                    </div>
                  </div>
                ));
              })()}
            </div>
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

          {/* Session, Day-of-Week & Timeframe Performance Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Trading Session & Timeframe Edge
              </h2>
              {metrics.sessionBreakdown.length === 0 ? (
                <p className="text-xs text-slate-500 py-10 text-center">
                  Close trades to identify your highest-expectancy trading sessions.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                          <th className="pb-2">Session</th>
                          <th className="pb-2 text-right">Trades</th>
                          <th className="pb-2 text-right">Win Rate</th>
                          <th className="pb-2 text-right">Avg R</th>
                          <th className="pb-2 text-right">Net P/L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {metrics.sessionBreakdown.map((ses) => (
                          <tr key={ses.session}>
                            <td className="py-2 font-medium text-slate-800 dark:text-slate-200">
                              {ses.session}
                            </td>
                            <td className="py-2 text-right font-mono tabular-nums">{ses.trades}</td>
                            <td className="py-2 text-right font-mono tabular-nums">{ses.winRate}%</td>
                            <td className="py-2 text-right font-mono tabular-nums">
                              {ses.avgRMultiple !== null ? `${ses.avgRMultiple}R` : '—'}
                            </td>
                            <td
                              className={`py-2 text-right font-mono tabular-nums font-semibold ${
                                ses.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                              }`}
                            >
                              {formatCurrency(ses.netPnl, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {metrics.timeframeBreakdown.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-medium text-slate-500 mb-2.5">By Entry Timeframe</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        {metrics.timeframeBreakdown.map((tf) => (
                          <div
                            key={tf.timeframe}
                            className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-mono font-semibold text-slate-900 dark:text-white">
                                {tf.timeframe}
                              </div>
                              <div className="text-xs text-slate-500">
                                {tf.trades} · {tf.winRate}% WR
                              </div>
                            </div>
                            <span
                              className={`font-mono font-semibold tabular-nums ${
                                tf.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                              }`}
                            >
                              {formatCurrency(tf.netPnl, currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Day-of-Week Net P/L Distribution
              </h2>
              <div className="h-56">
                {metrics.dayOfWeekBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.dayOfWeekBreakdown}>
                      <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} width={54} />
                      <Tooltip
                        formatter={(v: unknown) => [formatCurrency(Number(v), currency), 'Net P/L']}
                      />
                      <Bar dataKey="netPnl" radius={[4, 4, 0, 0]}>
                        {metrics.dayOfWeekBreakdown.map((entry, idx) => (
                          <Cell key={idx} fill={entry.netPnl >= 0 ? '#10B981' : '#EF4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No closed trade weekday distribution available yet.
                  </div>
                )}
              </div>
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
                  onClick={openNewAccountForm}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Account
                </button>
              </div>

              {showNewAccount && (
                <form
                  onSubmit={handleSaveAccount}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {editingAccount ? `Customize "${editingAccount.name}"` : 'New Trading Account'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAccount(false);
                        setEditingAccount(null);
                        setAccError(null);
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                  {accError && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                      {accError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      placeholder="Account label (e.g. Raw ECN or Cent Growth)"
                      className="col-span-2 px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                    />
                    <select
                      value={accType}
                      onChange={(e) => {
                        setAccType(e.target.value as TradingAccount['accountType']);
                        setAccError(null);
                      }}
                      className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                    >
                      <option value="standard">Standard Account (Min $10)</option>
                      <option value="cent">Cent Account (Min $10)</option>
                      <option value="demo">Demo Practice (Min $10)</option>
                      <option value="live">Live Standard (Min $10)</option>
                      <option value="prop_challenge">Prop Challenge (Min $10)</option>
                      <option value="funded">Funded (Min $10)</option>
                      <option value="custom">Custom Account (Min $1)</option>
                    </select>
                    <select
                      value={accCurrency}
                      onChange={(e) => setAccCurrency(e.target.value as TradingAccount['currency'])}
                      className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="JPY">JPY</option>
                      <option value="AUD">AUD</option>
                      <option value="CAD">CAD</option>
                      <option value="CHF">CHF</option>
                    </select>
                    {accType === 'custom' && (
                      <>
                        <input
                          type="text"
                          maxLength={60}
                          value={accCustomLabel}
                          onChange={(e) => setAccCustomLabel(e.target.value)}
                          placeholder="Custom tier label (e.g. Raw ECN, Mini 10k)"
                          className="col-span-2 px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                        />
                        <select
                          value={accScalePreset}
                          onChange={(e) =>
                            setAccScalePreset(e.target.value as '1' | '0.1' | '0.01' | 'custom')
                          }
                          className={`${
                            accScalePreset === 'custom' ? 'col-span-1' : 'col-span-2'
                          } px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800`}
                        >
                          <option value="1">Contract Scale: Standard (1x · 100k/lot)</option>
                          <option value="0.1">Contract Scale: Mini (0.1x · 10k/lot)</option>
                          <option value="0.01">Contract Scale: Cent / Micro (0.01x · 1k/lot)</option>
                          <option value="custom">Custom Contract Scale Multiplier</option>
                        </select>
                        {accScalePreset === 'custom' && (
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            max="100"
                            required
                            value={accCustomScale}
                            onChange={(e) => setAccCustomScale(e.target.value)}
                            placeholder="Scale multiplier (e.g. 0.5)"
                            className="px-3 py-2 text-xs font-mono rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                          />
                        )}
                      </>
                    )}
                    {!editingAccount && (
                      <div className="col-span-2 space-y-1.5">
                        <input
                          type="number"
                          min={getMinimumInitialBalance(accType)}
                          step="0.01"
                          required
                          value={accBalance}
                          onChange={(e) => setAccBalance(e.target.value)}
                          placeholder={`Starting balance (Min $${getMinimumInitialBalance(accType)} · $10–$1,000+)`}
                          className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                        />
                        <div className="flex flex-wrap items-center gap-1">
                          {ENROLLMENT_AMOUNT_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setAccBalance(String(preset))}
                              className={`px-2 py-0.5 text-[11px] font-mono tabular-nums rounded border transition-colors ${
                                Number(accBalance) === preset
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white dark:bg-[#0F172A] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                              }`}
                            >
                              ${preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <input
                      type="text"
                      value={accBroker}
                      onChange={(e) => setAccBroker(e.target.value)}
                      placeholder="Broker name (descriptive)"
                      className="col-span-2 px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accIsDefault}
                      onChange={(e) => setAccIsDefault(e.target.checked)}
                    />
                    Set as default active trading account
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {ACCOUNT_TYPE_SPECS[accType].description}
                  </p>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {editingAccount ? 'Save Account Customization' : 'Create Account'}
                  </button>
                </form>
              )}

              <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
                {tradingAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {acc.name}
                        </span>
                        {acc.isDefault && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatAccountTypeLabel(acc.accountType, acc.customTypeLabel)}
                        {acc.accountType === 'custom' &&
                        acc.customContractScale !== undefined &&
                        acc.customContractScale !== 1
                          ? ` (${acc.customContractScale}x)`
                          : ''}
                        {' · '}
                        {acc.currency}
                        {acc.brokerName ? ` · ${acc.brokerName}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatPlainCurrency(acc.currentBalance, acc.currency)}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          Init: {formatPlainCurrency(acc.initialBalance, acc.currency)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditAccountForm(acc)}
                        title="Customize account"
                        aria-label={`Customize ${acc.name}`}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>
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
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Monthly Trading Calendar · {calendarGrid.monthLabel}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth((prev) =>
                      prev.month === 0
                        ? { year: prev.year - 1, month: 11 }
                        : { year: prev.year, month: prev.month - 1 }
                    )
                  }
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
                    setSelectedCalendarDate(now.toISOString().slice(0, 10));
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth((prev) =>
                      prev.month === 11
                        ? { year: prev.year + 1, month: 0 }
                        : { year: prev.year, month: prev.month + 1 }
                    )
                  }
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">Monthly Net P/L</div>
                <div
                  className={`font-mono font-bold mt-0.5 ${
                    calendarGrid.monthNetPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {formatCurrency(calendarGrid.monthNetPnl, currency)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">Active Trading Days</div>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {calendarGrid.tradingDaysCount}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">Best Session Day</div>
                <div className="font-mono font-bold text-emerald-500 mt-0.5">
                  {calendarGrid.bestDay
                    ? `${formatCurrency(calendarGrid.bestDay.pnl, currency)} (${calendarGrid.bestDay.date.slice(5)})`
                    : '—'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">Weakest Session Day</div>
                <div className="font-mono font-bold text-red-500 mt-0.5">
                  {calendarGrid.worstDay
                    ? `${formatCurrency(calendarGrid.worstDay.pnl, currency)} (${calendarGrid.worstDay.date.slice(5)})`
                    : '—'}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto pb-1">
              <div className="min-w-[640px] space-y-2">
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-500 pt-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarGrid.cells.map((cell, idx) => {
                    if (!cell.iso) {
                      return <div key={`empty-${idx}`} className="h-20 rounded-lg bg-slate-50/40 dark:bg-[#0B111E]/30" />;
                    }
                    const info = dayTradeMap.get(cell.iso);
                    const isSelected = selectedCalendarDate === cell.iso;

                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        onClick={() => setSelectedCalendarDate(cell.iso!)}
                        className={`h-20 p-2.5 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                          isSelected
                            ? 'ring-2 ring-blue-500 border-blue-500'
                            : info && info.pnl > 0
                            ? 'bg-emerald-500/10 border-emerald-500/25'
                            : info && info.pnl < 0
                            ? 'bg-red-500/10 border-red-500/25'
                            : info
                            ? 'bg-slate-100 dark:bg-[#162033] border-slate-300 dark:border-slate-700'
                            : 'bg-slate-50 dark:bg-[#0B111E] border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {cell.dayNum}
                          </span>
                          {info && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {info.count}T
                            </span>
                          )}
                        </div>
                        {info ? (
                          <div
                            className={`text-xs font-mono font-bold tabular-nums ${
                              info.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}
                          >
                            {formatCurrency(info.pnl, currency)}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400/60">—</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Selected Day Trade Drill-Down */}
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Trades on {selectedCalendarDate} ({selectedDayTrades.length})
            </h3>
            {selectedDayTrades.length === 0 ? (
              <p className="text-xs text-slate-500">
                No trades recorded on {selectedCalendarDate}. Select any highlighted day above to inspect session trades.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {selectedDayTrades.map((t) => (
                  <div key={t.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {t.instrument} {t.direction}
                      </span>
                      <span className="text-slate-500 ml-2">
                        {t.strategy} · {t.session}
                        {t.timeframe ? ` · ${t.timeframe}` : ''}
                        {t.setupGrade ? ` · Grade ${t.setupGrade}` : ''}
                      </span>
                      {t.mistakeTags && t.mistakeTags.length > 0 && (
                        <div className="text-[11px] text-amber-500 mt-0.5">
                          Mistakes: {t.mistakeTags.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 font-mono">
                      <span className="text-slate-500">
                        {t.rMultiple !== undefined ? `${t.rMultiple}R` : t.status}
                      </span>
                      <span
                        className={`font-semibold ${
                          t.netPnl === undefined
                            ? 'text-slate-400'
                            : t.netPnl >= 0
                            ? 'text-emerald-500'
                            : 'text-red-500'
                        }`}
                      >
                        {t.netPnl !== undefined ? formatCurrency(t.netPnl, currency) : 'Open'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div className="space-y-6">
          {/* Manual Record Reader & Setup Prediction Baseline */}
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-blue-500" />
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Manual Record Reader & Forward Setup Prediction
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Reads every manually logged setup, entry justification, session, emotion tag, and outcome to forecast your highest-probability edge and surface deep AI pattern diagnostics.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunAiPatternAnalysis}
                disabled={aiLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors shrink-0"
              >
                <Activity className="w-3.5 h-3.5" />
                {aiLoading ? 'Running AI Pattern & Prediction Audit...' : 'Run Deep AI Pattern & Prediction'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800 text-xs">
              <div className="py-3.5 sm:pr-5 space-y-1">
                <div className="text-slate-500">Model Readiness</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {manualInsights.readinessLabel}
                </div>
                <div className="font-mono text-slate-500">
                  {manualInsights.closedTradesAnalyzed} closed · {manualInsights.totalNonDraftTrades} logged
                </div>
              </div>
              <div className="py-3.5 sm:px-5 space-y-1">
                <div className="text-slate-500">Projected Disciplined Hit Rate</div>
                <div className="text-lg font-bold font-mono tabular-nums text-emerald-500">
                  {manualInsights.predictedNextWinRate !== null
                    ? `${manualInsights.predictedNextWinRate}%`
                    : '—'}
                </div>
                <div className="font-mono text-slate-500">
                  Expected R:{' '}
                  {manualInsights.predictedExpectedR !== null
                    ? `${manualInsights.predictedExpectedR >= 0 ? '+' : ''}${manualInsights.predictedExpectedR}R`
                    : '—'}
                </div>
              </div>
              <div className="py-3.5 sm:px-5 space-y-1">
                <div className="text-slate-500">Manual Record Quality</div>
                <div className="text-lg font-bold font-mono tabular-nums text-blue-500">
                  {manualInsights.documentationRate}%
                </div>
                <div className="font-mono text-slate-500">
                  Plan Adherence: {manualInsights.planAdherenceRate}%
                </div>
              </div>
              <div className="py-3.5 sm:pl-5 space-y-1">
                <div className="text-slate-500">Top Setup Profile</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {manualInsights.topSetup
                    ? `${manualInsights.topSetup.instrument} ${manualInsights.topSetup.direction}`
                    : '—'}
                </div>
                <div className="text-slate-500">
                  {manualInsights.topSetup
                    ? `${manualInsights.topSetup.session} · ${manualInsights.topSetup.winRate}% WR`
                    : 'Awaiting closed trades'}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">
                {manualInsights.predictionHeadline}
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                {manualInsights.predictionGuidance.map((line, i) => (
                  <li key={i} className="leading-relaxed">
                    · {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {aiError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-500">
              {aiError}
            </div>
          )}

          {!aiReport && !aiLoading && !aiError && (
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-10 text-center space-y-2.5">
              <BrainCircuit className="w-8 h-8 text-blue-500/70 mx-auto" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                AI Pattern & Prediction Engine Ready
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                Select <span className="font-semibold text-blue-500">Run Deep AI Pattern & Prediction</span> above to analyze your {nonDraftCount} manual trade records, entry justifications, and {psychologyAssessments.length} psychology assessments.
              </p>
            </div>
          )}

          {aiReport && (
            <div className="space-y-6">
              {aiReport.predictions && (
                <div className="bg-white dark:bg-[#0F172A] border border-blue-500/30 rounded-xl p-5 md:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      AI Setup Forecast & Guidance from Your Manual Records
                    </h3>
                    {aiMeta && (
                      <span className="text-xs font-mono text-slate-500">
                        {aiMeta.tradesAnalyzed} records analyzed · {formatFirestoreDate(aiMeta.generatedAt)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs md:text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {aiReport.predictions.nextTradeOutlook}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-slate-500">Recommended Setup Focus</div>
                      <div className="font-semibold text-slate-900 dark:text-white leading-relaxed">
                        {aiReport.predictions.recommendedSetupFocus}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-slate-500">Projected Win-Rate Range</div>
                      <div className="text-sm font-bold font-mono text-emerald-500">
                        {aiReport.predictions.projectedWinRateRange}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-slate-500">Risk Watch Trigger</div>
                      <div className="text-amber-500 font-medium leading-relaxed">
                        {aiReport.predictions.riskWatchTrigger}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="text-slate-500">Manual Record Quality Feedback</div>
                      <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {aiReport.predictions.recordQualityFeedback}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Executive Behavioural & Performance Summary
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {aiReport.summary}
                </p>

                {aiReport.strengths?.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-semibold text-emerald-500 mb-2">
                      Observed Strengths
                    </div>
                    <ul className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {aiReport.strengths.map((s, idx) => (
                        <li
                          key={idx}
                          className="py-2.5 text-slate-700 dark:text-slate-200"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(aiReport.patterns || []).map((pat, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {pat.title}
                      </span>
                      <span
                        className={`text-xs font-medium capitalize shrink-0 ${
                          pat.severity === 'critical'
                            ? 'text-red-500'
                            : pat.severity === 'caution'
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        {pat.category} · {pat.severity}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Evidence: </span>
                      {pat.evidence}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-blue-500">Action: </span>
                      {pat.recommendation}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Psychology & Discipline Insights
                  </h3>
                  <ul className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    {(aiReport.psychologyInsights || []).map((item, idx) => (
                      <li key={idx} className="py-2.5 leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Next-Session Corrective Action Plan
                  </h3>
                  <ol className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300 list-decimal list-inside">
                    {(aiReport.actionPlan || []).map((step, idx) => (
                      <li key={idx} className="py-2.5 leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
