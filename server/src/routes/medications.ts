import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as medRepo from '../db/repositories/medicationRepo';
import * as medLogRepo from '../db/repositories/medicationLogRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';
import * as notificationRepo from '../db/repositories/notificationRepo';

const router = Router();

// GET /api/medications?patientId= — doctors see their meds, patients see their own
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;

  if (role === 'patient') {
    res.json(medRepo.findByPatientId(id));
    return;
  }

  // Doctor
  const patientId = req.query.patientId as string | undefined;
  res.json(medRepo.findByDoctorId(id, patientId));
});

// GET /api/medications/adherence/overview — doctor only: 7-day adherence per patient
// NOTE: Must be before /:id to avoid being matched as an id
router.get('/adherence/overview', requireRole('doctor'), (req: Request, res: Response) => {
  const doctorId = req.user!.id;
  const meds = medRepo.findByDoctorId(doctorId);
  const patientIds = [...new Set(meds.map(m => m.patient_id))];

  const results = patientIds.map(patientId => {
    const activeMeds = meds.filter(m => m.patient_id === patientId && m.status === 'active');
    const weekStats = medLogRepo.get7DayTallyByPatientId(patientId);
    const adherence = weekStats.total > 0 ? Math.round((weekStats.taken / weekStats.total) * 100) : null;
    return {
      patientId,
      activeMedCount: activeMeds.length,
      weekTaken: weekStats.taken,
      weekTotal: weekStats.total,
      weekAdherence: adherence,
    };
  });

  res.json(results);
});

// GET /api/medications/tallies/all — get all tallies for a patient (patient) or specific patient (doctor)
// NOTE: Must be before /:id to avoid being matched as an id
router.get('/tallies/all', (req: Request, res: Response) => {
  const { id, role } = req.user!;

  if (role === 'patient') {
    res.json(medLogRepo.getTalliesByPatientId(id));
  } else if (role === 'doctor') {
    const patientId = req.query.patientId as string;
    if (!patientId) { res.status(400).json({ error: 'patientId is required for doctors' }); return; }
    res.json(medLogRepo.getTalliesByPatientId(patientId));
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
});

// GET /api/medications/:id
router.get('/:id', (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }

  const { id, role } = req.user!;
  if (role === 'doctor' && med.doctor_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (role === 'patient' && med.patient_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }

  res.json(med);
});

// POST /api/medications — doctor only
router.post('/', requireRole('doctor'), (req: Request, res: Response) => {
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

    // Notify patient
    const doctor = doctorRepo.findById(req.user!.id);
    const doctorName = doctor?.display_name || 'Your doctor';
    notificationRepo.create({
      user_id: patientId,
      user_role: 'patient',
      type: 'medication_added',
      title: 'New medication prescribed',
      message: `Dr. ${doctorName} prescribed ${name} (${dosage}, ${frequency})`,
      reference_id: med.id,
      reference_type: 'medication',
    });

    res.status(201).json(med);
  } catch (error) {
    console.error('Create medication error:', error);
    res.status(500).json({ error: 'Failed to create medication' });
  }
});

// PUT /api/medications/:id — doctor can update all fields, patient can update start time & dose times
router.put('/:id', (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }

  const { id, role } = req.user!;

  if (role === 'doctor') {
    if (med.doctor_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }
    const updated = medRepo.update(req.params.id as string, req.body);
    res.json(updated);
  } else if (role === 'patient') {
    if (med.patient_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }
    // Patient can only update patient_start_time and dose_times
    const { patientStartTime, doseTimes } = req.body;
    const updated = medRepo.update(req.params.id as string, {
      patient_start_time: patientStartTime,
      dose_times: doseTimes,
    });
    res.json(updated);
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
});

// DELETE /api/medications/:id — doctor only
router.delete('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }
  if (med.doctor_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  medRepo.remove(req.params.id as string);
  res.json({ success: true });
});

// --- Medication Dose Logs ---

// GET /api/medications/:id/streak — get consecutive-day streak for a medication
router.get('/:id/streak', (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }

  const { id, role } = req.user!;
  if (role === 'patient' && med.patient_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (role === 'doctor' && med.doctor_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }

  res.json({ streak: medLogRepo.getStreak(med.id) });
});

// GET /api/medications/:id/recent-logs — get logs for last N days (default 14)
router.get('/:id/recent-logs', (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }

  const { id, role } = req.user!;
  if (role === 'patient' && med.patient_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (role === 'doctor' && med.doctor_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }

  const days = Math.min(parseInt(req.query.days as string) || 14, 90);
  res.json(medLogRepo.getRecentLogs(med.id, days));
});

// GET /api/medications/:id/logs — get dose logs for a medication
router.get('/:id/logs', (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }

  const { id, role } = req.user!;
  if (role === 'patient' && med.patient_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (role === 'doctor' && med.doctor_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }

  res.json(medLogRepo.findByMedicationId(req.params.id as string));
});

// GET /api/medications/:id/tally — get dose tally for a medication
router.get('/:id/tally', (req: Request, res: Response) => {
  const med = medRepo.findById(req.params.id as string);
  if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }

  const { id, role } = req.user!;
  if (role === 'patient' && med.patient_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (role === 'doctor' && med.doctor_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }

  res.json(medLogRepo.getTallyByMedicationId(req.params.id as string));
});

// POST /api/medications/:id/logs — patient logs a dose (taken/skipped)
router.post('/:id/logs', requireRole('patient'), (req: Request, res: Response) => {
  try {
    const med = medRepo.findById(req.params.id as string);
    if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }
    if (med.patient_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

    const { scheduledTime, status, takenAt, notes } = req.body;
    if (!scheduledTime || !status) {
      res.status(400).json({ error: 'scheduledTime and status are required' });
      return;
    }

    const log = medLogRepo.create({
      medication_id: med.id,
      patient_id: req.user!.id,
      scheduled_time: scheduledTime,
      status,
      taken_at: takenAt,
      notes,
    });

    // Notify prescribing doctor when patient skips a dose
    if (status === 'skipped') {
      notificationRepo.create({
        user_id: med.doctor_id,
        user_role: 'doctor',
        type: 'dose_skipped',
        title: 'Patient skipped medication',
        message: `Patient skipped ${med.name} (${med.dosage})`,
        reference_id: med.id,
        reference_type: 'medication',
      });
    }

    // Poor adherence alert: if 7-day adherence drops below 70%, notify doctor (max once per 72h per patient)
    const weekStats = medLogRepo.get7DayTallyByPatientId(req.user!.id);
    if (weekStats.total >= 5) {
      const adherencePct = (weekStats.taken / weekStats.total) * 100;
      if (adherencePct < 70) {
        const alreadyAlerted = notificationRepo.hasRecentNotification(
          med.doctor_id, 'low_adherence', req.user!.id, 72
        );
        if (!alreadyAlerted) {
          notificationRepo.create({
            user_id: med.doctor_id,
            user_role: 'doctor',
            type: 'low_adherence',
            title: 'Low medication adherence',
            message: `Patient's 7-day adherence has dropped to ${Math.round(adherencePct)}% — may need follow-up`,
            reference_id: req.user!.id,
            reference_type: 'medication',
          });
        }
      }
    }

    res.status(201).json(log);
  } catch (error) {
    console.error('Create medication log error:', error);
    res.status(500).json({ error: 'Failed to log dose' });
  }
});

export default router;
