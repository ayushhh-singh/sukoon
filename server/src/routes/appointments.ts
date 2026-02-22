import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as appointmentRepo from '../db/repositories/appointmentRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';

const router = Router();

// GET /api/appointments — list appointments (patient sees own, doctor sees own, admin sees all)
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;

  if (role === 'admin') {
    res.json(appointmentRepo.findAll());
  } else if (role === 'patient') {
    res.json(appointmentRepo.findByPatientId(id));
  } else {
    res.json(appointmentRepo.findByDoctorId(id));
  }
});

// GET /api/appointments/upcoming — upcoming appointments
router.get('/upcoming', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  res.json(appointmentRepo.findUpcoming(id, role));
});

// POST /api/appointments — patient creates appointment with a linked doctor
router.post('/', requireRole('patient'), (req: Request, res: Response) => {
  try {
    const { doctorId, dateTime, duration, notes } = req.body;

    if (!doctorId || !dateTime) {
      res.status(400).json({ error: 'doctorId and dateTime are required' });
      return;
    }

    // Verify doctor exists
    const doctor = doctorRepo.findById(doctorId);
    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    // Verify patient is linked to doctor
    const linkedDoctorIds = doctorRepo.getLinkedDoctorIds(req.user!.id);
    if (!linkedDoctorIds.includes(doctorId)) {
      res.status(403).json({ error: 'You must be linked to this doctor to schedule an appointment' });
      return;
    }

    const appointment = appointmentRepo.create({
      patient_id: req.user!.id,
      doctor_id: doctorId,
      date_time: dateTime,
      duration: duration || 30,
      notes: notes || undefined,
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PUT /api/appointments/:id — update appointment (status, reschedule)
router.put('/:id', (req: Request, res: Response) => {
  const appointment = appointmentRepo.findById(req.params.id as string);
  if (!appointment) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }

  const { id, role } = req.user!;

  // Access control: patient can update own, doctor can update own, admin can update all
  if (role === 'patient' && appointment.patient_id !== id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  if (role === 'doctor' && appointment.doctor_id !== id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const { status, dateTime, duration, notes } = req.body;
  const updated = appointmentRepo.update(req.params.id as string, {
    status,
    date_time: dateTime,
    duration,
    notes,
  });

  res.json(updated);
});

// DELETE /api/appointments/:id — cancel/remove appointment
router.delete('/:id', (req: Request, res: Response) => {
  const appointment = appointmentRepo.findById(req.params.id as string);
  if (!appointment) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }

  const { id, role } = req.user!;
  if (role === 'patient' && appointment.patient_id !== id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  if (role === 'doctor' && appointment.doctor_id !== id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  appointmentRepo.remove(req.params.id as string);
  res.json({ success: true });
});

export default router;
