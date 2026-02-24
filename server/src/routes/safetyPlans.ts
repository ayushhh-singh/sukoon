import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as safetyPlanRepo from '../db/repositories/safetyPlanRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';
import * as notificationRepo from '../db/repositories/notificationRepo';

const router = Router();

// GET /api/safety-plans?patientId= — get safety plans
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  const patientId = req.query.patientId as string;

  if (role === 'patient') {
    const plan = safetyPlanRepo.findActiveByPatientId(id);
    res.json(plan || null);
    return;
  }

  if (!patientId) {
    res.status(400).json({ error: 'patientId is required' });
    return;
  }
  const plan = safetyPlanRepo.findActiveByPatientId(patientId);
  res.json(plan || null);
});

// GET /api/safety-plans/history?patientId= — all plans for patient
router.get('/history', requireRole('doctor'), (req: Request, res: Response) => {
  const patientId = req.query.patientId as string;
  if (!patientId) { res.status(400).json({ error: 'patientId is required' }); return; }
  res.json(safetyPlanRepo.findAllByPatientId(patientId));
});

// GET /api/safety-plans/:id
router.get('/:id', (req: Request, res: Response) => {
  const plan = safetyPlanRepo.findById(req.params.id as string);
  if (!plan) { res.status(404).json({ error: 'Safety plan not found' }); return; }

  const { id, role } = req.user!;
  if (role === 'patient' && plan.patientId !== id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (role === 'doctor' && plan.doctorId !== id) { res.status(403).json({ error: 'Access denied' }); return; }

  res.json(plan);
});

// POST /api/safety-plans — create (deactivates previous)
router.post('/', requireRole('doctor'), (req: Request, res: Response) => {
  try {
    const { patientId, warningSigns, copingStrategies, supportContacts, professionalContacts, environmentSafety, reasonsForLiving } = req.body;
    if (!patientId) { res.status(400).json({ error: 'patientId is required' }); return; }

    const plan = safetyPlanRepo.create({
      doctorId: req.user!.id,
      patientId,
      warningSigns,
      copingStrategies,
      supportContacts,
      professionalContacts,
      environmentSafety,
      reasonsForLiving,
    });

    // Notify patient
    const doctor = doctorRepo.findById(req.user!.id);
    const doctorName = doctor?.displayName || 'Your doctor';
    notificationRepo.create({
      userId: patientId,
      userRole: 'patient',
      type: 'safety_plan_updated',
      title: 'Safety plan updated',
      message: `Dr. ${doctorName} created/updated your safety plan`,
      referenceId: plan.id,
      referenceType: 'safety_plan',
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error('Create safety plan error:', error);
    res.status(500).json({ error: 'Failed to create safety plan' });
  }
});

// PUT /api/safety-plans/:id
router.put('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const plan = safetyPlanRepo.findById(req.params.id as string);
  if (!plan) { res.status(404).json({ error: 'Safety plan not found' }); return; }
  if (plan.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const { warningSigns, copingStrategies, supportContacts, professionalContacts, environmentSafety, reasonsForLiving } = req.body;
  const updated = safetyPlanRepo.update(req.params.id as string, {
    warningSigns, copingStrategies, supportContacts, professionalContacts, environmentSafety, reasonsForLiving,
  });
  res.json(updated);
});

// DELETE /api/safety-plans/:id
router.delete('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const plan = safetyPlanRepo.findById(req.params.id as string);
  if (!plan) { res.status(404).json({ error: 'Safety plan not found' }); return; }
  if (plan.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  safetyPlanRepo.remove(req.params.id as string);
  res.json({ success: true });
});

export default router;
