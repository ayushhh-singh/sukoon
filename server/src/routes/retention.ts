import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as retentionRepo from '../db/repositories/retentionRepo';
import * as sessionRepo from '../db/repositories/sessionRepo';

const router = Router();
router.use(requireRole('patient'));

// GET /api/retention — also syncs milestones based on existing sessions
router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const retention = retentionRepo.findByUserId(userId);

  // Sync milestones from existing session data
  try {
    const sessions = sessionRepo.findByUserId(userId);
    const now = new Date().toISOString();
    let changed = false;

    const unlock = (id: string) => {
      if (!retention.milestones[id]) {
        retention.milestones[id] = now;
        changed = true;
      }
    };

    // Session count milestones
    if (sessions.length >= 1) unlock('first-session');
    if (sessions.length >= 5) unlock('sessions-5');
    if (sessions.length >= 10) unlock('sessions-10');
    if (sessions.length >= 25) unlock('sessions-25');

    // Streak milestones
    if (retention.currentStreak >= 3) unlock('streak-3');
    if (retention.currentStreak >= 7) unlock('streak-7');
    if (retention.currentStreak >= 14) unlock('streak-14');
    if (retention.currentStreak >= 30) unlock('streak-30');

    // Assessment milestone
    if (sessions.some(s => s.preAssessmentType)) unlock('first-assessment');

    // Mood improved milestone
    if (sessions.some(s => s.preMoodValue != null && s.postMoodValue != null && s.postMoodValue > s.preMoodValue)) {
      unlock('mood-improved');
    }

    // Reflection milestone
    if (sessions.some(s => s.userReflection && s.userReflection.trim().length > 0)) {
      unlock('reflection-written');
    }

    if (changed) retentionRepo.upsert(retention);
  } catch (e) {
    console.error('Milestone sync error (non-fatal):', e);
  }

  res.json(retention);
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
