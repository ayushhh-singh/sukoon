import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as userRepo from '../db/repositories/userRepo';
import { sanitizeUser } from '../utils/sanitize';

const router = Router();

// All routes require patient role
router.use(requireRole('patient'));

// GET /api/users/me
router.get('/me', (req: Request, res: Response) => {
  const user = userRepo.findById(req.user!.id);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(sanitizeUser(user));
});

// PUT /api/users/me
router.put('/me', (req: Request, res: Response) => {
  const { displayName, age, profession, phone, primaryConcerns, therapyExperience, language, voicePreference, ambientSound, consentGiven, knownDisorders, currentMedications } = req.body;
  const updated = userRepo.update(req.user!.id, {
    displayName,
    age,
    profession,
    phone,
    primaryConcerns,
    therapyExperience,
    language,
    voicePreference,
    ambientSound,
    consentGiven,
    knownDisorders,
    currentMedications,
  });
  if (!updated) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(sanitizeUser(updated));
});

// DELETE /api/users/me
router.delete('/me', (req: Request, res: Response) => {
  userRepo.deleteUser(req.user!.id);
  res.json({ success: true });
});

export default router;
