import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Doctor {
  id: string;
  email: string;
  passwordHash: string;
  username: string;
  displayName: string;
  age: number | null;
  gender: string | null;
  experienceYears: number | null;
  specializations: string[];
  qualifications: string | null;
  bio: string | null;
  clinicName: string | null;
  clinicAddress: string | null;
  phone: string | null;
  acceptingPatients: number;
  createdAt: string;
  updatedAt: string;
}

interface DoctorRow extends Omit<Doctor, 'specializations'> {
  specializations: string;
}

function parseDoctor(row: DoctorRow): Doctor {
  return {
    ...row,
    specializations: JSON.parse(row.specializations || '[]'),
  };
}

export function findById(id: string): Doctor | undefined {
  const row = db.prepare('SELECT * FROM doctors WHERE id = ?').get(id) as DoctorRow | undefined;
  return row ? parseDoctor(row) : undefined;
}

export function findByEmail(email: string): Doctor | undefined {
  const row = db.prepare('SELECT * FROM doctors WHERE email = ?').get(email.toLowerCase()) as DoctorRow | undefined;
  return row ? parseDoctor(row) : undefined;
}

export function findByUsername(username: string): Doctor | undefined {
  const row = db.prepare('SELECT * FROM doctors WHERE username = ?').get(username.toLowerCase()) as DoctorRow | undefined;
  return row ? parseDoctor(row) : undefined;
}

export function search(query: string, limit = 10): Doctor[] {
  const pattern = `%${query.toLowerCase()}%`;
  const rows = db.prepare(`
    SELECT * FROM doctors
    WHERE LOWER(username) LIKE ? OR LOWER(displayName) LIKE ?
    ORDER BY displayName ASC
    LIMIT ?
  `).all(pattern, pattern, limit) as DoctorRow[];
  return rows.map(parseDoctor);
}

export interface CreateDoctorInput {
  email: string;
  passwordHash: string;
  username: string;
  displayName: string;
  age?: number;
  gender?: string;
  experienceYears?: number;
  specializations?: string[];
  qualifications?: string;
  bio?: string;
  clinicName?: string;
  clinicAddress?: string;
  phone?: string;
}

export function create(data: CreateDoctorInput): Doctor {
  const id = `doctor-${uuidv4()}`;
  db.prepare(`
    INSERT INTO doctors (id, email, passwordHash, username, displayName, age, gender, experienceYears, specializations, qualifications, bio, clinicName, clinicAddress, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.email.toLowerCase(),
    data.passwordHash,
    data.username.toLowerCase(),
    data.displayName,
    data.age ?? null,
    data.gender ?? null,
    data.experienceYears ?? null,
    JSON.stringify(data.specializations || []),
    data.qualifications ?? null,
    data.bio ?? null,
    data.clinicName ?? null,
    data.clinicAddress ?? null,
    data.phone ?? null,
  );
  return findById(id)!;
}

export function update(id: string, data: Partial<Omit<Doctor, 'id' | 'email' | 'passwordHash' | 'username' | 'createdAt'>>): Doctor | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.displayName !== undefined) { fields.push('displayName = ?'); values.push(data.displayName); }
  if (data.age !== undefined) { fields.push('age = ?'); values.push(data.age); }
  if (data.gender !== undefined) { fields.push('gender = ?'); values.push(data.gender); }
  if (data.experienceYears !== undefined) { fields.push('experienceYears = ?'); values.push(data.experienceYears); }
  if (data.specializations !== undefined) { fields.push('specializations = ?'); values.push(JSON.stringify(data.specializations)); }
  if (data.qualifications !== undefined) { fields.push('qualifications = ?'); values.push(data.qualifications); }
  if (data.bio !== undefined) { fields.push('bio = ?'); values.push(data.bio); }
  if (data.clinicName !== undefined) { fields.push('clinicName = ?'); values.push(data.clinicName); }
  if (data.clinicAddress !== undefined) { fields.push('clinicAddress = ?'); values.push(data.clinicAddress); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.acceptingPatients !== undefined) { fields.push('acceptingPatients = ?'); values.push(data.acceptingPatients); }

  if (fields.length === 0) return findById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE doctors SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

// Doctor-Patient Links

export function linkPatient(doctorId: string, patientId: string): void {
  const id = `link-${uuidv4()}`;
  db.prepare(`
    INSERT OR IGNORE INTO doctor_patient_links (id, doctorId, patientId)
    VALUES (?, ?, ?)
  `).run(id, doctorId, patientId);
}

export function unlinkPatient(doctorId: string, patientId: string): void {
  db.prepare('DELETE FROM doctor_patient_links WHERE doctorId = ? AND patientId = ?').run(doctorId, patientId);
}

export function getLinkedPatientIds(doctorId: string): string[] {
  const rows = db.prepare(
    "SELECT patientId FROM doctor_patient_links WHERE doctorId = ? AND status = 'active'"
  ).all(doctorId) as { patientId: string }[];
  return rows.map(r => r.patientId);
}

export function getLinkedDoctorIds(patientId: string): string[] {
  const rows = db.prepare(
    "SELECT doctorId FROM doctor_patient_links WHERE patientId = ? AND status = 'active'"
  ).all(patientId) as { doctorId: string }[];
  return rows.map(r => r.doctorId);
}
