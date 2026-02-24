import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Medication {
  id: string;
  doctorId: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  patientInfo: string | null;
  status: 'active' | 'discontinued' | 'completed';
  patientStartTime: string | null;
  doseTimes: string[];
  createdAt: string;
  updatedAt: string;
}

interface MedRow extends Omit<Medication, 'doseTimes'> {
  doseTimes: string;
}

function parseMed(row: MedRow): Medication {
  return { ...row, doseTimes: JSON.parse(row.doseTimes || '[]') };
}

export function findByPatientId(patientId: string): Medication[] {
  const rows = db.prepare('SELECT * FROM medications WHERE patientId = ? ORDER BY createdAt DESC').all(patientId) as MedRow[];
  return rows.map(parseMed);
}

export function findByDoctorId(doctorId: string, patientId?: string): Medication[] {
  if (patientId) {
    const rows = db.prepare('SELECT * FROM medications WHERE doctorId = ? AND patientId = ? ORDER BY createdAt DESC').all(doctorId, patientId) as MedRow[];
    return rows.map(parseMed);
  }
  const rows = db.prepare('SELECT * FROM medications WHERE doctorId = ? ORDER BY createdAt DESC').all(doctorId) as MedRow[];
  return rows.map(parseMed);
}

export function findById(id: string): Medication | undefined {
  const row = db.prepare('SELECT * FROM medications WHERE id = ?').get(id) as MedRow | undefined;
  return row ? parseMed(row) : undefined;
}

export function findEndingSoon(daysAhead = 14): Medication[] {
  const now = new Date().toISOString();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const rows = db.prepare(`
    SELECT * FROM medications
    WHERE status = 'active' AND endDate IS NOT NULL
    AND endDate > ? AND endDate <= ?
    ORDER BY endDate ASC
  `).all(now, cutoff.toISOString()) as MedRow[];
  return rows.map(parseMed);
}

export interface CreateMedicationInput {
  doctorId: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  patientInfo?: string;
}

export function create(data: CreateMedicationInput): Medication {
  const id = `med-${uuidv4()}`;
  db.prepare(`
    INSERT INTO medications (id, doctorId, patientId, name, dosage, frequency, startDate, endDate, notes, patientInfo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.doctorId, data.patientId, data.name, data.dosage, data.frequency, data.startDate, data.endDate ?? null, data.notes ?? null, data.patientInfo ?? null);
  return findById(id)!;
}

export function update(id: string, data: Partial<Pick<Medication, 'name' | 'dosage' | 'frequency' | 'endDate' | 'notes' | 'patientInfo' | 'status' | 'patientStartTime' | 'doseTimes'>>): Medication | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.dosage !== undefined) { fields.push('dosage = ?'); values.push(data.dosage); }
  if (data.frequency !== undefined) { fields.push('frequency = ?'); values.push(data.frequency); }
  if (data.endDate !== undefined) { fields.push('endDate = ?'); values.push(data.endDate); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.patientInfo !== undefined) { fields.push('patientInfo = ?'); values.push(data.patientInfo); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.patientStartTime !== undefined) { fields.push('patientStartTime = ?'); values.push(data.patientStartTime); }
  if (data.doseTimes !== undefined) { fields.push('doseTimes = ?'); values.push(JSON.stringify(data.doseTimes)); }

  if (fields.length === 0) return findById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE medications SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM medications WHERE id = ?').run(id);
}
