import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as planRepo from '../db/repositories/treatmentPlanRepo';
import * as goalRepo from '../db/repositories/treatmentGoalRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';
import * as notificationRepo from '../db/repositories/notificationRepo';

const router = Router();

function requirePlanOwnership(planId: string, doctorId: string, res: Response): ReturnType<typeof planRepo.findById> {
  const plan = planRepo.findById(planId);
  if (!plan) { res.status(404).json({ error: 'Treatment plan not found' }); return undefined; }
  if (plan.doctorId !== doctorId) { res.status(403).json({ error: 'Access denied' }); return undefined; }
  return plan;
}

// GET /api/treatment-plans?patientId= — list plans (patients see their own, doctors filter by patientId)
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;

  if (role === 'patient') {
    const plans = planRepo.findByPatientId(id);
    res.json(plans.map(plan => ({ ...plan, goals: goalRepo.findByPlanId(plan.id) })));
    return;
  }

  const patientId = req.query.patientId as string;
  if (!patientId) { res.status(400).json({ error: 'patientId is required' }); return; }
  const plans = planRepo.findByPatientId(patientId, id);
  res.json(plans.map(plan => ({ ...plan, goals: goalRepo.findByPlanId(plan.id) })));
});

// GET /api/treatment-plans/:id — get plan with goals
router.get('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const plan = requirePlanOwnership(req.params.id as string, req.user!.id, res);
  if (!plan) return;
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
    const doctorName = doctorRepo.getDoctorDisplayName(req.user!.id);
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
  const plan = requirePlanOwnership(req.params.id as string, req.user!.id, res);
  if (!plan) return;

  const { title, diagnosis, status, startDate, targetEndDate, notes } = req.body;
  const updated = planRepo.update(req.params.id as string, {
    title, diagnosis, status, startDate, targetEndDate, notes,
  });
  res.json(updated);
});

// DELETE /api/treatment-plans/:id
router.delete('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const plan = requirePlanOwnership(req.params.id as string, req.user!.id, res);
  if (!plan) return;

  planRepo.remove(req.params.id as string);
  res.json({ success: true });
});

// --- Goals nested under plans ---

// GET /api/treatment-plans/:planId/goals
router.get('/:planId/goals', requireRole('doctor'), (req: Request, res: Response) => {
  const plan = requirePlanOwnership(req.params.planId as string, req.user!.id, res);
  if (!plan) return;
  res.json(goalRepo.findByPlanId(plan.id));
});

// POST /api/treatment-plans/:planId/goals
router.post('/:planId/goals', requireRole('doctor'), (req: Request, res: Response) => {
  try {
    const plan = requirePlanOwnership(req.params.planId as string, req.user!.id, res);
    if (!plan) return;

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
  const plan = requirePlanOwnership(req.params.planId as string, req.user!.id, res);
  if (!plan) return;

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
  const plan = requirePlanOwnership(req.params.planId as string, req.user!.id, res);
  if (!plan) return;

  const goal = goalRepo.findById(req.params.goalId as string);
  if (!goal || goal.planId !== plan.id) { res.status(404).json({ error: 'Goal not found' }); return; }

  goalRepo.remove(req.params.goalId as string);
  res.json({ success: true });
});

export default router;
