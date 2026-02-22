import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Doctor {
  id: string;
  email: string;
  password_hash: string;
  username: string;
  display_name: string;
  age: number | null;
  gender: string | null;
  experience_years: number | null;
  specializations: string[];
  qualifications: string | null;
  bio: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  phone: string | null;
  accepting_patients: number;
  created_at: string;
  updated_at: string;
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
    WHERE LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?
    ORDER BY display_name ASC
    LIMIT ?
  `).all(pattern, pattern, limit) as DoctorRow[];
  return rows.map(parseDoctor);
}

export interface CreateDoctorInput {
  email: string;
  password_hash: string;
  username: string;
  display_name: string;
  age?: number;
  gender?: string;
  experience_years?: number;
  specializations?: string[];
  qualifications?: string;
  bio?: string;
  clinic_name?: string;
  clinic_address?: string;
  phone?: string;
}

export function create(data: CreateDoctorInput): Doctor {
  const id = `doctor-${uuidv4()}`;
  db.prepare(`
    INSERT INTO doctors (id, email, password_hash, username, display_name, age, gender, experience_years, specializations, qualifications, bio, clinic_name, clinic_address, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.email.toLowerCase(),
    data.password_hash,
    data.username.toLowerCase(),
    data.display_name,
    data.age ?? null,
    data.gender ?? null,
    data.experience_years ?? null,
    JSON.stringify(data.specializations || []),
    data.qualifications ?? null,
    data.bio ?? null,
    data.clinic_name ?? null,
    data.clinic_address ?? null,
    data.phone ?? null,
  );
  return findById(id)!;
}

export function update(id: string, data: Partial<Omit<Doctor, 'id' | 'email' | 'password_hash' | 'username' | 'created_at'>>): Doctor | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.display_name !== undefined) { fields.push('display_name = ?'); values.push(data.display_name); }
  if (data.age !== undefined) { fields.push('age = ?'); values.push(data.age); }
  if (data.gender !== undefined) { fields.push('gender = ?'); values.push(data.gender); }
  if (data.experience_years !== undefined) { fields.push('experience_years = ?'); values.push(data.experience_years); }
  if (data.specializations !== undefined) { fields.push('specializations = ?'); values.push(JSON.stringify(data.specializations)); }
  if (data.qualifications !== undefined) { fields.push('qualifications = ?'); values.push(data.qualifications); }
  if (data.bio !== undefined) { fields.push('bio = ?'); values.push(data.bio); }
  if (data.clinic_name !== undefined) { fields.push('clinic_name = ?'); values.push(data.clinic_name); }
  if (data.clinic_address !== undefined) { fields.push('clinic_address = ?'); values.push(data.clinic_address); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.accepting_patients !== undefined) { fields.push('accepting_patients = ?'); values.push(data.accepting_patients); }

  if (fields.length === 0) return findById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE doctors SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

// Doctor-Patient Links

export function linkPatient(doctorId: string, patientId: string): void {
  const id = `link-${uuidv4()}`;
  db.prepare(`
    INSERT OR IGNORE INTO doctor_patient_links (id, doctor_id, patient_id)
    VALUES (?, ?, ?)
  `).run(id, doctorId, patientId);
}

export function unlinkPatient(doctorId: string, patientId: string): void {
  db.prepare('DELETE FROM doctor_patient_links WHERE doctor_id = ? AND patient_id = ?').run(doctorId, patientId);
}

export function getLinkedPatientIds(doctorId: string): string[] {
  const rows = db.prepare(
    "SELECT patient_id FROM doctor_patient_links WHERE doctor_id = ? AND status = 'active'"
  ).all(doctorId) as { patient_id: string }[];
  return rows.map(r => r.patient_id);
}

export function getLinkedDoctorIds(patientId: string): string[] {
  const rows = db.prepare(
    "SELECT doctor_id FROM doctor_patient_links WHERE patient_id = ? AND status = 'active'"
  ).all(patientId) as { doctor_id: string }[];
  return rows.map(r => r.doctor_id);
}
