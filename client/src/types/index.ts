export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export type SessionPhase =
  | 'consent'
  | 'profile-select'
  | 'onboarding'
  | 'concern-select'
  | 'pre-mood'
  | 'pre-assessment'
  | 'ready'
  | 'active'
  | 'post-mood'
  | 'summary'
  | 'ended';

export type SpeakingState = 'idle' | 'user-speaking' | 'ai-speaking';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface CrisisResources {
  emergency: string;
  suicidePrevention: string;
  crisisText: string;
  international: string;
}

export interface ServerMessage {
  type: string;
  sessionId?: string;
  status?: ConnectionStatus;
  delta?: string;
  transcript?: string;
  message?: string;
  detail?: string;
  resources?: CrisisResources;
  crisisLevel?: string;
  summary?: {
    keyTakeaways: string[];
    copingStrategies: string[];
    homeworkAssignments: string[];
    topicsDiscussed: string[];
    emotionalThemes: string[];
    issuesIdentified: string[];
    conversationAssessment: string;
    emotionalJourney: string;
    riskLevel: 'low' | 'moderate' | 'elevated';
    suggestedFocusAreas: string[];
    techniquesUsed: string[];
    clinicalImpression?: string;
    preliminaryDiagnosis?: string;
    recommendedActions?: string[];
    wayForward?: string;
  };
}
