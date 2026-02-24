import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as noteRepo from '../db/repositories/doctorNoteRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';
import * as notificationRepo from '../db/repositories/notificationRepo';

const router = Router();

// GET /api/notes?patientId= — doctor gets notes, patient gets their own
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;
  if (role === 'patient') {
    res.json(noteRepo.findByPatientId(id));
  } else {
    const patientId = req.query.patientId as string | undefined;
    res.json(noteRepo.findByDoctorId(id, patientId));
  }
});

// GET /api/notes/appointment/:appointmentId — get notes for appointment
router.get('/appointment/:appointmentId', (req: Request, res: Response) => {
  res.json(noteRepo.findByAppointmentId(req.params.appointmentId as string));
});

// GET /api/notes/:id
router.get('/:id', (req: Request, res: Response) => {
  const note = noteRepo.findById(req.params.id as string);
  if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
  res.json(note);
});

// POST /api/notes — doctor creates note
router.post('/', requireRole('doctor'), (req: Request, res: Response) => {
  try {
    const { patientId, sessionId, appointmentId, noteType, title, content, subjective, objective, assessmentText, planText, tags } = req.body;
    if (!patientId || !content) {
      res.status(400).json({ error: 'patientId and content are required' });
      return;
    }

    const note = noteRepo.create({
      doctorId: req.user!.id,
      patientId,
      sessionId,
      appointmentId,
      noteType,
      title,
      content,
      subjective,
      objective,
      assessmentText,
      planText,
      tags,
    });

    // Notify patient
    const doctor = doctorRepo.findById(req.user!.id);
    const doctorName = doctor?.displayName || 'Your doctor';
    notificationRepo.create({
      userId: patientId,
      userRole: 'patient',
      type: 'note_added',
      title: 'New note from doctor',
      message: `Dr. ${doctorName} added a${noteType === 'soap' ? ' SOAP' : ''} note: ${title || 'Untitled'}`,
      referenceId: note.id,
      referenceType: 'note',
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT /api/notes/:id
router.put('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const note = noteRepo.findById(req.params.id as string);
  if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
  if (note.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  const { title, content, tags, noteType, subjective, objective, assessmentText, planText } = req.body;
  const updated = noteRepo.update(req.params.id as string, { title, content, tags, noteType, subjective, objective, assessmentText, planText });
  res.json(updated);
});

// DELETE /api/notes/:id
router.delete('/:id', requireRole('doctor'), (req: Request, res: Response) => {
  const note = noteRepo.findById(req.params.id as string);
  if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
  if (note.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  noteRepo.remove(req.params.id as string);
  res.json({ success: true });
});

export default router;
