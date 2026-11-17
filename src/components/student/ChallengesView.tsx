import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Crown, ShieldAlert, Target, Trophy } from 'lucide-react';
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
import {
  computeChallengeProgress,
  formatCurrency,
  formatPlainCurrency,
} from '../../lib/forexCalculations';
import { enrollInChallengeCycle } from '../../services/mentorshipService';

export const ChallengesView: React.FC = () => {
  const {
    firebaseUser,
    studentProfile,
    tradingAccounts,
    activeAccount,
    challengeCycles,
    myChallenges,
    trades,
    metrics,
    riskPolicy,
    theme,
  } = useMentorship();

  const [selectedAccountId, setSelectedAccountId] = useState(
    activeAccount?.id || tradingAccounts[0]?.id || ''
  );
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const cycleReports = useMemo(() => {
    return challengeCycles.map((cycle) => {
      const participation = myChallenges.find((p) => p.cycleId === cycle.id);
      const enrolledAccount = participation
        ? tradingAccounts.find((a) => a.id === participation.accountId)
        : tradingAccounts.find((a) => a.id === selectedAccountId) || activeAccount || tradingAccounts[0];
      const report = computeChallengeProgress({
        cycle,
        participation,
        account: enrolledAccount,
        trades,
        riskPolicy,
      });
      return {
        cycle,
        participation,
        currency: enrolledAccount?.currency || activeAccount?.currency || 'USD',
        report,
      };
    });
  }, [challengeCycles, myChallenges, tradingAccounts, selectedAccountId, activeAccount, trades, riskPolicy]);

  const inspectedItem = useMemo(() => {
    if (cycleReports.length === 0) return null;
    return (
      cycleReports.find((item) => item.cycle.id === selectedCycleId) ||
      cycleReports.find((item) => item.cycle.status === 'active' && item.participation) ||
      cycleReports.find((item) => item.cycle.status === 'active') ||
      cycleReports[0]
    );
  }, [cycleReports, selectedCycleId]);

  const handleJoin = async (cycleId: string) => {
    const cycle = challengeCycles.find((c) => c.id === cycleId);
    const acc =
      tradingAccounts.find((a) => a.id === selectedAccountId) || tradingAccounts[0];
    if (!firebaseUser || !studentProfile || !cycle || !acc) return;

    setEnrollingId(cycleId);
    try {
      await enrollInChallengeCycle({
        cycle,
        userId: firebaseUser.uid,
        studentName: studentProfile.fullName,
        account: acc,
        metrics,
      });
      setSelectedCycleId(cycleId);
    } finally {
      setEnrollingId(null);
    }
  };

  const stateBadgeStyle = (state: string) => {
    if (state === 'Passed') return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    if (state === 'Breached') return 'bg-red-500/15 text-red-500 border-red-500/30';
    if (state === 'At Risk') return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    if (state === 'On Track') return 'bg-blue-500/15 text-blue-500 border-blue-500/30';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Recurring Trading Challenges
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated prop-style challenge monitoring with target balance, drawdown buffers, and daily loss tracking
          </p>
        </div>

        {tradingAccounts.length > 0 && (
          <select
            aria-label="Account for challenge enrollment"
            value={selectedAccountId || tradingAccounts[0]?.id}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="px-3.5 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
          >
            {tradingAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                Enroll with: {a.name} ({formatPlainCurrency(a.currentBalance, a.currency)})
              </option>
            ))}
          </select>
        )}
      </div>

      {challengeCycles.length === 0 ? (
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-2.5">
          <Trophy className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            No challenge cycles created yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            When your mentor starts a new challenge cycle, you can enroll and track progress here.
          </p>
        </div>
      ) : (
        <>
          {/* Interactive Prop Challenge Monitor for Selected Cycle */}
          {inspectedItem && (
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Target className="w-4 h-4 text-blue-500" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      Interactive Challenge Monitor · {inspectedItem.cycle.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Day {inspectedItem.report.daysElapsed} of {inspectedItem.cycle.durationDays} ({inspectedItem.report.daysRemaining} days left) ·{' '}
                      {inspectedItem.report.tradingDaysCount} active trading days
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${stateBadgeStyle(
                    inspectedItem.report.challengeState
                  )}`}
                >
                  {inspectedItem.report.challengeState}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800 text-xs">
                <div className="py-4 sm:pr-5 space-y-1.5">
                  <div className="flex justify-between gap-2 text-slate-500">
                    <span>Profit Target Progress</span>
                    <span className="font-mono">+{inspectedItem.cycle.targetGrowthPercent}%</span>
                  </div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {inspectedItem.report.growthPercent >= 0 ? '+' : ''}
                    {inspectedItem.report.growthPercent}%
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${inspectedItem.report.targetCompletionPercent}%` }}
                    />
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    {inspectedItem.report.remainingToTargetAmount > 0
                      ? `${formatPlainCurrency(inspectedItem.report.remainingToTargetAmount, inspectedItem.currency)} to target`
                      : 'Target achieved'}
                  </div>
                </div>

                <div className="py-4 sm:px-5 space-y-1.5">
                  <div className="flex justify-between gap-2 text-slate-500">
                    <span>Max Drawdown Buffer</span>
                    <span className="font-mono">{inspectedItem.cycle.maxDrawdownPercent}% max</span>
                  </div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {inspectedItem.report.cycleMaxDrawdownPercent.toFixed(2)}% used
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        inspectedItem.report.drawdownBufferRemainingPercent <= 1.5
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          inspectedItem.cycle.maxDrawdownPercent > 0
                            ? (inspectedItem.report.cycleMaxDrawdownPercent /
                                inspectedItem.cycle.maxDrawdownPercent) *
                                100
                            : 0
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    Remaining: {inspectedItem.report.drawdownBufferRemainingPercent.toFixed(2)}%
                  </div>
                </div>

                <div className="py-4 sm:pr-5 lg:px-5 space-y-1.5">
                  <div className="flex justify-between gap-2 text-slate-500">
                    <span>Daily Loss Limit</span>
                    <span className="font-mono">{riskPolicy.maxDailyLossPercent}% max</span>
                  </div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {inspectedItem.report.todayLossPercent.toFixed(2)}% today
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        inspectedItem.report.dailyLossBufferRemainingPercent <= 0.5
                          ? 'bg-red-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          riskPolicy.maxDailyLossPercent > 0
                            ? (inspectedItem.report.todayLossPercent / riskPolicy.maxDailyLossPercent) *
                                100
                            : 0
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    Buffer: {inspectedItem.report.dailyLossBufferRemainingPercent.toFixed(2)}%
                  </div>
                </div>

                <div className="py-4 sm:pl-5 space-y-1.5">
                  <div className="flex justify-between gap-2 text-slate-500">
                    <span>Balance vs Target</span>
                    <span className="font-mono">{inspectedItem.report.tradesCount} trades</span>
                  </div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatPlainCurrency(inspectedItem.report.currentBalance, inspectedItem.currency)}
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    Target: {formatPlainCurrency(inspectedItem.report.targetBalance, inspectedItem.currency)}
                  </div>
                  <div className="text-xs font-mono flex items-center gap-1 text-slate-500">
                    {inspectedItem.report.ruleViolationsCount > 0 && (
                      <ShieldAlert className="w-3 h-3 text-amber-500" />
                    )}
                    {inspectedItem.report.ruleViolationsCount} risk breach
                    {inspectedItem.report.ruleViolationsCount === 1 ? '' : 'es'} · {inspectedItem.report.winRate}% WR
                  </div>
                </div>
              </div>

              {inspectedItem.report.cycleEquityCurve.length > 1 ? (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={inspectedItem.report.cycleEquityCurve}
                      margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke={theme === 'dark' ? '#1E293B' : '#E2E8F0'}
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: theme === 'dark' ? '#94A3B8' : '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: theme === 'dark' ? '#94A3B8' : '#64748B' }}
                        tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#0B111E' : '#FFFFFF',
                          borderColor: theme === 'dark' ? '#1E293B' : '#E2E8F0',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(val: unknown, name: unknown) => [
                          formatPlainCurrency(Number(val), inspectedItem.currency),
                          name === 'balance' ? 'Cycle Equity' : 'Target Balance',
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.16}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="targetBalance"
                        stroke="#10B981"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
                  Log closed trades linked to <span className="font-semibold">{inspectedItem.cycle.title}</span> to plot your Cycle Equity vs Profit Target curve.
                </div>
              )}
            </div>
          )}

          {/* Challenge Cycles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {cycleReports.map(({ cycle, participation, currency: cycleCurrency, report }) => {
              const progressPct = Math.round((report.daysElapsed / cycle.durationDays) * 100);
              const isSelected = inspectedItem?.cycle.id === cycle.id;

              return (
                <div
                  key={cycle.id}
                  onClick={() => setSelectedCycleId(cycle.id)}
                  className={`bg-white dark:bg-[#0F172A] border rounded-xl p-5 md:p-6 space-y-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500/50'
                      : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                          {cycle.title}
                        </h2>
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="font-mono">
                          {cycle.startDate.slice(0, 10)} → {cycle.endDate.slice(0, 10)}
                        </span>
                        <span>·</span>
                        <span>{cycle.durationDays} Days</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold capitalize ${
                        cycle.status === 'active'
                          ? 'text-emerald-500'
                          : cycle.status === 'closed'
                          ? 'text-slate-400'
                          : 'text-amber-500'
                      }`}
                    >
                      {cycle.status}
                    </span>
                  </div>

                  {cycle.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {cycle.description}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">
                        Day {report.daysElapsed} of {cycle.durationDays}
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-200">
                        {progressPct}% Elapsed
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-[#0B111E] p-3.5 rounded-lg">
                    <div>
                      <div className="text-slate-500">Target Growth</div>
                      <div className="font-mono font-semibold mt-0.5">+{cycle.targetGrowthPercent}%</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Max Drawdown</div>
                      <div className="font-mono font-semibold mt-0.5">{cycle.maxDrawdownPercent}%</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Max Risk/Trade</div>
                      <div className="font-mono font-semibold mt-0.5">{cycle.maxRiskPerTradePercent}%</div>
                    </div>
                  </div>

                  {participation ? (
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Enrolled · Opening {formatPlainCurrency(participation.openingBalance, cycleCurrency)}
                        </span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {report.tradesCount} Trades · {report.winRate}% WR
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span>Cycle Net P/L: {formatCurrency(report.netPnl, cycleCurrency)}</span>
                        <span className={report.growthPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                          {report.growthPercent >= 0 ? '+' : ''}
                          {report.growthPercent}% / +{cycle.targetGrowthPercent}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-500">
                        <span>Max DD Used: {report.cycleMaxDrawdownPercent.toFixed(2)}%</span>
                        <span>DD Buffer: {report.drawdownBufferRemainingPercent.toFixed(2)}%</span>
                      </div>
                      {participation.mentorEvaluation && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          Mentor Evaluation: “{participation.mentorEvaluation}”
                        </p>
                      )}
                    </div>
                  ) : (
                    cycle.status !== 'closed' && (
                      <button
                        type="button"
                        disabled={enrollingId === cycle.id || tradingAccounts.length === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoin(cycle.id);
                        }}
                        className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium"
                      >
                        {enrollingId === cycle.id ? 'Joining Cycle...' : 'Join This Challenge Cycle'}
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
