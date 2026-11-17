import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Download,
  Edit3,
  History,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { exportTradesToCsv } from '../../lib/exporters';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import { formatCurrency, INSTRUMENT_SPECS, STRATEGY_OPTIONS } from '../../lib/forexCalculations';
import { deleteDraftTrade } from '../../services/mentorshipService';
import type { TradeRecord } from '../../types/domain';
import { TradeModal } from './TradeModal';

export const TradingJournal: React.FC = () => {
  const { trades, tradeEditLogs, activeAccountId, activeAccount, challengeCycles, tradeReviews } =
    useMentorship();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeRecord | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (activeAccountId !== 'all' && t.accountId !== activeAccountId) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (instrumentFilter !== 'all' && t.instrument !== instrumentFilter) return false;
      if (strategyFilter !== 'all' && t.strategy !== strategyFilter) return false;
      if (cycleFilter !== 'all' && t.challengeCycleId !== cycleFilter) return false;
      if (dateFrom && t.openedAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && t.openedAt.slice(0, 10) > dateTo) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          t.instrument.toLowerCase().includes(q) ||
          t.strategy.toLowerCase().includes(q) ||
          (t.entryJustification || '').toLowerCase().includes(q) ||
          (t.lessonsLearned || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    trades,
    activeAccountId,
    statusFilter,
    instrumentFilter,
    strategyFilter,
    cycleFilter,
    dateFrom,
    dateTo,
    search,
  ]);

  const selectedLogs = useMemo(
    () =>
      selectedTrade
        ? tradeEditLogs.filter((l) => l.tradeId === selectedTrade.id)
        : [],
    [selectedTrade, tradeEditLogs]
  );

  const selectedReviews = useMemo(
    () =>
      selectedTrade
        ? tradeReviews.filter((r) => r.tradeId === selectedTrade.id)
        : [],
    [selectedTrade, tradeReviews]
  );

  const currency = activeAccount?.currency || 'USD';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Trading Journal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manual trade ledger · Planned, open, closed, and draft records with immutable edit history
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportTradesToCsv(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTrade(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Trade
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pair, strategy, justification..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
        >
          <option value="all">All Statuses</option>
          <option value="closed">Closed</option>
          <option value="open">Open</option>
          <option value="planned">Planned</option>
          <option value="draft">Draft</option>
        </select>
        <select
          aria-label="Filter by instrument"
          value={instrumentFilter}
          onChange={(e) => setInstrumentFilter(e.target.value)}
          className="px-3.5 py-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
        >
          <option value="all">All Pairs</option>
          {Object.keys(INSTRUMENT_SPECS).map((sym) => (
            <option key={sym} value={sym}>
              {sym}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by strategy"
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
          className="px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
        >
          <option value="all">All Strategies</option>
          {STRATEGY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by challenge cycle"
          value={cycleFilter}
          onChange={(e) => setCycleFilter(e.target.value)}
          className="px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
        >
          <option value="all">All Cycles</option>
          {challengeCycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-6 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>Date range:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-mono"
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-mono"
          />
          {(dateFrom || dateTo || statusFilter !== 'all' || instrumentFilter !== 'all' || strategyFilter !== 'all' || search) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setInstrumentFilter('all');
                setStrategyFilter('all');
                setCycleFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-blue-500 hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No trading records match your current filters
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record your setups manually to track risk-to-reward, R-multiples, and mentor reviews.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingTrade(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Trade Record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-[#0B111E]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Pair</th>
                  <th className="py-3 px-3">Direction</th>
                  <th className="py-3 px-3 text-right">Entry</th>
                  <th className="py-3 px-3 text-right">SL / TP</th>
                  <th className="py-3 px-3 text-right">Lots</th>
                  <th className="py-3 px-3 text-right">Risk %</th>
                  <th className="py-3 px-3 text-right">R-Mult</th>
                  <th className="py-3 px-3 text-right">Net P/L</th>
                  <th className="py-3 px-3">Strategy</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filtered.map((t) => {
                  const isBuy = t.direction === 'BUY';
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrade(t)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatFirestoreDate(t.openedAt)}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                        <span className="inline-flex items-center gap-1.5">
                          {t.instrument}
                          {t.riskViolation && (
                            <span title="Risk policy threshold breached">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            isBuy ? 'text-emerald-500' : 'text-red-500'
                          }`}
                        >
                          {isBuy ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        {t.entryPrice}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {t.stopLoss} / {t.takeProfit ?? '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        {t.lotSize.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        {t.plannedRiskPercent.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        {t.rMultiple !== undefined ? `${t.rMultiple}R` : '—'}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${
                          t.netPnl === undefined
                            ? 'text-slate-400'
                            : t.netPnl >= 0
                            ? 'text-emerald-500'
                            : 'text-red-500'
                        }`}
                      >
                        {t.netPnl !== undefined ? formatCurrency(t.netPnl, currency) : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 max-w-[190px]">
                        <div className="truncate">{t.strategy}</div>
                        {(t.timeframe || t.setupGrade) && (
                          <div className="text-[11px] font-mono text-slate-400">
                            {[t.timeframe, t.setupGrade ? `Grade ${t.setupGrade}` : null].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-600 dark:text-slate-300">
                        {t.status}
                      </td>
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTrade(t);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-blue-500"
                          title="Edit trade"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {t.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => deleteDraftTrade(t.id)}
                            className="p-1.5 rounded text-slate-400 hover:text-red-500"
                            title="Delete draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade Detail & Audit History Drawer */}
      {selectedTrade && (
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-5 md:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {selectedTrade.instrument} {selectedTrade.direction} · {selectedTrade.strategy}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Session: {selectedTrade.session}
                {selectedTrade.timeframe ? ` · TF: ${selectedTrade.timeframe}` : ''}
                {selectedTrade.setupGrade ? ` · Grade: ${selectedTrade.setupGrade}` : ''}
                {selectedTrade.emotionTag ? ` · Emotion: ${selectedTrade.emotionTag}` : ''}
                {` · Status: ${selectedTrade.status} · Edit Count: ${selectedTrade.editCount}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingTrade(selectedTrade);
                  setModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Edit Trade
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrade(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div>
              <div className="text-slate-500">Planned R:R</div>
              <div className="font-mono font-semibold text-slate-900 dark:text-white mt-1">
                {selectedTrade.riskRewardRatio ? `1 : ${selectedTrade.riskRewardRatio}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Gross / Net P/L</div>
              <div className="font-mono font-semibold text-slate-900 dark:text-white mt-1">
                {selectedTrade.grossPnl !== undefined ? formatCurrency(selectedTrade.grossPnl, currency) : '—'} /{' '}
                {selectedTrade.netPnl !== undefined ? formatCurrency(selectedTrade.netPnl, currency) : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Fees (Comm / Swap)</div>
              <div className="font-mono font-semibold text-slate-900 dark:text-white mt-1">
                ${(selectedTrade.commission ?? 0).toFixed(2)} / ${(selectedTrade.swap ?? 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Plan Adherence</div>
              <div className={`font-semibold mt-1 ${selectedTrade.planFollowed ? 'text-emerald-500' : 'text-amber-500'}`}>
                {selectedTrade.planFollowed ? 'Plan Followed' : 'Plan Deviated'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2.5">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Entry Justification:</span>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  {selectedTrade.entryJustification || 'Not documented.'}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Exit Justification:</span>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  {selectedTrade.exitJustification || 'Not documented.'}
                </p>
              </div>
              {selectedTrade.partialCloseNotes && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Partial Close / Scaling Notes:</span>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {selectedTrade.partialCloseNotes}
                  </p>
                </div>
              )}
              {selectedTrade.observations && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Observations:</span>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {selectedTrade.observations}
                  </p>
                </div>
              )}
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Lessons Learned:</span>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  {selectedTrade.lessonsLearned || 'Not documented.'}
                </p>
              </div>
              {selectedTrade.mistakeTags && selectedTrade.mistakeTags.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Mistake Tags:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedTrade.mistakeTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[11px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  <History className="w-3.5 h-3.5 text-blue-500" />
                  Immutable Edit Audit Trail ({selectedLogs.length})
                </div>
                {selectedLogs.length === 0 ? (
                  <p className="text-slate-500">Original entry — no post-creation modifications.</p>
                ) : (
                  <ul className="space-y-1">
                    {selectedLogs.map((log) => (
                      <li
                        key={log.id}
                        className="p-2 rounded bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 flex justify-between gap-2"
                      >
                        <span className="text-slate-700 dark:text-slate-300">{log.summary}</span>
                        <span className="font-mono text-slate-400 whitespace-nowrap">
                          {formatFirestoreDate(log.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedReviews.length > 0 && (
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Mentor Reviews
                  </div>
                  {selectedReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-2.5 rounded bg-blue-500/5 border border-blue-500/20 space-y-1"
                    >
                      <div className="flex justify-between font-medium">
                        <span className="text-blue-500">
                          {rev.mentorName} · {rev.assessment.replace('_', ' ')}
                        </span>
                        <span className="font-mono">{rev.rating}/5</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <TradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        existingTrade={editingTrade}
      />
    </div>
  );
};
