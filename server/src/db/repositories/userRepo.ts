import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  age: number | null;
  profession: string | null;
  primary_concerns: string[];
  therapy_experience: 'none' | 'some' | 'regular';
  language: string;
  voice_preference: string;
  ambient_sound: string;
  consent_given: number;
  known_disorders: string[];
  current_medications: string[];
  created_at: string;
  updated_at: string;
}

interface UserRow extends Omit<User, 'primary_concerns' | 'known_disorders' | 'current_medications'> {
  primary_concerns: string;
  known_disorders: string;
  current_medications: string;
}

function parseUser(row: UserRow): User {
  return {
    ...row,
    primary_concerns: JSON.parse(row.primary_concerns || '[]'),
    known_disorders: JSON.parse(row.known_disorders || '[]'),
    current_medications: JSON.parse(row.current_medications || '[]'),
  };
}

export function findById(id: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? parseUser(row) : undefined;
}

export function findAll(): User[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY display_name ASC').all() as UserRow[];
  return rows.map(parseUser);
}

export function findByEmail(email: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined;
  return row ? parseUser(row) : undefined;
}

export interface CreateUserInput {
  email: string;
  password_hash: string;
  display_name: string;
  age?: number;
  profession?: string;
  primary_concerns?: string[];
  therapy_experience?: 'none' | 'some' | 'regular';
  language?: string;
  voice_preference?: string;
  ambient_sound?: string;
}

export function create(data: CreateUserInput): User {
  const id = `user-${uuidv4()}`;
  db.prepare(`
    INSERT INTO users (id, email, password_hash, display_name, age, profession, primary_concerns, therapy_experience, language, voice_preference, ambient_sound)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.email.toLowerCase(),
    data.password_hash,
    data.display_name,
    data.age ?? null,
    data.profession ?? null,
    JSON.stringify(data.primary_concerns || []),
    data.therapy_experience || 'none',
    data.language || 'English',
    data.voice_preference || 'female',
    data.ambient_sound || 'none',
  );
  return findById(id)!;
}

export function update(id: string, data: Partial<Omit<User, 'id' | 'email' | 'password_hash' | 'created_at'>>): User | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.display_name !== undefined) { fields.push('display_name = ?'); values.push(data.display_name); }
  if (data.age !== undefined) { fields.push('age = ?'); values.push(data.age); }
  if (data.profession !== undefined) { fields.push('profession = ?'); values.push(data.profession); }
  if (data.primary_concerns !== undefined) { fields.push('primary_concerns = ?'); values.push(JSON.stringify(data.primary_concerns)); }
  if (data.therapy_experience !== undefined) { fields.push('therapy_experience = ?'); values.push(data.therapy_experience); }
  if (data.language !== undefined) { fields.push('language = ?'); values.push(data.language); }
  if (data.voice_preference !== undefined) { fields.push('voice_preference = ?'); values.push(data.voice_preference); }
  if (data.ambient_sound !== undefined) { fields.push('ambient_sound = ?'); values.push(data.ambient_sound); }
  if (data.consent_given !== undefined) { fields.push('consent_given = ?'); values.push(data.consent_given); }
  if (data.known_disorders !== undefined) { fields.push('known_disorders = ?'); values.push(JSON.stringify(data.known_disorders)); }
  if (data.current_medications !== undefined) { fields.push('current_medications = ?'); values.push(JSON.stringify(data.current_medications)); }

  if (fields.length === 0) return findById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function deleteUser(id: string): void {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}
