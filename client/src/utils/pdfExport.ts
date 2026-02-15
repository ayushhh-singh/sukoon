import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SessionSummary } from '../types/session';
import { formatDuration } from './format';

// Brand colors
const INDIGO = [79, 70, 229] as const;    // #4f46e5
const TEAL = [20, 184, 166] as const;     // #14b8a6
const DARK = [30, 30, 48] as const;       // #1e1e30
const GRAY = [148, 163, 184] as const;    // #94a3b8
const WHITE = [255, 255, 255] as const;

export function exportSessionAsPDF(summary: SessionSummary): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // Helper: check if we need a new page
  function checkPage(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  }

  // ===== HEADER BAND =====
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, pageW, 38, 'F');

  // Subtle accent stripe
  doc.setFillColor(...TEAL);
  doc.rect(0, 38, pageW, 2, 'F');

  // Title
  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Sukoon', margin, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Session Summary Report', margin, 24);

  // Date & duration on the right
  const dateStr = new Date(summary.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.setFontSize(9);
  doc.text(dateStr, pageW - margin, 16, { align: 'right' });
  if (summary.duration > 0) {
    doc.text(`Duration: ${formatDuration(summary.duration)}`, pageW - margin, 23, { align: 'right' });
  }

  y = 48;

  // ===== OVERVIEW BOX =====
  doc.setFillColor(245, 245, 255);
  doc.roundedRect(margin, y, contentW, 24, 2, 2, 'F');
  doc.setDrawColor(200, 200, 230);
  doc.roundedRect(margin, y, contentW, 24, 2, 2, 'S');

  doc.setTextColor(...DARK);
  doc.setFontSize(9);

  let boxX = margin + 5;
  const boxY = y + 8;

  if (summary.preMood) {
    doc.setFont('helvetica', 'bold');
    doc.text('Mood Before:', boxX, boxY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${summary.preMood.emoji} ${summary.preMood.label}`, boxX, boxY + 6);
    boxX += 50;
  }

  if (summary.postMood) {
    doc.setFont('helvetica', 'bold');
    doc.text('Mood After:', boxX, boxY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${summary.postMood.emoji} ${summary.postMood.label}`, boxX, boxY + 6);
    boxX += 50;
  }

  if (summary.preAssessment) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${summary.preAssessment.type.toUpperCase()}:`, boxX, boxY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${summary.preAssessment.totalScore} (${summary.preAssessment.severity})`, boxX, boxY + 6);
    boxX += 50;
  }

  if (summary.riskLevel) {
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Level:', boxX, boxY);
    doc.setFont('helvetica', 'normal');
    const riskColors: Record<string, readonly [number, number, number]> = {
      low: [34, 197, 94],
      moderate: [245, 158, 11],
      elevated: [239, 68, 68],
    };
    const riskColor = riskColors[summary.riskLevel] || GRAY;
    doc.setTextColor(...riskColor);
    doc.text(summary.riskLevel.charAt(0).toUpperCase() + summary.riskLevel.slice(1), boxX, boxY + 6);
    doc.setTextColor(...DARK);
  }

  y += 32;

  // Helper: section heading
  function sectionHeading(title: string) {
    checkPage(14);
    doc.setFillColor(...INDIGO);
    doc.rect(margin, y, 3, 8, 'F');
    doc.setTextColor(...INDIGO);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 6, y + 6);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    y += 12;
  }

  // Helper: paragraph text
  function paragraph(text: string) {
    checkPage(10);
    const lines = doc.splitTextToSize(text, contentW - 4);
    doc.text(lines, margin + 2, y);
    y += lines.length * 4.5 + 4;
  }

  // Helper: bullet list
  function bulletList(items: string[]) {
    for (const item of items) {
      checkPage(8);
      const lines = doc.splitTextToSize(item, contentW - 10);
      doc.text('\u2022', margin + 3, y);
      doc.text(lines, margin + 8, y);
      y += lines.length * 4.5 + 2;
    }
    y += 2;
  }

  // Helper: numbered list
  function numberedList(items: string[]) {
    for (let i = 0; i < items.length; i++) {
      checkPage(8);
      const lines = doc.splitTextToSize(items[i], contentW - 12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}.`, margin + 3, y);
      doc.setFont('helvetica', 'normal');
      doc.text(lines, margin + 10, y);
      y += lines.length * 4.5 + 2;
    }
    y += 2;
  }

  // Helper: quote-style box
  function quoteBox(text: string, borderColor: readonly [number, number, number] = TEAL) {
    const lines = doc.splitTextToSize(text, contentW - 12);
    const boxH = lines.length * 4.5 + 8;
    checkPage(boxH + 4);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y - 2, contentW, boxH, 2, 2, 'F');
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.8);
    doc.line(margin + 2, y, margin + 2, y + boxH - 6);
    doc.setLineWidth(0.2);
    doc.setTextColor(60, 60, 80);
    doc.text(lines, margin + 8, y + 4);
    doc.setTextColor(...DARK);
    y += boxH + 4;
  }

  // ===== AI CONVERSATION ASSESSMENT =====
  if (summary.conversationAssessment) {
    sectionHeading('Session Assessment');
    quoteBox(summary.conversationAssessment);
  }

  // ===== CLINICAL IMPRESSION =====
  if (summary.clinicalImpression) {
    sectionHeading('Clinical Impression');
    quoteBox(summary.clinicalImpression, TEAL);
  }

  // ===== DIAGNOSTIC IMPRESSION =====
  if (summary.preliminaryDiagnosis) {
    sectionHeading('Diagnostic Impression');
    paragraph(summary.preliminaryDiagnosis);
    // Disclaimer in gray
    checkPage(8);
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    const disclaimerLines = doc.splitTextToSize(
      'Note: This is a preliminary AI-generated impression, not a formal diagnosis. A formal diagnosis requires evaluation by a licensed mental health professional.',
      contentW - 4,
    );
    doc.text(disclaimerLines, margin + 2, y);
    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    y += disclaimerLines.length * 3.5 + 4;
  }

  // ===== RECOMMENDED ACTIONS =====
  if (summary.recommendedActions && summary.recommendedActions.length > 0) {
    sectionHeading('Recommended Actions');
    numberedList(summary.recommendedActions);
  }

  // ===== WAY FORWARD =====
  if (summary.wayForward) {
    sectionHeading('Way Forward');
    paragraph(summary.wayForward);
  }

  // ===== EMOTIONAL JOURNEY =====
  if (summary.emotionalJourney) {
    sectionHeading('Emotional Journey');
    paragraph(summary.emotionalJourney);
  }

  // ===== ISSUES IDENTIFIED =====
  if (summary.issuesIdentified.length > 0) {
    sectionHeading('Issues Identified');
    bulletList(summary.issuesIdentified);
  }

  // ===== KEY TAKEAWAYS =====
  if (summary.keyTakeaways.length > 0) {
    sectionHeading('Key Takeaways');
    bulletList(summary.keyTakeaways);
  }

  // ===== COPING STRATEGIES =====
  if (summary.copingStrategies.length > 0) {
    sectionHeading('Coping Strategies');
    bulletList(summary.copingStrategies);
  }

  // ===== TECHNIQUES USED =====
  if (summary.techniquesUsed.length > 0) {
    sectionHeading('Techniques Applied');
    checkPage(10);
    const techText = summary.techniquesUsed.join('  \u2022  ');
    const techLines = doc.splitTextToSize(techText, contentW - 4);
    doc.setTextColor(...TEAL);
    doc.text(techLines, margin + 2, y);
    doc.setTextColor(...DARK);
    y += techLines.length * 4.5 + 4;
  }

  // ===== HOMEWORK =====
  if (summary.homeworkAssignments.length > 0) {
    sectionHeading('Practice This Week');
    bulletList(summary.homeworkAssignments);
  }

  // ===== FOCUS AREAS =====
  if (summary.suggestedFocusAreas.length > 0) {
    sectionHeading('Suggested Focus Areas');
    bulletList(summary.suggestedFocusAreas);
  }

  // ===== TRANSCRIPT TABLE =====
  if (summary.transcriptEntries.length > 0) {
    sectionHeading('Conversation Transcript');
    checkPage(20);

    const tableData = summary.transcriptEntries.map(e => [
      e.role === 'ai' ? 'Dr. Aria' : 'You',
      e.text,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Speaker', 'Message']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        textColor: [...DARK],
      },
      headStyles: {
        fillColor: [...INDIGO],
        textColor: [...WHITE],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' },
        1: { cellWidth: contentW - 25 },
      },
    });

    // Update y after table
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // ===== REFLECTION =====
  if (summary.userReflection) {
    sectionHeading('Your Reflection');
    paragraph(summary.userReflection);
  }

  // ===== DISCLAIMER FOOTER ON EVERY PAGE =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();

    // Footer line
    doc.setDrawColor(200, 200, 230);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);

    // Page number
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 8, { align: 'right' });

    // Disclaimer
    doc.text(
      'This report is from an AI-assisted conversation and is NOT a substitute for professional mental health care.',
      margin,
      pageH - 8,
    );
  }

  // Download
  doc.save(`sukoon-session-${summary.date.split('T')[0]}.pdf`);
}
