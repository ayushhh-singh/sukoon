import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface MedicationLog {
  id: string;
  medicationId: string;
  patientId: string;
  scheduledTime: string;
  status: 'taken' | 'skipped' | 'missed';
  takenAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateLogInput {
  medicationId: string;
  patientId: string;
  scheduledTime: string;
  status: 'taken' | 'skipped' | 'missed';
  takenAt?: string;
  notes?: string;
}

export function create(data: CreateLogInput): MedicationLog {
  const id = `medlog-${uuidv4()}`;
  db.prepare(`
    INSERT INTO medication_logs (id, medicationId, patientId, scheduledTime, status, takenAt, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.medicationId, data.patientId, data.scheduledTime, data.status, data.takenAt ?? null, data.notes ?? null);
  return db.prepare('SELECT * FROM medication_logs WHERE id = ?').get(id) as MedicationLog;
}

export function findByMedicationId(medicationId: string): MedicationLog[] {
  return db.prepare('SELECT * FROM medication_logs WHERE medicationId = ? ORDER BY scheduledTime DESC').all(medicationId) as MedicationLog[];
}

export function findByPatientId(patientId: string): MedicationLog[] {
  return db.prepare('SELECT * FROM medication_logs WHERE patientId = ? ORDER BY scheduledTime DESC').all(patientId) as MedicationLog[];
}

export interface MedicationTally {
  medicationId: string;
  total: number;
  taken: number;
  skipped: number;
  missed: number;
}

export function getTallyByMedicationId(medicationId: string): MedicationTally {
  const rows = db.prepare(`
    SELECT
      medicationId,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
    FROM medication_logs
    WHERE medicationId = ?
    GROUP BY medicationId
  `).get(medicationId) as MedicationTally | undefined;

  return rows || { medicationId: medicationId, total: 0, taken: 0, skipped: 0, missed: 0 };
}

export function getTalliesByPatientId(patientId: string): MedicationTally[] {
  return db.prepare(`
    SELECT
      medicationId,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
    FROM medication_logs
    WHERE patientId = ?
    GROUP BY medicationId
  `).all(patientId) as MedicationTally[];
}

export function remove(id: string): void {
  db.prepare('DELETE FROM medication_logs WHERE id = ?').run(id);
}

export interface DayLog {
  day: string;
  status: string;
  scheduledTime: string;
  takenAt: string | null;
  notes: string | null;
}

export function getRecentLogs(medicationId: string, days = 14): DayLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return db.prepare(`
    SELECT date(scheduledTime) as day, status, scheduledTime, takenAt, notes
    FROM medication_logs
    WHERE medicationId = ? AND scheduledTime >= ?
    ORDER BY scheduledTime DESC
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
    WHERE patientId = ? AND scheduledTime >= ?
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
    WHERE patientId = ? AND scheduledTime >= ?
  `).get(patientId, cutoff.toISOString()) as { total: number; taken: number; skipped: number; missed: number } | undefined;
  return result || { total: 0, taken: 0, skipped: 0, missed: 0 };
}

export function getAllActivePatients(): { patientId: string; doctorId: string }[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return db.prepare(`
    SELECT DISTINCT ml.patientId, m.doctorId
    FROM medication_logs ml
    JOIN medications m ON m.id = ml.medicationId
    WHERE ml.scheduledTime >= ? AND m.status = 'active'
  `).all(cutoff.toISOString()) as { patientId: string; doctorId: string }[];
}

export function getStreak(medicationId: string): number {
  const rows = db.prepare(`
    SELECT
      date(scheduledTime) as day,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as takenCount
    FROM medication_logs
    WHERE medicationId = ?
    GROUP BY date(scheduledTime)
    ORDER BY day DESC
  `).all(medicationId) as { day: string; takenCount: number }[];

  if (rows.length === 0) return 0;

  const dayMap = new Map(rows.map(r => [r.day, r.takenCount > 0]));
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;

  const startOffset = dayMap.get(today) === true ? 0 : 1;

  for (let i = startOffset; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (dayMap.get(key) === true) {
      streak++;
    } else if (dayMap.has(key)) {
      break;
    } else {
      break;
    }
  }

  return streak;
}
