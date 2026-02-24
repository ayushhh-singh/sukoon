import db from '../database';

export interface Retention {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string | null;
  milestones: Record<string, string | null>;
  schedule: { dayOfWeek: number; time: string; enabled: boolean }[];
  lastReminderShown: string | null;
}

interface RetentionRow extends Omit<Retention, 'milestones' | 'schedule'> {
  milestones: string;
  schedule: string;
}

function parse(row: RetentionRow): Retention {
  return {
    ...row,
    milestones: JSON.parse(row.milestones || '{}'),
    schedule: JSON.parse(row.schedule || '[]'),
  };
}

export function findByUserId(userId: string): Retention {
  const row = db.prepare('SELECT * FROM retention WHERE userId = ?').get(userId) as RetentionRow | undefined;
  if (row) return parse(row);
  return {
    userId: userId,
    currentStreak: 0,
    longestStreak: 0,
    lastSessionDate: null,
    milestones: {},
    schedule: [],
    lastReminderShown: null,
  };
}

export function upsert(data: Retention): void {
  db.prepare(`
    INSERT INTO retention (userId, currentStreak, longestStreak, lastSessionDate, milestones, schedule, lastReminderShown)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET
      currentStreak = excluded.currentStreak,
      longestStreak = excluded.longestStreak,
      lastSessionDate = excluded.lastSessionDate,
      milestones = excluded.milestones,
      schedule = excluded.schedule,
      lastReminderShown = excluded.lastReminderShown
  `).run(
    data.userId,
    data.currentStreak,
    data.longestStreak,
    data.lastSessionDate,
    JSON.stringify(data.milestones),
    JSON.stringify(data.schedule),
    data.lastReminderShown,
  );
}

export function updateSchedule(userId: string, schedule: { dayOfWeek: number; time: string; enabled: boolean }[]): void {
  const existing = findByUserId(userId);
  existing.schedule = schedule;
  upsert(existing);
}
