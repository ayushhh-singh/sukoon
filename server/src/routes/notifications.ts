import { Router, type Request, type Response } from 'express';
import * as notificationRepo from '../db/repositories/notificationRepo';

const router = Router();

// GET /api/notifications — list notifications
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  res.json(notificationRepo.findByUser(id, role));
});

// GET /api/notifications/unread-count
router.get('/unread-count', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  res.json({ count: notificationRepo.countUnread(id, role) });
});

// PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', (req: Request, res: Response) => {
  notificationRepo.markAsRead(req.params.id as string);
  res.json({ success: true });
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  notificationRepo.markAllAsRead(id, role);
  res.json({ success: true });
});

// DELETE /api/notifications/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  notificationRepo.remove(req.params.id as string, id, role);
  res.json({ success: true });
});

// DELETE /api/notifications — clear all
router.delete('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  notificationRepo.clearAll(id, role as 'patient' | 'doctor');
  res.json({ success: true });
});

export default router;
