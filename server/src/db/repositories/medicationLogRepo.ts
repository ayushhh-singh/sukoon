import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface MedicationLog {
  id: string;
  medication_id: string;
  patient_id: string;
  scheduled_time: string;
  status: 'taken' | 'skipped' | 'missed';
  taken_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateLogInput {
  medication_id: string;
  patient_id: string;
  scheduled_time: string;
  status: 'taken' | 'skipped' | 'missed';
  taken_at?: string;
  notes?: string;
}

export function create(data: CreateLogInput): MedicationLog {
  const id = `medlog-${uuidv4()}`;
  db.prepare(`
    INSERT INTO medication_logs (id, medication_id, patient_id, scheduled_time, status, taken_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.medication_id, data.patient_id, data.scheduled_time, data.status, data.taken_at ?? null, data.notes ?? null);
  return db.prepare('SELECT * FROM medication_logs WHERE id = ?').get(id) as MedicationLog;
}

export function findByMedicationId(medicationId: string): MedicationLog[] {
  return db.prepare('SELECT * FROM medication_logs WHERE medication_id = ? ORDER BY scheduled_time DESC').all(medicationId) as MedicationLog[];
}

export function findByPatientId(patientId: string): MedicationLog[] {
  return db.prepare('SELECT * FROM medication_logs WHERE patient_id = ? ORDER BY scheduled_time DESC').all(patientId) as MedicationLog[];
}

export interface MedicationTally {
  medication_id: string;
  total: number;
  taken: number;
  skipped: number;
  missed: number;
}

export function getTallyByMedicationId(medicationId: string): MedicationTally {
  const rows = db.prepare(`
    SELECT
      medication_id,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
    FROM medication_logs
    WHERE medication_id = ?
    GROUP BY medication_id
  `).get(medicationId) as MedicationTally | undefined;

  return rows || { medication_id: medicationId, total: 0, taken: 0, skipped: 0, missed: 0 };
}

export function getTalliesByPatientId(patientId: string): MedicationTally[] {
  return db.prepare(`
    SELECT
      medication_id,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
    FROM medication_logs
    WHERE patient_id = ?
    GROUP BY medication_id
  `).all(patientId) as MedicationTally[];
}

export function remove(id: string): void {
  db.prepare('DELETE FROM medication_logs WHERE id = ?').run(id);
}

export interface DayLog {
  day: string;
  status: string;
  scheduled_time: string;
}

export function getRecentLogs(medicationId: string, days = 14): DayLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return db.prepare(`
    SELECT date(scheduled_time) as day, status, scheduled_time
    FROM medication_logs
    WHERE medication_id = ? AND scheduled_time >= ?
    ORDER BY scheduled_time DESC
  `).all(medicationId, cutoff.toISOString()) as DayLog[];
}

export function get7DayTallyByPatientId(patientId: string): { taken: number; total: number } {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const result = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken
    FROM medication_logs
    WHERE patient_id = ? AND scheduled_time >= ?
  `).get(patientId, cutoff.toISOString()) as { total: number; taken: number } | undefined;
  return result || { taken: 0, total: 0 };
}

export function getPatientWeekSummary(patientId: string): { total: number; taken: number; skipped: number; missed: number } {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const result = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
    FROM medication_logs
    WHERE patient_id = ? AND scheduled_time >= ?
  `).get(patientId, cutoff.toISOString()) as { total: number; taken: number; skipped: number; missed: number } | undefined;
  return result || { total: 0, taken: 0, skipped: 0, missed: 0 };
}

export function getAllActivePatients(): { patient_id: string; doctor_id: string }[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return db.prepare(`
    SELECT DISTINCT ml.patient_id, m.doctor_id
    FROM medication_logs ml
    JOIN medications m ON m.id = ml.medication_id
    WHERE ml.scheduled_time >= ? AND m.status = 'active'
  `).all(cutoff.toISOString()) as { patient_id: string; doctor_id: string }[];
}

export function getStreak(medicationId: string): number {
  const rows = db.prepare(`
    SELECT
      date(scheduled_time) as day,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken_count
    FROM medication_logs
    WHERE medication_id = ?
    GROUP BY date(scheduled_time)
    ORDER BY day DESC
  `).all(medicationId) as { day: string; taken_count: number }[];

  if (rows.length === 0) return 0;

  const dayMap = new Map(rows.map(r => [r.day, r.taken_count > 0]));
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;

  // If today has taken doses, start from today; otherwise from yesterday
  const startOffset = dayMap.get(today) === true ? 0 : 1;

  for (let i = startOffset; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (dayMap.get(key) === true) {
      streak++;
    } else if (dayMap.has(key)) {
      break; // Day logged but not taken — streak broken
    } else {
      break; // No log for this day
    }
  }

  return streak;
}
