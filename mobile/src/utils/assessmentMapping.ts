import { PHQ9_CONFIG, GAD7_CONFIG, PSS10_CONFIG } from '../data/assessmentQuestions';
import type { AssessmentConfig } from '../types/assessments';

const CONCERN_TO_ASSESSMENT: Record<string, AssessmentConfig> = {
  'Anxiety & Worry': GAD7_CONFIG,
  'Relationship Difficulties': GAD7_CONFIG,
  'Low Mood & Depression': PHQ9_CONFIG,
  'Sleep Problems': PHQ9_CONFIG,
  'Self-Esteem': PHQ9_CONFIG,
  'Grief & Loss': PHQ9_CONFIG,
  'Loneliness': PHQ9_CONFIG,
  'Just Need to Talk': PHQ9_CONFIG,
  'Stress & Overwhelm': PSS10_CONFIG,
  'Work/Life Balance': PSS10_CONFIG,
};

export function selectAssessmentForConcerns(concerns: string[]): AssessmentConfig {
  if (!concerns.length) return PHQ9_CONFIG;

  const counts = new Map<AssessmentConfig, number>();
  for (const concern of concerns) {
    const cfg = CONCERN_TO_ASSESSMENT[concern];
    if (cfg) counts.set(cfg, (counts.get(cfg) ?? 0) + 1);
  }

  if (!counts.size) return PHQ9_CONFIG;
  return [...counts.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
}
