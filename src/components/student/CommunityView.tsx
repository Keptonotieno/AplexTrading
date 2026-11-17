import React, { useMemo, useState } from 'react';
import { Award, Megaphone, ShieldCheck, Users } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import { updateStudentProfile } from '../../services/mentorshipService';

type RankMetric =
  | 'overallScore'
  | 'growthPercent'
  | 'riskScore'
  | 'disciplineScore'
  | 'consistencyScore'
  | 'improvementDelta';

export const CommunityView: React.FC = () => {
  const {
    firebaseUser,
    studentProfile,
    privateInfo,
    leaderboardEntries,
    announcements,
    systemSettings,
  } = useMentorship();

  const [rankBy, setRankBy] = useState<RankMetric>('overallScore');
  const [toggling, setToggling] = useState(false);

  const optedIn = Boolean(studentProfile?.publicLeaderboardOptIn);
  const minTrades = systemSettings.minTradesForLeaderboard ?? 5;

  const ranked = useMemo(() => {
    return leaderboardEntries
      .filter((e) => e.optedIn && e.eligibleTradesCount >= minTrades)
      .sort((a, b) => (b[rankBy] ?? 0) - (a[rankBy] ?? 0));
  }, [leaderboardEntries, rankBy, minTrades]);

  const handleToggleOptIn = async () => {
    if (!firebaseUser || !studentProfile || !privateInfo) return;
    setToggling(true);
    try {
      await updateStudentProfile({
        uid: firebaseUser.uid,
        fullName: studentProfile.fullName,
        experienceLevel: studentProfile.experienceLevel,
        preferredInstruments: studentProfile.preferredInstruments,
        brokerName: studentProfile.brokerName,
        publicLeaderboardOptIn: !optedIn,
        phone: privateInfo.phone,
        country: privateInfo.country,
        email: privateInfo.email,
        completedLessonIds: studentProfile.completedLessonIds,
      });
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Community & Approved Rankings
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Privacy-first rankings · Private journals, screenshots, and monetary account balances are never exposed
          </p>
        </div>

        {studentProfile && (
          <button
            type="button"
            disabled={toggling}
            onClick={handleToggleOptIn}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
              optedIn
                ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-500'
                : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            {optedIn ? 'Public Rankings: Opted In' : 'Opt Into Public Rankings'}
          </button>
        )}
      </div>

      {/* Scoring Methodology Banner */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white mb-3">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          Multi-Factor Scoring Methodology (Minimum {minTrades} closed trades required)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/70 dark:border-slate-800">
            <div className="text-slate-500">Risk Management</div>
            <div className="text-base font-mono font-bold text-blue-500 mt-1">
              {systemSettings.weightRiskManagement}%
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/70 dark:border-slate-800">
            <div className="text-slate-500">Trading Discipline</div>
            <div className="text-base font-mono font-bold text-emerald-500 mt-1">
              {systemSettings.weightDiscipline}%
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/70 dark:border-slate-800">
            <div className="text-slate-500">Consistency</div>
            <div className="text-base font-mono font-bold text-indigo-400 mt-1">
              {systemSettings.weightConsistency}%
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/70 dark:border-slate-800">
            <div className="text-slate-500">Risk-Adj. Profit</div>
            <div className="text-base font-mono font-bold text-amber-500 mt-1">
              {systemSettings.weightProfitability}%
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/70 dark:border-slate-800">
            <div className="text-slate-500">Journal Completion</div>
            <div className="text-base font-mono font-bold text-cyan-500 mt-1">
              {systemSettings.weightJournalCompletion}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Leaderboard Table */}
        <div className="lg:col-span-8 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Verified Community Leaderboard
            </h2>
            <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0B111E]">
              {([
                ['overallScore', 'Overall'],
                ['growthPercent', '% Growth'],
                ['riskScore', 'Risk Mgmt'],
                ['disciplineScore', 'Discipline'],
                ['consistencyScore', 'Consistency'],
                ['improvementDelta', 'Most Improved'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRankBy(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    rankBy === key
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {ranked.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-xs text-slate-500">
              <Users className="w-7 h-7 mx-auto opacity-50" />
              <p>
                No opted-in students meet the {minTrades}-trade verification threshold yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Trader</th>
                    <th className="pb-2 text-right">Overall</th>
                    <th className="pb-2 text-right">Growth %</th>
                    <th className="pb-2 text-right">Risk</th>
                    <th className="pb-2 text-right">Discipline</th>
                    <th className="pb-2 text-right">Win Rate</th>
                    <th className="pb-2 text-right">Trades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {ranked.map((entry, idx) => (
                    <tr key={entry.userId}>
                      <td className="py-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3 font-semibold text-slate-900 dark:text-white">
                        {entry.displayAlias}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-blue-500 tabular-nums">
                        {entry.overallScore.toFixed(1)}
                      </td>
                      <td
                        className={`py-3 text-right font-mono tabular-nums ${
                          entry.growthPercent >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        {entry.growthPercent >= 0 ? '+' : ''}
                        {entry.growthPercent.toFixed(1)}%
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums">
                        {entry.riskScore.toFixed(0)}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums">
                        {entry.disciplineScore.toFixed(0)}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums">
                        {entry.winRate.toFixed(1)}%
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-slate-500">
                        {entry.eligibleTradesCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Community Announcements & Mentorship Sessions */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-500" />
            Community Updates
          </h2>

          {announcements.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No announcements or mentorship sessions posted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {ann.title}
                    </span>
                    <span className="text-[11px] capitalize text-blue-500">{ann.category}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{ann.body}</p>
                  <div className="text-[11px] text-slate-400">
                    {ann.authorName} · {formatFirestoreDate(ann.createdAt)}
                    {ann.sessionDate ? ` · Session: ${ann.sessionDate}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
