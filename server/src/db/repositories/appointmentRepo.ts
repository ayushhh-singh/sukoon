import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  date_time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function findById(id: string): Appointment | undefined {
  return db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Appointment | undefined;
}

export function findByPatientId(patientId: string): Appointment[] {
  return db.prepare('SELECT * FROM appointments WHERE patient_id = ? ORDER BY date_time ASC').all(patientId) as Appointment[];
}

export function findByDoctorId(doctorId: string): Appointment[] {
  return db.prepare('SELECT * FROM appointments WHERE doctor_id = ? ORDER BY date_time ASC').all(doctorId) as Appointment[];
}

export function findAll(): Appointment[] {
  return db.prepare('SELECT * FROM appointments ORDER BY date_time ASC').all() as Appointment[];
}

export function findUpcoming(userId: string, role: 'patient' | 'doctor' | 'admin'): Appointment[] {
  const now = new Date().toISOString();
  if (role === 'admin') {
    return db.prepare("SELECT * FROM appointments WHERE date_time >= ? AND status != 'cancelled' ORDER BY date_time ASC").all(now) as Appointment[];
  }
  const field = role === 'patient' ? 'patient_id' : 'doctor_id';
  return db.prepare(`SELECT * FROM appointments WHERE ${field} = ? AND date_time >= ? AND status != 'cancelled' ORDER BY date_time ASC`).all(userId, now) as Appointment[];
}

export interface CreateAppointmentInput {
  patient_id: string;
  doctor_id: string;
  date_time: string;
  duration?: number;
  notes?: string;
}

export function create(data: CreateAppointmentInput): Appointment {
  const id = `appt-${uuidv4()}`;
  db.prepare(`
    INSERT INTO appointments (id, patient_id, doctor_id, date_time, duration, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.patient_id, data.doctor_id, data.date_time, data.duration ?? 30, data.notes ?? null);
  return findById(id)!;
}

export function updateStatus(id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed'): Appointment | undefined {
  db.prepare("UPDATE appointments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  return findById(id);
}

export function update(id: string, data: Partial<Pick<Appointment, 'date_time' | 'duration' | 'notes' | 'status'>>): Appointment | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.date_time !== undefined) { fields.push('date_time = ?'); values.push(data.date_time); }
  if (data.duration !== undefined) { fields.push('duration = ?'); values.push(data.duration); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

  if (fields.length === 0) return findById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
}
