import { Router, type Request, type Response } from 'express';
import * as notificationRepo from '../db/repositories/notificationRepo';

const router = Router();

// GET /api/notifications — list notifications for current user
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  const unreadOnly = req.query.unread === 'true';
  res.json(notificationRepo.findByUser(id, role, unreadOnly));
});

// GET /api/notifications/unread-count
router.get('/unread-count', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  res.json({ count: notificationRepo.countUnread(id, role) });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', (req: Request, res: Response) => {
  notificationRepo.markAsRead(req.params.id as string);
  res.json({ success: true });
});

// PUT /api/notifications/read-all
router.put('/read-all', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  notificationRepo.markAllAsRead(id, role);
  res.json({ success: true });
});

// DELETE /api/notifications — clear all notifications for user
router.delete('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  notificationRepo.clearAll(id, role as 'patient' | 'doctor');
  res.json({ success: true });
});

// DELETE /api/notifications/:id — delete a single notification
router.delete('/:id', (req: Request, res: Response) => {
  const { id: userId, role } = req.user!;
  notificationRepo.remove(req.params.id as string, userId, role);
  res.json({ success: true });
});

export default router;
