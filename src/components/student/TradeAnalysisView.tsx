import React, { useMemo, useState } from 'react';
import { CheckCircle2, ImagePlus, MessageSquare, Trash2, Upload } from 'lucide-react';
import { useMentorship } from '../../context/MentorshipContext';
import { auth } from '../../lib/firebase';
import { formatFirestoreDate } from '../../lib/firestore-helpers';
import { deleteTradeScreenshot, saveTradeScreenshot } from '../../services/mentorshipService';
import type { ScreenshotStage } from '../../types/domain';
import { AuthenticatedImage } from '../AuthenticatedImage';

const STAGES: Array<{ id: ScreenshotStage; label: string }> = [
  { id: 'before_entry', label: 'Before Entry' },
  { id: 'entry_confirmation', label: 'Entry Confirmation' },
  { id: 'stop_loss', label: 'Stop-Loss Placement' },
  { id: 'take_profit', label: 'Take-Profit Placement' },
  { id: 'after_trade', label: 'After Trade' },
  { id: 'annotated', label: 'Annotated Chart' },
];

export const TradeAnalysisView: React.FC = () => {
  const { firebaseUser, trades, screenshots, tradeReviews } = useMentorship();

  const [selectedTradeId, setSelectedTradeId] = useState(trades[0]?.id || '');
  const [stage, setStage] = useState<ScreenshotStage>('before_entry');
  const [caption, setCaption] = useState('');
  const [structureNotes, setStructureNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const activeTrade = useMemo(
    () => trades.find((t) => t.id === selectedTradeId) || trades[0] || null,
    [trades, selectedTradeId]
  );

  const tradeShots = useMemo(
    () => (activeTrade ? screenshots.filter((s) => s.tradeId === activeTrade.id) : []),
    [screenshots, activeTrade]
  );

  const reviewsForTrade = useMemo(
    () => (activeTrade ? tradeReviews.filter((r) => r.tradeId === activeTrade.id) : []),
    [tradeReviews, activeTrade]
  );

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !activeTrade || !file) {
      setError('Select a trade record and an image file (PNG, JPEG, or WEBP up to 5MB).');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Unsupported file format. Upload PNG, JPEG, or WEBP images only.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File exceeds 5 MB maximum upload size.');
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
      if (!token) throw new Error('Authentication token unavailable.');

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
        caption,
        marketStructureNotes: structureNotes,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        fileSize: payload.fileSize,
      });

      setCaption('');
      setStructureNotes('');
      setFile(null);
      setNotice('Chart screenshot uploaded and linked to your trade.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Trade Analysis & Chart Review
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Upload multi-stage chart evidence (Liquidity Sweeps, Order Blocks, FVG, BOS/CHoCH) and review mentor feedback
        </p>
      </div>

      {trades.length === 0 ? (
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-2.5">
          <ImagePlus className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Log a trade in your Trading Journal before attaching chart screenshots
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Upload & Technical Explanation Form */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Attach Chart Screenshot
            </h2>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            {notice && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Select Trade Record
                </label>
                <select
                  value={activeTrade?.id || ''}
                  onChange={(e) => setSelectedTradeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                >
                  {trades.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.instrument} {t.direction} · {formatFirestoreDate(t.openedAt)} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Chart Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as ScreenshotStage)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                >
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Screenshot File (PNG / JPG / WEBP, max 5MB)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-600/15 file:text-blue-500 hover:file:bg-blue-600/25"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Caption / Summary
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. M15 liquidity sweep into H4 order block"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Market Structure & Execution Reasoning
                </label>
                <textarea
                  rows={4}
                  value={structureNotes}
                  onChange={(e) => setStructureNotes(e.target.value)}
                  placeholder="Describe market structure, liquidity conditions, fair value gaps, SL/TP reasoning, and plan adherence..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
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

          {/* Selected Trade Gallery & Mentor Feedback */}
          <div className="lg:col-span-7 space-y-5">
            {activeTrade && (
              <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 md:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                      {activeTrade.instrument} {activeTrade.direction} · {activeTrade.strategy}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Entry {activeTrade.entryPrice} · SL {activeTrade.stopLoss} · TP{' '}
                      {activeTrade.takeProfit ?? '—'} · R:R{' '}
                      {activeTrade.riskRewardRatio ? `1:${activeTrade.riskRewardRatio}` : '—'}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {tradeShots.length} chart{tradeShots.length === 1 ? '' : 's'}
                  </span>
                </div>

                {tradeShots.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                    No screenshots uploaded for this trade yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {tradeShots.map((shot) => (
                      <div
                        key={shot.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-[#0B111E]"
                      >
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(shot.imageUrl)}
                          className="w-full block text-left"
                        >
                          <AuthenticatedImage
                            src={shot.imageUrl}
                            alt={shot.caption || shot.stage}
                            className="w-full h-44 object-cover"
                          />
                        </button>
                        <div className="p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                              {STAGES.find((s) => s.id === shot.stage)?.label || shot.stage}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteTradeScreenshot(shot.id)}
                              className="text-slate-400 hover:text-red-500"
                              title="Remove screenshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {shot.caption && (
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {shot.caption}
                            </p>
                          )}
                          {shot.marketStructureNotes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              {shot.marketStructureNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mentor Trade Reviews */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    Mentor Feedback & Evaluations ({reviewsForTrade.length})
                  </div>
                  {reviewsForTrade.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Pending mentor review. Once your mentor evaluates this trade, comments and ratings will appear here.
                    </p>
                  ) : (
                    reviewsForTrade.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B111E] border border-slate-200 dark:border-slate-800 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {rev.mentorName} ·{' '}
                            <span className="capitalize text-blue-500">
                              {rev.assessment.replace('_', ' ')}
                            </span>
                          </span>
                          <span className="font-mono text-amber-500">Rating: {rev.rating}/5</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{rev.comment}</p>
                        {rev.recommendations && (
                          <p className="text-slate-500 dark:text-slate-400">
                            Recommendation: {rev.recommendations}
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
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="max-w-5xl w-full max-h-[90vh] overflow-hidden rounded-xl border border-slate-700 bg-[#0B111E]">
            <AuthenticatedImage
              src={lightboxUrl}
              alt="Enlarged chart screenshot"
              className="w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
