import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  userId: string;
  userRole: 'patient' | 'doctor';
  type: string;
  title: string;
  message: string;
  referenceId: string | null;
  referenceType: string | null;
  isRead: number;
  createdAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  userRole: 'patient' | 'doctor';
  type: string;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
}

export function create(data: CreateNotificationInput): Notification {
  const id = `notif-${uuidv4()}`;
  db.prepare(`
    INSERT INTO notifications (id, userId, userRole, type, title, message, referenceId, referenceType)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.userId, data.userRole, data.type, data.title, data.message, data.referenceId ?? null, data.referenceType ?? null);
  return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as Notification;
}

export function findByUser(userId: string, role: string, unreadOnly = false, limit = 50): Notification[] {
  if (unreadOnly) {
    return db.prepare(
      'SELECT * FROM notifications WHERE userId = ? AND userRole = ? AND isRead = 0 ORDER BY createdAt DESC LIMIT ?'
    ).all(userId, role, limit) as Notification[];
  }
  return db.prepare(
    'SELECT * FROM notifications WHERE userId = ? AND userRole = ? ORDER BY createdAt DESC LIMIT ?'
  ).all(userId, role, limit) as Notification[];
}

export function countUnread(userId: string, role: string): number {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND userRole = ? AND isRead = 0'
  ).get(userId, role) as { count: number };
  return row.count;
}

export function markAsRead(id: string): void {
  db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ?').run(id);
}

export function markAllAsRead(userId: string, role: string): void {
  db.prepare('UPDATE notifications SET isRead = 1 WHERE userId = ? AND userRole = ? AND isRead = 0').run(userId, role);
}

export function remove(id: string, userId?: string, role?: string): void {
  if (userId && role) {
    db.prepare('DELETE FROM notifications WHERE id = ? AND userId = ? AND userRole = ?').run(id, userId, role);
  } else {
    db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
  }
}

export function clearAll(userId: string, role: 'patient' | 'doctor'): void {
  db.prepare('DELETE FROM notifications WHERE userId = ? AND userRole = ?').run(userId, role);
}

export function hasRecentNotification(userId: string, type: string, referenceId: string, hoursAgo: number): boolean {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursAgo);
  const result = db.prepare(
    'SELECT id FROM notifications WHERE userId = ? AND type = ? AND referenceId = ? AND createdAt >= ? LIMIT 1'
  ).get(userId, type, referenceId, cutoff.toISOString());
  return !!result;
}
