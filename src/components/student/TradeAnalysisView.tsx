import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  Edit3,
  Eye,
  ImagePlus,
  Layers,
  MessageSquare,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { auth } from '../../lib/firebase';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import { formatCurrency } from '../../lib/forexCalculations';
import {
  deleteTradeScreenshot,
  saveTradeScreenshot,
  updateTradeScreenshotNotes,
} from '../../services/mentorshipService';
import type { ScreenshotStage, TradeScreenshot } from '../../types/domain';
import type { StudentTab } from '../AppShell';
import { AuthenticatedImage } from '../AuthenticatedImage';
import { TradeModal } from './TradeModal';

const STAGES: Array<{ id: ScreenshotStage; label: string; shortLabel: string }> = [
  { id: 'before_entry', label: 'Before Entry', shortLabel: 'Pre-Entry' },
  { id: 'entry_confirmation', label: 'Entry Confirmation', shortLabel: 'Entry' },
  { id: 'stop_loss', label: 'Stop-Loss Placement', shortLabel: 'SL Logic' },
  { id: 'take_profit', label: 'Take-Profit Placement', shortLabel: 'TP Target' },
  { id: 'after_trade', label: 'After Trade', shortLabel: 'Outcome' },
  { id: 'annotated', label: 'Annotated Chart', shortLabel: 'Annotated' },
];

const STRUCTURE_TAGS = [
  'Liquidity Sweep',
  'Order Block',
  'Fair Value Gap (FVG)',
  'BOS / CHoCH',
  'Supply / Demand',
  'Session High/Low',
];

interface AiChartReviewResult {
  structureAlignment: 'aligned' | 'mixed' | 'unclear';
  chartObservations: string[];
  riskAndLevelCheck: string;
  strengths: string[];
  watchItems: string[];
  mentorPrepSummary: string;
}

interface Props {
  onNavigate?: (tab: StudentTab) => void;
}

export const TradeAnalysisView: React.FC<Props> = ({ onNavigate }) => {
  const { firebaseUser, trades, tradingAccounts, activeAccount, screenshots, tradeReviews } =
    useMentorship();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [viewMode, setViewMode] = useState<'trade' | 'gallery'>('trade');
  const [selectedTradeId, setSelectedTradeId] = useState(trades[0]?.id || '');
  const [stageFilter, setStageFilter] = useState<'all' | ScreenshotStage>('all');
  const [gallerySearch, setGallerySearch] = useState('');

  // Upload form state
  const [stage, setStage] = useState<ScreenshotStage>('before_entry');
  const [caption, setCaption] = useState('');
  const [structureNotes, setStructureNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Inline edit state
  const [editingShotId, setEditingShotId] = useState<string | null>(null);
  const [editStage, setEditStage] = useState<ScreenshotStage>('before_entry');
  const [editCaption, setEditCaption] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // AI chart setup review state
  const [aiLoadingShotId, setAiLoadingShotId] = useState<string | null>(null);
  const [aiErrorByShot, setAiErrorByShot] = useState<Record<string, string>>({});
  const [aiReviewByShot, setAiReviewByShot] = useState<Record<string, AiChartReviewResult>>({});

  // Lightbox & quick TradeModal state
  const [lightboxShot, setLightboxShot] = useState<TradeScreenshot | null>(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  // Keep selectedTradeId synchronized when trades arrive or change
  useEffect(() => {
    if (trades.length === 0) {
      if (selectedTradeId) setSelectedTradeId('');
      return;
    }
    if (!selectedTradeId || !trades.some((t) => t.id === selectedTradeId)) {
      setSelectedTradeId(trades[0].id);
    }
  }, [trades, selectedTradeId]);

  // Create & clean up local file preview URL
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  // Escape key closes lightbox
  useEffect(() => {
    if (!lightboxShot) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxShot(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxShot]);

  const activeTrade = useMemo(
    () => trades.find((t) => t.id === selectedTradeId) || trades[0] || null,
    [trades, selectedTradeId]
  );

  const sortedScreenshots = useMemo(() => {
    return [...screenshots].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    );
  }, [screenshots]);

  const tradeShots = useMemo(
    () =>
      activeTrade ? sortedScreenshots.filter((s) => s.tradeId === activeTrade.id) : [],
    [sortedScreenshots, activeTrade]
  );

  const filteredTradeShots = useMemo(
    () =>
      stageFilter === 'all' ? tradeShots : tradeShots.filter((s) => s.stage === stageFilter),
    [tradeShots, stageFilter]
  );

  const stageCounts = useMemo(() => {
    const map: Record<ScreenshotStage, number> = {
      before_entry: 0,
      entry_confirmation: 0,
      stop_loss: 0,
      take_profit: 0,
      after_trade: 0,
      annotated: 0,
    };
    tradeShots.forEach((s) => {
      map[s.stage] = (map[s.stage] || 0) + 1;
    });
    return map;
  }, [tradeShots]);

  const galleryShots = useMemo(() => {
    return sortedScreenshots.filter((s) => {
      if (stageFilter !== 'all' && s.stage !== stageFilter) return false;
      if (gallerySearch.trim()) {
        const q = gallerySearch.toLowerCase();
        const linkedTrade = trades.find((t) => t.id === s.tradeId);
        const matchesText =
          (s.caption || '').toLowerCase().includes(q) ||
          (s.marketStructureNotes || '').toLowerCase().includes(q) ||
          (linkedTrade?.instrument || '').toLowerCase().includes(q) ||
          (linkedTrade?.strategy || '').toLowerCase().includes(q);
        if (!matchesText) return false;
      }
      return true;
    });
  }, [sortedScreenshots, stageFilter, gallerySearch, trades]);

  const reviewsForTrade = useMemo(
    () => (activeTrade ? tradeReviews.filter((r) => r.tradeId === activeTrade.id) : []),
    [tradeReviews, activeTrade]
  );

  const currency = activeAccount?.currency || 'USD';

  const selectFileCandidate = (candidate: File | null) => {
    setError(null);
    setNotice(null);
    if (!candidate) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(candidate.type)) {
      setError('Unsupported file format. Upload PNG, JPEG, or WEBP images only.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (candidate.size > 5 * 1024 * 1024) {
      setError('File exceeds 5 MB maximum upload size.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(candidate);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0] || null;
    if (dropped) {
      selectFileCandidate(dropped);
    }
  };

  const appendConceptTag = (tag: string) => {
    setStructureNotes((prev) => {
      const trimmed = prev.trim();
      if (trimmed.toLowerCase().includes(tag.toLowerCase())) return prev;
      return trimmed ? `${trimmed}\n• ${tag}: ` : `• ${tag}: `;
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !activeTrade || !file) {
      setError('Select a trade record and an image file (PNG, JPEG, or WEBP up to 5 MB).');
      return;
    }

    setUploading(true);
    setError(null);
    setNotice(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication token unavailable. Please sign in again.');

      const res = await fetch('/api/uploads/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dataUrl,
          fileName: file.name,
          mimeType: file.type,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Screenshot upload failed.');
      }

      await saveTradeScreenshot({
        tradeId: activeTrade.id,
        userId: firebaseUser.uid,
        stage,
        imageUrl: payload.imageUrl,
        caption: caption.trim(),
        marketStructureNotes: structureNotes.trim(),
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        fileSize: payload.fileSize,
      });

      setCaption('');
      setStructureNotes('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNotice(`Chart screenshot uploaded under "${STAGES.find((s) => s.id === stage)?.label}".`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (shot: TradeScreenshot) => {
    setEditingShotId(shot.id);
    setEditStage(shot.stage);
    setEditCaption(shot.caption || '');
    setEditNotes(shot.marketStructureNotes || '');
  };

  const handleSaveEdit = async (shotId: string) => {
    setSavingEdit(true);
    setError(null);
    try {
      await updateTradeScreenshotNotes({
        screenshotId: shotId,
        stage: editStage,
        caption: editCaption.trim(),
        marketStructureNotes: editNotes.trim(),
      });
      setEditingShotId(null);
      setNotice('Chart stage and technical notes updated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update chart notes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteShot = async (shot: TradeScreenshot) => {
    setDeletingId(shot.id);
    setError(null);
    try {
      await deleteTradeScreenshot(shot.id, shot.imageUrl);
      setConfirmDeleteId(null);
      if (lightboxShot?.id === shot.id) setLightboxShot(null);
      setNotice('Chart screenshot removed.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to delete screenshot.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAnalyzeChart = async (shot: TradeScreenshot) => {
    const linkedTrade = trades.find((t) => t.id === shot.tradeId) || activeTrade;
    if (!linkedTrade) return;

    setAiLoadingShotId(shot.id);
    setAiErrorByShot((prev) => ({ ...prev, [shot.id]: '' }));

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication token unavailable.');

      const res = await fetch('/api/ai/chart-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrl: shot.imageUrl,
          trade: linkedTrade,
          screenshot: {
            stage: shot.stage,
            caption: shot.caption,
            marketStructureNotes: shot.marketStructureNotes,
          },
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Unable to complete chart review.');
      }

      setAiReviewByShot((prev) => ({ ...prev, [shot.id]: payload.review as AiChartReviewResult }));
    } catch (err: unknown) {
      setAiErrorByShot((prev) => ({
        ...prev,
        [shot.id]: err instanceof Error ? err.message : 'Chart setup check failed.',
      }));
    } finally {
      setAiLoadingShotId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Trade Analysis & Chart Review
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload multi-stage chart evidence (Liquidity Sweeps, Order Blocks, FVG, BOS/CHoCH) and review mentor feedback
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {trades.length > 0 && (
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-1">
              <button
                type="button"
                onClick={() => setViewMode('trade')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'trade'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Selected Trade
              </button>
              <button
                type="button"
                onClick={() => setViewMode('gallery')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5 ${
                  viewMode === 'gallery'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                All Charts ({screenshots.length})
              </button>
            </div>
          )}

          {tradingAccounts.length > 0 && (
            <button
              type="button"
              onClick={() => setTradeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Log New Trade
            </button>
          )}
        </div>
      </div>

      {/* Empty State with Actionable Onboarding Workflow */}
      {trades.length === 0 ? (
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 md:p-10 space-y-8">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto">
              <ImagePlus className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">
              {tradingAccounts.length === 0
                ? 'Set up a trading account and log your first trade'
                : 'Start your multi-stage chart analysis'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {tradingAccounts.length === 0
                ? 'Chart screenshots attach directly to manual trade records so your mentor can evaluate your entry trigger, stop-loss placement, and market structure logic alongside your risk metrics.'
                : 'Log a planned, open, or closed trade record first—then attach pre-entry, execution, stop-loss, and outcome screenshots for chart review and mentor critique.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {tradingAccounts.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.('analytics')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Trading Account
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setTradeModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Log First Trade Record
                  </button>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('journal')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" />
                      Open Trading Journal
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-slate-800/80">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B111E] border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-semibold text-blue-500 font-mono">STEP 01</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Record Trade Parameters
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Enter your pair, direction, entry, stop-loss, take-profit, and risk % as a planned, open, or closed trade.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B111E] border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-semibold text-blue-500 font-mono">STEP 02</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Upload Multi-Stage Charts
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Attach screenshots across Before Entry, Entry Confirmation, SL/TP Logic, and After Trade with structure notes.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B111E] border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-semibold text-blue-500 font-mono">STEP 03</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                AI Check & Mentor Review
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Run an automated visual chart alignment check on your markup and track mentor ratings and recommendations.
              </p>
            </div>
          </div>
        </div>
      ) : viewMode === 'gallery' ? (
        /* Cross-Trade Chart Evidence Gallery */
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <input
              type="search"
              value={gallerySearch}
              onChange={(e) => setGallerySearch(e.target.value)}
              placeholder="Search charts by pair, strategy, caption, or market structure..."
              className="flex-1 min-w-[240px] px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            />
            <select
              aria-label="Filter gallery by stage"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as 'all' | ScreenshotStage)}
              className="px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Stages ({screenshots.length})</option>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {galleryShots.length === 0 ? (
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-10 text-center space-y-3">
              <ImagePlus className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {screenshots.length === 0
                  ? 'No chart screenshots uploaded yet'
                  : 'No charts match your current filter'}
              </p>
              <button
                type="button"
                onClick={() => setViewMode('trade')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Attach Chart to Selected Trade
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {galleryShots.map((shot) => {
                const linkedTrade = trades.find((t) => t.id === shot.tradeId);
                return (
                  <div
                    key={shot.id}
                    className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden flex flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => setLightboxShot(shot)}
                      className="relative group block w-full text-left"
                    >
                      <AuthenticatedImage
                        src={shot.imageUrl}
                        alt={shot.caption || shot.stage}
                        className="w-full h-48 object-cover"
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-1 rounded bg-slate-950/75 text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Inspect
                      </span>
                    </button>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                            {STAGES.find((s) => s.id === shot.stage)?.label || shot.stage}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {formatFirestoreDate(shot.createdAt)}
                          </span>
                        </div>
                        {linkedTrade && (
                          <div className="text-xs font-semibold text-slate-900 dark:text-white font-mono">
                            {linkedTrade.instrument} {linkedTrade.direction} · {linkedTrade.strategy}
                          </div>
                        )}
                        {shot.caption && (
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            {shot.caption}
                          </p>
                        )}
                        {shot.marketStructureNotes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                            {shot.marketStructureNotes}
                          </p>
                        )}
                      </div>

                      {linkedTrade && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTradeId(linkedTrade.id);
                            setStageFilter('all');
                            setViewMode('trade');
                          }}
                          className="w-full py-2 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Open Trade Workspace →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Selected Trade Workbench */
        <div className="space-y-5">
          {/* Selected Trade Summary & Multi-Stage Coverage Strip */}
          {activeTrade && (
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[260px]">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Active Trade Record
                  </label>
                  <select
                    value={activeTrade.id}
                    onChange={(e) => {
                      setSelectedTradeId(e.target.value);
                      setStageFilter('all');
                      setEditingShotId(null);
                      setConfirmDeleteId(null);
                    }}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    {trades.map((t) => {
                      const count = screenshots.filter((s) => s.tradeId === t.id).length;
                      return (
                        <option key={t.id} value={t.id}>
                          {t.instrument} {t.direction} · {t.strategy} · {formatFirestoreDate(t.openedAt)} ({t.status} · {count} chart{count === 1 ? '' : 's'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-slate-500">Entry / SL / TP</div>
                    <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {activeTrade.entryPrice} / {activeTrade.stopLoss} / {activeTrade.takeProfit ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Planned R:R & Risk</div>
                    <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {activeTrade.riskRewardRatio ? `1:${activeTrade.riskRewardRatio}` : '—'} ·{' '}
                      {activeTrade.plannedRiskPercent}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Session / TF</div>
                    <div className="font-medium text-slate-900 dark:text-white mt-0.5">
                      {activeTrade.session} · {activeTrade.timeframe || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Result</div>
                    <div
                      className={`font-mono font-semibold tabular-nums mt-0.5 ${
                        activeTrade.netPnl === undefined
                          ? 'text-slate-500 capitalize'
                          : activeTrade.netPnl >= 0
                          ? 'text-emerald-500'
                          : 'text-red-500'
                      }`}
                    >
                      {activeTrade.netPnl !== undefined
                        ? formatCurrency(activeTrade.netPnl, currency)
                        : activeTrade.status}
                    </div>
                  </div>
                </div>
              </div>

              {/* 6-Stage Coverage Bar */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>Multi-Stage Documentation Coverage (click any stage to upload)</span>
                  <span className="font-mono tabular-nums">
                    {Object.values(stageCounts).filter((c) => c > 0).length} / {STAGES.length} stages
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {STAGES.map((s) => {
                    const count = stageCounts[s.id];
                    const isSelected = stage === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStage(s.id)}
                        className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                            : count > 0
                            ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B111E] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate font-medium">{s.shortLabel}</span>
                        {count > 0 ? (
                          <span className="inline-flex items-center gap-0.5 font-mono text-[11px] shrink-0">
                            <Check className="w-3 h-3" />
                            {count}
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] opacity-50 shrink-0">0</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
            {/* Upload & Technical Explanation Form */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Attach Chart Screenshot
              </h2>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {notice && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Chart Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as ScreenshotStage)}
                    className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Drag & Drop + Preview Zone */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Chart Image (PNG / JPG / WEBP, max 5 MB)
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => selectFileCandidate(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  {!file ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                      }}
                      onDrop={handleDrop}
                      className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                        dragActive
                          ? 'border-blue-500 bg-blue-500/5'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B111E] hover:border-blue-500/60'
                      }`}
                    >
                      <Upload className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        Click to browse or drag and drop a chart screenshot
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        PNG, JPEG, or WEBP up to 5 MB
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B111E] overflow-hidden">
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Selected chart preview"
                          className="w-full h-44 object-contain bg-slate-950/90"
                        />
                      )}
                      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {file.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => selectFileCandidate(null)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Caption / Setup Headline
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">{caption.length}/400</span>
                  </div>
                  <input
                    type="text"
                    maxLength={400}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="e.g. M15 liquidity sweep into H4 bullish order block"
                    className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Market Structure & Execution Reasoning
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {structureNotes.length}/1500
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {STRUCTURE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => appendConceptTag(tag)}
                        className="px-2 py-1 text-[11px] rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B111E] text-slate-600 dark:text-slate-300 hover:border-blue-500/50 hover:text-blue-500 transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={4}
                    maxLength={1500}
                    value={structureNotes}
                    onChange={(e) => setStructureNotes(e.target.value)}
                    placeholder="Describe higher-timeframe bias, liquidity sweep, FVG/OB entry trigger, SL invalidation, and target management..."
                    className="w-full px-3.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading & Validating...' : 'Upload Chart Screenshot'}
                </button>
              </form>
            </div>

            {/* Selected Trade Gallery, Inline Edit, Visual Analysis & Mentor Feedback */}
            <div className="lg:col-span-7 space-y-5">
              {activeTrade && (
                <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        {activeTrade.instrument} {activeTrade.direction} · {activeTrade.strategy}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {activeTrade.entryJustification
                          ? activeTrade.entryJustification
                          : 'Attach annotated charts to document your setup and execution.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tradeShots.length > 0 && (
                        <select
                          aria-label="Filter uploaded charts by stage"
                          value={stageFilter}
                          onChange={(e) => setStageFilter(e.target.value as 'all' | ScreenshotStage)}
                          className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                        >
                          <option value="all">All Stages ({tradeShots.length})</option>
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label} ({stageCounts[s.id]})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {filteredTradeShots.length === 0 ? (
                    <div className="py-8 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-[#0B111E]/50 p-6">
                      <ImagePlus className="w-7 h-7 text-slate-400 mx-auto" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {tradeShots.length === 0
                          ? 'No chart screenshots attached to this trade yet.'
                          : 'No screenshots recorded for the selected stage filter.'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Use the uploader on the left to attach a chart image for{' '}
                        <span className="font-semibold text-blue-500">
                          {STAGES.find((s) => s.id === stage)?.label}
                        </span>
                        .
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredTradeShots.map((shot) => {
                        const isEditing = editingShotId === shot.id;
                        const aiResult = aiReviewByShot[shot.id];
                        const aiError = aiErrorByShot[shot.id];
                        const isAnalyzing = aiLoadingShotId === shot.id;

                        return (
                          <div
                            key={shot.id}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-[#0B111E]"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-12">
                              <button
                                type="button"
                                onClick={() => setLightboxShot(shot)}
                                className="md:col-span-5 relative group block w-full text-left bg-slate-950"
                              >
                                <AuthenticatedImage
                                  src={shot.imageUrl}
                                  alt={shot.caption || shot.stage}
                                  className="w-full h-52 md:h-full object-cover"
                                />
                                <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-slate-950/80 text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  Zoom
                                </span>
                              </button>

                              <div className="md:col-span-7 p-4 flex flex-col justify-between gap-3">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                                      {STAGES.find((s) => s.id === shot.stage)?.label || shot.stage}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-400">
                                      {formatFirestoreDate(shot.createdAt)}
                                    </span>
                                  </div>

                                  {isEditing ? (
                                    <div className="space-y-2.5 pt-1">
                                      <select
                                        value={editStage}
                                        onChange={(e) =>
                                          setEditStage(e.target.value as ScreenshotStage)
                                        }
                                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                      >
                                        {STAGES.map((s) => (
                                          <option key={s.id} value={s.id}>
                                            {s.label}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="text"
                                        maxLength={400}
                                        value={editCaption}
                                        onChange={(e) => setEditCaption(e.target.value)}
                                        placeholder="Caption"
                                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                      />
                                      <textarea
                                        rows={3}
                                        maxLength={1500}
                                        value={editNotes}
                                        onChange={(e) => setEditNotes(e.target.value)}
                                        placeholder="Market structure & execution reasoning"
                                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                      />
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          disabled={savingEdit}
                                          onClick={() => handleSaveEdit(shot.id)}
                                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                                        >
                                          {savingEdit ? 'Saving...' : 'Save Notes'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingShotId(null)}
                                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {shot.caption ? (
                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                          {shot.caption}
                                        </p>
                                      ) : (
                                        <p className="text-xs italic text-slate-400">
                                          No caption added
                                        </p>
                                      )}
                                      {shot.marketStructureNotes && (
                                        <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                                          {shot.marketStructureNotes}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>

                                {!isEditing && (
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={isAnalyzing}
                                        onClick={() => handleAnalyzeChart(shot)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 disabled:opacity-50 transition-colors"
                                      >
                                        <BrainCircuit className="w-3.5 h-3.5" />
                                        {isAnalyzing ? 'Analyzing Chart...' : 'Analyze Chart Setup'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => startEdit(shot)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Edit
                                      </button>
                                    </div>

                                    {confirmDeleteId === shot.id ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          disabled={deletingId === shot.id}
                                          onClick={() => handleDeleteShot(shot)}
                                          className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                        >
                                          {deletingId === shot.id ? 'Removing...' : 'Confirm'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteId(null)}
                                          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(shot.id)}
                                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
                                        title="Remove screenshot"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {aiError && (
                              <div className="px-4 py-3 border-t border-red-500/20 bg-red-500/5 text-xs text-red-600 dark:text-red-400">
                                {aiError}
                              </div>
                            )}

                            {aiResult && (
                              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] space-y-3 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                                    <BrainCircuit className="w-4 h-4 text-blue-500" />
                                    Chart Markup & Risk Alignment Review
                                  </span>
                                  <span
                                    className={`font-semibold uppercase tracking-wide text-[11px] ${
                                      aiResult.structureAlignment === 'aligned'
                                        ? 'text-emerald-500'
                                        : aiResult.structureAlignment === 'mixed'
                                        ? 'text-amber-500'
                                        : 'text-red-500'
                                    }`}
                                  >
                                    Structure: {aiResult.structureAlignment}
                                  </span>
                                </div>

                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {aiResult.riskAndLevelCheck}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/80 dark:border-slate-800 space-y-1">
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                      Visual Observations
                                    </div>
                                    <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                                      {aiResult.chartObservations.map((obs, idx) => (
                                        <li key={idx}>• {obs}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200/80 dark:border-slate-800 space-y-1">
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                      Verify Before / After Execution
                                    </div>
                                    <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                                      {aiResult.watchItems.map((item, idx) => (
                                        <li key={idx}>• {item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>

                                <div className="text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    Mentor Review Note:{' '}
                                  </span>
                                  {aiResult.mentorPrepSummary}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Mentor Trade Reviews */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      Mentor Feedback & Evaluations ({reviewsForTrade.length})
                    </div>
                    {reviewsForTrade.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Pending mentor review. Once your mentor evaluates this trade and your uploaded charts, comments and ratings will appear here.
                      </p>
                    ) : (
                      reviewsForTrade.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {rev.mentorName} ·{' '}
                              <span
                                className={`capitalize ${
                                  rev.assessment === 'exemplary' || rev.assessment === 'compliant'
                                    ? 'text-emerald-500'
                                    : rev.assessment === 'needs_clarification'
                                    ? 'text-amber-500'
                                    : 'text-red-500'
                                }`}
                              >
                                {rev.assessment.replace('_', ' ')}
                              </span>
                            </span>
                            <span className="font-mono text-amber-500 font-semibold">
                              Rating: {rev.rating}/5
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            {rev.comment}
                          </p>
                          {rev.clarificationRequested && (
                            <p className="text-amber-600 dark:text-amber-400 font-medium">
                              Clarification requested: update your chart notes or attach an annotated follow-up screenshot.
                            </p>
                          )}
                          {rev.recommendations && (
                            <p className="text-slate-500 dark:text-slate-400">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                Recommendation:{' '}
                              </span>
                              {rev.recommendations}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Lightbox Modal */}
      {lightboxShot && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxShot(null)}
        >
          <div
            className="max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0B111E]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                  {STAGES.find((s) => s.id === lightboxShot.stage)?.label || lightboxShot.stage}
                </div>
                {lightboxShot.caption && (
                  <div className="text-sm font-medium text-white truncate">
                    {lightboxShot.caption}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxShot(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close chart preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-black/40 p-2">
              <AuthenticatedImage
                src={lightboxShot.imageUrl}
                alt={lightboxShot.caption || 'Enlarged chart screenshot'}
                className="max-w-full max-h-[72vh] object-contain"
              />
            </div>
            {lightboxShot.marketStructureNotes && (
              <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto">
                {lightboxShot.marketStructureNotes}
              </div>
            )}
          </div>
        </div>
      )}

      <TradeModal open={tradeModalOpen} onClose={() => setTradeModalOpen(false)} />
    </div>
  );
};
