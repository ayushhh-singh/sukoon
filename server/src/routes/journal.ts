import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as journalRepo from '../db/repositories/journalRepo';

const router = Router();
router.use(requireRole('patient'));

// GET /api/journal
router.get('/', (req: Request, res: Response) => {
  res.json(journalRepo.findByUserId(req.user!.id));
});

// GET /api/journal/search?q=
router.get('/search', (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (query.length < 2) { res.json([]); return; }
  res.json(journalRepo.search(req.user!.id, query));
});

// POST /api/journal
router.post('/', (req: Request, res: Response) => {
  try {
    const data = req.body;
    data.user_id = req.user!.id;
    const entry = journalRepo.create(data);
    res.status(201).json(entry);
  } catch (error) {
    console.error('Create journal entry error:', error);
    res.status(500).json({ error: 'Failed to save journal entry' });
  }
});

// PUT /api/journal/:id
router.put('/:id', (req: Request, res: Response) => {
  const entry = journalRepo.findById(req.params.id as string);
  if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }
  if (entry.user_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const updated = journalRepo.update(req.params.id as string, req.body);
  res.json(updated);
});

// DELETE /api/journal/:id
router.delete('/:id', (req: Request, res: Response) => {
  const entry = journalRepo.findById(req.params.id as string);
  if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }
  if (entry.user_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  journalRepo.remove(req.params.id as string);
  res.json({ success: true });
});

export default router;
