import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, FileSpreadsheet, Megaphone, Settings, Trophy } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { exportPerformanceReportPdf } from '../../lib/exporters';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import { computePortfolioMetrics } from '../../lib/forexCalculations';
import {
  adminPublishAnnouncement,
  adminReviewAssignment,
  adminSaveChallengeCycle,
  adminSaveLearningMaterial,
  adminSaveMentorReport,
  adminSaveSystemSettings,
} from '../../services/mentorshipService';
import type { AnnouncementItem, ChallengeCycle, LearningMaterial } from '../../types/domain';

export const AdminChallengesView: React.FC = () => {
  const { firebaseUser, challengeCycles, adminAllParticipants, riskPolicy } = useMentorship();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetGrowth, setTargetGrowth] = useState('');
  const [maxDd, setMaxDd] = useState(String(riskPolicy.maxDrawdownPercent));
  const [maxRisk, setMaxRisk] = useState(String(riskPolicy.maxRiskPerTradePercent));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMaxDd(String(riskPolicy.maxDrawdownPercent));
    setMaxRisk(String(riskPolicy.maxRiskPerTradePercent));
  }, [riskPolicy]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    try {
      const end = new Date(new Date(startDate).getTime() + durationDays * 86400000)
        .toISOString()
        .slice(0, 10);
      await adminSaveChallengeCycle({
        title: title.trim(),
        description: description.trim() || undefined,
        durationDays,
        startDate,
        endDate: end,
        status: 'active',
        targetGrowthPercent: Number(targetGrowth) || 5,
        maxDrawdownPercent: Number(maxDd) || riskPolicy.maxDrawdownPercent,
        maxRiskPerTradePercent: Number(maxRisk) || riskPolicy.maxRiskPerTradePercent,
        actorId: firebaseUser.uid,
      });
      setTitle('');
      setDescription('');
      setTargetGrowth('');
    } finally {
      setSaving(false);
    }
  };

  const extendTo60Days = async (cyc: ChallengeCycle) => {
    if (!firebaseUser) return;
    const newEnd = new Date(new Date(cyc.startDate).getTime() + 60 * 86400000)
      .toISOString()
      .slice(0, 10);
    await adminSaveChallengeCycle({
      existing: cyc,
      title: cyc.title,
      description: cyc.description,
      durationDays: 60,
      startDate: cyc.startDate,
      endDate: newEnd,
      status: cyc.status,
      targetGrowthPercent: cyc.targetGrowthPercent,
      maxDrawdownPercent: cyc.maxDrawdownPercent,
      maxRiskPerTradePercent: cyc.maxRiskPerTradePercent,
      actorId: firebaseUser.uid,
    });
  };

  const setCycleStatus = async (cyc: ChallengeCycle, status: ChallengeCycle['status']) => {
    if (!firebaseUser) return;
    await adminSaveChallengeCycle({
      existing: cyc,
      title: cyc.title,
      description: cyc.description,
      durationDays: cyc.durationDays,
      startDate: cyc.startDate,
      endDate: cyc.endDate,
      status,
      targetGrowthPercent: cyc.targetGrowthPercent,
      maxDrawdownPercent: cyc.maxDrawdownPercent,
      maxRiskPerTradePercent: cyc.maxRiskPerTradePercent,
      actorId: firebaseUser.uid,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Challenge Cycle Manager
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Launch recurring 30-day cycles, extend to 60 days, and preserve historical student records
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        <form
          onSubmit={handleCreate}
          className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4 text-xs"
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Create New Challenge Cycle
          </h2>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cycle Title"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cycle objectives and focus rules..."
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Duration (Days)</label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              >
                <option value={30}>30 Days (Default)</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 mb-1.5">Target Growth %</label>
              <input
                type="number"
                required
                step="0.5"
                value={targetGrowth}
                onChange={(e) => setTargetGrowth(e.target.value)}
                placeholder="e.g. 5"
                className="w-full px-3.5 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1.5">Max Drawdown %</label>
              <input
                type="number"
                required
                step="0.5"
                value={maxDd}
                onChange={(e) => setMaxDd(e.target.value)}
                className="w-full px-3.5 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-500 mb-1.5">Max Risk Per Trade %</label>
              <input
                type="number"
                required
                step="0.1"
                value={maxRisk}
                onChange={(e) => setMaxRisk(e.target.value)}
                className="w-full px-3.5 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {saving ? 'Creating Cycle...' : 'Launch Challenge Cycle'}
          </button>
        </form>

        <div className="lg:col-span-7 space-y-3">
          {challengeCycles.map((cyc) => {
            const participants = adminAllParticipants.filter((p) => p.cycleId === cyc.id);
            return (
              <div
                key={cyc.id}
                className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {cyc.title}
                    </div>
                    <div className="font-mono text-slate-500">
                      {cyc.startDate} → {cyc.endDate} ({cyc.durationDays}d) · {participants.length} Participants
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cyc.durationDays < 60 && cyc.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => extendTo60Days(cyc)}
                        className="px-2.5 py-1 rounded bg-blue-600/15 text-blue-500 font-medium"
                      >
                        Extend to 60 Days
                      </button>
                    )}
                    {cyc.status !== 'closed' ? (
                      <button
                        type="button"
                        onClick={() => setCycleStatus(cyc, 'closed')}
                        className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                      >
                        Close Cycle
                      </button>
                    ) : (
                      <span className="text-slate-400 font-medium">Closed</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const AdminLearningCmsView: React.FC = () => {
  const { firebaseUser, learningMaterials, adminAllAssignments } = useMentorship();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<LearningMaterial['type']>('lesson');
  const [difficulty, setDifficulty] = useState<LearningMaterial['difficulty']>('foundation');
  const [duration, setDuration] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !title.trim() || !summary.trim()) return;
    setSaving(true);
    try {
      await adminSaveLearningMaterial({
        title: title.trim(),
        category: category.trim(),
        type,
        durationMinutes: Number(duration) || 20,
        difficulty,
        summary: summary.trim(),
        content: content.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        published: true,
        orderIndex: learningMaterials.length + 1,
        actorId: firebaseUser.uid,
      });
      setTitle('');
      setCategory('');
      setDuration('');
      setSummary('');
      setContent('');
      setVideoUrl('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Learning Centre Management
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Publish lessons, video briefings, quizzes, and review student exercise submissions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        <form
          onSubmit={handlePublish}
          className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4 text-xs"
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            Publish Learning Material
          </h2>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lesson or Exercise Title"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LearningMaterial['type'])}
              className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
            >
              <option value="lesson">Lesson</option>
              <option value="video">Video Resource</option>
              <option value="exercise">Practical Exercise</option>
              <option value="quiz">Quiz</option>
            </select>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as LearningMaterial['difficulty'])}
              className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
            >
              <option value="foundation">Foundation</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Duration (min)"
              className="px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
            />
          </div>
          <input
            type="text"
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Concise summary"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Video link URL (optional)"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Detailed lesson content or exercise prompt..."
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {saving ? 'Publishing...' : 'Publish Module'}
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-3 text-xs">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Published Curriculum ({learningMaterials.length})
            </h2>
            {learningMaterials.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 flex justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">{m.title}</span>
                  <span className="text-slate-500 ml-2">
                    ({m.type} · {m.category})
                  </span>
                </div>
                <span className="font-mono text-slate-400">{m.durationMinutes}m</span>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-3 text-xs">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Student Exercise Submissions ({adminAllAssignments.length})
            </h2>
            {adminAllAssignments.length === 0 ? (
              <p className="text-slate-500">No submissions received yet.</p>
            ) : (
              adminAllAssignments.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex justify-between font-semibold">
                    <span>
                      {sub.studentName} · {sub.materialTitle}
                    </span>
                    <span className="capitalize text-blue-500">{sub.status}</span>
                  </div>
                  {sub.responseText && (
                    <p className="text-slate-600 dark:text-slate-300">{sub.responseText}</p>
                  )}
                  {sub.status === 'submitted' && firebaseUser && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={feedbackMap[sub.id] || ''}
                        onChange={(e) =>
                          setFeedbackMap((prev) => ({ ...prev, [sub.id]: e.target.value }))
                        }
                        placeholder="Write mentor feedback..."
                        className="flex-1 px-2.5 py-1.5 rounded bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          adminReviewAssignment({
                            submission: sub,
                            mentorId: firebaseUser.uid,
                            mentorFeedback: feedbackMap[sub.id] || 'Reviewed and approved.',
                          })
                        }
                        className="px-3 py-1.5 rounded bg-emerald-600 text-white font-medium"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminReportsView: React.FC = () => {
  const {
    firebaseUser,
    studentProfile,
    adminProfiles,
    adminAllTrades,
    adminAllAccounts,
    adminAllTransactions,
    adminAllViolations,
    adminAllPsychology,
    adminAllMentorReviews,
    systemSettings,
  } = useMentorship();

  const [studentId, setStudentId] = useState(adminProfiles[0]?.uid || '');
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'challenge'>('weekly');
  const [periodLabel, setPeriodLabel] = useState('');
  const [commonMistakes, setCommonMistakes] = useState('');
  const [psychObs, setPsychObs] = useState('');
  const [improvements, setImprovements] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedUid = studentId || adminProfiles[0]?.uid || '';
  const targetStudent = adminProfiles.find((p) => p.uid === selectedUid);

  const targetMetrics = useMemo(() => {
    if (!selectedUid) return null;
    return computePortfolioMetrics({
      trades: adminAllTrades.filter((t) => t.userId === selectedUid),
      accounts: adminAllAccounts.filter((a) => a.userId === selectedUid),
      transactions: adminAllTransactions.filter((tx) => tx.userId === selectedUid),
      violations: adminAllViolations.filter((v) => v.userId === selectedUid),
      assessments: adminAllPsychology.filter((a) => a.userId === selectedUid),
      settings: systemSettings,
    });
  }, [
    selectedUid,
    adminAllTrades,
    adminAllAccounts,
    adminAllTransactions,
    adminAllViolations,
    adminAllPsychology,
    systemSettings,
  ]);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !targetStudent || !targetMetrics || !recommendations.trim()) return;
    setSaving(true);
    try {
      await adminSaveMentorReport({
        studentId: targetStudent.uid,
        studentName: targetStudent.fullName,
        mentorId: firebaseUser.uid,
        mentorName: studentProfile?.fullName || firebaseUser.displayName || 'Mentor',
        periodType,
        periodLabel: periodLabel.trim(),
        totalTrades: targetMetrics.closedTradesCount,
        winningTrades: targetMetrics.winningTrades,
        losingTrades: targetMetrics.losingTrades,
        netPnl: targetMetrics.netPnl,
        accountGrowthPercent: targetMetrics.accountGrowthPercent,
        winRate: targetMetrics.winRate,
        avgRiskPercent: targetMetrics.avgRiskPercent,
        maxDrawdownPercent: targetMetrics.maxDrawdownPercent,
        bestInstrument: targetMetrics.bestInstrument || undefined,
        weakestInstrument: targetMetrics.weakestInstrument || undefined,
        commonMistakes: commonMistakes.trim() || undefined,
        riskViolationsCount: adminAllViolations.filter((v) => v.userId === selectedUid).length,
        psychologyObservations: psychObs.trim() || undefined,
        improvementsRequired: improvements.trim() || undefined,
        mentorRecommendations: recommendations.trim(),
      });
      setPeriodLabel('');
      setCommonMistakes('');
      setPsychObs('');
      setImprovements('');
      setRecommendations('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Weekly & Monthly Evaluation Reports
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Generate individual student evaluations from verified trade telemetry and export PDF reports
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        <form
          onSubmit={handleGenerateReport}
          className="lg:col-span-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4 text-xs"
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
            Generate Evaluation Report
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={selectedUid}
              onChange={(e) => setStudentId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
            >
              {adminProfiles.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.fullName}
                </option>
              ))}
            </select>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as typeof periodType)}
              className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
            >
              <option value="weekly">Weekly Review</option>
              <option value="monthly">Monthly Evaluation</option>
              <option value="challenge">Challenge Cycle Evaluation</option>
            </select>
          </div>

          <input
            type="text"
            required
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="Evaluation period label (e.g. Week 4 Review)"
            className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />

          {targetMetrics && (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/70 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
              <div>Trades: {targetMetrics.closedTradesCount}</div>
              <div>Win Rate: {targetMetrics.winRate}%</div>
              <div>Growth: {targetMetrics.accountGrowthPercent}%</div>
              <div>Best: {targetMetrics.bestInstrument || '—'}</div>
              <div>Weakest: {targetMetrics.weakestInstrument || '—'}</div>
              <div>Max DD: {targetMetrics.maxDrawdownPercent}%</div>
            </div>
          )}

          <textarea
            rows={2}
            value={commonMistakes}
            onChange={(e) => setCommonMistakes(e.target.value)}
            placeholder="Common trading mistakes observed..."
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />
          <textarea
            rows={2}
            value={psychObs}
            onChange={(e) => setPsychObs(e.target.value)}
            placeholder="Psychology & emotional discipline observations..."
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />
          <textarea
            rows={2}
            value={improvements}
            onChange={(e) => setImprovements(e.target.value)}
            placeholder="Areas requiring improvement..."
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />
          <textarea
            rows={3}
            required
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder="Mentor recommendations and next-week focus plan *"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />

          <button
            type="submit"
            disabled={saving || !targetStudent}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {saving ? 'Saving & Notifying Student...' : 'Save Evaluation Report'}
          </button>
        </form>

        <div className="lg:col-span-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-3 text-xs">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Issued Mentor Reports ({adminAllMentorReviews.length})
          </h2>
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto">
            {adminAllMentorReviews.map((rep) => (
              <div
                key={rep.id}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {rep.studentName} · {rep.periodLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const stuMetrics = computePortfolioMetrics({
                        trades: adminAllTrades.filter((t) => t.userId === rep.studentId),
                        accounts: adminAllAccounts.filter((a) => a.userId === rep.studentId),
                        transactions: adminAllTransactions.filter((tx) => tx.userId === rep.studentId),
                        violations: adminAllViolations.filter((v) => v.userId === rep.studentId),
                        assessments: adminAllPsychology.filter((a) => a.userId === rep.studentId),
                        settings: systemSettings,
                      });
                      exportPerformanceReportPdf({
                        studentName: rep.studentName,
                        periodLabel: rep.periodLabel,
                        metrics: stuMetrics,
                        review: rep,
                      });
                    }}
                    className="text-blue-500 hover:underline font-medium"
                  >
                    Export PDF
                  </button>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{rep.mentorRecommendations}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminAnnouncementsView: React.FC = () => {
  const { firebaseUser, studentProfile, announcements } = useMentorship();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AnnouncementItem['category']>('community');
  const [sessionDate, setSessionDate] = useState('');
  const [pinned, setPinned] = useState(true);
  const [saving, setSaving] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await adminPublishAnnouncement({
        title: title.trim(),
        body: body.trim(),
        category,
        pinned,
        sessionDate: sessionDate || undefined,
        authorId: firebaseUser.uid,
        authorName: studentProfile?.fullName || firebaseUser.displayName || 'Mentor',
      });
      setTitle('');
      setBody('');
      setSessionDate('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Announcements & Mentorship Sessions
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Broadcast community updates, challenge milestones, and scheduled live review sessions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        <form
          onSubmit={handlePublish}
          className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4 text-xs"
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-500" />
            Publish Announcement
          </h2>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement Headline"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AnnouncementItem['category'])}
              className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
            >
              <option value="community">Community</option>
              <option value="challenge">Challenge Milestone</option>
              <option value="education">Educational Update</option>
              <option value="session">Mentorship Session</option>
            </select>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
            />
          </div>
          <textarea
            rows={4}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Announcement details..."
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            <span>Pin to top of Community Updates</span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {saving ? 'Publishing...' : 'Publish Announcement'}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-3 text-xs">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Published Announcements ({announcements.length})
          </h2>
          <div className="space-y-2.5">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              >
                <div className="flex justify-between font-semibold">
                  <span>{a.title}</span>
                  <span className="capitalize text-blue-500">{a.category}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-1">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminAuditAndSettingsView: React.FC = () => {
  const { firebaseUser, systemSettings, adminAuditLogs } = useMentorship();
  const [wRisk, setWRisk] = useState(String(systemSettings.weightRiskManagement));
  const [wDisc, setWDisc] = useState(String(systemSettings.weightDiscipline));
  const [wCons, setWCons] = useState(String(systemSettings.weightConsistency));
  const [wProf, setWProf] = useState(String(systemSettings.weightProfitability));
  const [wJour, setWJour] = useState(String(systemSettings.weightJournalCompletion));
  const [minTrades, setMinTrades] = useState(String(systemSettings.minTradesForLeaderboard));
  const [saved, setSaved] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [targetFilter, setTargetFilter] = useState<string>('all');

  useEffect(() => {
    setWRisk(String(systemSettings.weightRiskManagement));
    setWDisc(String(systemSettings.weightDiscipline));
    setWCons(String(systemSettings.weightConsistency));
    setWProf(String(systemSettings.weightProfitability));
    setWJour(String(systemSettings.weightJournalCompletion));
    setMinTrades(String(systemSettings.minTradesForLeaderboard));
  }, [systemSettings]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return adminAuditLogs.filter((log) => {
      if (targetFilter !== 'all' && log.targetType !== targetFilter) return false;
      if (q) {
        const hay = `${log.action} ${log.targetType} ${log.targetId || ''} ${log.actorEmail || ''} ${log.details || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [adminAuditLogs, targetFilter, logSearch]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    await adminSaveSystemSettings({
      id: 'default',
      programmeName: systemSettings.programmeName,
      challengeDefaultDays: systemSettings.challengeDefaultDays,
      weightRiskManagement: Number(wRisk) || 30,
      weightDiscipline: Number(wDisc) || 25,
      weightConsistency: Number(wCons) || 20,
      weightProfitability: Number(wProf) || 15,
      weightJournalCompletion: Number(wJour) || 10,
      requireMentorApproval: systemSettings.requireMentorApproval,
      minTradesForLeaderboard: Number(minTrades) || 5,
      updatedBy: firebaseUser.uid,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Audit Logs & Administrative Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure performance scoring weights and inspect immutable security & operational logs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        <form
          onSubmit={handleSave}
          className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4 text-xs"
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-500" />
            Leaderboard & Scoring Weights (%)
          </h2>
          {saved && (
            <div className="p-2.5 rounded bg-emerald-500/10 text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              System settings updated.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Risk Mgmt (%)</label>
              <input
                type="number"
                value={wRisk}
                onChange={(e) => setWRisk(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Discipline (%)</label>
              <input
                type="number"
                value={wDisc}
                onChange={(e) => setWDisc(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Consistency (%)</label>
              <input
                type="number"
                value={wCons}
                onChange={(e) => setWCons(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Profitability (%)</label>
              <input
                type="number"
                value={wProf}
                onChange={(e) => setWProf(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Journal Comp. (%)</label>
              <input
                type="number"
                value={wJour}
                onChange={(e) => setWJour(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Min Trades Rank</label>
              <input
                type="number"
                value={minTrades}
                onChange={(e) => setMinTrades(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Save Scoring Settings
          </button>
        </form>

        <div className="lg:col-span-7 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Immutable Security & Action Audit Logs ({filteredLogs.length})
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Filter action, actor, or details..."
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-xs"
              />
              <select
                aria-label="Filter audit target type"
                value={targetFilter}
                onChange={(e) => setTargetFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-xs"
              >
                <option value="all">All Targets</option>
                <option value="user">User & Roles</option>
                <option value="student">Student Profiles</option>
                <option value="trade">Trade Journal</option>
                <option value="riskPolicy">Risk Policy</option>
                <option value="systemSettings">System Settings</option>
              </select>
            </div>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <p className="text-slate-500 py-6 text-center">No audit logs match the selected filter.</p>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-blue-500">{log.action}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {log.targetType}
                        {log.targetId ? `:${log.targetId.slice(0, 14)}` : ''}
                      </span>
                    </div>
                    <span className="font-mono text-slate-400 whitespace-nowrap">
                      {formatFirestoreDate(log.createdAt)}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-slate-600 dark:text-slate-300 break-words">{log.details}</p>
                  )}
                  <div className="text-[11px] font-mono text-slate-400">
                    Actor: {log.actorEmail || log.actorId}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
