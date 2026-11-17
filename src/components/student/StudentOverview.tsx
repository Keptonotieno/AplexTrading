import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BrainCircuit,
  ClipboardCheck,
  FileBarChart,
  ImagePlus,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMentorship } from '../../context/MentorshipContext';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import {
  computeChallengeProgress,
  computeManualRecordInsights,
  formatCurrency,
  formatPlainCurrency,
} from '../../lib/forexCalculations';
import type { StudentTab } from '../AppShell';

interface Props {
  onNavigate: (tab: StudentTab) => void;
  onOpenNewTrade: () => void;
}

export const StudentOverview: React.FC<Props> = ({ onNavigate, onOpenNewTrade }) => {
  const {
    studentProfile,
    userAccount,
    activeAccount,
    trades,
    psychologyAssessments,
    metrics,
    challengeCycles,
    myChallenges,
    riskPolicy,
    tradeReviews,
    myMentorReviews,
    theme,
  } = useMentorship();

  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const fullName = studentProfile?.fullName || userAccount?.displayName || 'Trader';
  const firstName = fullName.split(' ')[0];
  const currency = activeAccount?.currency || 'USD';

  const activeCycle = useMemo(
    () => challengeCycles.find((c) => c.status === 'active') || challengeCycles[0],
    [challengeCycles]
  );

  const cycleStats = useMemo(() => {
    if (!activeCycle) {
      return { day: 0, total: 30, percent: 0, targetCompletion: 0, growthPercent: 0, enrolled: false };
    }
    const participation = myChallenges.find((p) => p.cycleId === activeCycle.id);
    const report = computeChallengeProgress({
      cycle: activeCycle,
      participation,
      account: activeAccount ?? undefined,
      trades,
      riskPolicy,
    });
    const percent = participation
      ? report.targetCompletionPercent
      : Math.round((report.daysElapsed / (activeCycle.durationDays || 30)) * 100);
    return {
      day: report.daysElapsed,
      total: activeCycle.durationDays || 30,
      percent: Math.round(percent),
      targetCompletion: report.targetCompletionPercent,
      growthPercent: report.growthPercent,
      enrolled: Boolean(participation),
    };
  }, [activeCycle, myChallenges, activeAccount, trades, riskPolicy]);

  const recordInsights = useMemo(
    () =>
      computeManualRecordInsights({
        trades,
        assessments: psychologyAssessments,
        riskPolicy,
      }),
    [trades, psychologyAssessments, riskPolicy]
  );

  const chartData = useMemo(() => {
    const cutoffDays = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
    const cutoffTs = cutoffDays ? Date.now() - cutoffDays * 86400000 : 0;

    return metrics.equitySeries
      .filter((pt) => !cutoffDays || new Date(pt.date).getTime() >= cutoffTs)
      .map((pt) => ({
        ...pt,
        shortDate: formatFirestoreDate(pt.date).replace(/, \d{4}$/, ''),
      }));
  }, [metrics.equitySeries, range]);

  const recentTrades = useMemo(() => trades.slice(0, 5), [trades]);

  const latestFeedback = useMemo(() => {
    if (tradeReviews.length > 0) {
      const sorted = [...tradeReviews].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );
      const rev = sorted[0];
      return {
        author: rev.mentorName,
        role: `Mentor · ${formatFirestoreDate(rev.createdAt)}`,
        quote: rev.comment,
      };
    }
    if (myMentorReviews.length > 0) {
      const rev = myMentorReviews[0];
      return {
        author: rev.mentorName,
        role: `Mentor · ${rev.periodLabel}`,
        quote: rev.mentorRecommendations,
      };
    }
    return null;
  }, [tradeReviews, myMentorReviews]);

  const complianceLabel =
    metrics.riskComplianceRate >= 90
      ? 'On Track'
      : metrics.riskComplianceRate >= 75
      ? 'Caution'
      : 'Review Needed';

  const complianceTone =
    metrics.riskComplianceRate >= 90
      ? 'text-emerald-500'
      : metrics.riskComplianceRate >= 75
      ? 'text-amber-500'
      : 'text-red-500';

  return (
    <div className="space-y-6 md:space-y-7">
      {/* Welcome Banner with integrated Candlestick Chart Artwork */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0C1425] via-[#0F1B33] to-[#0A1324] border border-slate-800/80 px-6 py-7 md:px-8 md:py-8 text-white">
        <div className="relative z-10 max-w-xl space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight [text-wrap:balance]">
            Welcome back, <span className="text-blue-400">{firstName}</span>!
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Stay disciplined. Track your manual trade records. Become a consistent trader.
          </p>
        </div>

        {/* Clean SVG Candlestick Backdrop (zero external dependency, crisp dark aesthetic) */}
        <svg
          className="hidden md:block absolute right-4 bottom-0 h-32 w-80 opacity-85 pointer-events-none"
          viewBox="0 0 320 120"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="100" x2="300" y2="15" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          {[
            { x: 24, y: 74, h: 22, wickY: 66, wickH: 36, up: true },
            { x: 42, y: 66, h: 18, wickY: 58, wickH: 34, up: true },
            { x: 60, y: 70, h: 20, wickY: 62, wickH: 34, up: false },
            { x: 78, y: 78, h: 16, wickY: 70, wickH: 30, up: false },
            { x: 96, y: 62, h: 24, wickY: 54, wickH: 38, up: true },
            { x: 114, y: 55, h: 18, wickY: 46, wickH: 34, up: true },
            { x: 132, y: 60, h: 15, wickY: 52, wickH: 28, up: false },
            { x: 150, y: 48, h: 24, wickY: 40, wickH: 38, up: true },
            { x: 168, y: 42, h: 20, wickY: 32, wickH: 36, up: true },
            { x: 186, y: 46, h: 16, wickY: 38, wickH: 30, up: false },
            { x: 204, y: 34, h: 22, wickY: 26, wickH: 36, up: true },
            { x: 222, y: 26, h: 20, wickY: 18, wickH: 34, up: true },
            { x: 240, y: 20, h: 22, wickY: 12, wickH: 34, up: true },
          ].map((c, idx) => (
            <g key={idx}>
              <line
                x1={c.x + 3}
                y1={c.wickY}
                x2={c.x + 3}
                y2={c.wickY + c.wickH}
                stroke={c.up ? '#10B981' : '#EF4444'}
                strokeWidth="1.5"
                strokeOpacity="0.65"
              />
              <rect
                x={c.x}
                y={c.y}
                width="6"
                height={c.h}
                rx="1"
                fill={c.up ? '#10B981' : '#EF4444'}
                fillOpacity="0.75"
              />
            </g>
          ))}
          <path
            d="M 16 104 Q 130 82 278 24"
            stroke="url(#trendGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <polygon points="286,18 269,20 278,34" fill="#10B981" />
        </svg>
      </section>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-emerald-500/12 text-emerald-500 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Account Growth</div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                metrics.accountGrowthPercent >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {metrics.accountGrowthPercent >= 0 ? '+' : ''}
              {metrics.accountGrowthPercent.toFixed(1)}%
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {formatCurrency(metrics.netPnl, currency)}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-amber-500/12 text-amber-500 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Win Rate</div>
            <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
              {metrics.winRate.toFixed(1)}%
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {metrics.winningTrades} / {metrics.closedTradesCount} Trades
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-blue-500/12 text-blue-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Risk Compliance</div>
            <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${complianceTone}`}>
              {metrics.riskComplianceRate.toFixed(0)}%
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className={`font-sans font-medium ${complianceTone}`}>{complianceLabel}</span> · Daily {metrics.dailyLossPercent.toFixed(1)}%/{riskPolicy.maxDailyLossPercent}%
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-blue-600/12 text-blue-500 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Challenge Progress</div>
            <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
              {activeCycle ? `${cycleStats.percent}%` : '—'}
            </div>
            {activeCycle ? (
              <div className="space-y-1.5">
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${cycleStats.percent}%` }}
                  />
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  Day {cycleStats.day} / {cycleStats.total}
                  {cycleStats.enrolled ? ` · ${cycleStats.growthPercent >= 0 ? '+' : ''}${cycleStats.growthPercent}%` : ''}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('challenges')}
                className="text-xs text-blue-500 hover:underline"
              >
                Explore Challenges →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Middle Split: Performance Overview (8 cols) + Quick Actions (4 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Performance Overview Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Performance Overview
            </h2>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-blue-500 inline-block" />
                  Equity Curve
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" />
                  Account Balance
                </span>
              </div>
              <select
                aria-label="Performance timeframe"
                value={range}
                onChange={(e) => setRange(e.target.value as typeof range)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke={theme === 'dark' ? '#1E293B' : '#E2E8F0'}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortDate"
                    tick={{ fontSize: 11, fill: theme === 'dark' ? '#94A3B8' : '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: theme === 'dark' ? '#94A3B8' : '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                    width={64}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#0B111E' : '#FFFFFF',
                      borderColor: theme === 'dark' ? '#1E293B' : '#E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val: unknown, name: unknown) => [
                      formatPlainCurrency(Number(val), currency),
                      name === 'equity' ? 'Equity Curve' : 'Account Balance',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#eqFill)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6">
                <Activity className="w-7 h-7 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Your Equity Curve Appears Here
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
                  Log closed trades or capital transactions to plot real equity growth and balance history.
                </p>
                <button
                  type="button"
                  onClick={onOpenNewTrade}
                  className="mt-3 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Log First Trade
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 flex flex-col justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <button
              type="button"
              onClick={onOpenNewTrade}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg bg-slate-50 dark:bg-[#162033] hover:bg-slate-100 dark:hover:bg-[#1C2942] border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-800 dark:text-slate-100 transition-colors text-left"
            >
              <span className="w-8 h-8 rounded-lg bg-blue-600/15 text-blue-500 flex items-center justify-center shrink-0">
                <PlusCircle className="w-4 h-4" />
              </span>
              <span>Add New Trade</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('analysis')}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg bg-slate-50 dark:bg-[#162033] hover:bg-slate-100 dark:hover:bg-[#1C2942] border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-800 dark:text-slate-100 transition-colors text-left"
            >
              <span className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0">
                <ImagePlus className="w-4 h-4" />
              </span>
              <span>Upload Screenshot</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('psychology')}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg bg-slate-50 dark:bg-[#162033] hover:bg-slate-100 dark:hover:bg-[#1C2942] border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-800 dark:text-slate-100 transition-colors text-left"
            >
              <span className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-4 h-4" />
              </span>
              <span>Take Assessment</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg bg-slate-50 dark:bg-[#162033] hover:bg-slate-100 dark:hover:bg-[#1C2942] border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-800 dark:text-slate-100 transition-colors text-left"
            >
              <span className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <FileBarChart className="w-4 h-4" />
              </span>
              <span>View Reports</span>
            </button>
          </div>
        </div>
      </section>

      {/* Spacious Row 1: Recent Trades (7 cols) + Your Stats (5 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Recent Trades */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Trades</h2>
              <button
                type="button"
                onClick={() => onNavigate('journal')}
                className="text-xs font-medium text-blue-500 hover:underline whitespace-nowrap shrink-0"
              >
                View All →
              </button>
            </div>

            {recentTrades.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No trades logged yet. Use <span className="font-medium text-blue-500">Add New Trade</span> to record your first setup.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <th className="pb-3 pr-3">Instrument</th>
                      <th className="pb-3 px-3">Direction</th>
                      <th className="pb-3 px-3 text-right">P/L</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 pl-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs md:text-[13px]">
                    {recentTrades.map((t) => {
                      const isBuy = t.direction === 'BUY';
                      const pnl = t.netPnl;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => onNavigate('journal')}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="py-3 pr-3 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {t.instrument}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 font-medium ${
                                isBuy ? 'text-emerald-500' : 'text-red-500'
                              }`}
                            >
                              {isBuy ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                              {isBuy ? 'Buy' : 'Sell'}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                              pnl === undefined
                                ? 'text-slate-400'
                                : pnl >= 0
                                ? 'text-emerald-500'
                                : 'text-red-500'
                            }`}
                          >
                            {pnl !== undefined ? formatCurrency(pnl, currency) : '—'}
                          </td>
                          <td className="py-3 px-3 capitalize text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {t.status}
                          </td>
                          <td className="py-3 pl-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {formatFirestoreDate(t.openedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Your Stats: Spacious 2x2 Hairline-Divided Metric Grid (zero squeezing or clipping) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Your Stats</h2>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-medium text-blue-500 hover:underline whitespace-nowrap shrink-0"
            >
              View Details →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-slate-200 dark:border-slate-800 flex-1">
            <div className="py-4 sm:pr-5 border-b border-slate-200 dark:border-slate-800 sm:border-r space-y-1.5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Trades</div>
              <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
                {metrics.totalTrades}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {metrics.closedTradesCount} closed · {metrics.openTradesCount} open
              </div>
            </div>

            <div className="py-4 sm:pl-5 border-b border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Profit</div>
              <div
                className={`text-2xl font-bold font-mono tabular-nums tracking-tight whitespace-nowrap ${
                  metrics.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {formatCurrency(metrics.netPnl, currency)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Balance: {formatPlainCurrency(metrics.currentAccountBalance, currency)}
              </div>
            </div>

            <div className="py-4 sm:pr-5 border-b sm:border-b-0 border-slate-200 dark:border-slate-800 sm:border-r space-y-1.5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Max Drawdown</div>
              <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
                {metrics.maxDrawdownPercent.toFixed(1)}%
              </div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Current: {metrics.currentDrawdownPercent.toFixed(1)}%
              </div>
            </div>

            <div className="py-4 sm:pl-5 space-y-1.5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg. R-Multiple</div>
              <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
                {metrics.avgRMultiple !== null ? `${metrics.avgRMultiple.toFixed(2)}R` : '—'}
              </div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Expectancy: {formatCurrency(metrics.expectancy, currency)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spacious Row 2: Record Intelligence & Setup Prediction (7 cols) + Mentor Feedback (5 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-blue-500 shrink-0" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Record Reader & Setup Prediction
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Learns directly from your manual trade entries & psychology logs · {recordInsights.readinessLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-medium text-blue-500 hover:underline whitespace-nowrap shrink-0"
            >
              Open Full Prediction Engine →
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
              {recordInsights.predictionHeadline}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 border-y border-slate-200 dark:border-slate-800 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
              <div className="py-3 sm:pr-4 space-y-1">
                <div className="text-xs text-slate-500 dark:text-slate-400">Projected Hit Rate</div>
                <div className="text-lg font-bold font-mono tabular-nums text-blue-500">
                  {recordInsights.predictedNextWinRate !== null
                    ? `${recordInsights.predictedNextWinRate}%`
                    : 'Building'}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {recordInsights.predictedExpectedR !== null
                    ? `Expected ${recordInsights.predictedExpectedR}R`
                    : `${recordInsights.closedTradesAnalyzed} closed trades`}
                </div>
              </div>

              <div className="py-3 sm:px-4 space-y-1">
                <div className="text-xs text-slate-500 dark:text-slate-400">Record Quality</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {recordInsights.documentationRate}%
                </div>
                <div className="text-xs text-slate-500">
                  Plan adherence {recordInsights.planAdherenceRate}%
                </div>
              </div>

              <div className="py-3 sm:pl-4 space-y-1">
                <div className="text-xs text-slate-500 dark:text-slate-400">Best Session / Mindset</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {recordInsights.bestSession
                    ? `${recordInsights.bestSession.session} (${recordInsights.bestSession.winRate}%)`
                    : 'Awaiting closed trades'}
                </div>
                <div className="text-xs text-slate-500 capitalize">
                  {recordInsights.bestEmotion
                    ? `Mindset: ${recordInsights.bestEmotion.emotion}`
                    : 'Tag emotions when logging'}
                </div>
              </div>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {recordInsights.predictionGuidance.slice(0, 2).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold mt-0.5">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mentor Feedback */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Mentor Feedback
            </h2>

            {latestFeedback ? (
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center text-xs font-bold shrink-0">
                    {latestFeedback.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {latestFeedback.author}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {latestFeedback.role}
                    </div>
                  </div>
                </div>
                <p className="text-sm italic text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                  “{latestFeedback.quote}”
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Mentor critiques on your trade setups, chart annotations, and weekly evaluations will appear here as soon as reviewed.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('analysis')}
            className="mt-5 w-full py-2.5 px-4 rounded-lg bg-slate-100 dark:bg-[#162033] hover:bg-slate-200 dark:hover:bg-[#1C2942] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
          >
            View All Feedback →
          </button>
        </div>
      </section>
    </div>
  );
};
