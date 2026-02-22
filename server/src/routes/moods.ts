import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as moodRepo from '../db/repositories/moodRepo';

const router = Router();
router.use(requireRole('patient'));

// GET /api/moods
router.get('/', (req: Request, res: Response) => {
  res.json(moodRepo.findByUserId(req.user!.id));
});

// POST /api/moods
router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const mood = moodRepo.create({
      user_id: req.user!.id,
      session_id: body.sessionId || body.session_id,
      value: body.value,
      label: body.label,
      emoji: body.emoji,
      context: body.context,
      timestamp: body.timestamp || new Date().toISOString(),
    });
    res.status(201).json(mood);
  } catch (error) {
    console.error('Create mood error:', error);
    res.status(500).json({ error: 'Failed to save mood' });
  }
});

export default router;
