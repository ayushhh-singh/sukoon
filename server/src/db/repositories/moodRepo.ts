import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Mood {
  id: string;
  userId: string;
  sessionId: string | null;
  value: number;
  label: string;
  emoji: string | null;
  context: 'pre-session' | 'post-session' | 'standalone' | null;
  timestamp: string;
}

export function findByUserId(userId: string): Mood[] {
  return db.prepare('SELECT * FROM moods WHERE userId = ? ORDER BY timestamp DESC').all(userId) as Mood[];
}

export interface CreateMoodInput {
  userId: string;
  sessionId?: string;
  value: number;
  label: string;
  emoji?: string;
  context?: 'pre-session' | 'post-session' | 'standalone';
  timestamp: string;
}

export function create(data: CreateMoodInput): Mood {
  const id = `mood-${uuidv4()}`;
  db.prepare(`
    INSERT INTO moods (id, userId, sessionId, value, label, emoji, context, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.userId, data.sessionId ?? null, data.value, data.label, data.emoji ?? null, data.context ?? null, data.timestamp);
  return db.prepare('SELECT * FROM moods WHERE id = ?').get(id) as Mood;
}
