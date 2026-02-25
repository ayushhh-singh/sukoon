import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  age: number | null;
  profession: string | null;
  phone: string | null;
  primaryConcerns: string[];
  therapyExperience: 'none' | 'some' | 'regular';
  language: string;
  voicePreference: string;
  ambientSound: string;
  consentGiven: number;
  knownDisorders: string[];
  currentMedications: string[];
  createdAt: string;
  updatedAt: string;
}

interface UserRow extends Omit<User, 'primaryConcerns' | 'knownDisorders' | 'currentMedications'> {
  primaryConcerns: string;
  knownDisorders: string;
  currentMedications: string;
}

function parseUser(row: UserRow): User {
  return {
    ...row,
    primaryConcerns: JSON.parse(row.primaryConcerns || '[]'),
    knownDisorders: JSON.parse(row.knownDisorders || '[]'),
    currentMedications: JSON.parse(row.currentMedications || '[]'),
  };
}

export function findById(id: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? parseUser(row) : undefined;
}

export function findAll(): User[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY displayName ASC').all() as UserRow[];
  return rows.map(parseUser);
}

export function findByEmail(email: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined;
  return row ? parseUser(row) : undefined;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  age?: number;
  profession?: string;
  primaryConcerns?: string[];
  therapyExperience?: 'none' | 'some' | 'regular';
  language?: string;
  voicePreference?: string;
  ambientSound?: string;
}

export function create(data: CreateUserInput): User {
  const id = `user-${uuidv4()}`;
  db.prepare(`
    INSERT INTO users (id, email, passwordHash, displayName, age, profession, primaryConcerns, therapyExperience, language, voicePreference, ambientSound)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.email.toLowerCase(),
    data.passwordHash,
    data.displayName,
    data.age ?? null,
    data.profession ?? null,
    JSON.stringify(data.primaryConcerns || []),
    data.therapyExperience || 'none',
    data.language || 'English',
    data.voicePreference || 'female',
    data.ambientSound || 'none',
  );
  return findById(id)!;
}

export function update(id: string, data: Partial<Omit<User, 'id' | 'email' | 'passwordHash' | 'createdAt'>>): User | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.displayName !== undefined) { fields.push('displayName = ?'); values.push(data.displayName); }
  if (data.age !== undefined) { fields.push('age = ?'); values.push(data.age); }
  if (data.profession !== undefined) { fields.push('profession = ?'); values.push(data.profession); }
  if (data.primaryConcerns !== undefined) { fields.push('primaryConcerns = ?'); values.push(JSON.stringify(data.primaryConcerns)); }
  if (data.therapyExperience !== undefined) { fields.push('therapyExperience = ?'); values.push(data.therapyExperience); }
  if (data.language !== undefined) { fields.push('language = ?'); values.push(data.language); }
  if (data.voicePreference !== undefined) { fields.push('voicePreference = ?'); values.push(data.voicePreference); }
  if (data.ambientSound !== undefined) { fields.push('ambientSound = ?'); values.push(data.ambientSound); }
  if (data.consentGiven !== undefined) { fields.push('consentGiven = ?'); values.push(data.consentGiven); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.knownDisorders !== undefined) { fields.push('knownDisorders = ?'); values.push(JSON.stringify(data.knownDisorders)); }
  if (data.currentMedications !== undefined) { fields.push('currentMedications = ?'); values.push(JSON.stringify(data.currentMedications)); }

  if (fields.length === 0) return findById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function deleteUser(id: string): void {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}
