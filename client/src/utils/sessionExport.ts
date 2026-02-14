import type { SessionSummary } from '../types/session';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function exportSessionAsText(summary: SessionSummary): void {
  const lines: string[] = [
    '=== Sukoon Session Summary ===',
    `Date: ${new Date(summary.date).toLocaleDateString()}`,
    `Duration: ${formatDuration(summary.duration)}`,
    '',
  ];

  if (summary.preMood) {
    lines.push(`Mood Before: ${summary.preMood.emoji} ${summary.preMood.label}`);
  }
  if (summary.postMood) {
    lines.push(`Mood After: ${summary.postMood.emoji} ${summary.postMood.label}`);
  }
  if (summary.preMood || summary.postMood) lines.push('');

  if (summary.preAssessment) {
    lines.push(`Assessment ${summary.preAssessment.type}: ${summary.preAssessment.totalScore} (${summary.preAssessment.severity})`);
    lines.push('');
  }

  if (summary.conversationAssessment) {
    lines.push('--- Session Assessment ---');
    lines.push(summary.conversationAssessment);
    lines.push('');
  }

  if (summary.clinicalImpression) {
    lines.push('--- Clinical Impression ---');
    lines.push(summary.clinicalImpression);
    lines.push('');
  }

  if (summary.preliminaryDiagnosis) {
    lines.push('--- Diagnostic Impression ---');
    lines.push(summary.preliminaryDiagnosis);
    lines.push('(Note: Preliminary AI impression — not a formal diagnosis)');
    lines.push('');
  }

  if (summary.recommendedActions && summary.recommendedActions.length > 0) {
    lines.push('--- Recommended Actions ---');
    summary.recommendedActions.forEach((a, i) => lines.push(`  ${i + 1}. ${a}`));
    lines.push('');
  }

  if (summary.wayForward) {
    lines.push('--- Way Forward ---');
    lines.push(summary.wayForward);
    lines.push('');
  }

  if (summary.keyTakeaways.length > 0) {
    lines.push('--- Key Takeaways ---');
    summary.keyTakeaways.forEach(t => lines.push(`  - ${t}`));
    lines.push('');
  }

  if (summary.copingStrategies.length > 0) {
    lines.push('--- Coping Strategies ---');
    summary.copingStrategies.forEach(s => lines.push(`  - ${s}`));
    lines.push('');
  }

  if (summary.homeworkAssignments.length > 0) {
    lines.push('--- Practice This Week ---');
    summary.homeworkAssignments.forEach(h => lines.push(`  - ${h}`));
    lines.push('');
  }

  if (summary.transcriptEntries.length > 0) {
    lines.push('--- Conversation ---');
    summary.transcriptEntries.forEach(e => {
      lines.push(`[${e.role === 'ai' ? 'Dr. Aria' : 'You'}] ${e.text}`);
    });
    lines.push('');
  }

  if (summary.userReflection) {
    lines.push('--- Your Reflection ---');
    lines.push(summary.userReflection);
    lines.push('');
  }

  lines.push('=== Disclaimer ===');
  lines.push('This is from an AI-assisted conversation, NOT a substitute for professional mental health care.');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sukoon-session-${summary.date.split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
