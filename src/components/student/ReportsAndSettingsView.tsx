import React, { useEffect, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { CheckCircle2, Download, FileText, KeyRound, Shield, UserCheck } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { exportPerformanceReportPdf, exportTradesToCsv } from '../../lib/exporters';
import { auth } from '../../lib/firebase';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import { formatCurrency, INSTRUMENT_SPECS } from '../../lib/forexCalculations';
import { updateStudentProfile } from '../../services/mentorshipService';
import type { StudentProfile } from '../../types/domain';

export const ReportsAndSettingsView: React.FC<{ initialTab?: 'reports' | 'settings' }> = ({
  initialTab = 'settings',
}) => {
  const {
    firebaseUser,
    studentProfile,
    privateInfo,
    trades,
    metrics,
    myMentorReviews,
    theme,
    toggleTheme,
  } = useMentorship();

  const [tab, setTab] = useState<'reports' | 'settings'>(initialTab);
  const [fullName, setFullName] = useState(studentProfile?.fullName || '');
  const [phone, setPhone] = useState(privateInfo?.phone || '');
  const [country, setCountry] = useState(privateInfo?.country || '');
  const [experienceLevel, setExperienceLevel] = useState<StudentProfile['experienceLevel']>(
    studentProfile?.experienceLevel || 'intermediate'
  );
  const [brokerName, setBrokerName] = useState(studentProfile?.brokerName || '');
  const [preferredInstruments, setPreferredInstruments] = useState<string[]>(
    studentProfile?.preferredInstruments || []
  );
  const [publicLeaderboardOptIn, setPublicLeaderboardOptIn] = useState(
    Boolean(studentProfile?.publicLeaderboardOptIn)
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (studentProfile) {
      setFullName(studentProfile.fullName || '');
      setExperienceLevel(studentProfile.experienceLevel || 'intermediate');
      setBrokerName(studentProfile.brokerName || '');
      setPreferredInstruments(
        studentProfile.preferredInstruments?.length ? studentProfile.preferredInstruments : []
      );
      setPublicLeaderboardOptIn(Boolean(studentProfile.publicLeaderboardOptIn));
    }
  }, [studentProfile]);

  useEffect(() => {
    if (privateInfo) {
      setPhone(privateInfo.phone || '');
      setCountry(privateInfo.country || '');
    }
  }, [privateInfo]);

  const toggleInstrument = (sym: string) => {
    setPreferredInstruments((prev) =>
      prev.includes(sym) ? prev.filter((x) => x !== sym) : prev.length < 15 ? [...prev, sym] : prev
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !studentProfile) return;
    setSaving(true);
    setNotice(null);
    try {
      await updateStudentProfile({
        uid: firebaseUser.uid,
        fullName: fullName.trim() || studentProfile.fullName,
        experienceLevel,
        preferredInstruments: preferredInstruments.length > 0 ? preferredInstruments : ['EURUSD'],
        brokerName: brokerName.trim() || undefined,
        publicLeaderboardOptIn,
        phone: phone.trim() || undefined,
        country: country.trim() || 'Global',
        email: privateInfo?.email || firebaseUser.email || '',
        completedLessonIds: studentProfile.completedLessonIds,
      });
      setNotice('Profile and privacy settings saved.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordRecovery = async () => {
    if (!firebaseUser?.email) return;
    await sendPasswordResetEmail(auth, firebaseUser.email);
    setNotice(`Password reset link sent to ${firebaseUser.email}.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {tab === 'reports' ? 'Personal & Mentor Reports' : 'Profile & Account Security'}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Export PDF/CSV performance audits, read weekly mentor evaluations, and manage profile privacy
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTab('reports')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md ${
              tab === 'reports'
                ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white'
                : 'text-slate-500'
            }`}
          >
            Reports & Exports
          </button>
          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md ${
              tab === 'settings'
                ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white'
                : 'text-slate-500'
            }`}
          >
            Profile Settings
          </button>
        </div>
      </div>

      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Generate Personal Performance Report
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Includes capital-adjusted growth, R-multiples, current & max drawdown, 30-day comparisons, 5-pillar score, and closed trades.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => exportTradesToCsv(trades, 'personal-trading-journal.csv')}
                  disabled={trades.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Trades CSV
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportPerformanceReportPdf({
                      studentName: studentProfile?.fullName || 'Student',
                      periodLabel: 'Cumulative Portfolio Report',
                      metrics,
                      trades: trades.filter((t) => t.status === 'closed'),
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Download PDF Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="py-3 sm:pr-5 space-y-1">
                <div className="text-slate-500">Last 30 Days Net P/L</div>
                <div
                  className={`text-base font-mono font-bold tabular-nums ${
                    metrics.periodComparison.current30d.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {formatCurrency(metrics.periodComparison.current30d.netPnl)}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Prior 30d: {formatCurrency(metrics.periodComparison.prior30d.netPnl)}
                </div>
              </div>
              <div className="py-3 sm:px-5 space-y-1">
                <div className="text-slate-500">This Month Win Rate</div>
                <div className="text-base font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                  {metrics.periodComparison.thisMonth.winRate}%
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Last Month: {metrics.periodComparison.lastMonth.winRate}%
                </div>
              </div>
              <div className="py-3 sm:pr-5 lg:px-5 space-y-1">
                <div className="text-slate-500">Max / Current Drawdown</div>
                <div className="text-base font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                  {metrics.maxDrawdownPercent}% / {metrics.currentDrawdownPercent}%
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Compliance: {metrics.riskComplianceRate}%
                </div>
              </div>
              <div className="py-3 sm:pl-5 space-y-1">
                <div className="text-slate-500">Overall 5-Pillar Score</div>
                <div className="text-base font-mono font-bold tabular-nums text-blue-500">
                  {metrics.scores.overall.toFixed(0)} / 100
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Journal: {metrics.scores.journalCompletion}%
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Mentor Weekly & Monthly Evaluations ({myMentorReviews.length})
            </h2>

            {myMentorReviews.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No formal weekly or challenge evaluations issued by your mentor yet.
              </p>
            ) : (
              <div className="space-y-3">
                {myMentorReviews.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          {rep.periodLabel}
                        </span>
                        <span className="ml-2 capitalize text-blue-500 font-medium">
                          {rep.periodType} Review
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">
                          {formatFirestoreDate(rep.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            exportPerformanceReportPdf({
                              studentName: rep.studentName,
                              periodLabel: rep.periodLabel,
                              metrics,
                              review: rep,
                            })
                          }
                          className="px-2.5 py-1 rounded bg-blue-600/15 text-blue-500 hover:bg-blue-600/25 font-medium"
                        >
                          Export PDF
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono">
                      <div>Trades: {rep.totalTrades}</div>
                      <div>Win Rate: {rep.winRate}%</div>
                      <div>Net P/L: {formatCurrency(rep.netPnl)}</div>
                      <div>Max DD: {rep.maxDrawdownPercent}%</div>
                      <div>Violations: {rep.riskViolationsCount}</div>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">Recommendations:</span>{' '}
                      {rep.mentorRecommendations}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-8 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-5 text-xs"
          >
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Student Profile & Preferences
            </h2>

            {notice && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {notice}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1.5">Country</label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1.5">Trading Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value as StudentProfile['experienceLevel'])}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="funded">Funded / Prop</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-500 mb-1.5">
                  Broker Name (Descriptive Only — Never share credentials)
                </label>
                <input
                  type="text"
                  value={brokerName}
                  onChange={(e) => setBrokerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1.5">Preferred Instruments</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(INSTRUMENT_SPECS).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleInstrument(sym)}
                    className={`px-2.5 py-1 rounded font-mono border ${
                      preferredInstruments.includes(sym)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-[#0B111E] border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={publicLeaderboardOptIn}
                onChange={(e) => setPublicLeaderboardOptIn(e.target.checked)}
              />
              <span className="text-slate-700 dark:text-slate-200">
                Opt into public Community Performance Rankings (percentage growth & discipline scores only)
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {saving ? 'Saving...' : 'Save Profile Settings'}
            </button>
          </form>

          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-3.5 text-xs">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Account Security
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Status</span>
                  <span className="font-semibold capitalize text-emerald-500">
                    {studentProfile?.status || 'active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email Verification</span>
                  <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                    <UserCheck className="w-3.5 h-3.5" />
                    {firebaseUser?.emailVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Theme Appearance</span>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="text-blue-500 hover:underline font-medium capitalize"
                  >
                    {theme} Mode (Switch)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePasswordRecovery}
                className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Send Password Reset Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
