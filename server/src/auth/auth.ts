import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sukoon-dev-secret-change-in-production';
const JWT_EXPIRY = '24h';
const SALT_ROUNDS = 10;

export interface TokenPayload {
  id: string;
  role: 'patient' | 'doctor' | 'admin';
  email: string;
}

export const ADMIN_EMAIL = 'asingh@sukoon.com';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
