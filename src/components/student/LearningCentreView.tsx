import React, { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ClipboardList, PlayCircle, Send } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import {
  submitAssignmentOrQuiz,
  updateStudentProfile,
} from '../../services/mentorshipService';
import type { LearningMaterial } from '../../types/domain';

export const LearningCentreView: React.FC = () => {
  const {
    firebaseUser,
    studentProfile,
    privateInfo,
    learningMaterials,
    myAssignments,
  } = useMentorship();

  const [selected, setSelected] = useState<LearningMaterial | null>(null);
  const [responseText, setResponseText] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const activeMaterial = selected || learningMaterials[0] || null;
  const completedIds = studentProfile?.completedLessonIds || [];

  const progressPercent = useMemo(() => {
    if (learningMaterials.length === 0) return 0;
    const done = learningMaterials.filter((m) => completedIds.includes(m.id)).length;
    return Math.round((done / learningMaterials.length) * 100);
  }, [learningMaterials, completedIds]);

  const markCompleted = async (materialId: string) => {
    if (!firebaseUser || !studentProfile || !privateInfo) return;
    if (completedIds.includes(materialId)) return;
    await updateStudentProfile({
      uid: firebaseUser.uid,
      fullName: studentProfile.fullName,
      experienceLevel: studentProfile.experienceLevel,
      preferredInstruments: studentProfile.preferredInstruments,
      brokerName: studentProfile.brokerName,
      publicLeaderboardOptIn: studentProfile.publicLeaderboardOptIn,
      phone: privateInfo.phone,
      country: privateInfo.country,
      email: privateInfo.email,
      completedLessonIds: [...completedIds, materialId],
    });
    setNotice('Lesson marked as completed.');
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !studentProfile || !activeMaterial) return;
    setSubmitting(true);
    setNotice(null);
    try {
      let quizScore: number | undefined;
      if (activeMaterial.type === 'quiz' && activeMaterial.quizQuestions?.length) {
        const correct = activeMaterial.quizQuestions.reduce(
          (acc, q, idx) => acc + (quizAnswers[idx] === q.correctIndex ? 1 : 0),
          0
        );
        quizScore = Math.round((correct / activeMaterial.quizQuestions.length) * 100);
      }

      await submitAssignmentOrQuiz({
        material: activeMaterial,
        userId: firebaseUser.uid,
        studentName: studentProfile.fullName,
        responseText: responseText.trim() || (quizScore !== undefined ? `Quiz Score: ${quizScore}%` : undefined),
        quizScore,
      });
      await markCompleted(activeMaterial.id);
      setResponseText('');
      setQuizAnswers({});
      setNotice(
        quizScore !== undefined
          ? `Quiz submitted! Score: ${quizScore}%`
          : 'Exercise submitted for mentor review.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const existingSubmission = activeMaterial
    ? myAssignments.find((a) => a.materialId === activeMaterial.id)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Learning Centre
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Structured Forex curriculum, video briefings, quizzes, and mentor-reviewed exercises
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5">
          <span className="text-xs text-slate-500">Curriculum Progress</span>
          <div className="w-28 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-500 tabular-nums">
            {progressPercent}%
          </span>
        </div>
      </div>

      {learningMaterials.length === 0 ? (
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-2.5">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            No learning materials published yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lessons, video sessions, and exercises published by your mentor will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Curriculum Sidebar */}
          <div className="lg:col-span-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-1 pb-1">
              Modules ({learningMaterials.length})
            </h2>
            {learningMaterials.map((mat) => {
              const isDone = completedIds.includes(mat.id);
              const isCurrent = activeMaterial?.id === mat.id;
              return (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => {
                    setSelected(mat);
                    setNotice(null);
                  }}
                  className={`w-full p-3.5 rounded-lg border text-left transition-colors ${
                    isCurrent
                      ? 'bg-blue-600/10 border-blue-500/30'
                      : 'bg-slate-50 dark:bg-[#0B111E] border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {mat.title}
                    </div>
                    {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2">
                    <span className="capitalize">{mat.type}</span>
                    <span>·</span>
                    <span>{mat.durationMinutes} min</span>
                    <span>·</span>
                    <span className="capitalize">{mat.difficulty}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Material Detail */}
          {activeMaterial && (
            <div className="lg:col-span-8 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="text-xs text-blue-500 font-medium">
                    {activeMaterial.category} · {activeMaterial.difficulty} · {activeMaterial.durationMinutes} min
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {activeMaterial.title}
                  </h2>
                </div>
                {!completedIds.includes(activeMaterial.id) && (
                  <button
                    type="button"
                    onClick={() => markCompleted(activeMaterial.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Completed
                  </button>
                )}
              </div>

              {notice && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500">
                  {notice}
                </div>
              )}

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeMaterial.summary}
              </p>

              {activeMaterial.videoUrl && (
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                    <PlayCircle className="w-4 h-4 text-blue-500" />
                    <span>Video Briefing Resource</span>
                  </div>
                  <a
                    href={activeMaterial.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-blue-500 hover:underline"
                  >
                    Open Video Resource →
                  </a>
                </div>
              )}

              {activeMaterial.content && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs md:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-[#0B111E] p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  {activeMaterial.content}
                </div>
              )}

              {/* Interactive Quiz or Exercise Submission */}
              {(activeMaterial.type === 'quiz' || activeMaterial.type === 'exercise') && (
                <form
                  onSubmit={handleAssignmentSubmit}
                  className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <ClipboardList className="w-4 h-4 text-blue-500" />
                    {activeMaterial.type === 'quiz' ? 'Module Knowledge Check' : 'Practical Exercise Submission'}
                  </div>

                  {activeMaterial.type === 'quiz' && activeMaterial.quizQuestions?.length ? (
                    <div className="space-y-3">
                      {activeMaterial.quizQuestions.map((q, qIdx) => (
                        <div
                          key={qIdx}
                          className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                        >
                          <div className="font-medium text-slate-900 dark:text-white">
                            {qIdx + 1}. {q.question}
                          </div>
                          <div className="space-y-1.5">
                            {q.options.map((opt, oIdx) => (
                              <label key={oIdx} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`q_${qIdx}`}
                                  checked={quizAnswers[qIdx] === oIdx}
                                  onChange={() =>
                                    setQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                                  }
                                />
                                <span className="text-slate-600 dark:text-slate-300">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      rows={4}
                      required
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Write your exercise analysis, trade markups, or reflections for mentor evaluation..."
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                    />
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </form>
              )}

              {existingSubmission && (
                <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-blue-500">
                      Your Submission · Status: {existingSubmission.status}
                    </span>
                    {existingSubmission.quizScore !== undefined && (
                      <span className="font-mono">Score: {existingSubmission.quizScore}%</span>
                    )}
                  </div>
                  {existingSubmission.responseText && (
                    <p className="text-slate-600 dark:text-slate-300">
                      {existingSubmission.responseText}
                    </p>
                  )}
                  {existingSubmission.mentorFeedback && (
                    <p className="text-emerald-500 pt-1">
                      Mentor Feedback: {existingSubmission.mentorFeedback}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
