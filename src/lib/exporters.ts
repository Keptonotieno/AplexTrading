import { jsPDF } from 'jspdf';
import type { MentorReview, TradeRecord } from '../types/domain';
import { formatCurrency, formatPlainCurrency, type PortfolioMetrics } from './forexCalculations';
import { formatFirestoreDate } from './firestore-helpers';

export function exportTradesToCsv(trades: TradeRecord[], fileName = 'trading-journal.csv') {
  const headers = [
    'ID',
    'Opened At',
    'Closed At',
    'Instrument',
    'Direction',
    'Status',
    'Session',
    'Timeframe',
    'Strategy',
    'Setup Grade',
    'Emotion Tag',
    'Mistake Tags',
    'Entry Price',
    'Stop Loss',
    'Take Profit',
    'Exit Price',
    'Lot Size',
    'Account Balance At Entry',
    'Planned Risk %',
    'Planned Risk $',
    'R:R',
    'Gross P/L',
    'Commission',
    'Swap',
    'Net P/L',
    'R-Multiple',
    'Plan Followed',
    'Risk Violation',
    'Partial Close Notes',
    'Entry Justification',
    'Exit Justification',
    'Lessons Learned',
  ];

  const escapeCsv = (val: unknown) => {
    const s = val === undefined || val === null ? '' : String(val);
    if (/[",\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = trades.map((t) =>
    [
      t.id,
      t.openedAt,
      t.closedAt ?? '',
      t.instrument,
      t.direction,
      t.status,
      t.session,
      t.timeframe ?? '',
      t.strategy,
      t.setupGrade ?? '',
      t.emotionTag ?? '',
      (t.mistakeTags || []).join('; '),
      t.entryPrice,
      t.stopLoss,
      t.takeProfit ?? '',
      t.exitPrice ?? '',
      t.lotSize,
      t.accountBalanceAtEntry,
      t.plannedRiskPercent,
      t.plannedRiskAmount ?? '',
      t.riskRewardRatio ?? '',
      t.grossPnl ?? '',
      t.commission ?? 0,
      t.swap ?? 0,
      t.netPnl ?? '',
      t.rMultiple ?? '',
      t.planFollowed ? 'Yes' : 'No',
      t.riskViolation ? 'Yes' : 'No',
      t.partialCloseNotes ?? '',
      t.entryJustification ?? '',
      t.exitJustification ?? '',
      t.lessonsLearned ?? '',
    ]
      .map(escapeCsv)
      .join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadBlob(csvContent, fileName, 'text/csv;charset=utf-8;');
}

export function exportPerformanceReportPdf(params: {
  studentName: string;
  periodLabel: string;
  metrics: PortfolioMetrics;
  review?: Partial<MentorReview>;
  trades?: TradeRecord[];
}) {
  const { studentName, periodLabel, metrics, review, trades } = params;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  let y = 48;
  const left = 44;
  const right = 550;

  doc.setFillColor(11, 17, 30);
  doc.rect(0, 0, 595, 92, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Forex Mentorship — Performance Report', left, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`Student: ${studentName}   |   Period: ${periodLabel}   |   Generated: ${new Date().toLocaleDateString()}`, left, 66);

  y = 122;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Performance & Risk Summary', left, y);
  y += 18;

  const summaryRows: Array<[string, string, string, string]> = [
    [
      'Net Profit / Loss',
      formatCurrency(metrics.netPnl),
      'Account Growth',
      `${metrics.accountGrowthPercent >= 0 ? '+' : ''}${metrics.accountGrowthPercent}%`,
    ],
    [
      'Total Closed Trades',
      `${metrics.closedTradesCount} (${metrics.winningTrades}W / ${metrics.losingTrades}L)`,
      'Win Rate',
      `${metrics.winRate}%`,
    ],
    [
      'Profit Factor',
      metrics.profitFactor !== null ? String(metrics.profitFactor) : 'N/A',
      'Expectancy / Trade',
      formatCurrency(metrics.expectancy),
    ],
    [
      'Average R-Multiple',
      metrics.avgRMultiple !== null ? `${metrics.avgRMultiple}R` : 'N/A',
      'Max / Current Drawdown',
      `${metrics.maxDrawdownPercent}% / ${metrics.currentDrawdownPercent}%`,
    ],
    [
      'Risk Compliance',
      `${metrics.riskComplianceRate}%`,
      'Avg Risk / Trade',
      `${metrics.avgRiskPercent}%`,
    ],
    [
      'Last 30d vs Prior 30d',
      `${formatCurrency(metrics.periodComparison.current30d.netPnl)} vs ${formatCurrency(metrics.periodComparison.prior30d.netPnl)}`,
      'Best / Weakest Pair',
      `${metrics.bestInstrument || 'N/A'} / ${metrics.weakestInstrument || 'N/A'}`,
    ],
  ];

  doc.setFontSize(9.5);
  for (const [k1, v1, k2, v2] of summaryRows) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(k1, left, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(v1, left + 115, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(k2, left + 260, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(v2, left + 380, y);
    y += 18;
  }

  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(left, y, right, y);
  y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Evaluation Pillars (Weighted Methodology)', left, y);
  y += 18;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Risk Management (30%): ${metrics.scores.riskManagement}/100   |   Discipline (25%): ${metrics.scores.discipline}/100   |   Consistency (20%): ${metrics.scores.consistency}/100`,
    left,
    y
  );
  y += 16;
  doc.text(
    `Profitability (15%): ${metrics.scores.profitability}/100   |   Journal Completion (10%): ${metrics.scores.journalCompletion}/100   |   Overall Score: ${metrics.scores.overall}/100`,
    left,
    y
  );
  y += 22;

  if (review) {
    doc.setDrawColor(226, 232, 240);
    doc.line(left, y, right, y);
    y += 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('3. Mentor Evaluation & Recommendations', left, y);
    y += 18;

    const blocks: Array<[string, string | undefined]> = [
      ['Common Mistakes Identified', review.commonMistakes],
      ['Psychology Observations', review.psychologyObservations],
      ['Areas Requiring Improvement', review.improvementsRequired],
      ['Mentor Recommendations', review.mentorRecommendations],
    ];

    doc.setFontSize(9.5);
    for (const [heading, text] of blocks) {
      if (!text) continue;
      if (y > 740) {
        doc.addPage();
        y = 48;
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(heading, left, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const wrapped = doc.splitTextToSize(text, right - left);
      doc.text(wrapped, left, y);
      y += wrapped.length * 13 + 10;
    }
  }

  if (trades && trades.length > 0) {
    if (y > 680) {
      doc.addPage();
      y = 48;
    } else {
      y += 8;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('4. Recent Closed Trades', left, y);
    y += 18;

    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Date', left, y);
    doc.text('Pair', left + 85, y);
    doc.text('Dir', left + 150, y);
    doc.text('Lots', left + 195, y);
    doc.text('Risk %', left + 240, y);
    doc.text('R-Mult', left + 295, y);
    doc.text('Net P/L', left + 355, y);
    doc.text('Strategy', left + 430, y);
    y += 14;

    doc.setTextColor(15, 23, 42);
    for (const t of trades.slice(0, 15)) {
      if (y > 760) {
        doc.addPage();
        y = 48;
      }
      doc.text(formatFirestoreDate(t.closedAt || t.openedAt), left, y);
      doc.text(t.instrument, left + 85, y);
      doc.text(t.direction, left + 150, y);
      doc.text(t.lotSize.toFixed(2), left + 195, y);
      doc.text(`${t.plannedRiskPercent}%`, left + 240, y);
      doc.text(t.rMultiple !== undefined ? `${t.rMultiple}R` : '—', left + 295, y);
      doc.text(formatPlainCurrency(t.netPnl), left + 355, y);
      doc.text(t.strategy.slice(0, 20), left + 430, y);
      y += 14;
    }
  }

  const safeSlug = `${studentName}-${periodLabel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`forex-mentorship-report-${safeSlug}.pdf`);
}

function downloadBlob(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
