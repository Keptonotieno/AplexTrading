import React, { useMemo, useState } from 'react';
import { Activity, Download, Search, Users } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import {
  ACTIVITY_CATEGORY_LABELS,
  buildAllUserActivities,
  type ActivityCategory,
} from '../../lib/activityFeed';
import { formatFirestoreDate } from '../../lib/firestore-helpers';

const CATEGORY_TEXT_CLASS: Record<ActivityCategory, string> = {
  trades: 'text-blue-500',
  charts: 'text-indigo-500',
  capital: 'text-emerald-500',
  psychology: 'text-violet-500',
  risk: 'text-red-500',
  learning: 'text-amber-500',
  challenges: 'text-teal-500',
  profile: 'text-slate-500 dark:text-slate-300',
  admin: 'text-cyan-500',
};

export const AdminActivityView: React.FC = () => {
  const {
    adminProfiles,
    adminUsers,
    adminAuditLogs,
    adminAllTrades,
    adminAllTradeEditLogs,
    adminAllScreenshots,
    adminAllAccounts,
    adminAllTransactions,
    adminAllPsychology,
    adminAllViolations,
    adminAllParticipants,
    adminAllAssignments,
    adminAllTradeReviews,
    adminAllMentorReviews,
    challengeCycles,
  } = useMentorship();

  const [userFilter, setUserFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ActivityCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(50);

  const allActivities = useMemo(
    () =>
      buildAllUserActivities({
        profiles: adminProfiles,
        users: adminUsers,
        auditLogs: adminAuditLogs,
        trades: adminAllTrades,
        tradeEditLogs: adminAllTradeEditLogs,
        screenshots: adminAllScreenshots,
        accounts: adminAllAccounts,
        transactions: adminAllTransactions,
        psychology: adminAllPsychology,
        violations: adminAllViolations,
        participants: adminAllParticipants,
        assignments: adminAllAssignments,
        tradeReviews: adminAllTradeReviews,
        mentorReviews: adminAllMentorReviews,
        cycles: challengeCycles,
      }),
    [
      adminProfiles,
      adminUsers,
      adminAuditLogs,
      adminAllTrades,
      adminAllTradeEditLogs,
      adminAllScreenshots,
      adminAllAccounts,
      adminAllTransactions,
      adminAllPsychology,
      adminAllViolations,
      adminAllParticipants,
      adminAllAssignments,
      adminAllTradeReviews,
      adminAllMentorReviews,
      challengeCycles,
    ]
  );

  const distinctUsers = useMemo(() => {
    const map = new Map<string, { uid: string; label: string; count: number }>();
    for (const item of allActivities) {
      const existing = map.get(item.userId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(item.userId, {
          uid: item.userId,
          label: item.userName,
          count: 1,
        });
      }
    }
    adminProfiles.forEach((p) => {
      if (!map.has(p.uid)) {
        map.set(p.uid, { uid: p.uid, label: p.fullName, count: 0 });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allActivities, adminProfiles]);

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allActivities.filter((item) => {
      if (userFilter !== 'all' && item.userId !== userFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (q) {
        const hay = `${item.userName} ${item.userEmail || ''} ${item.actionLabel} ${item.summary} ${item.targetId || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allActivities, userFilter, categoryFilter, searchQuery]);

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const todayCount = useMemo(
    () => allActivities.filter((a) => a.timestamp.slice(0, 10) === todayPrefix).length,
    [allActivities, todayPrefix]
  );
  const tradeAndChartCount = useMemo(
    () => allActivities.filter((a) => a.category === 'trades' || a.category === 'charts').length,
    [allActivities]
  );
  const capitalAndRiskCount = useMemo(
    () => allActivities.filter((a) => a.category === 'capital' || a.category === 'risk').length,
    [allActivities]
  );

  const visibleItems = filteredActivities.slice(0, visibleLimit);

  const exportCsv = () => {
    const header = ['Timestamp', 'User', 'Email', 'Category', 'Action', 'Details', 'ReferenceId'];
    const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = filteredActivities.map((item) =>
      [
        item.timestamp,
        item.userName,
        item.userEmail || '',
        ACTIVITY_CATEGORY_LABELS[item.category],
        item.actionLabel,
        item.summary,
        item.targetId || '',
      ]
        .map(escapeCell)
        .join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-user-activities-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            All Users Activity Monitor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Unified real-time stream of trades, chart uploads, capital movements, psychology check-ins, risk alerts, and profile changes across all users
          </p>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredActivities.length === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 disabled:opacity-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Activity CSV
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5">
          <div className="text-xs text-slate-500">Total Recorded Activities</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
            {allActivities.length}
          </div>
          <div className="text-xs text-blue-500 mt-1.5 font-mono tabular-nums">
            {todayCount} logged today
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5">
          <div className="text-xs text-slate-500">Tracked Users & Mentors</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
            {distinctUsers.length}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {distinctUsers.filter((u) => u.count > 0).length} with recorded events
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5">
          <div className="text-xs text-slate-500">Trade & Chart Activity</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
            {tradeAndChartCount}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Journal entries, edits & screenshots
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5">
          <div className="text-xs text-slate-500">Capital & Risk Events</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1.5">
            {capitalAndRiskCount}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Accounts, deposits, withdrawals & breaches
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
        <div className="md:col-span-5 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleLimit(50);
            }}
            placeholder="Search user name, email, instrument, action, or details..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="md:col-span-4">
          <select
            aria-label="Filter activities by user"
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setVisibleLimit(50);
            }}
            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Users ({allActivities.length} events)</option>
            {distinctUsers.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.label} ({u.count})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            aria-label="Filter activities by category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as typeof categoryFilter);
              setVisibleLimit(50);
            }}
            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {(Object.keys(ACTIVITY_CATEGORY_LABELS) as ActivityCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {ACTIVITY_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Activity className="w-4 h-4 text-blue-500" />
            <span>Chronological User Activity Feed ({filteredActivities.length})</span>
          </div>
          {userFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setUserFilter('all')}
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              Show All Users
            </button>
          )}
        </div>

        {visibleItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No user activities match the active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B111E] text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Timestamp</th>
                  <th className="py-3 px-3 whitespace-nowrap">User</th>
                  <th className="py-3 px-3 whitespace-nowrap">Category</th>
                  <th className="py-3 px-3 whitespace-nowrap">Action</th>
                  <th className="py-3 px-4">Activity Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {visibleItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 align-top"
                  >
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {formatFirestoreDate(item.timestamp)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setUserFilter(item.userId)}
                        className="font-semibold text-slate-900 dark:text-white hover:text-blue-500 text-left"
                      >
                        {item.userName}
                      </button>
                      {item.userEmail && item.userEmail !== item.userName && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.userEmail}
                        </div>
                      )}
                    </td>
                    <td
                      className={`py-3 px-3 font-medium whitespace-nowrap ${CATEGORY_TEXT_CLASS[item.category]}`}
                    >
                      {ACTIVITY_CATEGORY_LABELS[item.category]}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {item.actionLabel}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 leading-relaxed min-w-[260px]">
                      <span>{item.summary}</span>
                      {item.targetId && (
                        <span className="ml-2 text-[11px] font-mono text-slate-400">
                          #{item.targetId.slice(0, 12)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredActivities.length > visibleLimit && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={() => setVisibleLimit((prev) => prev + 50)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Load 50 More ({filteredActivities.length - visibleLimit} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
