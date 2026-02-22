import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Medication {
  id: string;
  doctor_id: string;
  patient_id: string;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  status: 'active' | 'discontinued' | 'completed';
  created_at: string;
  updated_at: string;
}

export function findByDoctorId(doctorId: string, patientId?: string): Medication[] {
  if (patientId) {
    return db.prepare('SELECT * FROM medications WHERE doctor_id = ? AND patient_id = ? ORDER BY created_at DESC').all(doctorId, patientId) as Medication[];
  }
  return db.prepare('SELECT * FROM medications WHERE doctor_id = ? ORDER BY created_at DESC').all(doctorId) as Medication[];
}

export function findById(id: string): Medication | undefined {
  return db.prepare('SELECT * FROM medications WHERE id = ?').get(id) as Medication | undefined;
}

export interface CreateMedicationInput {
  doctor_id: string;
  patient_id: string;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  notes?: string;
}

export function create(data: CreateMedicationInput): Medication {
  const id = `med-${uuidv4()}`;
  db.prepare(`
    INSERT INTO medications (id, doctor_id, patient_id, name, dosage, frequency, start_date, end_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.doctor_id, data.patient_id, data.name, data.dosage, data.frequency, data.start_date, data.end_date ?? null, data.notes ?? null);
  return findById(id)!;
}

export function update(id: string, data: Partial<Pick<Medication, 'name' | 'dosage' | 'frequency' | 'end_date' | 'notes' | 'status'>>): Medication | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.dosage !== undefined) { fields.push('dosage = ?'); values.push(data.dosage); }
  if (data.frequency !== undefined) { fields.push('frequency = ?'); values.push(data.frequency); }
  if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

  if (fields.length === 0) return findById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE medications SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM medications WHERE id = ?').run(id);
}
