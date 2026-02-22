import db from '../database';

export interface Retention {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_session_date: string | null;
  milestones: Record<string, string | null>;
  schedule: { dayOfWeek: number; time: string; enabled: boolean }[];
  last_reminder_shown: string | null;
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
  const row = db.prepare('SELECT * FROM retention WHERE user_id = ?').get(userId) as RetentionRow | undefined;
  if (row) return parse(row);
  // Return default
  return {
    user_id: userId,
    current_streak: 0,
    longest_streak: 0,
    last_session_date: null,
    milestones: {},
    schedule: [],
    last_reminder_shown: null,
  };
}

export function upsert(data: Retention): void {
  db.prepare(`
    INSERT INTO retention (user_id, current_streak, longest_streak, last_session_date, milestones, schedule, last_reminder_shown)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      current_streak = excluded.current_streak,
      longest_streak = excluded.longest_streak,
      last_session_date = excluded.last_session_date,
      milestones = excluded.milestones,
      schedule = excluded.schedule,
      last_reminder_shown = excluded.last_reminder_shown
  `).run(
    data.user_id,
    data.current_streak,
    data.longest_streak,
    data.last_session_date,
    JSON.stringify(data.milestones),
    JSON.stringify(data.schedule),
    data.last_reminder_shown,
  );
}

export function updateSchedule(userId: string, schedule: { dayOfWeek: number; time: string; enabled: boolean }[]): void {
  const existing = findByUserId(userId);
  existing.schedule = schedule;
  upsert(existing);
}
