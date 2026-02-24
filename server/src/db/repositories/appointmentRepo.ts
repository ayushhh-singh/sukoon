import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  dateTime: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'in_progress';
  notes: string | null;
  rescheduleReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function findById(id: string): Appointment | undefined {
  return db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Appointment | undefined;
}

export function findByPatientId(patientId: string): Appointment[] {
  return db.prepare('SELECT * FROM appointments WHERE patientId = ? ORDER BY dateTime ASC').all(patientId) as Appointment[];
}

export function findByDoctorId(doctorId: string): Appointment[] {
  return db.prepare('SELECT * FROM appointments WHERE doctorId = ? ORDER BY dateTime ASC').all(doctorId) as Appointment[];
}

export function findAll(): Appointment[] {
  return db.prepare('SELECT * FROM appointments ORDER BY dateTime ASC').all() as Appointment[];
}

export function findUpcoming(userId: string, role: 'patient' | 'doctor' | 'admin'): Appointment[] {
  const now = new Date().toISOString();
  if (role === 'admin') {
    return db.prepare("SELECT * FROM appointments WHERE dateTime >= ? AND status != 'cancelled' ORDER BY dateTime ASC").all(now) as Appointment[];
  }
  const field = role === 'patient' ? 'patientId' : 'doctorId';
  return db.prepare(`SELECT * FROM appointments WHERE ${field} = ? AND dateTime >= ? AND status != 'cancelled' ORDER BY dateTime ASC`).all(userId, now) as Appointment[];
}

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  dateTime: string;
  duration?: number;
  notes?: string;
}

export function create(data: CreateAppointmentInput): Appointment {
  const id = `appt-${uuidv4()}`;
  db.prepare(`
    INSERT INTO appointments (id, patientId, doctorId, dateTime, duration, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.patientId, data.doctorId, data.dateTime, data.duration ?? 30, data.notes ?? null);
  return findById(id)!;
}

export function updateStatus(id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'in_progress'): Appointment | undefined {
  db.prepare("UPDATE appointments SET status = ?, updatedAt = datetime('now') WHERE id = ?").run(status, id);
  return findById(id);
}

export function update(id: string, data: Partial<Pick<Appointment, 'dateTime' | 'duration' | 'notes' | 'status' | 'rescheduleReason'>>): Appointment | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.dateTime !== undefined) { fields.push('dateTime = ?'); values.push(data.dateTime); }
  if (data.duration !== undefined) { fields.push('duration = ?'); values.push(data.duration); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.rescheduleReason !== undefined) { fields.push('rescheduleReason = ?'); values.push(data.rescheduleReason); }

  if (fields.length === 0) return findById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
}
