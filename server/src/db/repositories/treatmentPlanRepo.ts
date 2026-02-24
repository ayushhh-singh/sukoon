import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface TreatmentPlan {
  id: string;
  doctorId: string;
  patientId: string;
  title: string;
  diagnosis: string | null;
  status: 'active' | 'completed' | 'paused' | 'revised';
  startDate: string;
  targetEndDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function findById(id: string): TreatmentPlan | undefined {
  return db.prepare('SELECT * FROM treatment_plans WHERE id = ?').get(id) as TreatmentPlan | undefined;
}

export function findByPatientId(patientId: string, doctorId?: string): TreatmentPlan[] {
  if (doctorId) {
    return db.prepare('SELECT * FROM treatment_plans WHERE patientId = ? AND doctorId = ? ORDER BY createdAt DESC').all(patientId, doctorId) as TreatmentPlan[];
  }
  return db.prepare('SELECT * FROM treatment_plans WHERE patientId = ? ORDER BY createdAt DESC').all(patientId) as TreatmentPlan[];
}

export function findActive(patientId: string, doctorId: string): TreatmentPlan[] {
  return db.prepare("SELECT * FROM treatment_plans WHERE patientId = ? AND doctorId = ? AND status = 'active' ORDER BY createdAt DESC").all(patientId, doctorId) as TreatmentPlan[];
}

export interface CreatePlanInput {
  doctorId: string;
  patientId: string;
  title: string;
  diagnosis?: string;
  startDate: string;
  targetEndDate?: string;
  notes?: string;
}

export function create(data: CreatePlanInput): TreatmentPlan {
  const id = `plan-${uuidv4()}`;
  db.prepare(`
    INSERT INTO treatment_plans (id, doctorId, patientId, title, diagnosis, startDate, targetEndDate, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.doctorId, data.patientId, data.title, data.diagnosis ?? null, data.startDate, data.targetEndDate ?? null, data.notes ?? null);
  return findById(id)!;
}

export function update(id: string, data: Partial<Pick<TreatmentPlan, 'title' | 'diagnosis' | 'status' | 'startDate' | 'targetEndDate' | 'notes'>>): TreatmentPlan | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.diagnosis !== undefined) { fields.push('diagnosis = ?'); values.push(data.diagnosis); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.startDate !== undefined) { fields.push('startDate = ?'); values.push(data.startDate); }
  if (data.targetEndDate !== undefined) { fields.push('targetEndDate = ?'); values.push(data.targetEndDate); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }

  if (fields.length === 0) return findById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE treatment_plans SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM treatment_plans WHERE id = ?').run(id);
}
