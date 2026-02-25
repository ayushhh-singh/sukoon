import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as medRepo from '../db/repositories/medicationRepo';
import * as medLogRepo from '../db/repositories/medicationLogRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';
import * as notificationRepo from '../db/repositories/notificationRepo';
import { emitToUser } from '../realtimeEvents';

const router = Router();

// GET /api/medications?patientId= — list medications
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  const patientId = req.query.patientId as string | undefined;

  if (role === 'patient') {
    res.json(medRepo.findByPatientId(id));
  } else {
    res.json(medRepo.findByDoctorId(id, patientId));
  }
});

// GET /api/medications/:id — get single medication
router.get('/:id', (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }
  res.json(med);
});

// POST /api/medications — doctor creates medication
router.post('/', requireRole('doctor'), (req: Request, res: Response) => {
  try {
    const { patientId, name, dosage, frequency, startDate, endDate, notes, patientInfo } = req.body;
    if (!patientId || !name || !dosage || !frequency || !startDate) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const med = medRepo.create({
      doctorId: req.user!.id,
      patientId,
      name,
      dosage,
      frequency,
      startDate,
      endDate,
      notes,
      patientInfo,
    });

    // Notify patient
    const doctor = doctorRepo.findById(req.user!.id);
    const doctorName = doctor?.displayName || 'Your doctor';
    notificationRepo.create({
      userId: patientId,
      userRole: 'patient',
      type: 'medication_prescribed',
      title: 'New medication prescribed',
      message: `Dr. ${doctorName} prescribed ${name} (${dosage}, ${frequency})`,
      referenceId: med.id,
      referenceType: 'medication',
    });

    emitToUser(patientId, { type: 'medication:created', payload: med });
    emitToUser(patientId, { type: 'notification:new', payload: { type: 'medication_prescribed' } });

    res.status(201).json(med);
  } catch (error) {
    console.error('Create medication error:', error);
    res.status(500).json({ error: 'Failed to create medication' });
  }
});

// PUT /api/medications/:id — update medication
router.put('/:id', (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }

  const { id, role } = req.user!;
  if (role === 'doctor' && med.doctorId !== id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (role === 'patient' && med.patientId !== id) { res.status(403).json({ error: 'Access denied' }); return; }

  const { name, dosage, frequency, endDate, notes, patientInfo, status, patientStartTime, doseTimes } = req.body;

  // Patient can only update patientStartTime and doseTimes
  if (role === 'patient') {
    const updated = medRepo.update(req.params.id as string, { patientStartTime, doseTimes });
    emitToUser(med.patientId, { type: 'medication:updated', payload: updated });
    res.json(updated);
    return;
  }

  const updated = medRepo.update(req.params.id as string, { name, dosage, frequency, endDate, notes, patientInfo, status, patientStartTime, doseTimes });

  // Notify patient of changes
  if (updated && (name || dosage || frequency || status)) {
    notificationRepo.create({
      userId: med.patientId,
      userRole: 'patient',
      type: 'medication_updated',
      title: 'Medication updated',
      message: `Your ${updated.name} prescription has been updated`,
      referenceId: med.id,
      referenceType: 'medication',
    });
    emitToUser(med.patientId, { type: 'notification:new', payload: { type: 'medication_updated' } });
  }

  emitToUser(med.patientId, { type: 'medication:updated', payload: updated });
  res.json(updated);
});

// DELETE /api/medications/:id
router.delete('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }
  if (med.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }
  medRepo.remove(req.params.id as string);
  emitToUser(med.patientId, { type: 'medication:deleted', payload: { id: med.id } });
  res.json({ success: true });
});

// --- Dose Logs ---

// GET /api/medications/tallies/all?patientId= — all tallies for a patient
router.get('/tallies/all', (req: Request, res: Response) => {
  const patientId = (req.query.patientId as string) || req.user!.id;
  res.json(medLogRepo.getTalliesByPatientId(patientId));
});

// GET /api/medications/:id/tally — tally for one medication
router.get('/:id/tally', (req: Request, res: Response) => {
  res.json(medLogRepo.getTallyByMedicationId(req.params.id as string));
});

// GET /api/medications/:id/recent-logs?days= — recent logs for one medication
router.get('/:id/recent-logs', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 14;
  res.json(medLogRepo.getRecentLogs(req.params.id as string, days));
});

// GET /api/medications/:id/logs — all logs for one medication
router.get('/:id/logs', (req: Request, res: Response) => {
  res.json(medLogRepo.findByMedicationId(req.params.id as string));
});

// POST /api/medications/:id/logs — patient logs a dose
router.post('/:id/logs', requireRole('patient'), (req: Request, res: Response) => {
  try {
    const med = medRepo.findById(req.params.id as string);
    if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }
    if (med.patientId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

    const { scheduledTime, status, takenAt, notes } = req.body;
    if (!scheduledTime || !status) { res.status(400).json({ error: 'scheduledTime and status are required' }); return; }

    const log = medLogRepo.create({
      medicationId: req.params.id as string,
      patientId: req.user!.id,
      scheduledTime,
      status,
      takenAt,
      notes,
    });

    // Notify doctor if skipped
    if (status === 'skipped') {
      notificationRepo.create({
        userId: med.doctorId,
        userRole: 'doctor',
        type: 'dose_skipped',
        title: 'Dose skipped',
        message: `A patient skipped their ${med.name} dose`,
        referenceId: med.id,
        referenceType: 'medication',
      });
      emitToUser(med.doctorId, { type: 'notification:new', payload: { type: 'dose_skipped' } });
    }

    emitToUser(med.doctorId, { type: 'doselog:created', payload: { medicationId: med.id, status, patientId: med.patientId } });
    res.status(201).json(log);
  } catch (error) {
    console.error('Create dose log error:', error);
    res.status(500).json({ error: 'Failed to log dose' });
  }
});

// GET /api/medications/:id/streak — adherence streak
router.get('/:id/streak', (req: Request, res: Response) => {
  res.json({ streak: medLogRepo.getStreak(req.params.id as string) });
});

export default router;
