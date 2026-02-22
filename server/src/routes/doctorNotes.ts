import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as noteRepo from '../db/repositories/doctorNoteRepo';

const router = Router();
router.use(requireRole('doctor'));

// GET /api/notes?patientId=
router.get('/', (req: Request, res: Response) => {
  const patientId = req.query.patientId as string | undefined;
  res.json(noteRepo.findByDoctorId(req.user!.id, patientId));
});

// GET /api/notes/:id
router.get('/:id', (req: Request, res: Response) => {
  const note = noteRepo.findById(req.params.id as string);
  if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
  if (note.doctor_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }
  res.json(note);
});

// POST /api/notes
router.post('/', (req: Request, res: Response) => {
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
    res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT /api/notes/:id
router.put('/:id', (req: Request, res: Response) => {
  const note = noteRepo.findById(req.params.id as string);
  if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
  if (note.doctor_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const updated = noteRepo.update(req.params.id as string, req.body);
  res.json(updated);
});

// DELETE /api/notes/:id
router.delete('/:id', (req: Request, res: Response) => {
  const note = noteRepo.findById(req.params.id as string);
  if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
  if (note.doctor_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  noteRepo.remove(req.params.id as string);
  res.json({ success: true });
});

export default router;
