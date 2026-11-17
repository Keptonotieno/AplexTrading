import React, { useMemo, useState } from 'react';
import { Activity, Brain, CheckCircle2, Info } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import { formatCurrency, round2 } from '../../lib/forexCalculations';
import { savePsychologyAssessment } from '../../services/mentorshipService';
import type { EmotionalState } from '../../types/domain';

const EMOTIONS: EmotionalState[] = [
  'calm',
  'focused',
  'anxious',
  'frustrated',
  'overconfident',
  'hesitant',
  'fatigued',
];

export const PsychologyView: React.FC = () => {
  const { firebaseUser, activeAccount, trades, psychologyAssessments } = useMentorship();
  const currency = activeAccount?.currency || 'USD';

  const [phase, setPhase] = useState<'pre_trade' | 'post_trade'>('pre_trade');
  const [tradeId, setTradeId] = useState('');
  const [emotionalState, setEmotionalState] = useState<EmotionalState>('calm');
  const [confidenceLevel, setConfidenceLevel] = useState(7);
  const [fomoLevel, setFomoLevel] = useState(2);
  const [revengeTendency, setRevengeTendency] = useState(false);
  const [followsStrategy, setFollowsStrategy] = useState(true);
  const [riskCalculated, setRiskCalculated] = useState(true);
  const [planFollowed, setPlanFollowed] = useState(true);
  const [stopLossRespected, setStopLossRespected] = useState(true);
  const [closedEmotionally, setClosedEmotionally] = useState(false);
  const [overtradingOccurred, setOvertradingOccurred] = useState(false);
  const [notes, setNotes] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const patterns = useMemo(() => {
    const total = psychologyAssessments.length;
    if (total === 0) return null;
    const fomoAvg =
      psychologyAssessments.reduce((s, a) => s + a.fomoLevel, 0) / total;
    const revengeCount = psychologyAssessments.filter((a) => a.revengeTendency).length;
    const overtradeCount = psychologyAssessments.filter((a) => a.overtradingOccurred).length;
    const calmCount = psychologyAssessments.filter(
      (a) => a.emotionalState === 'calm' || a.emotionalState === 'focused'
    ).length;

    const recommendations: string[] = [];
    if (fomoAvg >= 5) {
      recommendations.push(
        'Elevated FOMO self-ratings detected. Wait for candle close confirmation before entering setups.'
      );
    }
    if (revengeCount > 0) {
      recommendations.push(
        'Revenge-trading urges reported. Enforce a mandatory 30-minute cool-off period after any losing trade.'
      );
    }
    if (overtradeCount > 0) {
      recommendations.push(
        'Overtrading logged in recent sessions. Cap daily trade frequency to your top 2 A+ setups.'
      );
    }
    if (recommendations.length === 0) {
      recommendations.push(
        'Self-reported execution habits show steady emotional composure and consistent rule adherence.'
      );
    }

    return {
      total,
      fomoAvg: fomoAvg.toFixed(1),
      calmRate: Math.round((calmCount / total) * 100),
      revengeCount,
      recommendations,
    };
  }, [psychologyAssessments]);

  const behaviouralCorrelation = useMemo(() => {
    const closed = trades.filter((t) => t.status === 'closed' && typeof t.netPnl === 'number');
    const assessmentByTrade = new Map<string, EmotionalState>();
    psychologyAssessments.forEach((a) => {
      if (a.tradeId && !assessmentByTrade.has(a.tradeId)) {
        assessmentByTrade.set(a.tradeId, a.emotionalState);
      }
    });

    const emotionStats = new Map<
      string,
      { count: number; wins: number; netPnl: number; rSum: number; rCount: number }
    >();
    const mistakeStats = new Map<string, { count: number; netPnl: number }>();

    const planFollowedStats = { count: 0, wins: 0, netPnl: 0 };
    const planDeviatedStats = { count: 0, wins: 0, netPnl: 0 };

    closed.forEach((t) => {
      const pnl = t.netPnl ?? 0;
      const isWin = pnl > 0.005;
      const emotion = t.emotionTag || assessmentByTrade.get(t.id) || 'unspecified';

      if (emotion !== 'unspecified') {
        const cur = emotionStats.get(emotion) || {
          count: 0,
          wins: 0,
          netPnl: 0,
          rSum: 0,
          rCount: 0,
        };
        cur.count++;
        if (isWin) cur.wins++;
        cur.netPnl += pnl;
        if (typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple)) {
          cur.rSum += t.rMultiple;
          cur.rCount++;
        }
        emotionStats.set(emotion, cur);
      }

      if (t.planFollowed) {
        planFollowedStats.count++;
        if (isWin) planFollowedStats.wins++;
        planFollowedStats.netPnl += pnl;
      } else {
        planDeviatedStats.count++;
        if (isWin) planDeviatedStats.wins++;
        planDeviatedStats.netPnl += pnl;
      }

      (t.mistakeTags || []).forEach((tag) => {
        const mCur = mistakeStats.get(tag) || { count: 0, netPnl: 0 };
        mCur.count++;
        mCur.netPnl += pnl;
        mistakeStats.set(tag, mCur);
      });
    });

    const byEmotion = Array.from(emotionStats.entries())
      .map(([emotion, v]) => ({
        emotion,
        trades: v.count,
        winRate: round2((v.wins / v.count) * 100),
        avgR: v.rCount > 0 ? round2(v.rSum / v.rCount) : null,
        netPnl: round2(v.netPnl),
      }))
      .sort((a, b) => b.netPnl - a.netPnl);

    const byMistake = Array.from(mistakeStats.entries())
      .map(([tag, v]) => ({
        tag,
        count: v.count,
        netPnl: round2(v.netPnl),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalClosed: closed.length,
      byEmotion,
      byMistake,
      planFollowed: {
        ...planFollowedStats,
        winRate:
          planFollowedStats.count > 0
            ? round2((planFollowedStats.wins / planFollowedStats.count) * 100)
            : 0,
        netPnl: round2(planFollowedStats.netPnl),
      },
      planDeviated: {
        ...planDeviatedStats,
        winRate:
          planDeviatedStats.count > 0
            ? round2((planDeviatedStats.wins / planDeviatedStats.count) * 100)
            : 0,
        netPnl: round2(planDeviatedStats.netPnl),
      },
    };
  }, [trades, psychologyAssessments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    setNotice(null);
    try {
      await savePsychologyAssessment({
        userId: firebaseUser.uid,
        tradeId: tradeId || undefined,
        phase,
        emotionalState,
        confidenceLevel,
        fomoLevel,
        revengeTendency,
        followsStrategy,
        riskCalculated,
        planFollowed: phase === 'post_trade' ? planFollowed : undefined,
        stopLossRespected: phase === 'post_trade' ? stopLossRespected : undefined,
        closedEmotionally: phase === 'post_trade' ? closedEmotionally : undefined,
        overtradingOccurred: phase === 'post_trade' ? overtradingOccurred : undefined,
        notes,
        lessonsLearned,
      });
      setNotes('');
      setLessonsLearned('');
      setNotice('Psychology assessment recorded.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Trading Psychology & Discipline
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pre-trade readiness checks, post-trade behavioural reviews, and live emotion-to-outcome correlation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Assessment Form */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-500" />
              Log Psychology Assessment
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0B111E]">
              <button
                type="button"
                onClick={() => setPhase('pre_trade')}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  phase === 'pre_trade'
                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Pre-Trade
              </button>
              <button
                type="button"
                onClick={() => setPhase('post_trade')}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  phase === 'post_trade'
                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Post-Trade
              </button>
            </div>
          </div>

          {notice && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">Linked Trade (Optional)</label>
                <select
                  value={tradeId}
                  onChange={(e) => setTradeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                >
                  <option value="">General Session Check-In</option>
                  {trades.slice(0, 25).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.instrument} {t.direction} · {formatFirestoreDate(t.openedAt)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Emotional Condition</label>
                <select
                  value={emotionalState}
                  onChange={(e) => setEmotionalState(e.target.value as EmotionalState)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 capitalize"
                >
                  {EMOTIONS.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Confidence Level</span>
                  <span className="font-mono font-semibold">{confidenceLevel}/10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Fear of Missing Out (FOMO)</span>
                  <span className="font-mono font-semibold">{fomoLevel}/10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={fomoLevel}
                  onChange={(e) => setFomoLevel(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={followsStrategy}
                  onChange={(e) => setFollowsStrategy(e.target.checked)}
                />
                <span>Setup strictly matches trading plan</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={riskCalculated}
                  onChange={(e) => setRiskCalculated(e.target.checked)}
                />
                <span>Position size & stop-loss pre-calculated</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={revengeTendency}
                  onChange={(e) => setRevengeTendency(e.target.checked)}
                />
                <span>Experiencing urge to recover a prior loss</span>
              </label>

              {phase === 'post_trade' && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planFollowed}
                      onChange={(e) => setPlanFollowed(e.target.checked)}
                    />
                    <span>Trading plan followed end-to-end</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stopLossRespected}
                      onChange={(e) => setStopLossRespected(e.target.checked)}
                    />
                    <span>Stop-loss respected without widening</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={closedEmotionally}
                      onChange={(e) => setClosedEmotionally(e.target.checked)}
                    />
                    <span>Closed prematurely due to emotion</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overtradingOccurred}
                      onChange={(e) => setOvertradingOccurred(e.target.checked)}
                    />
                    <span>Overtrading occurred in this session</span>
                  </label>
                </>
              )}
            </div>

            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Self-observation notes (triggers, patience, mental clarity)..."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
            />
            {phase === 'post_trade' && (
              <textarea
                rows={2}
                value={lessonsLearned}
                onChange={(e) => setLessonsLearned(e.target.value)}
                placeholder="Key behavioural lesson learned..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {saving ? 'Saving...' : 'Save Assessment'}
            </button>
          </form>
        </div>

        {/* Behavioural Patterns & History */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Self-Reported Behavioural Patterns
            </h2>
            {!patterns ? (
              <p className="text-xs text-slate-500">
                Complete pre-trade and post-trade check-ins to surface behavioural trends.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/70 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Calm / Focused</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-emerald-500 mt-1">
                      {patterns.calmRate}%
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/70 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Avg FOMO</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-amber-500 mt-1">
                      {patterns.fomoAvg}/10
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/70 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Revenge Flags</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-red-500 mt-1">
                      {patterns.revengeCount}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {patterns.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5 leading-relaxed"
                    >
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-3.5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recent Assessments ({psychologyAssessments.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {psychologyAssessments.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold capitalize">
                      {a.phase.replace('_', '-')} · {a.emotionalState}
                    </span>
                    <span className="font-mono text-slate-400">
                      {formatFirestoreDate(a.createdAt)}
                    </span>
                  </div>
                  <div className="text-slate-500 font-mono">
                    Confidence {a.confidenceLevel}/10 · FOMO {a.fomoLevel}/10
                  </div>
                  {a.notes && <p className="text-slate-600 dark:text-slate-300">{a.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trade-Linked Behavioural & Mistake Impact Analysis */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Trade-Linked Behavioural Impact Analysis
          </h2>
        </div>

        {behaviouralCorrelation.totalClosed === 0 ? (
          <p className="text-xs text-slate-500 py-4">
            Close trades with execution emotions or linked psychology assessments to quantify how mindset and plan adherence affect your P/L.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
            <div className="lg:col-span-5 space-y-3.5">
              <div className="text-xs font-medium text-slate-500">Plan Adherence vs Deviation</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="text-slate-500">Plan Followed</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-emerald-500">
                    {behaviouralCorrelation.planFollowed.winRate}% WR
                  </div>
                  <div className="font-mono text-slate-700 dark:text-slate-200">
                    {formatCurrency(behaviouralCorrelation.planFollowed.netPnl, currency)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {behaviouralCorrelation.planFollowed.count} closed trades
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="text-slate-500">Plan Deviated</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-amber-500">
                    {behaviouralCorrelation.planDeviated.winRate}% WR
                  </div>
                  <div className="font-mono text-slate-700 dark:text-slate-200">
                    {formatCurrency(behaviouralCorrelation.planDeviated.netPnl, currency)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {behaviouralCorrelation.planDeviated.count} closed trades
                  </div>
                </div>
              </div>

              {behaviouralCorrelation.byMistake.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="text-xs font-medium text-slate-500">Recurring Execution Mistakes</div>
                  <div className="space-y-1.5">
                    {behaviouralCorrelation.byMistake.map((m) => (
                      <div
                        key={m.tag}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                      >
                        <span className="font-medium text-amber-500">
                          {m.tag} ({m.count}x)
                        </span>
                        <span
                          className={`font-mono font-semibold ${
                            m.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                          }`}
                        >
                          {formatCurrency(m.netPnl, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-7">
              <div className="text-xs font-medium text-slate-500 mb-2.5">
                Performance by Emotional State
              </div>
              {behaviouralCorrelation.byEmotion.length === 0 ? (
                <p className="text-xs text-slate-500 py-6">
                  Tag emotions when logging trades or link psychology assessments to trades to populate emotional correlation metrics.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="pb-2">Emotional State</th>
                        <th className="pb-2 text-right">Trades</th>
                        <th className="pb-2 text-right">Win Rate</th>
                        <th className="pb-2 text-right">Avg R</th>
                        <th className="pb-2 text-right">Net P/L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {behaviouralCorrelation.byEmotion.map((row) => (
                        <tr key={row.emotion}>
                          <td className="py-2 capitalize font-medium text-slate-800 dark:text-slate-200">
                            {row.emotion}
                          </td>
                          <td className="py-2 text-right font-mono tabular-nums">{row.trades}</td>
                          <td className="py-2 text-right font-mono tabular-nums">{row.winRate}%</td>
                          <td className="py-2 text-right font-mono tabular-nums">
                            {row.avgR !== null ? `${row.avgR}R` : '—'}
                          </td>
                          <td
                            className={`py-2 text-right font-mono tabular-nums font-semibold ${
                              row.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}
                          >
                            {formatCurrency(row.netPnl, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
