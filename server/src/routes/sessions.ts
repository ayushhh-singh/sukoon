import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as sessionRepo from '../db/repositories/sessionRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';

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
    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// PUT /api/sessions/:id/reflection
router.put('/:id/reflection', requireRole('patient'), (req: Request, res: Response) => {
  const session = sessionRepo.findById(req.params.id as string);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.userId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  sessionRepo.updateReflection(req.params.id as string, req.body.reflection || '');
  res.json({ success: true });
});

export default router;
