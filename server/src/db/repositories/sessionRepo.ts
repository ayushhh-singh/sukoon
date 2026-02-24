import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Session {
  id: string;
  sessionId: string;
  userId: string;
  date: string;
  duration: number;
  mode: 'voice' | 'chat' | null;
  keyTakeaways: string[];
  copingStrategies: string[];
  homeworkAssignments: string[];
  topicsDiscussed: string[];
  emotionalThemes: string[];
  issuesIdentified: string[];
  conversationAssessment: string;
  emotionalJourney: string;
  riskLevel: 'low' | 'moderate' | 'elevated';
  suggestedFocusAreas: string[];
  techniquesUsed: string[];
  clinicalImpression: string | null;
  preliminaryDiagnosis: string | null;
  recommendedActions: string[];
  wayForward: string | null;
  rootCauseAnalysis: string | null;
  triggerPoints: string[];
  familyHistory: string | null;
  patientMedicalContext: string | null;
  frequencyPatterns: string | null;
  preMoodValue: number | null;
  preMoodLabel: string | null;
  preMoodEmoji: string | null;
  postMoodValue: number | null;
  postMoodLabel: string | null;
  postMoodEmoji: string | null;
  preAssessmentType: string | null;
  preAssessmentScore: number | null;
  preAssessmentSeverity: string | null;
  userReflection: string | null;
  transcript: { role: string; text: string; timestamp?: string }[];
  createdAt: string;
}

const JSON_FIELDS = [
  'keyTakeaways', 'copingStrategies', 'homeworkAssignments', 'topicsDiscussed',
  'emotionalThemes', 'issuesIdentified', 'suggestedFocusAreas', 'techniquesUsed',
  'recommendedActions', 'triggerPoints', 'transcript',
] as const;

interface SessionRow extends Omit<Session, typeof JSON_FIELDS[number]> {
  keyTakeaways: string;
  copingStrategies: string;
  homeworkAssignments: string;
  topicsDiscussed: string;
  emotionalThemes: string;
  issuesIdentified: string;
  suggestedFocusAreas: string;
  techniquesUsed: string;
  recommendedActions: string;
  triggerPoints: string;
  transcript: string;
}

function parseSession(row: SessionRow): Session {
  const parsed = { ...row } as Record<string, unknown>;
  for (const field of JSON_FIELDS) {
    parsed[field] = JSON.parse((row[field] as string) || '[]');
  }
  return parsed as unknown as Session;
}

export function findById(id: string): Session | undefined {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined;
  return row ? parseSession(row) : undefined;
}

export function findBySessionId(sessionId: string): Session | undefined {
  const row = db.prepare('SELECT * FROM sessions WHERE sessionId = ?').get(sessionId) as SessionRow | undefined;
  return row ? parseSession(row) : undefined;
}

export function findAll(): Session[] {
  const rows = db.prepare('SELECT * FROM sessions ORDER BY date DESC').all() as SessionRow[];
  return rows.map(parseSession);
}

export function findByUserId(userId: string): Session[] {
  const rows = db.prepare('SELECT * FROM sessions WHERE userId = ? ORDER BY date DESC').all(userId) as SessionRow[];
  return rows.map(parseSession);
}

export function findByUserIds(userIds: string[]): Session[] {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM sessions WHERE userId IN (${placeholders}) ORDER BY date DESC`).all(...userIds) as SessionRow[];
  return rows.map(parseSession);
}

export interface CreateSessionInput {
  sessionId: string;
  userId: string;
  date: string;
  duration: number;
  mode?: 'voice' | 'chat';
  keyTakeaways?: string[];
  copingStrategies?: string[];
  homeworkAssignments?: string[];
  topicsDiscussed?: string[];
  emotionalThemes?: string[];
  issuesIdentified?: string[];
  conversationAssessment?: string;
  emotionalJourney?: string;
  riskLevel?: 'low' | 'moderate' | 'elevated';
  suggestedFocusAreas?: string[];
  techniquesUsed?: string[];
  clinicalImpression?: string;
  preliminaryDiagnosis?: string;
  recommendedActions?: string[];
  wayForward?: string;
  rootCauseAnalysis?: string;
  triggerPoints?: string[];
  familyHistory?: string;
  patientMedicalContext?: string;
  frequencyPatterns?: string;
  preMoodValue?: number;
  preMoodLabel?: string;
  preMoodEmoji?: string;
  postMoodValue?: number;
  postMoodLabel?: string;
  postMoodEmoji?: string;
  preAssessmentType?: string;
  preAssessmentScore?: number;
  preAssessmentSeverity?: string;
  transcript?: { role: string; text: string; timestamp?: string }[];
}

export function create(data: CreateSessionInput): Session {
  const id = `session-summary-${uuidv4()}`;
  db.prepare(`
    INSERT INTO sessions (
      id, sessionId, userId, date, duration, mode,
      keyTakeaways, copingStrategies, homeworkAssignments, topicsDiscussed,
      emotionalThemes, issuesIdentified, conversationAssessment, emotionalJourney,
      riskLevel, suggestedFocusAreas, techniquesUsed, clinicalImpression,
      preliminaryDiagnosis, recommendedActions, wayForward,
      rootCauseAnalysis, triggerPoints, familyHistory, patientMedicalContext, frequencyPatterns,
      preMoodValue, preMoodLabel, preMoodEmoji,
      postMoodValue, postMoodLabel, postMoodEmoji,
      preAssessmentType, preAssessmentScore, preAssessmentSeverity,
      transcript
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.sessionId, data.userId, data.date, data.duration, data.mode ?? null,
    JSON.stringify(data.keyTakeaways || []),
    JSON.stringify(data.copingStrategies || []),
    JSON.stringify(data.homeworkAssignments || []),
    JSON.stringify(data.topicsDiscussed || []),
    JSON.stringify(data.emotionalThemes || []),
    JSON.stringify(data.issuesIdentified || []),
    data.conversationAssessment || '',
    data.emotionalJourney || '',
    data.riskLevel || 'low',
    JSON.stringify(data.suggestedFocusAreas || []),
    JSON.stringify(data.techniquesUsed || []),
    data.clinicalImpression ?? null,
    data.preliminaryDiagnosis ?? null,
    JSON.stringify(data.recommendedActions || []),
    data.wayForward ?? null,
    data.rootCauseAnalysis ?? null,
    JSON.stringify(data.triggerPoints || []),
    data.familyHistory ?? null,
    data.patientMedicalContext ?? null,
    data.frequencyPatterns ?? null,
    data.preMoodValue ?? null,
    data.preMoodLabel ?? null,
    data.preMoodEmoji ?? null,
    data.postMoodValue ?? null,
    data.postMoodLabel ?? null,
    data.postMoodEmoji ?? null,
    data.preAssessmentType ?? null,
    data.preAssessmentScore ?? null,
    data.preAssessmentSeverity ?? null,
    JSON.stringify(data.transcript || []),
  );
  return findById(id)!;
}

export function updateReflection(id: string, reflection: string): void {
  db.prepare('UPDATE sessions SET userReflection = ? WHERE id = ?').run(reflection, id);
}

export function updateSummary(sessionId: string, summary: Record<string, unknown>): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  const jsonArrayFields = ['keyTakeaways', 'copingStrategies', 'homeworkAssignments', 'topicsDiscussed', 'emotionalThemes', 'issuesIdentified', 'suggestedFocusAreas', 'techniquesUsed', 'recommendedActions', 'triggerPoints'];
  const stringFields = ['conversationAssessment', 'emotionalJourney', 'riskLevel', 'clinicalImpression', 'preliminaryDiagnosis', 'wayForward', 'rootCauseAnalysis', 'familyHistory', 'patientMedicalContext', 'frequencyPatterns'];

  for (const f of jsonArrayFields) {
    if (summary[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(JSON.stringify(summary[f]));
    }
  }
  for (const f of stringFields) {
    if (summary[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(summary[f] as string);
    }
  }

  if (fields.length === 0) return;
  values.push(sessionId);
  db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE sessionId = ?`).run(...values);
}

export function updatePostMood(sessionId: string, value: number, label: string, emoji: string): void {
  db.prepare('UPDATE sessions SET postMoodValue = ?, postMoodLabel = ?, postMoodEmoji = ? WHERE sessionId = ?')
    .run(value, label, emoji, sessionId);
}
