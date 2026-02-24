import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as appointmentRepo from '../db/repositories/appointmentRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';
import * as userRepo from '../db/repositories/userRepo';
import * as notificationRepo from '../db/repositories/notificationRepo';

const router = Router();

// GET /api/appointments — list appointments
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  if (role === 'patient') {
    res.json(appointmentRepo.findByPatientId(id));
  } else if (role === 'doctor') {
    res.json(appointmentRepo.findByDoctorId(id));
  } else {
    res.json(appointmentRepo.findAll());
  }
});

// GET /api/appointments/upcoming — upcoming appointments
router.get('/upcoming', (req: Request, res: Response) => {
  res.json(appointmentRepo.findUpcoming(req.user!.id, req.user!.role as 'patient' | 'doctor' | 'admin'));
});

// POST /api/appointments — patient creates appointment
router.post('/', requireRole('patient'), (req: Request, res: Response) => {
  try {
    const { doctorId, dateTime, duration, notes } = req.body;
    if (!doctorId || !dateTime) {
      res.status(400).json({ error: 'doctorId and dateTime are required' });
      return;
    }

    const appointment = appointmentRepo.create({
      patientId: req.user!.id,
      doctorId,
      dateTime,
      duration,
      notes,
    });

    // Notify doctor
    const patient = userRepo.findById(req.user!.id);
    const patientName = patient?.displayName || 'A patient';
    notificationRepo.create({
      userId: doctorId,
      userRole: 'doctor',
      type: 'appointment_request',
      title: 'New appointment request',
      message: `${patientName} requested an appointment on ${new Date(dateTime).toLocaleDateString()}`,
      referenceId: appointment.id,
      referenceType: 'appointment',
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PUT /api/appointments/:id — update appointment (accept/decline/etc)
router.put('/:id', (req: Request, res: Response) => {
  const appointment = appointmentRepo.findById(req.params.id as string);
  if (!appointment) { res.status(404).json({ error: 'Appointment not found' }); return; }

  const updated = appointmentRepo.update(req.params.id as string, req.body);

  // Notify on status changes
  if (req.body.status && req.body.status !== appointment.status) {
    const { id, role } = req.user!;
    if (role === 'doctor') {
      const doctor = doctorRepo.findById(id);
      notificationRepo.create({
        userId: appointment.patientId,
        userRole: 'patient',
        type: `appointment_${req.body.status}`,
        title: `Appointment ${req.body.status}`,
        message: `Dr. ${doctor?.displayName || 'Your doctor'} ${req.body.status} your appointment`,
        referenceId: appointment.id,
        referenceType: 'appointment',
      });
    } else if (role === 'patient') {
      const patient = userRepo.findById(id);
      notificationRepo.create({
        userId: appointment.doctorId,
        userRole: 'doctor',
        type: `appointment_${req.body.status}`,
        title: `Appointment ${req.body.status}`,
        message: `${patient?.displayName || 'A patient'} ${req.body.status} their appointment`,
        referenceId: appointment.id,
        referenceType: 'appointment',
      });
    }
  }

  res.json(updated);
});

// PUT /api/appointments/:id/start — doctor starts session
router.put('/:id/start', requireRole('doctor'), (req: Request, res: Response) => {
  const appointment = appointmentRepo.findById(req.params.id as string);
  if (!appointment) { res.status(404).json({ error: 'Appointment not found' }); return; }
  if (appointment.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const updated = appointmentRepo.updateStatus(req.params.id as string, 'in_progress');

  const doctor = doctorRepo.findById(req.user!.id);
  notificationRepo.create({
    userId: appointment.patientId,
    userRole: 'patient',
    type: 'appointment_started',
    title: 'Session started',
    message: `Dr. ${doctor?.displayName || 'Your doctor'} has started your session`,
    referenceId: appointment.id,
    referenceType: 'appointment',
  });

  res.json(updated);
});

// PUT /api/appointments/:id/complete — doctor completes session
router.put('/:id/complete', requireRole('doctor'), (req: Request, res: Response) => {
  const appointment = appointmentRepo.findById(req.params.id as string);
  if (!appointment) { res.status(404).json({ error: 'Appointment not found' }); return; }
  if (appointment.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const updated = appointmentRepo.updateStatus(req.params.id as string, 'completed');

  const doctor = doctorRepo.findById(req.user!.id);
  notificationRepo.create({
    userId: appointment.patientId,
    userRole: 'patient',
    type: 'appointment_completed',
    title: 'Session completed',
    message: `Your session with Dr. ${doctor?.displayName || 'your doctor'} has been completed`,
    referenceId: appointment.id,
    referenceType: 'appointment',
  });

  res.json(updated);
});

// PUT /api/appointments/:id/reschedule — reschedule appointment
router.put('/:id/reschedule', (req: Request, res: Response) => {
  const appointment = appointmentRepo.findById(req.params.id as string);
  if (!appointment) { res.status(404).json({ error: 'Appointment not found' }); return; }

  const { dateTime, reason } = req.body;
  if (!dateTime) { res.status(400).json({ error: 'dateTime is required' }); return; }

  const updated = appointmentRepo.update(req.params.id as string, {
    dateTime,
    rescheduleReason: reason,
    status: 'pending',
  });

  const { id, role } = req.user!;
  if (role === 'patient') {
    const patient = userRepo.findById(id);
    notificationRepo.create({
      userId: appointment.doctorId,
      userRole: 'doctor',
      type: 'appointment_rescheduled',
      title: 'Appointment rescheduled',
      message: `${patient?.displayName || 'A patient'} rescheduled their appointment to ${new Date(dateTime).toLocaleDateString()}`,
      referenceId: appointment.id,
      referenceType: 'appointment',
    });
  } else {
    const doctor = doctorRepo.findById(id);
    notificationRepo.create({
      userId: appointment.patientId,
      userRole: 'patient',
      type: 'appointment_rescheduled',
      title: 'Appointment rescheduled',
      message: `Dr. ${doctor?.displayName || 'Your doctor'} rescheduled your appointment to ${new Date(dateTime).toLocaleDateString()}`,
      referenceId: appointment.id,
      referenceType: 'appointment',
    });
  }

  res.json(updated);
});

export default router;
