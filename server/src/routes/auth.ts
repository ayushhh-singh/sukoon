import { Router, type Request, type Response } from 'express';
import { hashPassword, verifyPassword, generateToken, ADMIN_EMAIL } from '../auth/auth';
import { authMiddleware } from '../middleware/auth';
import * as userRepo from '../db/repositories/userRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';

const router = Router();

// Strip sensitive fields from user
function sanitizeUser(user: userRepo.User) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function sanitizeDoctor(doctor: doctorRepo.Doctor) {
  const { passwordHash, ...safe } = doctor;
  return safe;
}

// POST /api/auth/register/patient
router.post('/register/patient', (req: Request, res: Response) => {
  try {
    const { email, password, displayName, age, profession, primaryConcerns, therapyExperience, language, voicePreference } = req.body;

    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'Email, password, and display name are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check email uniqueness across both tables
    if (userRepo.findByEmail(email) || doctorRepo.findByEmail(email)) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const user = userRepo.create({
      email,
      passwordHash: hashPassword(password),
      displayName,
      age,
      profession,
      primaryConcerns,
      therapyExperience,
      language,
      voicePreference,
    });

    const token = generateToken({ id: user.id, role: 'patient', email: user.email });
    res.status(201).json({ token, user: sanitizeUser(user), role: 'patient' });
  } catch (error) {
    console.error('Register patient error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/register/doctor
router.post('/register/doctor', (req: Request, res: Response) => {
  try {
    const { email, password, username, displayName, age, gender, experienceYears, specializations, qualifications, bio, clinicName, clinicAddress, phone } = req.body;

    if (!email || !password || !username || !displayName) {
      res.status(400).json({ error: 'Email, password, username, and display name are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }
    if (username.length < 3 || !/^[a-z0-9_]+$/.test(username.toLowerCase())) {
      res.status(400).json({ error: 'Username must be at least 3 characters and contain only lowercase letters, numbers, and underscores' });
      return;
    }

    // Check email uniqueness across both tables
    if (userRepo.findByEmail(email) || doctorRepo.findByEmail(email)) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }
    if (doctorRepo.findByUsername(username)) {
      res.status(409).json({ error: 'This username is already taken' });
      return;
    }

    const doctor = doctorRepo.create({
      email,
      passwordHash: hashPassword(password),
      username: username.toLowerCase(),
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
    });

    const token = generateToken({ id: doctor.id, role: 'doctor', email: doctor.email });
    res.status(201).json({ token, doctor: sanitizeDoctor(doctor), role: 'doctor' });
  } catch (error) {
    console.error('Register doctor error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Check patients first, then doctors
    const user = userRepo.findByEmail(email);
    if (user) {
      if (!verifyPassword(password, user.passwordHash)) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      const token = generateToken({ id: user.id, role: 'patient', email: user.email });
      res.json({ token, user: sanitizeUser(user), role: 'patient' });
      return;
    }

    const doctor = doctorRepo.findByEmail(email);
    if (doctor) {
      if (!verifyPassword(password, doctor.passwordHash)) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      // Admin detection: elevate role for the master admin email
      const effectiveRole = doctor.email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'doctor';
      const token = generateToken({ id: doctor.id, role: effectiveRole, email: doctor.email });
      res.json({ token, doctor: sanitizeDoctor(doctor), role: effectiveRole });
      return;
    }

    res.status(401).json({ error: 'Invalid email or password' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  try {
    const { id, role } = req.user!;

    if (role === 'patient') {
      const user = userRepo.findById(id);
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      res.json({ user: sanitizeUser(user), role });
    } else {
      // Both 'doctor' and 'admin' are doctor accounts
      const doctor = doctorRepo.findById(id);
      if (!doctor) { res.status(404).json({ error: 'Doctor not found' }); return; }
      res.json({ doctor: sanitizeDoctor(doctor), role });
    }
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;
