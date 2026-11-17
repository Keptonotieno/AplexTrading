import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import {
  computePortfolioMetrics,
  formatCurrency,
  formatPlainCurrency,
  INSTRUMENT_SPECS,
  STRATEGY_OPTIONS,
} from '../../lib/forexCalculations';
import {
  adminSaveRiskPolicy,
  adminSendNotification,
  adminSubmitTradeReview,
  adminUpdateStudentStatus,
  adminUpdateUserRole,
  fetchPrivateUserInfo,
} from '../../services/mentorshipService';
import type { PrivateUserInfo, ReviewAssessment, TradeRecord, UserRole } from '../../types/domain';
import type { AdminTab } from '../AppShell';
import { AuthenticatedImage } from '../AuthenticatedImage';

export const AdminOverview: React.FC<{ onNavigate: (tab: AdminTab) => void }> = ({
  onNavigate,
}) => {
  const {
    adminProfiles,
    adminAllTrades,
    adminAllTradeReviews,
    adminAllViolations,
    challengeCycles,
    adminAllAssignments,
  } = useMentorship();

  const reviewedTradeIds = useMemo(
    () => new Set(adminAllTradeReviews.map((r) => r.tradeId)),
    [adminAllTradeReviews]
  );

  const unreviewedTrades = useMemo(
    () => adminAllTrades.filter((t) => t.status !== 'draft' && !reviewedTradeIds.has(t.id)),
    [adminAllTrades, reviewedTradeIds]
  );

  const openViolations = useMemo(
    () => adminAllViolations.filter((v) => !v.acknowledged),
    [adminAllViolations]
  );

  const pendingAssignments = useMemo(
    () => adminAllAssignments.filter((a) => a.status === 'submitted'),
    [adminAllAssignments]
  );

  const activeCycle = challengeCycles.find((c) => c.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Mentor Command Overview
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Centralized cohort monitoring, pending journal reviews, risk alerts, and mentorship operations
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <button
          type="button"
          onClick={() => onNavigate('students')}
          className="text-left bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 hover:border-blue-500/40 transition-colors"
        >
          <div className="text-xs text-slate-500">Enrolled Students</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {adminProfiles.length}
          </div>
          <div className="text-xs text-blue-500 mt-1">Manage profiles →</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('reviews')}
          className="text-left bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 hover:border-blue-500/40 transition-colors"
        >
          <div className="text-xs text-slate-500">Trades Pending Review</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-500 mt-1">
            {unreviewedTrades.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Out of {adminAllTrades.length} total trades
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('risk_psych')}
          className="text-left bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 hover:border-blue-500/40 transition-colors"
        >
          <div className="text-xs text-slate-500">Unacknowledged Risk Alerts</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-red-500 mt-1">
            {openViolations.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {adminAllViolations.length} total logged
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('challenges')}
          className="text-left bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 hover:border-blue-500/40 transition-colors"
        >
          <div className="text-xs text-slate-500">Active Challenge Cycle</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1.5 truncate">
            {activeCycle ? activeCycle.title : 'None Active'}
          </div>
          <div className="text-xs text-emerald-500 mt-1">
            {pendingAssignments.length} pending assignments
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recent Student Trades
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('reviews')}
              className="text-xs text-blue-500 hover:underline"
            >
              Review Queue →
            </button>
          </div>
          {adminAllTrades.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No student trades logged yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {adminAllTrades.slice(0, 6).map((t) => {
                const student = adminProfiles.find((p) => p.uid === t.userId);
                return (
                  <div key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {student?.fullName || t.userId.slice(0, 8)}
                      </span>
                      <span className="text-slate-500 ml-2 font-mono">
                        {t.instrument} {t.direction}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono font-semibold ${
                          t.netPnl === undefined
                            ? 'text-slate-400'
                            : t.netPnl >= 0
                            ? 'text-emerald-500'
                            : 'text-red-500'
                        }`}
                      >
                        {t.netPnl !== undefined ? formatCurrency(t.netPnl) : t.status}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {formatFirestoreDate(t.openedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recent Risk Rule Violations
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('risk_psych')}
              className="text-xs text-blue-500 hover:underline"
            >
              Risk Monitor →
            </button>
          </div>
          {adminAllViolations.length === 0 ? (
            <p className="text-xs text-emerald-500 py-6 text-center">
              All students are currently within programme risk thresholds.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {adminAllViolations.slice(0, 6).map((v) => {
                const student = adminProfiles.find((p) => p.uid === v.userId);
                return (
                  <div key={v.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {student?.fullName || v.userId.slice(0, 8)}
                      </div>
                      <div className="text-red-500 truncate">{v.policyRule}</div>
                    </div>
                    <span className="font-mono text-slate-400 whitespace-nowrap">
                      {formatFirestoreDate(v.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminStudentsView: React.FC = () => {
  const {
    firebaseUser,
    adminUsers,
    adminProfiles,
    adminAllTrades,
    adminAllAccounts,
    adminAllTransactions,
    adminAllViolations,
    adminAllPsychology,
    systemSettings,
  } = useMentorship();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [privateContact, setPrivateContact] = useState<PrivateUserInfo | null>(null);
  const [notifMsg, setNotifMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    return adminProfiles.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (search.trim() && !p.fullName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [adminProfiles, statusFilter, search]);

  const selectedProfile = adminProfiles.find((p) => p.uid === selectedUid) || null;
  const selectedMetrics = useMemo(() => {
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

  const inspectStudent = async (uid: string) => {
    setSelectedUid(uid);
    const info = await fetchPrivateUserInfo(uid).catch(() => null);
    setPrivateContact(info);
  };

  const selectedUserRecord = adminUsers.find((u) => u.uid === selectedUid) || null;

  const handleStatusChange = async (uid: string, status: 'active' | 'suspended') => {
    if (!firebaseUser) return;
    setBusy(true);
    try {
      await adminUpdateStudentStatus({
        studentId: uid,
        status,
        actorId: firebaseUser.uid,
        actorEmail: firebaseUser.email || undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!firebaseUser || !selectedUserRecord || selectedUserRecord.role === newRole) return;
    setBusy(true);
    try {
      await adminUpdateUserRole({
        targetUser: selectedUserRecord,
        newRole,
        targetEmail: privateContact?.email,
        actorId: firebaseUser.uid,
        actorEmail: firebaseUser.email || undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUid || !notifMsg.trim()) return;
    setBusy(true);
    try {
      await adminSendNotification({
        recipientId: selectedUid,
        type: 'mentor_feedback',
        title: 'Direct Message from Mentor',
        message: notifMsg.trim(),
        linkTab: 'notifications',
      });
      setNotifMsg('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Student Management & Profiles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitor student progress, verify account status, and inspect isolated student profiles
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name..."
              className="pl-8 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3.5 py-2 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        <div className="lg:col-span-7 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              <Users className="w-7 h-7 mx-auto mb-2 opacity-50" />
              No students found matching filter.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B111E] text-slate-500">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-3">Experience</th>
                  <th className="py-3 px-3 text-right">Trades</th>
                  <th className="py-3 px-3 text-right">Net P/L</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((stu) => {
                  const stTrades = adminAllTrades.filter((t) => t.userId === stu.uid);
                  const netPnl = stTrades
                    .filter((t) => t.status === 'closed')
                    .reduce((s, t) => s + (t.netPnl ?? 0), 0);
                  return (
                    <tr
                      key={stu.uid}
                      onClick={() => inspectStudent(stu.uid)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer ${
                        selectedUid === stu.uid ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {stu.fullName}
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-500">
                        {stu.experienceLevel}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {stTrades.length}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${
                          netPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        {formatCurrency(netPnl)}
                      </td>
                      <td className="py-3 px-3 capitalize">
                        <span
                          className={
                            stu.status === 'active'
                              ? 'text-emerald-500'
                              : stu.status === 'suspended'
                              ? 'text-red-500'
                              : 'text-amber-500'
                          }
                        >
                          {stu.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Eye className="w-4 h-4 inline text-blue-500" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Individual Student Profile Inspector */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-4">
          {!selectedProfile || !selectedMetrics ? (
            <p className="text-xs text-slate-500 py-10 text-center">
              Select any student row to view full profile, accounts, metrics, and status controls.
            </p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedProfile.fullName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {privateContact?.email || 'Email loading...'} · {privateContact?.country || '—'}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {selectedProfile.status !== 'active' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleStatusChange(selectedProfile.uid, 'active')}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 text-white"
                    >
                      Approve
                    </button>
                  )}
                  {selectedProfile.status !== 'suspended' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleStatusChange(selectedProfile.uid, 'suspended')}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-red-600 text-white"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E]">
                  <div className="text-slate-500">Account Balance</div>
                  <div className="font-mono font-bold mt-0.5">
                    {formatPlainCurrency(selectedMetrics.currentAccountBalance)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E]">
                  <div className="text-slate-500">Win Rate</div>
                  <div className="font-mono font-bold mt-0.5">
                    {selectedMetrics.winRate}% ({selectedMetrics.closedTradesCount} closed)
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E]">
                  <div className="text-slate-500">Risk Compliance</div>
                  <div className="font-mono font-bold mt-0.5">
                    {selectedMetrics.riskComplianceRate}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E]">
                  <div className="text-slate-500">5-Pillar Score</div>
                  <div className="font-mono font-bold text-blue-500 mt-0.5">
                    {selectedMetrics.scores.overall}/100
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-2">
                <div>
                  Preferred Pairs:{' '}
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedProfile.preferredInstruments.join(', ')}
                  </span>
                </div>
                <div>
                  Broker (Descriptive): {selectedProfile.brokerName || 'Not specified'}
                </div>
                {selectedUserRecord && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      Platform Role (Audited)
                    </span>
                    <select
                      aria-label="User platform role"
                      disabled={busy || selectedUserRecord.uid === firebaseUser?.uid}
                      value={selectedUserRecord.role}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="px-2.5 py-1 text-xs rounded-md bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                    >
                      <option value="student">Student</option>
                      <option value="mentor">Mentor / Admin</option>
                    </select>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendDirectMessage} className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                  Send Direct Notification to Student
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={notifMsg}
                    onChange={(e) => setNotifMsg(e.target.value)}
                    placeholder="Feedback or reminder message..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={busy || !notifMsg.trim()}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminReviewsView: React.FC = () => {
  const {
    firebaseUser,
    studentProfile,
    adminProfiles,
    adminAllTrades,
    adminAllScreenshots,
    adminAllTradeReviews,
    challengeCycles,
  } = useMentorship();

  const [studentFilter, setStudentFilter] = useState('all');
  const [instrumentFilter, setInstrumentFilter] = useState('all');
  const [strategyFilter, setStrategyFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);

  const [assessment, setAssessment] = useState<ReviewAssessment>('compliant');
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [clarificationRequested, setClarificationRequested] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredTrades = useMemo(() => {
    return adminAllTrades.filter((t) => {
      if (studentFilter !== 'all' && t.userId !== studentFilter) return false;
      if (instrumentFilter !== 'all' && t.instrument !== instrumentFilter) return false;
      if (strategyFilter !== 'all' && t.strategy !== strategyFilter) return false;
      if (cycleFilter !== 'all' && t.challengeCycleId !== cycleFilter) return false;
      return true;
    });
  }, [adminAllTrades, studentFilter, instrumentFilter, strategyFilter, cycleFilter]);

  const activeTrade = selectedTrade || filteredTrades[0] || null;
  const activeShots = activeTrade
    ? adminAllScreenshots.filter((s) => s.tradeId === activeTrade.id)
    : [];
  const activeReviews = activeTrade
    ? adminAllTradeReviews.filter((r) => r.tradeId === activeTrade.id)
    : [];

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !activeTrade || !comment.trim()) return;
    setSaving(true);
    try {
      await adminSubmitTradeReview({
        trade: activeTrade,
        mentorId: firebaseUser.uid,
        mentorName: studentProfile?.fullName || firebaseUser.displayName || 'Mentor',
        assessment,
        rating,
        comment: comment.trim(),
        clarificationRequested,
        recommendations: recommendations.trim() || undefined,
      });
      setComment('');
      setRecommendations('');
      setClarificationRequested(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Journal & Trade Screenshot Reviews
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Filter student setups by student, cycle, instrument, or strategy and provide chart-level critiques
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
        >
          <option value="all">All Students</option>
          {adminProfiles.map((p) => (
            <option key={p.uid} value={p.uid}>
              {p.fullName}
            </option>
          ))}
        </select>
        <select
          value={instrumentFilter}
          onChange={(e) => setInstrumentFilter(e.target.value)}
          className="px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
        >
          <option value="all">All Instruments</option>
          {Object.keys(INSTRUMENT_SPECS).map((sym) => (
            <option key={sym} value={sym}>
              {sym}
            </option>
          ))}
        </select>
        <select
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
        >
          <option value="all">All Strategies</option>
          {STRATEGY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={cycleFilter}
          onChange={(e) => setCycleFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
        >
          <option value="all">All Challenge Cycles</option>
          {challengeCycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Trade List */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-2 max-h-[650px] overflow-y-auto">
          {filteredTrades.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No trades match these filters.</p>
          ) : (
            filteredTrades.map((t) => {
              const stu = adminProfiles.find((p) => p.uid === t.userId);
              const shotCount = adminAllScreenshots.filter((s) => s.tradeId === t.id).length;
              const isSelected = activeTrade?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTrade(t)}
                  className={`w-full p-3 rounded-lg border text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500/30'
                      : 'bg-slate-50 dark:bg-[#0B111E] border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-900 dark:text-white">
                      {stu?.fullName || 'Student'} · {t.instrument} {t.direction}
                    </span>
                    <span className={t.netPnl && t.netPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                      {t.netPnl !== undefined ? formatCurrency(t.netPnl) : t.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                    <span>{t.strategy}</span>
                    <span>
                      {shotCount} screenshot{shotCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected Trade Inspection & Mentor Review Form */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-4">
          {!activeTrade ? (
            <p className="text-xs text-slate-500 py-10 text-center">
              Select a trade on the left to inspect charts and submit mentor feedback.
            </p>
          ) : (
            <>
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeTrade.instrument} {activeTrade.direction} · {activeTrade.strategy}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Entry {activeTrade.entryPrice} · SL {activeTrade.stopLoss} · TP{' '}
                  {activeTrade.takeProfit ?? '—'} · Risk {activeTrade.plannedRiskPercent}% · Lots{' '}
                  {activeTrade.lotSize}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Entry Justification:
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {activeTrade.entryJustification || 'None provided.'}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Lessons Learned:
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {activeTrade.lessonsLearned || 'None provided.'}
                  </p>
                </div>
              </div>

              {activeShots.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeShots.map((shot) => (
                    <div
                      key={shot.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-[#0B111E]"
                    >
                      <AuthenticatedImage
                        src={shot.imageUrl}
                        alt={shot.caption || shot.stage}
                        className="w-full h-40 object-cover"
                      />
                      <div className="p-2.5 text-xs">
                        <div className="font-semibold text-blue-500 uppercase text-[10px]">
                          {shot.stage.replace('_', ' ')}
                        </div>
                        {shot.caption && <div className="font-medium mt-0.5">{shot.caption}</div>}
                        {shot.marketStructureNotes && (
                          <div className="text-slate-500 mt-0.5">{shot.marketStructureNotes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={handleReviewSubmit}
                className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3 text-xs"
              >
                <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Submit Mentor Critique
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value as ReviewAssessment)}
                    className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                  >
                    <option value="exemplary">Exemplary Execution</option>
                    <option value="compliant">Plan Compliant</option>
                    <option value="needs_clarification">Needs Clarification</option>
                    <option value="rule_violation">Rule Violation</option>
                  </select>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                  >
                    <option value={5}>Rating: 5 / 5</option>
                    <option value={4}>Rating: 4 / 5</option>
                    <option value={3}>Rating: 3 / 5</option>
                    <option value={2}>Rating: 2 / 5</option>
                    <option value={1}>Rating: 1 / 5</option>
                  </select>
                </div>

                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Provide specific technical, risk, and execution feedback..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                />
                <input
                  type="text"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Recommended action items for next session (optional)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clarificationRequested}
                    onChange={(e) => setClarificationRequested(e.target.checked)}
                  />
                  <span>Request student clarification on entry / stop placement</span>
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {saving ? 'Publishing Feedback...' : 'Publish Mentor Review'}
                </button>
              </form>

              {activeReviews.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold text-slate-500">Previous Reviews</div>
                  {activeReviews.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="flex justify-between font-semibold">
                        <span className="capitalize text-blue-500">
                          {r.assessment.replace('_', ' ')} ({r.rating}/5)
                        </span>
                        <span className="text-slate-400">{formatFirestoreDate(r.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminRiskAndPsychView: React.FC = () => {
  const {
    firebaseUser,
    riskPolicy,
    adminAllViolations,
    adminAllPsychology,
    adminProfiles,
  } = useMentorship();

  const [maxRisk, setMaxRisk] = useState(String(riskPolicy.maxRiskPerTradePercent));
  const [maxDaily, setMaxDaily] = useState(String(riskPolicy.maxDailyLossPercent));
  const [maxDd, setMaxDd] = useState(String(riskPolicy.maxDrawdownPercent));
  const [maxLosses, setMaxLosses] = useState(String(riskPolicy.maxConsecutiveLosses));
  const [maxOpen, setMaxOpen] = useState(String(riskPolicy.maxOpenExposurePercent));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMaxRisk(String(riskPolicy.maxRiskPerTradePercent));
    setMaxDaily(String(riskPolicy.maxDailyLossPercent));
    setMaxDd(String(riskPolicy.maxDrawdownPercent));
    setMaxLosses(String(riskPolicy.maxConsecutiveLosses));
    setMaxOpen(String(riskPolicy.maxOpenExposurePercent));
  }, [riskPolicy]);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    await adminSaveRiskPolicy({
      id: 'default',
      name: riskPolicy.name || 'Standard Mentorship Risk Policy',
      maxRiskPerTradePercent: Number(maxRisk) || 1,
      maxDailyLossPercent: Number(maxDaily) || 2,
      maxDrawdownPercent: Number(maxDd) || 6,
      maxConsecutiveLosses: Number(maxLosses) || 3,
      maxOpenExposurePercent: Number(maxOpen) || 3,
      updatedBy: firebaseUser.uid,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Risk Policies & Psychology Monitoring
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure mentorship risk thresholds and monitor student violations and psychological patterns
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        <form
          onSubmit={handleSavePolicy}
          className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-3.5 text-xs"
        >
          <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            Configure Programme Risk Rules
          </div>
          {saved && (
            <div className="p-2.5 rounded bg-emerald-500/10 text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Risk policy updated across all student workspaces.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Max Risk / Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={maxRisk}
                onChange={(e) => setMaxRisk(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Max Daily Loss (%)</label>
              <input
                type="number"
                step="0.1"
                value={maxDaily}
                onChange={(e) => setMaxDaily(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Max Drawdown (%)</label>
              <input
                type="number"
                step="0.5"
                value={maxDd}
                onChange={(e) => setMaxDd(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Max Open Exposure (%)</label>
              <input
                type="number"
                step="0.5"
                value={maxOpen}
                onChange={(e) => setMaxOpen(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-500 mb-1">Max Consecutive Losses</label>
              <input
                type="number"
                value={maxLosses}
                onChange={(e) => setMaxLosses(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Save Risk Policy
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Cohort Risk Violations ({adminAllViolations.length})
            </h2>
            <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
              {adminAllViolations.length === 0 ? (
                <p className="text-slate-500">No violations recorded.</p>
              ) : (
                adminAllViolations.map((v) => {
                  const stu = adminProfiles.find((p) => p.uid === v.userId);
                  return (
                    <div
                      key={v.id}
                      className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 flex justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold">{stu?.fullName || 'Student'}: </span>
                        <span className="text-red-500">{v.policyRule}</span>
                      </div>
                      <span className="font-mono text-slate-400">
                        {formatFirestoreDate(v.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Student Psychology Check-Ins ({adminAllPsychology.length})
            </h2>
            <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
              {adminAllPsychology.slice(0, 12).map((a) => {
                const stu = adminProfiles.find((p) => p.uid === a.userId);
                return (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex justify-between font-semibold">
                      <span>
                        {stu?.fullName || 'Student'} · {a.emotionalState}
                      </span>
                      <span className="font-mono text-slate-400">
                        Conf {a.confidenceLevel}/10 · FOMO {a.fomoLevel}/10
                      </span>
                    </div>
                    {a.notes && <p className="text-slate-500 mt-0.5">{a.notes}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
