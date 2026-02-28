import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as sessionRepo from '../db/repositories/sessionRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';
import * as retentionRepo from '../db/repositories/retentionRepo';
import { updateRetentionAfterSession } from '../services/retentionService';

const router = Router();

// GET /api/sessions — get own sessions (patient), linked patients' sessions (doctor), or all (admin)
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;

  if (role === 'admin') {
    res.json(sessionRepo.findAll());
  } else if (role === 'patient') {
    res.json(sessionRepo.findByUserId(id));
  } else {
    const patientIds = doctorRepo.getLinkedPatientIds(id);
    res.json(sessionRepo.findByUserIds(patientIds));
  }
});

// GET /api/sessions/:id
router.get('/:id', (req: Request, res: Response) => {
  const session = sessionRepo.findById(req.params.id as string);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  const { id, role } = req.user!;
  if (role === 'admin') { res.json(session); return; }

  if (role === 'patient' && session.userId !== id) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  if (role === 'doctor') {
    const patientIds = doctorRepo.getLinkedPatientIds(id);
    if (!patientIds.includes(session.userId)) {
      res.status(403).json({ error: 'Access denied' }); return;
    }
  }

  res.json(session);
});

// POST /api/sessions — create/save session
router.post('/', requireRole('patient'), (req: Request, res: Response) => {
  try {
    const data = req.body;
    data.userId = req.user!.id;
    const session = sessionRepo.create(data);

    // Update streak and milestones
    try {
      updateRetentionAfterSession(req.user!.id, session);
    } catch (e) {
      console.error('Retention update error (non-fatal):', e);
    }

    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// PUT /api/sessions/:sessionId/post-mood — save post-session mood on the session record
router.put('/:sessionId/post-mood', requireRole('patient'), (req: Request, res: Response) => {
  const session = sessionRepo.findBySessionId(req.params.sessionId as string);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.userId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const { value, label, emoji } = req.body;
  if (value == null) { res.status(400).json({ error: 'Mood value required' }); return; }

  sessionRepo.updatePostMood(session.sessionId, value, label || '', emoji || '');

  // Check mood-improved milestone
  if (session.preMoodValue != null && value > session.preMoodValue) {
    try {
      const retention = retentionRepo.findByUserId(req.user!.id);
      if (!retention.milestones['mood-improved']) {
        retention.milestones['mood-improved'] = new Date().toISOString();
        retentionRepo.upsert(retention);
      }
    } catch { /* non-fatal */ }
  }

  res.json({ success: true });
});

// PUT /api/sessions/:id/reflection
router.put('/:id/reflection', requireRole('patient'), (req: Request, res: Response) => {
  const session = sessionRepo.findById(req.params.id as string);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.userId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const reflection = req.body.reflection || '';
  sessionRepo.updateReflection(req.params.id as string, reflection);

  // Unlock reflection milestone if non-empty
  if (reflection.trim().length > 0) {
    try {
      const retention = retentionRepo.findByUserId(req.user!.id);
      if (!retention.milestones['reflection-written']) {
        retention.milestones['reflection-written'] = new Date().toISOString();
        retentionRepo.upsert(retention);
      }
    } catch (e) {
      console.error('Reflection milestone error (non-fatal):', e);
    }
  }

  res.json({ success: true });
});


export default router;
