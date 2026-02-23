import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  user_id: string;
  user_role: 'patient' | 'doctor';
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: number;
  created_at: string;
}

export interface CreateNotificationInput {
  user_id: string;
  user_role: 'patient' | 'doctor';
  type: string;
  title: string;
  message: string;
  reference_id?: string;
  reference_type?: string;
}

export function create(data: CreateNotificationInput): Notification {
  const id = `notif-${uuidv4()}`;
  db.prepare(`
    INSERT INTO notifications (id, user_id, user_role, type, title, message, reference_id, reference_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.user_id, data.user_role, data.type, data.title, data.message, data.reference_id ?? null, data.reference_type ?? null);
  return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as Notification;
}

export function findByUser(userId: string, role: string, unreadOnly = false, limit = 50): Notification[] {
  if (unreadOnly) {
    return db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? AND user_role = ? AND is_read = 0 ORDER BY created_at DESC LIMIT ?'
    ).all(userId, role, limit) as Notification[];
  }
  return db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? AND user_role = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, role, limit) as Notification[];
}

export function countUnread(userId: string, role: string): number {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND user_role = ? AND is_read = 0'
  ).get(userId, role) as { count: number };
  return row.count;
}

export function markAsRead(id: string): void {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
}

export function markAllAsRead(userId: string, role: string): void {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND user_role = ? AND is_read = 0').run(userId, role);
}

export function remove(id: string, userId?: string, role?: string): void {
  if (userId && role) {
    db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ? AND user_role = ?').run(id, userId, role);
  } else {
    db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
  }
}

export function clearAll(userId: string, role: 'patient' | 'doctor'): void {
  db.prepare('DELETE FROM notifications WHERE user_id = ? AND user_role = ?').run(userId, role);
}

export function hasRecentNotification(userId: string, type: string, referenceId: string, hoursAgo: number): boolean {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursAgo);
  const result = db.prepare(
    'SELECT id FROM notifications WHERE user_id = ? AND type = ? AND reference_id = ? AND created_at >= ? LIMIT 1'
  ).get(userId, type, referenceId, cutoff.toISOString());
  return !!result;
}
