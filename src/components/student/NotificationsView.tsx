import React, { useMemo, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import { markNotificationRead } from '../../services/mentorshipService';
import type { StudentTab } from '../AppShell';

export const NotificationsView: React.FC<{ onNavigate: (tab: StudentTab) => void }> = ({
  onNavigate,
}) => {
  const { notifications } = useMentorship();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const items = useMemo(() => {
    const sorted = [...notifications].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    );
    return filter === 'unread' ? sorted.filter((n) => !n.read) : sorted;
  }, [notifications, filter]);

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationRead(n.id, true)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mentor feedback alerts, risk rule notifications, weekly reviews, and programme updates
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                filter === 'all'
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white'
                  : 'text-slate-500'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                filter === 'unread'
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white'
                  : 'text-slate-500'
              }`}
            >
              Unread ({notifications.filter((n) => !n.read).length})
            </button>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All Read
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/60">
        {items.length === 0 ? (
          <div className="p-12 text-center space-y-2.5 text-xs text-slate-500">
            <Bell className="w-7 h-7 mx-auto opacity-50" />
            <p>No notifications in this view.</p>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex flex-wrap items-start justify-between gap-4 ${
                !n.read ? 'bg-blue-500/5' : ''
              }`}
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">{n.title}</span>
                  <span className="text-[11px] capitalize text-blue-500">
                    {n.type.replace('_', ' ')}
                  </span>
                  {!n.read && <span className="text-[11px] font-medium text-amber-500">· Unread</span>}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                <div className="text-[11px] text-slate-400 font-mono">
                  {formatFirestoreDate(n.createdAt)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {n.linkTab && (
                  <button
                    type="button"
                    onClick={() => {
                      markNotificationRead(n.id, true);
                      onNavigate(n.linkTab as StudentTab);
                    }}
                    className="px-2.5 py-1 text-xs font-medium rounded bg-blue-600/15 text-blue-500 hover:bg-blue-600/25"
                  >
                    Open
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => markNotificationRead(n.id, !n.read)}
                  className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  title={n.read ? 'Mark unread' : 'Mark read'}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
