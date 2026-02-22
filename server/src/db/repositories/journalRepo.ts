import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  title: string;
  content: string;
  mood_tag: string | null;
  mood_label: string | null;
  tags: string[];
  template_used: string | null;
  created_at: string;
  updated_at: string;
}

interface JournalRow extends Omit<JournalEntry, 'tags'> {
  tags: string;
}

function parse(row: JournalRow): JournalEntry {
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

export function findByUserId(userId: string): JournalEntry[] {
  const rows = db.prepare('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC').all(userId) as JournalRow[];
  return rows.map(parse);
}

export function findById(id: string): JournalEntry | undefined {
  const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as JournalRow | undefined;
  return row ? parse(row) : undefined;
}

export function search(userId: string, query: string): JournalEntry[] {
  const pattern = `%${query}%`;
  const rows = db.prepare(`
    SELECT * FROM journal_entries
    WHERE user_id = ? AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
    ORDER BY date DESC
  `).all(userId, pattern, pattern, pattern) as JournalRow[];
  return rows.map(parse);
}

export interface CreateJournalInput {
  user_id: string;
  date: string;
  title: string;
  content: string;
  mood_tag?: string;
  mood_label?: string;
  tags?: string[];
  template_used?: string;
}

export function create(data: CreateJournalInput): JournalEntry {
  const id = `journal-${uuidv4()}`;
  db.prepare(`
    INSERT INTO journal_entries (id, user_id, date, title, content, mood_tag, mood_label, tags, template_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.user_id, data.date, data.title, data.content, data.mood_tag ?? null, data.mood_label ?? null, JSON.stringify(data.tags || []), data.template_used ?? null);
  return findById(id)!;
}

export function update(id: string, data: Partial<Pick<JournalEntry, 'title' | 'content' | 'mood_tag' | 'mood_label' | 'tags'>>): JournalEntry | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
  if (data.mood_tag !== undefined) { fields.push('mood_tag = ?'); values.push(data.mood_tag); }
  if (data.mood_label !== undefined) { fields.push('mood_label = ?'); values.push(data.mood_label); }
  if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }

  if (fields.length === 0) return findById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE journal_entries SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id);
}
