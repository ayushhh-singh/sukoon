import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface JournalEntry {
  id: string;
  userId: string;
  date: string;
  title: string;
  content: string;
  moodTag: string | null;
  moodLabel: string | null;
  tags: string[];
  templateUsed: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JournalRow extends Omit<JournalEntry, 'tags'> {
  tags: string;
}

function parse(row: JournalRow): JournalEntry {
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

export function findByUserId(userId: string): JournalEntry[] {
  const rows = db.prepare('SELECT * FROM journal_entries WHERE userId = ? ORDER BY date DESC').all(userId) as JournalRow[];
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
    WHERE userId = ? AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
    ORDER BY date DESC
  `).all(userId, pattern, pattern, pattern) as JournalRow[];
  return rows.map(parse);
}

export interface CreateJournalInput {
  userId: string;
  date: string;
  title: string;
  content: string;
  moodTag?: string;
  moodLabel?: string;
  tags?: string[];
  templateUsed?: string;
}

export function create(data: CreateJournalInput): JournalEntry {
  const id = `journal-${uuidv4()}`;
  db.prepare(`
    INSERT INTO journal_entries (id, userId, date, title, content, moodTag, moodLabel, tags, templateUsed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.userId, data.date, data.title, data.content, data.moodTag ?? null, data.moodLabel ?? null, JSON.stringify(data.tags || []), data.templateUsed ?? null);
  return findById(id)!;
}

export function update(id: string, data: Partial<Pick<JournalEntry, 'title' | 'content' | 'moodTag' | 'moodLabel' | 'tags'>>): JournalEntry | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
  if (data.moodTag !== undefined) { fields.push('moodTag = ?'); values.push(data.moodTag); }
  if (data.moodLabel !== undefined) { fields.push('moodLabel = ?'); values.push(data.moodLabel); }
  if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }

  if (fields.length === 0) return findById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE journal_entries SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id);
}
