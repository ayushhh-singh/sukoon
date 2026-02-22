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
    const data = req.body;
    data.user_id = req.user!.id;
    const mood = moodRepo.create(data);
    res.status(201).json(mood);
  } catch (error) {
    console.error('Create mood error:', error);
    res.status(500).json({ error: 'Failed to save mood' });
  }
});

export default router;
