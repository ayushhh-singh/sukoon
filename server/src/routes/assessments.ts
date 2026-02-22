import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as assessmentRepo from '../db/repositories/assessmentRepo';

const router = Router();
router.use(requireRole('patient'));

// GET /api/assessments
router.get('/', (req: Request, res: Response) => {
  res.json(assessmentRepo.findByUserId(req.user!.id));
});

// GET /api/assessments/latest/:type
router.get('/latest/:type', (req: Request, res: Response) => {
  const result = assessmentRepo.findLatest(req.user!.id, (req.params.type as string).toUpperCase());
  if (!result) { res.json(null); return; }
  res.json(result);
});

// POST /api/assessments
router.post('/', (req: Request, res: Response) => {
  try {
    const data = req.body;
    data.user_id = req.user!.id;
    const assessment = assessmentRepo.create(data);
    res.status(201).json(assessment);
  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({ error: 'Failed to save assessment' });
  }
});

export default router;
