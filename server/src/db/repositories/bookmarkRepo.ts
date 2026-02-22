import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Bookmark {
  id: string;
  user_id: string;
  text: string;
  concern: string | null;
  session_id: string | null;
  session_date: string | null;
  saved_at: string;
}

export function findByUserId(userId: string): Bookmark[] {
  return db.prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY saved_at DESC').all(userId) as Bookmark[];
}

export interface CreateBookmarkInput {
  user_id: string;
  text: string;
  concern?: string;
  session_id?: string;
  session_date?: string;
}

export function create(data: CreateBookmarkInput): Bookmark {
  const id = `bm-${uuidv4()}`;
  const saved_at = new Date().toISOString();
  db.prepare(`
    INSERT INTO bookmarks (id, user_id, text, concern, session_id, session_date, saved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.user_id, data.text, data.concern ?? null, data.session_id ?? null, data.session_date ?? null, saved_at);
  return db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as Bookmark;
}

export function remove(id: string): void {
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
}
