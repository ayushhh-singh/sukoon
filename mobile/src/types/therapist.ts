export interface TherapistPatientSummary {
  profileId: string;
  displayName: string;
  createdAt: string;
  sessionCount: number;
  lastSessionDate: string | null;
  avgMoodChange: number | null;
  latestRiskLevel: 'low' | 'moderate' | 'elevated' | null;
  concerns: string[];
}

export interface TherapistAggregateStats {
  totalProfiles: number;
  totalSessions: number;
  averageMoodDelta: number;
  sessionsThisWeek: number;
  riskDistribution: { low: number; moderate: number; elevated: number };
}
