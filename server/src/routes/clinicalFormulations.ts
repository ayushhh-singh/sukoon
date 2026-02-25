import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as formulationRepo from '../db/repositories/clinicalFormulationRepo';

const router = Router();

// GET /api/formulations?patientId= — get latest formulation (patients see their own)
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;

  if (role === 'patient') {
    const formulation = formulationRepo.findByPatientId(id);
    res.json(formulation || null);
    return;
  }

  // Doctor path
  const patientId = req.query.patientId as string;
  if (!patientId) { res.status(400).json({ error: 'patientId is required' }); return; }

  const formulation = formulationRepo.findByPatientId(patientId, id);
  res.json(formulation || null);
});

// GET /api/formulations/all?patientId= — all formulations for patient
router.get('/all', requireRole('doctor'), (req: Request, res: Response) => {
  const patientId = req.query.patientId as string;
  if (!patientId) { res.status(400).json({ error: 'patientId is required' }); return; }

  res.json(formulationRepo.findAllByPatientId(patientId));
});

// POST /api/formulations — create formulation
router.post('/', requireRole('doctor'), (req: Request, res: Response) => {
  try {
    const { patientId, presentingProblems, predisposingFactors, precipitatingFactors, perpetuatingFactors, protectiveFactors, formulationSummary } = req.body;
    if (!patientId) { res.status(400).json({ error: 'patientId is required' }); return; }

    const formulation = formulationRepo.create({
      doctorId: req.user!.id,
      patientId,
      presentingProblems,
      predisposingFactors,
      precipitatingFactors,
      perpetuatingFactors,
      protectiveFactors,
      formulationSummary,
    });

    res.status(201).json(formulation);
  } catch (error) {
    console.error('Create formulation error:', error);
    res.status(500).json({ error: 'Failed to create formulation' });
  }
});

// PUT /api/formulations/:id
router.put('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const formulation = formulationRepo.findById(req.params.id as string);
  if (!formulation) { res.status(404).json({ error: 'Formulation not found' }); return; }
  if (formulation.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const { presentingProblems, predisposingFactors, precipitatingFactors, perpetuatingFactors, protectiveFactors, formulationSummary } = req.body;
  const updated = formulationRepo.update(req.params.id as string, {
    presentingProblems, predisposingFactors, precipitatingFactors, perpetuatingFactors, protectiveFactors, formulationSummary,
  });
  res.json(updated);
});

export default router;
