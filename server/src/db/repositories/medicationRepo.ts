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
  patient_info: string | null;
  status: 'active' | 'discontinued' | 'completed';
  patient_start_time: string | null;
  dose_times: string[];
  created_at: string;
  updated_at: string;
}

interface MedRow extends Omit<Medication, 'dose_times'> {
  dose_times: string;
}

function parseMed(row: MedRow): Medication {
  return { ...row, dose_times: JSON.parse(row.dose_times || '[]') };
}

export function findByPatientId(patientId: string): Medication[] {
  const rows = db.prepare('SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC').all(patientId) as MedRow[];
  return rows.map(parseMed);
}

export function findByDoctorId(doctorId: string, patientId?: string): Medication[] {
  if (patientId) {
    const rows = db.prepare('SELECT * FROM medications WHERE doctor_id = ? AND patient_id = ? ORDER BY created_at DESC').all(doctorId, patientId) as MedRow[];
    return rows.map(parseMed);
  }
  const rows = db.prepare('SELECT * FROM medications WHERE doctor_id = ? ORDER BY created_at DESC').all(doctorId) as MedRow[];
  return rows.map(parseMed);
}

export function findById(id: string): Medication | undefined {
  const row = db.prepare('SELECT * FROM medications WHERE id = ?').get(id) as MedRow | undefined;
  return row ? parseMed(row) : undefined;
}

// Find active medications ending within N days — for expiry alerts
export function findEndingSoon(daysAhead = 14): Medication[] {
  const now = new Date().toISOString();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const rows = db.prepare(`
    SELECT * FROM medications
    WHERE status = 'active' AND end_date IS NOT NULL
    AND end_date > ? AND end_date <= ?
    ORDER BY end_date ASC
  `).all(now, cutoff.toISOString()) as MedRow[];
  return rows.map(parseMed);
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
  patient_info?: string;
}

export function create(data: CreateMedicationInput): Medication {
  const id = `med-${uuidv4()}`;
  db.prepare(`
    INSERT INTO medications (id, doctor_id, patient_id, name, dosage, frequency, start_date, end_date, notes, patient_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.doctor_id, data.patient_id, data.name, data.dosage, data.frequency, data.start_date, data.end_date ?? null, data.notes ?? null, data.patient_info ?? null);
  return findById(id)!;
}

export function update(id: string, data: Partial<Pick<Medication, 'name' | 'dosage' | 'frequency' | 'end_date' | 'notes' | 'patient_info' | 'status' | 'patient_start_time' | 'dose_times'>>): Medication | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.dosage !== undefined) { fields.push('dosage = ?'); values.push(data.dosage); }
  if (data.frequency !== undefined) { fields.push('frequency = ?'); values.push(data.frequency); }
  if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.patient_info !== undefined) { fields.push('patient_info = ?'); values.push(data.patient_info); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.patient_start_time !== undefined) { fields.push('patient_start_time = ?'); values.push(data.patient_start_time); }
  if (data.dose_times !== undefined) { fields.push('dose_times = ?'); values.push(JSON.stringify(data.dose_times)); }

  if (fields.length === 0) return findById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE medications SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM medications WHERE id = ?').run(id);
}
