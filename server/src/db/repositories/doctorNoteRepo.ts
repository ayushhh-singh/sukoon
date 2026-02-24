import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface DoctorNote {
  id: string;
  doctorId: string;
  patientId: string;
  sessionId: string | null;
  appointmentId: string | null;
  noteType: 'general' | 'session' | 'intake' | 'discharge' | 'soap';
  title: string | null;
  content: string;
  subjective: string | null;
  objective: string | null;
  assessmentText: string | null;
  planText: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface NoteRow extends Omit<DoctorNote, 'tags'> {
  tags: string;
}

function parse(row: NoteRow): DoctorNote {
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

export function findByPatientId(patientId: string): DoctorNote[] {
  const rows = db.prepare('SELECT * FROM doctor_notes WHERE patientId = ? ORDER BY createdAt DESC').all(patientId) as NoteRow[];
  return rows.map(parse);
}

export function findByDoctorId(doctorId: string, patientId?: string): DoctorNote[] {
  if (patientId) {
    const rows = db.prepare('SELECT * FROM doctor_notes WHERE doctorId = ? AND patientId = ? ORDER BY createdAt DESC').all(doctorId, patientId) as NoteRow[];
    return rows.map(parse);
  }
  const rows = db.prepare('SELECT * FROM doctor_notes WHERE doctorId = ? ORDER BY createdAt DESC').all(doctorId) as NoteRow[];
  return rows.map(parse);
}

export function findById(id: string): DoctorNote | undefined {
  const row = db.prepare('SELECT * FROM doctor_notes WHERE id = ?').get(id) as NoteRow | undefined;
  return row ? parse(row) : undefined;
}

export function findByAppointmentId(appointmentId: string): DoctorNote[] {
  const rows = db.prepare('SELECT * FROM doctor_notes WHERE appointmentId = ? ORDER BY createdAt DESC').all(appointmentId) as NoteRow[];
  return rows.map(parse);
}

export interface CreateNoteInput {
  doctorId: string;
  patientId: string;
  sessionId?: string;
  appointmentId?: string;
  noteType?: 'general' | 'session' | 'intake' | 'discharge' | 'soap';
  title?: string;
  content: string;
  subjective?: string;
  objective?: string;
  assessmentText?: string;
  planText?: string;
  tags?: string[];
}

export function create(data: CreateNoteInput): DoctorNote {
  const id = `note-${uuidv4()}`;
  db.prepare(`
    INSERT INTO doctor_notes (id, doctorId, patientId, sessionId, appointmentId, noteType, title, content, subjective, objective, assessmentText, planText, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.doctorId, data.patientId, data.sessionId ?? null, data.appointmentId ?? null, data.noteType || 'general', data.title ?? null, data.content, data.subjective ?? null, data.objective ?? null, data.assessmentText ?? null, data.planText ?? null, JSON.stringify(data.tags || []));
  return findById(id)!;
}

export function update(id: string, data: Partial<Pick<DoctorNote, 'title' | 'content' | 'tags' | 'noteType' | 'subjective' | 'objective' | 'assessmentText' | 'planText'>>): DoctorNote | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
  if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
  if (data.noteType !== undefined) { fields.push('noteType = ?'); values.push(data.noteType); }
  if (data.subjective !== undefined) { fields.push('subjective = ?'); values.push(data.subjective); }
  if (data.objective !== undefined) { fields.push('objective = ?'); values.push(data.objective); }
  if (data.assessmentText !== undefined) { fields.push('assessmentText = ?'); values.push(data.assessmentText); }
  if (data.planText !== undefined) { fields.push('planText = ?'); values.push(data.planText); }

  if (fields.length === 0) return findById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE doctor_notes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM doctor_notes WHERE id = ?').run(id);
}
