import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as noteRepo from '../db/repositories/doctorNoteRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';
import * as notificationRepo from '../db/repositories/notificationRepo';

const router = Router();

// GET /api/notes?patientId= — doctors see their notes, patients see notes about them
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;

  if (role === 'patient') {
    res.json(noteRepo.findByPatientId(id));
    return;
  }

  // Doctor
  const patientId = req.query.patientId as string | undefined;
  res.json(noteRepo.findByDoctorId(id, patientId));
});

// GET /api/notes/:id
router.get('/:id', (req: Request, res: Response) => {
  const note = noteRepo.findById(req.params.id as string);
  if (!note) { res.status(404).json({ error: 'Note not found' }); return; }

  const { id, role } = req.user!;
  if (role === 'doctor' && note.doctor_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }
  if (role === 'patient' && note.patient_id !== id) { res.status(403).json({ error: 'Access denied' }); return; }

  res.json(note);
});

// POST /api/notes — doctor only
router.post('/', requireRole('doctor'), (req: Request, res: Response) => {
  try {
    const { patientId, sessionId, noteType, title, content, tags } = req.body;
    if (!patientId || !content) { res.status(400).json({ error: 'patientId and content are required' }); return; }
    const note = noteRepo.create({
      doctor_id: req.user!.id,
      patient_id: patientId,
      session_id: sessionId,
      note_type: noteType,
      title,
      content,
      tags,
    });

    // Notify patient
    const doctor = doctorRepo.findById(req.user!.id);
    const doctorName = doctor?.display_name || 'Your doctor';
    notificationRepo.create({
      user_id: patientId,
      user_role: 'patient',
      type: 'note_added',
      title: 'New note from your therapist',
      message: `Dr. ${doctorName} added a note: ${title || 'Untitled'}`,
      reference_id: note.id,
      reference_type: 'note',
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT /api/notes/:id — doctor only
router.put('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const note = noteRepo.findById(req.params.id as string);
  if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
  if (note.doctor_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const updated = noteRepo.update(req.params.id as string, req.body);
  res.json(updated);
});

// DELETE /api/notes/:id — doctor only
router.delete('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const note = noteRepo.findById(req.params.id as string);
  if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
  if (note.doctor_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  noteRepo.remove(req.params.id as string);
  res.json({ success: true });
});

export default router;
