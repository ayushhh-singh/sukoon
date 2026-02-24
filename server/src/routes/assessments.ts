import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as assessmentRepo from '../db/repositories/assessmentRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';

const router = Router();

// GET /api/assessments — patient's own assessments
router.get('/', requireRole('patient'), (req: Request, res: Response) => {
  res.json(assessmentRepo.findByUserId(req.user!.id));
});

// GET /api/assessments/latest/:type — patient's latest of a type
router.get('/latest/:type', requireRole('patient'), (req: Request, res: Response) => {
  const result = assessmentRepo.findLatest(req.user!.id, (req.params.type as string).toUpperCase());
  if (!result) { res.json(null); return; }
  res.json(result);
});

// GET /api/assessments/patient/:patientId/trends — doctor gets patient assessment trends
router.get('/patient/:patientId/trends', requireRole('doctor'), (req: Request, res: Response) => {
  try {
    const patientId = req.params.patientId as string;
    const doctorId = req.user!.id;

    const linkedPatientIds = doctorRepo.getLinkedPatientIds(doctorId);
    if (!linkedPatientIds.includes(patientId) && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const trends = assessmentRepo.findTrendsByUserId(patientId);
    res.json(trends);
  } catch (error) {
    console.error('Assessment trends error:', error);
    res.status(500).json({ error: 'Failed to load assessment trends' });
  }
});

// POST /api/assessments — patient creates assessment
router.post('/', requireRole('patient'), (req: Request, res: Response) => {
  try {
    const body = req.body;
    const assessment = assessmentRepo.create({
      userId: req.user!.id,
      sessionId: body.sessionId,
      type: body.type,
      responses: body.responses,
      totalScore: body.totalScore,
      severity: body.severity,
      color: body.color,
      timing: body.timing,
      completedAt: body.completedAt || new Date().toISOString(),
    });
    res.status(201).json(assessment);
  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({ error: 'Failed to save assessment' });
  }
});

export default router;
