import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface DoctorNote {
  id: string;
  doctor_id: string;
  patient_id: string;
  session_id: string | null;
  note_type: 'general' | 'session' | 'intake' | 'discharge';
  title: string | null;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface NoteRow extends Omit<DoctorNote, 'tags'> {
  tags: string;
}

function parse(row: NoteRow): DoctorNote {
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

export function findByDoctorId(doctorId: string, patientId?: string): DoctorNote[] {
  if (patientId) {
    const rows = db.prepare('SELECT * FROM doctor_notes WHERE doctor_id = ? AND patient_id = ? ORDER BY created_at DESC').all(doctorId, patientId) as NoteRow[];
    return rows.map(parse);
  }
  const rows = db.prepare('SELECT * FROM doctor_notes WHERE doctor_id = ? ORDER BY created_at DESC').all(doctorId) as NoteRow[];
  return rows.map(parse);
}

export function findById(id: string): DoctorNote | undefined {
  const row = db.prepare('SELECT * FROM doctor_notes WHERE id = ?').get(id) as NoteRow | undefined;
  return row ? parse(row) : undefined;
}

export interface CreateNoteInput {
  doctor_id: string;
  patient_id: string;
  session_id?: string;
  note_type?: 'general' | 'session' | 'intake' | 'discharge';
  title?: string;
  content: string;
  tags?: string[];
}

export function create(data: CreateNoteInput): DoctorNote {
  const id = `note-${uuidv4()}`;
  db.prepare(`
    INSERT INTO doctor_notes (id, doctor_id, patient_id, session_id, note_type, title, content, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.doctor_id, data.patient_id, data.session_id ?? null, data.note_type || 'general', data.title ?? null, data.content, JSON.stringify(data.tags || []));
  return findById(id)!;
}

export function update(id: string, data: Partial<Pick<DoctorNote, 'title' | 'content' | 'tags' | 'note_type'>>): DoctorNote | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
  if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
  if (data.note_type !== undefined) { fields.push('note_type = ?'); values.push(data.note_type); }

  if (fields.length === 0) return findById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE doctor_notes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM doctor_notes WHERE id = ?').run(id);
}
