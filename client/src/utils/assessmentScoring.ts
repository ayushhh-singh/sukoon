import type { AssessmentConfig, AssessmentResponse } from '../types/assessments';

export function scoreAssessment(
  config: AssessmentConfig,
  responses: AssessmentResponse[]
): { totalScore: number; severity: string; description: string; color: string } {
  let totalScore = 0;

  for (const response of responses) {
    const question = config.questions.find(q => q.id === response.questionId);
    if (question?.isReversed) {
      // PSS reverse scoring: (maxOptionValue - value)
      const maxOption = Math.max(...config.responseOptions.map(o => o.value));
      totalScore += maxOption - response.value;
    } else {
      totalScore += response.value;
    }
  }

  const range = config.scoringRanges.find(
    r => totalScore >= r.min && totalScore <= r.max
  ) || config.scoringRanges[config.scoringRanges.length - 1];

  return {
    totalScore,
    severity: range.severity,
    description: range.description,
    color: range.color,
  };
}

export function getScoreChange(
  currentScore: number,
  previousScore: number
): { delta: number; direction: 'improved' | 'worsened' | 'unchanged' } {
  const delta = currentScore - previousScore;
  if (delta < -2) return { delta, direction: 'improved' };
  if (delta > 2) return { delta, direction: 'worsened' };
  return { delta, direction: 'unchanged' };
}
