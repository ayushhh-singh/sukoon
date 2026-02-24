import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as doctorRepo from '../db/repositories/doctorRepo';
import * as userRepo from '../db/repositories/userRepo';

const router = Router();

function sanitizeDoctor(doctor: doctorRepo.Doctor) {
  const { passwordHash, ...safe } = doctor;
  return safe;
}

function sanitizeUser(user: userRepo.User) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// GET /api/doctors/me — doctor or admin
router.get('/me', requireRole('doctor', 'admin'), (req: Request, res: Response) => {
  const doctor = doctorRepo.findById(req.user!.id);
  if (!doctor) { res.status(404).json({ error: 'Doctor not found' }); return; }
  res.json(sanitizeDoctor(doctor));
});

// PUT /api/doctors/me — doctor or admin
router.put('/me', requireRole('doctor', 'admin'), (req: Request, res: Response) => {
  const { displayName, age, gender, experienceYears, specializations, qualifications, bio, clinicName, clinicAddress, phone, acceptingPatients } = req.body;
  const updated = doctorRepo.update(req.user!.id, {
    displayName,
    age,
    gender,
    experienceYears,
    specializations,
    qualifications,
    bio,
    clinicName,
    clinicAddress,
    phone,
    acceptingPatients,
  });
  if (!updated) { res.status(404).json({ error: 'Doctor not found' }); return; }
  res.json(sanitizeDoctor(updated));
});

// GET /api/doctors/search?q= — patient only
router.get('/search', requireRole('patient'), (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (query.length < 2) { res.json([]); return; }
  const doctors = doctorRepo.search(query);
  res.json(doctors.map(d => ({
    id: d.id,
    username: d.username,
    displayName: d.displayName,
    specializations: d.specializations,
    experienceYears: d.experienceYears,
    qualifications: d.qualifications,
    acceptingPatients: d.acceptingPatients,
  })));
});

// GET /api/doctors/me/patients — doctor gets linked patients, admin gets ALL patients
router.get('/me/patients', requireRole('doctor', 'admin'), (req: Request, res: Response) => {
  if (req.user!.role === 'admin') {
    const allPatients = userRepo.findAll();
    res.json(allPatients.map(u => sanitizeUser(u)));
    return;
  }
  const patientIds = doctorRepo.getLinkedPatientIds(req.user!.id);
  const patients = patientIds.map(id => userRepo.findById(id)).filter(Boolean).map(u => sanitizeUser(u!));
  res.json(patients);
});

// GET /api/doctors/me/linked — patient gets linked doctor IDs
router.get('/me/linked', requireRole('patient'), (req: Request, res: Response) => {
  const doctorIds = doctorRepo.getLinkedDoctorIds(req.user!.id);
  const doctors = doctorIds.map(id => doctorRepo.findById(id)).filter(Boolean).map(d => sanitizeDoctor(d!));
  res.json(doctors);
});

// POST /api/doctors/link — patient links to doctor
router.post('/link', requireRole('patient'), (req: Request, res: Response) => {
  const { doctorId } = req.body;
  if (!doctorId) { res.status(400).json({ error: 'doctorId is required' }); return; }

  const doctor = doctorRepo.findById(doctorId);
  if (!doctor) { res.status(404).json({ error: 'Doctor not found' }); return; }

  doctorRepo.linkPatient(doctorId, req.user!.id);
  res.json({ success: true });
});

// DELETE /api/doctors/link/:doctorId — patient unlinks from doctor
router.delete('/link/:doctorId', requireRole('patient'), (req: Request, res: Response) => {
  doctorRepo.unlinkPatient(req.params.doctorId as string, req.user!.id);
  res.json({ success: true });
});

// GET /api/doctors/:id — any authenticated user
router.get('/:id', (req: Request, res: Response) => {
  const doctor = doctorRepo.findById(req.params.id as string);
  if (!doctor) { res.status(404).json({ error: 'Doctor not found' }); return; }
  res.json({
    id: doctor.id,
    username: doctor.username,
    displayName: doctor.displayName,
    specializations: doctor.specializations,
    experienceYears: doctor.experienceYears,
    qualifications: doctor.qualifications,
    bio: doctor.bio,
    clinicName: doctor.clinicName,
    acceptingPatients: doctor.acceptingPatients,
  });
});

export default router;
