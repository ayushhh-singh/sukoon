import type { User } from '../db/repositories/userRepo';
import type { Doctor } from '../db/repositories/doctorRepo';

export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...safe } = user;
  return safe;
}

export function sanitizeDoctor(doctor: Doctor): Omit<Doctor, 'passwordHash'> {
  const { passwordHash, ...safe } = doctor;
  return safe;
}
