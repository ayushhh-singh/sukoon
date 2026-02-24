import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as checkinRepo from '../db/repositories/appointmentCheckinRepo';
import * as appointmentRepo from '../db/repositories/appointmentRepo';
import * as notificationRepo from '../db/repositories/notificationRepo';
import * as userRepo from '../db/repositories/userRepo';

const router = Router();

// POST /api/checkins — patient submits pre-session check-in
router.post('/', requireRole('patient'), (req: Request, res: Response) => {
  try {
    const { appointmentId, moodValue, moodLabel, concerns, goalsForSession, symptomsSinceLast, medicationIssues } = req.body;

    if (!appointmentId) {
      res.status(400).json({ error: 'appointmentId is required' });
      return;
    }

    const appointment = appointmentRepo.findById(appointmentId);
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    if (appointment.patientId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (appointment.status !== 'confirmed') {
      res.status(400).json({ error: 'Appointment must be confirmed to check in' });
      return;
    }

    const existing = checkinRepo.findByAppointmentId(appointmentId);
    if (existing) {
      res.status(400).json({ error: 'Already checked in for this appointment' });
      return;
    }

    const checkin = checkinRepo.create({
      appointmentId,
      patientId: req.user!.id,
      moodValue,
      moodLabel,
      concerns,
      goalsForSession,
      symptomsSinceLast,
      medicationIssues,
    });

    // Notify doctor
    const patient = userRepo.findById(req.user!.id);
    const patientName = patient?.displayName || 'A patient';
    notificationRepo.create({
      userId: appointment.doctorId,
      userRole: 'doctor',
      type: 'checkin_submitted',
      title: 'Patient check-in submitted',
      message: `${patientName} submitted a pre-session check-in for their upcoming appointment`,
      referenceId: appointmentId,
      referenceType: 'appointment',
    });

    res.status(201).json(checkin);
  } catch (error) {
    console.error('Create checkin error:', error);
    res.status(500).json({ error: 'Failed to create check-in' });
  }
});

// GET /api/checkins/:appointmentId — get check-in for appointment
router.get('/:appointmentId', (req: Request, res: Response) => {
  const appointment = appointmentRepo.findById(req.params.appointmentId as string);
  if (!appointment) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }

  const { id, role } = req.user!;
  if (role === 'patient' && appointment.patientId !== id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  if (role === 'doctor' && appointment.doctorId !== id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const checkin = checkinRepo.findByAppointmentId(req.params.appointmentId as string);
  res.json(checkin || null);
});

export default router;
