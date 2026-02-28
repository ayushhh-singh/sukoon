import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as retentionRepo from '../db/repositories/retentionRepo';
import { syncMilestones } from '../services/retentionService';

const router = Router();
router.use(requireRole('patient'));

// GET /api/retention — also syncs milestones based on existing sessions
router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Sync milestones from existing session data
  try {
    syncMilestones(userId);
  } catch (e) {
    console.error('Milestone sync error (non-fatal):', e);
  }

  res.json(retentionRepo.findByUserId(userId));
});

// PUT /api/retention
router.put('/', (req: Request, res: Response) => {
  try {
    const data = req.body;
    data.userId = req.user!.id;
    retentionRepo.upsert(data);
    res.json(retentionRepo.findByUserId(req.user!.id));
  } catch (error) {
    console.error('Update retention error:', error);
    res.status(500).json({ error: 'Failed to update retention' });
  }
});

// PUT /api/retention/schedule
router.put('/schedule', (req: Request, res: Response) => {
  try {
    retentionRepo.updateSchedule(req.user!.id, req.body.schedule || []);
    res.json(retentionRepo.findByUserId(req.user!.id));
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

export default router;
