import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  NotebookPen,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { formatCurrency, INSTRUMENT_SPECS } from '../../lib/forexCalculations';
import {
  deleteDailyTradingSummary,
  saveDailyTradingSummary,
} from '../../services/mentorshipService';
import type { DailyTradingSummary } from '../../types/domain';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatCalendarDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return dateStr;
  }
  const local = new Date(year, month - 1, day);
  return local.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const KNOWN_PAIRS = Object.keys(INSTRUMENT_SPECS);

export const DailyTradingSummaryCard: React.FC = () => {
  const {
    firebaseUser,
    activeAccount,
    activeAccountId,
    dailySummaries,
    studentProfile,
  } = useMentorship();

  const todayStr = useMemo(() => getTodayDateString(), []);
  const defaultPair = useMemo(() => {
    const preferred = studentProfile?.preferredInstruments?.[0];
    return preferred || 'EURUSD';
  }, [studentProfile?.preferredInstruments]);

  const currency = activeAccount?.currency || 'USD';

  // Form state
  const [editingEntry, setEditingEntry] = useState<DailyTradingSummary | null>(null);
  const [summaryDate, setSummaryDate] = useState<string>(todayStr);
  const [pairSelect, setPairSelect] = useState<string>(
    KNOWN_PAIRS.includes(defaultPair) ? defaultPair : '__custom__'
  );
  const [customPair, setCustomPair] = useState<string>(
    KNOWN_PAIRS.includes(defaultPair) ? '' : defaultPair
  );
  const [outcomeSign, setOutcomeSign] = useState<'profit' | 'loss'>('profit');
  const [pnlInput, setPnlInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // List & feedback state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'profit' | 'loss'>('all');
  const [saving, setSaving] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const resetForm = () => {
    setEditingEntry(null);
    setSummaryDate(todayStr);
    const fallbackPair = KNOWN_PAIRS.includes(defaultPair) ? defaultPair : '__custom__';
    setPairSelect(fallbackPair);
    setCustomPair(fallbackPair === '__custom__' ? defaultPair : '');
    setOutcomeSign('profit');
    setPnlInput('');
    setNotes('');
    setErrorMsg(null);
  };

  const handleStartEdit = (item: DailyTradingSummary) => {
    setEditingEntry(item);
    setSummaryDate(item.summaryDate);
    if (KNOWN_PAIRS.includes(item.pair)) {
      setPairSelect(item.pair);
      setCustomPair('');
    } else {
      setPairSelect('__custom__');
      setCustomPair(item.pair);
    }
    setOutcomeSign(item.pnl < 0 ? 'loss' : 'profit');
    setPnlInput(String(Math.abs(item.pnl)));
    setNotes(item.notes);
    setErrorMsg(null);
    setSavedNotice(null);
  };

  const handlePnlChange = (raw: string) => {
    if (raw.startsWith('-')) {
      setOutcomeSign('loss');
      setPnlInput(raw.slice(1));
      return;
    }
    if (raw.startsWith('+')) {
      setOutcomeSign('profit');
      setPnlInput(raw.slice(1));
      return;
    }
    setPnlInput(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    setErrorMsg(null);
    setSavedNotice(null);

    const resolvedPair = (pairSelect === '__custom__' ? customPair : pairSelect)
      .trim()
      .toUpperCase();
    if (resolvedPair.length < 2 || resolvedPair.length > 20) {
      setErrorMsg('Enter a valid trading pair or instrument symbol (2–20 characters).');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(summaryDate)) {
      setErrorMsg('Choose a valid summary date.');
      return;
    }

    const numericMagnitude = Number(pnlInput);
    if (pnlInput.trim() === '' || !Number.isFinite(numericMagnitude)) {
      setErrorMsg('Enter a numeric P&L amount (e.g., 145.50 or 0 for breakeven).');
      return;
    }
    if (Math.abs(numericMagnitude) > 100000000) {
      setErrorMsg('P&L amount is out of supported range.');
      return;
    }

    const signedPnl =
      numericMagnitude === 0
        ? 0
        : outcomeSign === 'loss'
        ? -Math.abs(numericMagnitude)
        : Math.abs(numericMagnitude);

    const trimmedNotes = notes.trim();
    if (!trimmedNotes) {
      setErrorMsg('Add brief trade notes summarizing execution, setup context, or takeaways.');
      return;
    }

    setSaving(true);
    try {
      await saveDailyTradingSummary({
        existingSummary: editingEntry ?? undefined,
        userId: firebaseUser.uid,
        accountId:
          editingEntry?.accountId ||
          (activeAccountId !== 'all' ? activeAccountId : activeAccount?.id),
        summaryDate,
        pair: resolvedPair,
        currency: editingEntry?.currency || currency,
        pnl: signedPnl,
        notes: trimmedNotes,
      });

      const wasEdit = Boolean(editingEntry);
      resetForm();
      setSavedNotice(
        wasEdit
          ? `Updated ${resolvedPair} daily summary.`
          : `Saved ${resolvedPair} daily summary (${formatCurrency(signedPnl, currency)}).`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save daily trading summary.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: DailyTradingSummary) => {
    if (!firebaseUser) return;
    setDeletingId(item.id);
    setErrorMsg(null);
    setSavedNotice(null);
    try {
      await deleteDailyTradingSummary(item, firebaseUser.uid);
      if (editingEntry?.id === item.id) {
        resetForm();
      }
      setConfirmDeleteId(null);
      setSavedNotice(`Deleted ${item.pair} summary (${item.summaryDate}).`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to delete daily summary.');
    } finally {
      setDeletingId(null);
    }
  };

  const todayStats = useMemo(() => {
    const todayEntries = dailySummaries.filter((item) => item.summaryDate === todayStr);
    const todayNet = todayEntries.reduce((sum, item) => sum + item.pnl, 0);
    return {
      countToday: todayEntries.length,
      todayNet,
      totalCount: dailySummaries.length,
    };
  }, [dailySummaries, todayStr]);

  const filteredSummaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dailySummaries.filter((item) => {
      if (outcomeFilter === 'profit' && item.pnl < 0) return false;
      if (outcomeFilter === 'loss' && item.pnl >= 0) return false;
      if (q) {
        const hay = `${item.pair} ${item.notes} ${item.summaryDate}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dailySummaries, searchQuery, outcomeFilter]);

  const fieldClass =
    'w-full h-10 px-3 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#0F172A] focus:outline-none focus-visible:border-blue-600 dark:focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 transition-colors';

  return (
    <section
      aria-labelledby="daily-summary-heading"
      className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 space-y-6"
    >
      {/* Card Header + Unboxed Summary Telemetry */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <NotebookPen className="w-4 h-4 text-blue-500 shrink-0" />
            <h2
              id="daily-summary-heading"
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              Daily Trading Summary
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log realized P&amp;L, trading pair, and session notes directly from your dashboard
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Today&apos;s Net:{' '}
            <strong
              className={`font-mono tabular-nums font-semibold ${
                todayStats.todayNet > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : todayStats.todayNet < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {formatCurrency(todayStats.todayNet, currency)}
            </strong>
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            ·
          </span>
          <span className="font-mono tabular-nums">
            {todayStats.countToday} today / {todayStats.totalCount} total
          </span>
        </div>
      </div>

      {/* Main Split: Direct Entry Form (5 cols) | Logged Summaries List (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left: Input Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {editingEntry ? `Edit Summary · ${editingEntry.pair}` : 'New Daily Entry'}
            </h3>
            {editingEntry && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                Cancel Edit
              </button>
            )}
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-400"
            >
              {errorMsg}
            </div>
          )}

          {savedNotice && (
            <div
              role="status"
              className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="daily-summary-pair"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Trading Pair *
              </label>
              <select
                id="daily-summary-pair"
                value={pairSelect}
                onChange={(e) => setPairSelect(e.target.value)}
                className={fieldClass}
              >
                {KNOWN_PAIRS.map((sym) => (
                  <option key={sym} value={sym}>
                    {INSTRUMENT_SPECS[sym].label} ({sym})
                  </option>
                ))}
                <option value="__custom__">Custom Pair / Asset…</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="daily-summary-date"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Date *
              </label>
              <input
                id="daily-summary-date"
                type="date"
                required
                value={summaryDate}
                onChange={(e) => setSummaryDate(e.target.value)}
                className={`${fieldClass} font-mono tabular-nums`}
              />
            </div>
          </div>

          {pairSelect === '__custom__' && (
            <div>
              <label
                htmlFor="daily-summary-custom-pair"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Custom Pair Symbol *
              </label>
              <input
                id="daily-summary-custom-pair"
                type="text"
                maxLength={20}
                required
                value={customPair}
                onChange={(e) => setCustomPair(e.target.value.toUpperCase())}
                placeholder="e.g. XAUUSD, BTCUSD, EURJPY"
                className={`${fieldClass} font-mono uppercase`}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="daily-summary-pnl"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Realized P&amp;L ({currency}) *
              </label>
              <div
                role="group"
                aria-label="P&L outcome direction"
                className="inline-flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => setOutcomeSign('profit')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    outcomeSign === 'profit'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Profit (+)
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomeSign('loss')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    outcomeSign === 'loss'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Loss (−)
                </button>
              </div>
            </div>

            <div className="relative">
              <span
                className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold ${
                  outcomeSign === 'loss'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {outcomeSign === 'loss' ? '−' : '+'} {currency}
              </span>
              <input
                id="daily-summary-pnl"
                type="number"
                step="0.01"
                min="0"
                required
                value={pnlInput}
                onChange={(e) => handlePnlChange(e.target.value)}
                placeholder="0.00"
                className={`${fieldClass} pl-16 font-mono tabular-nums`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="daily-summary-notes"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Trade Notes *
              </label>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {notes.length} / 2000
              </span>
            </div>
            <textarea
              id="daily-summary-notes"
              rows={3}
              maxLength={2000}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summarize setups taken, session bias, risk adherence, or key lessons from today..."
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#0F172A] focus:outline-none focus-visible:border-blue-600 dark:focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 transition-colors resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
          >
            {saving
              ? 'Saving Summary...'
              : editingEntry
              ? 'Update Daily Summary'
              : 'Save Daily Summary'}
          </button>
        </form>

        {/* Right: Recent Daily Summaries Feed */}
        <div className="lg:col-span-7 lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-8 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Search & Outcome Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  aria-label="Search daily summaries"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pair, date, or notes..."
                  className="w-full h-9 pl-8 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus-visible:border-blue-600"
                />
              </div>

              <div
                role="group"
                aria-label="Filter daily summaries by outcome"
                className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                {(['all', 'profit', 'loss'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setOutcomeFilter(tab)}
                    className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                      outcomeFilter === tab
                        ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Populated vs Empty State */}
            {dailySummaries.length === 0 ? (
              <div className="py-10 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  No Daily Summaries Logged Yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Use the form beside this panel to record each trading day&apos;s pair, realized P&amp;L, and session observations.
                </p>
              </div>
            ) : filteredSummaries.length === 0 ? (
              <div className="py-10 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  No matching daily summaries
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setOutcomeFilter('all');
                  }}
                  className="text-xs font-medium text-blue-500 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[340px] overflow-y-auto pr-1">
                {filteredSummaries.map((item) => {
                  const isGain = item.pnl >= 0;
                  const isEditingThis = editingEntry?.id === item.id;
                  const isConfirmingDelete = confirmDeleteId === item.id;

                  return (
                    <article
                      key={item.id}
                      className={`py-3.5 first:pt-1 last:pb-1 space-y-1.5 transition-colors ${
                        isEditingThis ? 'bg-blue-50/40 dark:bg-blue-500/5 -mx-2 px-2 rounded-lg' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                          <span className="font-mono font-semibold text-sm text-slate-900 dark:text-white">
                            {item.pair}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {formatCalendarDate(item.summaryDate)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-medium ${
                              isGain
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {item.pnl === 0 ? 'Breakeven' : isGain ? 'Profit' : 'Loss'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`font-mono tabular-nums text-sm font-semibold ${
                              item.pnl === 0
                                ? 'text-slate-600 dark:text-slate-300'
                                : isGain
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {formatCurrency(item.pnl, item.currency)}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              aria-label={`Edit ${item.pair} summary on ${item.summaryDate}`}
                              className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {isConfirmingDelete ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={deletingId === item.id}
                                  onClick={() => handleDelete(item)}
                                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 whitespace-nowrap"
                                >
                                  {deletingId === item.id ? 'Removing…' : 'Confirm'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-[11px] font-medium rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                >
                                  Keep
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.id)}
                                aria-label={`Delete ${item.pair} summary on ${item.summaryDate}`}
                                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words">
                        {item.notes}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
