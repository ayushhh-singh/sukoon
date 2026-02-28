import * as retentionRepo from '../db/repositories/retentionRepo';
import * as sessionRepo from '../db/repositories/sessionRepo';

/**
 * Updates the retention record for a user after a session is completed.
 * Recalculates streak, longest streak, last-session date, and unlocks
 * applicable milestones. Safe to call from both HTTP routes and WebSocket.
 */
export function updateRetentionAfterSession(userId: string, session: sessionRepo.Session): void {
  const retention = retentionRepo.findByUserId(userId);
  const today = new Date().toISOString().split('T')[0];
  const last = retention.lastSessionDate;

  // Update streak
  if (last !== today) {
    if (last) {
      const diffMs = new Date(today).getTime() - new Date(last).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      retention.currentStreak = diffDays === 1 ? retention.currentStreak + 1 : 1;
    } else {
      retention.currentStreak = 1;
    }
    if (retention.currentStreak > retention.longestStreak) {
      retention.longestStreak = retention.currentStreak;
    }
    retention.lastSessionDate = today;
  }

  // Unlock milestones
  const allSessions = sessionRepo.findByUserId(userId);
  const sessionCount = allSessions.length;
  const now = new Date().toISOString();

  const unlock = (id: string) => {
    if (!retention.milestones[id]) {
      retention.milestones[id] = now;
    }
  };

  if (sessionCount >= 1) unlock('first-session');
  if (sessionCount >= 5) unlock('sessions-5');
  if (sessionCount >= 10) unlock('sessions-10');
  if (sessionCount >= 25) unlock('sessions-25');

  if (retention.currentStreak >= 3) unlock('streak-3');
  if (retention.currentStreak >= 7) unlock('streak-7');
  if (retention.currentStreak >= 14) unlock('streak-14');
  if (retention.currentStreak >= 30) unlock('streak-30');

  if (session.preAssessmentType) unlock('first-assessment');

  if (session.preMoodValue != null && session.postMoodValue != null && session.postMoodValue > session.preMoodValue) {
    unlock('mood-improved');
  }

  if (allSessions.some(s => s.userReflection && s.userReflection.trim().length > 0)) {
    unlock('reflection-written');
  }

  retentionRepo.upsert(retention);
}

/**
 * Syncs all milestones for a user from existing session history.
 * Used by the GET /api/retention route to repair any missed milestones.
 * Returns true if any milestone was newly unlocked and the record was saved.
 */
export function syncMilestones(userId: string): boolean {
  const retention = retentionRepo.findByUserId(userId);
  const sessions = sessionRepo.findByUserId(userId);
  const now = new Date().toISOString();
  let changed = false;

  const unlock = (id: string) => {
    if (!retention.milestones[id]) {
      retention.milestones[id] = now;
      changed = true;
    }
  };

  if (sessions.length >= 1) unlock('first-session');
  if (sessions.length >= 5) unlock('sessions-5');
  if (sessions.length >= 10) unlock('sessions-10');
  if (sessions.length >= 25) unlock('sessions-25');

  if (retention.currentStreak >= 3) unlock('streak-3');
  if (retention.currentStreak >= 7) unlock('streak-7');
  if (retention.currentStreak >= 14) unlock('streak-14');
  if (retention.currentStreak >= 30) unlock('streak-30');

  if (sessions.some(s => s.preAssessmentType)) unlock('first-assessment');
  if (sessions.some(s => s.preMoodValue != null && s.postMoodValue != null && s.postMoodValue > s.preMoodValue)) {
    unlock('mood-improved');
  }
  if (sessions.some(s => s.userReflection && s.userReflection.trim().length > 0)) {
    unlock('reflection-written');
  }

  if (changed) retentionRepo.upsert(retention);
  return changed;
}
