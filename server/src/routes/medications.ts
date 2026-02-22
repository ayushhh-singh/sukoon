import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as medRepo from '../db/repositories/medicationRepo';

const router = Router();
router.use(requireRole('doctor'));

// GET /api/medications?patientId=
router.get('/', (req: Request, res: Response) => {
  const patientId = req.query.patientId as string | undefined;
  res.json(medRepo.findByDoctorId(req.user!.id, patientId));
});

// GET /api/medications/:id
router.get('/:id', (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }
  if (med.doctor_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }
  res.json(med);
});

// POST /api/medications
router.post('/', (req: Request, res: Response) => {
  try {
    const { patientId, name, dosage, frequency, startDate, endDate, notes } = req.body;
    if (!patientId || !name || !dosage || !frequency || !startDate) {
      res.status(400).json({ error: 'patientId, name, dosage, frequency, and startDate are required' });
      return;
    }
    const med = medRepo.create({
      doctor_id: req.user!.id,
      patient_id: patientId,
      name,
      dosage,
      frequency,
      start_date: startDate,
      end_date: endDate,
      notes,
    });
    res.status(201).json(med);
  } catch (error) {
    console.error('Create medication error:', error);
    res.status(500).json({ error: 'Failed to create medication' });
  }
});

// PUT /api/medications/:id
router.put('/:id', (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }
  if (med.doctor_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const updated = medRepo.update(req.params.id as string, req.body);
  res.json(updated);
});

// DELETE /api/medications/:id
router.delete('/:id', (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }
  if (med.doctor_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  medRepo.remove(req.params.id as string);
  res.json({ success: true });
});

export default router;
