import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface AppointmentCheckin {
  id: string;
  appointmentId: string;
  patientId: string;
  moodValue: number | null;
  moodLabel: string | null;
  concerns: string[];
  goalsForSession: string | null;
  symptomsSinceLast: string | null;
  medicationIssues: string | null;
  createdAt: string;
}

interface CheckinRow extends Omit<AppointmentCheckin, 'concerns'> {
  concerns: string;
}

function parse(row: CheckinRow): AppointmentCheckin {
  return { ...row, concerns: JSON.parse(row.concerns || '[]') };
}

export function findById(id: string): AppointmentCheckin | undefined {
  const row = db.prepare('SELECT * FROM appointment_checkins WHERE id = ?').get(id) as CheckinRow | undefined;
  return row ? parse(row) : undefined;
}

export function findByAppointmentId(appointmentId: string): AppointmentCheckin | undefined {
  const row = db.prepare('SELECT * FROM appointment_checkins WHERE appointmentId = ? ORDER BY createdAt DESC LIMIT 1').get(appointmentId) as CheckinRow | undefined;
  return row ? parse(row) : undefined;
}

export function findByPatientId(patientId: string): AppointmentCheckin[] {
  const rows = db.prepare('SELECT * FROM appointment_checkins WHERE patientId = ? ORDER BY createdAt DESC').all(patientId) as CheckinRow[];
  return rows.map(parse);
}

export interface CreateCheckinInput {
  appointmentId: string;
  patientId: string;
  moodValue?: number;
  moodLabel?: string;
  concerns?: string[];
  goalsForSession?: string;
  symptomsSinceLast?: string;
  medicationIssues?: string;
}

export function create(data: CreateCheckinInput): AppointmentCheckin {
  const id = `checkin-${uuidv4()}`;
  db.prepare(`
    INSERT INTO appointment_checkins (id, appointmentId, patientId, moodValue, moodLabel, concerns, goalsForSession, symptomsSinceLast, medicationIssues)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.appointmentId, data.patientId, data.moodValue ?? null, data.moodLabel ?? null, JSON.stringify(data.concerns || []), data.goalsForSession ?? null, data.symptomsSinceLast ?? null, data.medicationIssues ?? null);
  return findById(id)!;
}
