export interface AssessmentResponse {
  questionId: number;
  value: number;
}

export interface AssessmentResult {
  id: string;
  type: 'PHQ9' | 'GAD7' | 'PSS';
  responses: AssessmentResponse[];
  totalScore: number;
  severity: string;
  color: string;
  completedAt: string;
  sessionId: string;
  timing: 'pre-session' | 'post-session' | 'standalone';
}

export interface AssessmentConfig {
  type: 'PHQ9' | 'GAD7' | 'PSS';
  title: string;
  description: string;
  instructions: string;
  questions: { id: number; text: string; isReversed?: boolean }[];
  responseOptions: { value: number; label: string }[];
  scoringRanges: { min: number; max: number; severity: string; description: string; color: string }[];
  maxScore: number;
}
