import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as doctorRepo from '../db/repositories/doctorRepo';
import db from '../db/database';

const router = Router();

interface TimelineEvent {
  type: 'appointment' | 'session' | 'note' | 'medication' | 'assessment';
  date: string;
  title: string;
  summary: string;
  referenceId: string;
  metadata?: Record<string, unknown>;
}

// GET /api/timeline/:patientId — aggregated chronological timeline
router.get('/:patientId', requireRole('doctor'), (req: Request, res: Response) => {
  try {
    const patientId = req.params.patientId as string;
    const doctorId = req.user!.id;

    const linkedPatientIds = doctorRepo.getLinkedPatientIds(doctorId);
    if (!linkedPatientIds.includes(patientId) && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const events: TimelineEvent[] = [];

    // Appointments
    const appointments = db.prepare(
      'SELECT id, dateTime, duration, status, notes FROM appointments WHERE patientId = ? AND doctorId = ? ORDER BY dateTime DESC'
    ).all(patientId, doctorId) as { id: string; dateTime: string; duration: number; status: string; notes: string | null }[];

    for (const a of appointments) {
      events.push({
        type: 'appointment',
        date: a.dateTime,
        title: `Appointment (${a.status})`,
        summary: a.notes || `${a.duration} min appointment`,
        referenceId: a.id,
        metadata: { status: a.status, duration: a.duration },
      });
    }

    // Sessions (AI therapy)
    const sessions = db.prepare(
      'SELECT id, sessionId, date, duration, mode, clinicalImpression, riskLevel, topicsDiscussed FROM sessions WHERE userId = ? ORDER BY date DESC'
    ).all(patientId) as { id: string; sessionId: string; date: string; duration: number; mode: string; clinicalImpression: string | null; riskLevel: string; topicsDiscussed: string }[];

    for (const s of sessions) {
      const topics = JSON.parse(s.topicsDiscussed || '[]');
      events.push({
        type: 'session',
        date: s.date,
        title: `AI Session (${s.mode})`,
        summary: s.clinicalImpression || (topics.length > 0 ? `Topics: ${topics.slice(0, 3).join(', ')}` : `${s.duration}s session`),
        referenceId: s.id,
        metadata: { riskLevel: s.riskLevel, mode: s.mode, duration: s.duration },
      });
    }

    // Doctor notes
    const notes = db.prepare(
      'SELECT id, noteType, title, content, createdAt FROM doctor_notes WHERE patientId = ? AND doctorId = ? ORDER BY createdAt DESC'
    ).all(patientId, doctorId) as { id: string; noteType: string; title: string | null; content: string; createdAt: string }[];

    for (const n of notes) {
      events.push({
        type: 'note',
        date: n.createdAt,
        title: n.title || `${n.noteType} note`,
        summary: n.content.substring(0, 150) + (n.content.length > 150 ? '...' : ''),
        referenceId: n.id,
        metadata: { noteType: n.noteType },
      });
    }

    // Medications (creation date as event)
    const meds = db.prepare(
      'SELECT id, name, dosage, frequency, status, startDate, endDate, createdAt FROM medications WHERE patientId = ? AND doctorId = ? ORDER BY createdAt DESC'
    ).all(patientId, doctorId) as { id: string; name: string; dosage: string; frequency: string; status: string; startDate: string; endDate: string | null; createdAt: string }[];

    for (const m of meds) {
      events.push({
        type: 'medication',
        date: m.createdAt,
        title: `${m.name} prescribed`,
        summary: `${m.dosage}, ${m.frequency} — ${m.status}`,
        referenceId: m.id,
        metadata: { status: m.status, startDate: m.startDate, endDate: m.endDate },
      });
    }

    // Assessments
    const assessments = db.prepare(
      'SELECT id, type, totalScore, severity, timing, completedAt FROM assessments WHERE userId = ? ORDER BY completedAt DESC'
    ).all(patientId) as { id: string; type: string; totalScore: number; severity: string; timing: string | null; completedAt: string }[];

    for (const a of assessments) {
      events.push({
        type: 'assessment',
        date: a.completedAt,
        title: `${a.type} Assessment`,
        summary: `Score: ${a.totalScore} — ${a.severity}`,
        referenceId: a.id,
        metadata: { assessmentType: a.type, score: a.totalScore, severity: a.severity, timing: a.timing },
      });
    }

    // Sort by date descending
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply optional type filter
    const types = req.query.types as string | undefined;
    if (types) {
      const allowedTypes = types.split(',');
      const filtered = events.filter(e => allowedTypes.includes(e.type));
      res.json(filtered);
      return;
    }

    res.json(events);
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ error: 'Failed to load timeline' });
  }
});

export default router;
