import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Bookmark {
  id: string;
  userId: string;
  text: string;
  concern: string | null;
  sessionId: string | null;
  sessionDate: string | null;
  savedAt: string;
}

export function findByUserId(userId: string): Bookmark[] {
  return db.prepare('SELECT * FROM bookmarks WHERE userId = ? ORDER BY savedAt DESC').all(userId) as Bookmark[];
}

export interface CreateBookmarkInput {
  userId: string;
  text: string;
  concern?: string;
  sessionId?: string;
  sessionDate?: string;
}

export function create(data: CreateBookmarkInput): Bookmark {
  const id = `bm-${uuidv4()}`;
  const savedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO bookmarks (id, userId, text, concern, sessionId, sessionDate, savedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.userId, data.text, data.concern ?? null, data.sessionId ?? null, data.sessionDate ?? null, savedAt);
  return db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as Bookmark;
}

export function remove(id: string): void {
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
}
