import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as bookmarkRepo from '../db/repositories/bookmarkRepo';

const router = Router();
router.use(requireRole('patient'));

// GET /api/bookmarks
router.get('/', (req: Request, res: Response) => {
  res.json(bookmarkRepo.findByUserId(req.user!.id));
});

// POST /api/bookmarks
router.post('/', (req: Request, res: Response) => {
  try {
    const data = req.body;
    data.user_id = req.user!.id;
    const bookmark = bookmarkRepo.create(data);
    res.status(201).json(bookmark);
  } catch (error) {
    console.error('Create bookmark error:', error);
    res.status(500).json({ error: 'Failed to save bookmark' });
  }
});

// DELETE /api/bookmarks/:id
router.delete('/:id', (req: Request, res: Response) => {
  bookmarkRepo.remove(req.params.id as string);
  res.json({ success: true });
});

export default router;
