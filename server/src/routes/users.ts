import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as userRepo from '../db/repositories/userRepo';

const router = Router();

// All routes require patient role
router.use(requireRole('patient'));

function sanitize(user: userRepo.User) {
  const { password_hash, ...safe } = user;
  return safe;
}

// GET /api/users/me
router.get('/me', (req: Request, res: Response) => {
  const user = userRepo.findById(req.user!.id);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(sanitize(user));
});

// PUT /api/users/me
router.put('/me', (req: Request, res: Response) => {
  const { displayName, age, profession, primaryConcerns, therapyExperience, language, voicePreference, ambientSound, consentGiven, knownDisorders, currentMedications } = req.body;
  const updated = userRepo.update(req.user!.id, {
    display_name: displayName,
    age,
    profession,
    primary_concerns: primaryConcerns,
    therapy_experience: therapyExperience,
    language,
    voice_preference: voicePreference,
    ambient_sound: ambientSound,
    consent_given: consentGiven,
    known_disorders: knownDisorders,
    current_medications: currentMedications,
  });
  if (!updated) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(sanitize(updated));
});

// DELETE /api/users/me
router.delete('/me', (req: Request, res: Response) => {
  userRepo.deleteUser(req.user!.id);
  res.json({ success: true });
});

export default router;
