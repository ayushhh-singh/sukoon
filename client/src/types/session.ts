import type { TranscriptEntry } from './index';

export type AmbientSound = 'none' | 'rain' | 'ocean' | 'forest' | 'piano';

export interface BookmarkedStrategy {
  id: string;
  text: string;
  concern?: string;
  sessionId: string;
  sessionDate: string;
  savedAt: string;
}
import type { AssessmentResult } from './assessments';
import type { MoodEntry } from './mood';

export interface SessionSummary {
  id: string;
  sessionId: string;
  userId?: string;
  date: string;
  duration: number;

  // AI summary fields
  keyTakeaways: string[];
  copingStrategies: string[];
  homeworkAssignments: string[];
  topicsDiscussed: string[];
  emotionalThemes: string[];

  // Enhanced AI analysis fields
  issuesIdentified: string[];
  conversationAssessment: string;
  emotionalJourney: string;
  riskLevel: 'low' | 'moderate' | 'elevated';
  suggestedFocusAreas: string[];
  techniquesUsed: string[];

  // Clinical fields
  clinicalImpression?: string;
  preliminaryDiagnosis?: string;
  recommendedActions?: string[];
  wayForward?: string;

  preMood: MoodEntry | null;
  postMood: MoodEntry | null;

  preAssessment: AssessmentResult | null;
  sessionRating?: number;

  transcriptEntries: TranscriptEntry[];
  userReflection?: string;
}

export interface OnboardingData {
  preferredName: string;
  age?: number;
  profession?: string;
  primaryConcerns: string[];
  therapyExperience: 'none' | 'some' | 'regular';
  goalForToday?: string;
  voicePreference?: 'female' | 'male';
  language?: string;
  ambientSound?: AmbientSound;
}

export interface UserProfile {
  id: string;
  displayName: string;
  createdAt: string;
  onboarding: OnboardingData;
}

export interface SessionContext {
  assessmentContext?: {
    phq9Score?: number;
    phq9Severity?: string;
    gad7Score?: number;
    gad7Severity?: string;
    pssScore?: number;
    pssSeverity?: string;
    previousScores?: { type: string; score: number; date: string }[];
  };
  userPreferences?: OnboardingData;
}
