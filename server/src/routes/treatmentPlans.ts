import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as planRepo from '../db/repositories/treatmentPlanRepo';
import * as goalRepo from '../db/repositories/treatmentGoalRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';
import * as notificationRepo from '../db/repositories/notificationRepo';

const router = Router();

// GET /api/treatment-plans?patientId= — list plans
router.get('/', requireRole('doctor'), (req: Request, res: Response) => {
  const patientId = req.query.patientId as string;
  if (!patientId) {
    res.status(400).json({ error: 'patientId is required' });
    return;
  }
  const plans = planRepo.findByPatientId(patientId, req.user!.id);
  const plansWithGoals = plans.map(plan => ({
    ...plan,
    goals: goalRepo.findByPlanId(plan.id),
  }));
  res.json(plansWithGoals);
});

// GET /api/treatment-plans/:id — get plan with goals
router.get('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const plan = planRepo.findById(req.params.id as string);
  if (!plan) { res.status(404).json({ error: 'Treatment plan not found' }); return; }
  if (plan.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  res.json({ ...plan, goals: goalRepo.findByPlanId(plan.id) });
});

// POST /api/treatment-plans — create plan
router.post('/', requireRole('doctor'), (req: Request, res: Response) => {
  try {
    const { patientId, title, diagnosis, startDate, targetEndDate, notes } = req.body;
    if (!patientId || !title || !startDate) {
      res.status(400).json({ error: 'patientId, title, and startDate are required' });
      return;
    }

    const plan = planRepo.create({
      doctorId: req.user!.id,
      patientId,
      title,
      diagnosis,
      startDate,
      targetEndDate,
      notes,
    });

    // Notify patient
    const doctor = doctorRepo.findById(req.user!.id);
    const doctorName = doctor?.displayName || 'Your doctor';
    notificationRepo.create({
      userId: patientId,
      userRole: 'patient',
      type: 'treatment_plan_created',
      title: 'New treatment plan',
      message: `Dr. ${doctorName} created a treatment plan: ${title}`,
      referenceId: plan.id,
      referenceType: 'treatment_plan',
    });

    res.status(201).json({ ...plan, goals: [] });
  } catch (error) {
    console.error('Create treatment plan error:', error);
    res.status(500).json({ error: 'Failed to create treatment plan' });
  }
});

// PUT /api/treatment-plans/:id — update plan
router.put('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const plan = planRepo.findById(req.params.id as string);
  if (!plan) { res.status(404).json({ error: 'Treatment plan not found' }); return; }
  if (plan.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const { title, diagnosis, status, startDate, targetEndDate, notes } = req.body;
  const updated = planRepo.update(req.params.id as string, {
    title, diagnosis, status, startDate, targetEndDate, notes,
  });
  res.json(updated);
});

// DELETE /api/treatment-plans/:id
router.delete('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const plan = planRepo.findById(req.params.id as string);
  if (!plan) { res.status(404).json({ error: 'Treatment plan not found' }); return; }
  if (plan.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  planRepo.remove(req.params.id as string);
  res.json({ success: true });
});

// --- Goals nested under plans ---

// GET /api/treatment-plans/:planId/goals
router.get('/:planId/goals', requireRole('doctor'), (req: Request, res: Response) => {
  const plan = planRepo.findById(req.params.planId as string);
  if (!plan) { res.status(404).json({ error: 'Treatment plan not found' }); return; }
  if (plan.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  res.json(goalRepo.findByPlanId(plan.id));
});

// POST /api/treatment-plans/:planId/goals
router.post('/:planId/goals', requireRole('doctor'), (req: Request, res: Response) => {
  try {
    const plan = planRepo.findById(req.params.planId as string);
    if (!plan) { res.status(404).json({ error: 'Treatment plan not found' }); return; }
    if (plan.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

    const { title, description, targetDate, interventions, notes } = req.body;
    if (!title) { res.status(400).json({ error: 'title is required' }); return; }

    const goal = goalRepo.create({
      planId: plan.id,
      title,
      description,
      targetDate,
      interventions,
      notes,
    });
    res.status(201).json(goal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// PUT /api/treatment-plans/:planId/goals/:goalId
router.put('/:planId/goals/:goalId', requireRole('doctor'), (req: Request, res: Response) => {
  const plan = planRepo.findById(req.params.planId as string);
  if (!plan) { res.status(404).json({ error: 'Treatment plan not found' }); return; }
  if (plan.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const goal = goalRepo.findById(req.params.goalId as string);
  if (!goal || goal.planId !== plan.id) { res.status(404).json({ error: 'Goal not found' }); return; }

  const { title, description, targetDate, status, progress, interventions, notes } = req.body;
  const updated = goalRepo.update(req.params.goalId as string, {
    title, description, status, progress, interventions, notes, targetDate,
  });
  res.json(updated);
});

// DELETE /api/treatment-plans/:planId/goals/:goalId
router.delete('/:planId/goals/:goalId', requireRole('doctor'), (req: Request, res: Response) => {
  const plan = planRepo.findById(req.params.planId as string);
  if (!plan) { res.status(404).json({ error: 'Treatment plan not found' }); return; }
  if (plan.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const goal = goalRepo.findById(req.params.goalId as string);
  if (!goal || goal.planId !== plan.id) { res.status(404).json({ error: 'Goal not found' }); return; }

  goalRepo.remove(req.params.goalId as string);
  res.json({ success: true });
});

export default router;
