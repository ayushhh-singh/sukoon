import { StorageService } from '../services/storage';
import type { TherapistPatientSummary, TherapistAggregateStats } from '../types/therapist';

export function computePatientSummaries(doctorUsername?: string): TherapistPatientSummary[] {
  const profiles = doctorUsername
    ? StorageService.getPatientsForDoctor(doctorUsername)
    : StorageService.getProfiles();
  const allSessions = StorageService.getSessions();

  return profiles.map(profile => {
    const sessions = allSessions.filter(s => s.userId === profile.id);
    const lastSession = sessions[sessions.length - 1];

    // Average mood change
    let avgMoodChange: number | null = null;
    const moodDeltas = sessions
      .filter(s => s.preMood && s.postMood)
      .map(s => s.postMood!.value - s.preMood!.value);
    if (moodDeltas.length > 0) {
      avgMoodChange = moodDeltas.reduce((a, b) => a + b, 0) / moodDeltas.length;
    }

    return {
      profileId: profile.id,
      displayName: profile.displayName,
      createdAt: profile.createdAt,
      sessionCount: sessions.length,
      lastSessionDate: lastSession?.date ?? null,
      avgMoodChange,
      latestRiskLevel: lastSession?.riskLevel ?? null,
      concerns: profile.onboarding.primaryConcerns || [],
    };
  }).filter(p => p.sessionCount > 0);
}

export function computeAggregateStats(doctorUsername?: string): TherapistAggregateStats {
  const profiles = doctorUsername
    ? StorageService.getPatientsForDoctor(doctorUsername)
    : StorageService.getProfiles();
  const profileIds = new Set(profiles.map(p => p.id));
  const allSessions = StorageService.getSessions().filter(
    s => !doctorUsername || (s.userId && profileIds.has(s.userId))
  );

  // Average mood delta
  const moodDeltas = allSessions
    .filter(s => s.preMood && s.postMood)
    .map(s => s.postMood!.value - s.preMood!.value);
  const averageMoodDelta = moodDeltas.length > 0
    ? moodDeltas.reduce((a, b) => a + b, 0) / moodDeltas.length
    : 0;

  // Sessions this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const sessionsThisWeek = allSessions.filter(s => new Date(s.date) >= weekAgo).length;

  // Risk distribution
  const riskDistribution = { low: 0, moderate: 0, elevated: 0 };
  allSessions.forEach(s => {
    if (s.riskLevel && riskDistribution[s.riskLevel] !== undefined) {
      riskDistribution[s.riskLevel]++;
    }
  });

  return {
    totalProfiles: profiles.filter(p => allSessions.some(s => s.userId === p.id)).length,
    totalSessions: allSessions.length,
    averageMoodDelta,
    sessionsThisWeek,
    riskDistribution,
  };
}

export function getPatientMoodTrend(profileId: string) {
  const sessions = StorageService.getSessionsForUser(profileId);
  return StorageService.getMoods().filter(
    m => m.sessionId && sessions.some(s => s.sessionId === m.sessionId)
  );
}

export function getPatientAssessmentTrend(profileId: string) {
  const sessions = StorageService.getSessionsForUser(profileId);
  return StorageService.getAssessments().filter(
    a => a.sessionId && sessions.some(s => s.sessionId === a.sessionId)
  );
}
