import React, { useState } from 'react';
import { Calendar, CheckCircle2, Crown, Trophy } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { formatCurrency, formatPlainCurrency } from '../../lib/forexCalculations';
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
  } = useMentorship();

  const [selectedAccountId, setSelectedAccountId] = useState(
    activeAccount?.id || tradingAccounts[0]?.id || ''
  );
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

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
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Recurring Trading Challenges
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Continuous challenge cycles preserving full historical records without resetting your real accounts
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {challengeCycles.map((cycle) => {
            const participation = myChallenges.find((p) => p.cycleId === cycle.id);
            const enrolledAccount = participation
              ? tradingAccounts.find((a) => a.id === participation.accountId)
              : undefined;
            const cycleCurrency =
              enrolledAccount?.currency ||
              activeAccount?.currency ||
              tradingAccounts[0]?.currency ||
              'USD';
            const cycleTrades = trades.filter(
              (t) => t.challengeCycleId === cycle.id && t.status === 'closed'
            );
            const cycleNetPnl = cycleTrades.reduce((s, t) => s + (t.netPnl ?? 0), 0);
            const cycleWins = cycleTrades.filter((t) => (t.netPnl ?? 0) > 0).length;
            const cycleWinRate =
              cycleTrades.length > 0
                ? Math.round((cycleWins / cycleTrades.length) * 100)
                : 0;
            const growthPct =
              participation && participation.openingBalance > 0
                ? ((cycleNetPnl / participation.openingBalance) * 100).toFixed(2)
                : '0.00';

            const startMs = new Date(cycle.startDate).getTime();
            const day = Math.max(
              1,
              Math.min(cycle.durationDays, Math.floor((Date.now() - startMs) / 86400000) + 1)
            );
            const progressPct = Math.round((day / cycle.durationDays) * 100);

            return (
              <div
                key={cycle.id}
                className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4"
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
                      Day {day} of {cycle.durationDays}
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">
                      {progressPct}%
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
                        {cycleTrades.length} Trades · {cycleWinRate}% WR
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span>Cycle Net P/L: {formatCurrency(cycleNetPnl, cycleCurrency)}</span>
                      <span className={Number(growthPct) >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                        {Number(growthPct) >= 0 ? '+' : ''}
                        {growthPct}% Growth
                      </span>
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
                      onClick={() => handleJoin(cycle.id)}
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
      )}
    </div>
  );
};
