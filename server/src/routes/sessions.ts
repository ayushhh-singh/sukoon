import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/auth';
import * as sessionRepo from '../db/repositories/sessionRepo';
import * as doctorRepo from '../db/repositories/doctorRepo';

const router = Router();

// Convert snake_case session record to camelCase for the frontend
function toCamelCase(s: sessionRepo.Session) {
  return {
    id: s.id,
    sessionId: s.session_id,
    userId: s.user_id,
    date: s.date,
    duration: s.duration,
    mode: s.mode,
    keyTakeaways: s.key_takeaways,
    copingStrategies: s.coping_strategies,
    homeworkAssignments: s.homework_assignments,
    topicsDiscussed: s.topics_discussed,
    emotionalThemes: s.emotional_themes,
    issuesIdentified: s.issues_identified,
    conversationAssessment: s.conversation_assessment,
    emotionalJourney: s.emotional_journey,
    riskLevel: s.risk_level,
    suggestedFocusAreas: s.suggested_focus_areas,
    techniquesUsed: s.techniques_used,
    clinicalImpression: s.clinical_impression,
    preliminaryDiagnosis: s.preliminary_diagnosis,
    recommendedActions: s.recommended_actions,
    wayForward: s.way_forward,
    rootCauseAnalysis: s.root_cause_analysis,
    triggerPoints: s.trigger_points,
    familyHistory: s.family_history,
    patientMedicalContext: s.patient_medical_context,
    frequencyPatterns: s.frequency_patterns,
    preMoodValue: s.pre_mood_value,
    preMoodLabel: s.pre_mood_label,
    preMoodEmoji: s.pre_mood_emoji,
    postMoodValue: s.post_mood_value,
    postMoodLabel: s.post_mood_label,
    postMoodEmoji: s.post_mood_emoji,
    preAssessmentType: s.pre_assessment_type,
    preAssessmentScore: s.pre_assessment_score,
    preAssessmentSeverity: s.pre_assessment_severity,
    userReflection: s.user_reflection,
    transcript: s.transcript,
    createdAt: s.created_at,
  };
}

// GET /api/sessions — get own sessions (patient), linked patients' sessions (doctor), or all (admin)
router.get('/', (req: Request, res: Response) => {
  const { id, role } = req.user!;

  if (role === 'admin') {
    res.json(sessionRepo.findAll().map(toCamelCase));
  } else if (role === 'patient') {
    res.json(sessionRepo.findByUserId(id).map(toCamelCase));
  } else {
    const patientIds = doctorRepo.getLinkedPatientIds(id);
    res.json(sessionRepo.findByUserIds(patientIds).map(toCamelCase));
  }
});

// GET /api/sessions/:id
router.get('/:id', (req: Request, res: Response) => {
  const session = sessionRepo.findById(req.params.id as string);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  const { id, role } = req.user!;
  if (role === 'admin') { res.json(toCamelCase(session)); return; }

  if (role === 'patient' && session.user_id !== id) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  if (role === 'doctor') {
    const patientIds = doctorRepo.getLinkedPatientIds(id);
    if (!patientIds.includes(session.user_id)) {
      res.status(403).json({ error: 'Access denied' }); return;
    }
  }

  res.json(toCamelCase(session));
});

// POST /api/sessions — create/save session
router.post('/', requireRole('patient'), (req: Request, res: Response) => {
  try {
    const data = req.body;
    data.user_id = req.user!.id;
    const session = sessionRepo.create(data);
    res.status(201).json(toCamelCase(session));
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// PUT /api/sessions/:id/reflection
router.put('/:id/reflection', requireRole('patient'), (req: Request, res: Response) => {
  const session = sessionRepo.findById(req.params.id as string);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  if (session.user_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

  sessionRepo.updateReflection(req.params.id as string, req.body.reflection || '');
  res.json({ success: true });
});

export default router;
