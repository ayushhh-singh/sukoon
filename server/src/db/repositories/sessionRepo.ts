import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Session {
  id: string;
  session_id: string;
  user_id: string;
  date: string;
  duration: number;
  mode: 'voice' | 'chat' | null;
  key_takeaways: string[];
  coping_strategies: string[];
  homework_assignments: string[];
  topics_discussed: string[];
  emotional_themes: string[];
  issues_identified: string[];
  conversation_assessment: string;
  emotional_journey: string;
  risk_level: 'low' | 'moderate' | 'elevated';
  suggested_focus_areas: string[];
  techniques_used: string[];
  clinical_impression: string | null;
  preliminary_diagnosis: string | null;
  recommended_actions: string[];
  way_forward: string | null;
  root_cause_analysis: string | null;
  trigger_points: string[];
  family_history: string | null;
  patient_medical_context: string | null;
  frequency_patterns: string | null;
  pre_mood_value: number | null;
  pre_mood_label: string | null;
  pre_mood_emoji: string | null;
  post_mood_value: number | null;
  post_mood_label: string | null;
  post_mood_emoji: string | null;
  pre_assessment_type: string | null;
  pre_assessment_score: number | null;
  pre_assessment_severity: string | null;
  user_reflection: string | null;
  transcript: { role: string; text: string; timestamp?: string }[];
  created_at: string;
}

interface SessionRow extends Omit<Session, 'key_takeaways' | 'coping_strategies' | 'homework_assignments' | 'topics_discussed' | 'emotional_themes' | 'issues_identified' | 'suggested_focus_areas' | 'techniques_used' | 'recommended_actions' | 'trigger_points' | 'transcript'> {
  key_takeaways: string;
  coping_strategies: string;
  homework_assignments: string;
  topics_discussed: string;
  emotional_themes: string;
  issues_identified: string;
  suggested_focus_areas: string;
  techniques_used: string;
  recommended_actions: string;
  trigger_points: string;
  transcript: string;
}

const JSON_FIELDS = [
  'key_takeaways', 'coping_strategies', 'homework_assignments', 'topics_discussed',
  'emotional_themes', 'issues_identified', 'suggested_focus_areas', 'techniques_used',
  'recommended_actions', 'trigger_points', 'transcript',
] as const;

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
  const row = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as SessionRow | undefined;
  return row ? parseSession(row) : undefined;
}

export function findAll(): Session[] {
  const rows = db.prepare('SELECT * FROM sessions ORDER BY date DESC').all() as SessionRow[];
  return rows.map(parseSession);
}

export function findByUserId(userId: string): Session[] {
  const rows = db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC').all(userId) as SessionRow[];
  return rows.map(parseSession);
}

export function findByUserIds(userIds: string[]): Session[] {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM sessions WHERE user_id IN (${placeholders}) ORDER BY date DESC`).all(...userIds) as SessionRow[];
  return rows.map(parseSession);
}

export interface CreateSessionInput {
  session_id: string;
  user_id: string;
  date: string;
  duration: number;
  mode?: 'voice' | 'chat';
  key_takeaways?: string[];
  coping_strategies?: string[];
  homework_assignments?: string[];
  topics_discussed?: string[];
  emotional_themes?: string[];
  issues_identified?: string[];
  conversation_assessment?: string;
  emotional_journey?: string;
  risk_level?: 'low' | 'moderate' | 'elevated';
  suggested_focus_areas?: string[];
  techniques_used?: string[];
  clinical_impression?: string;
  preliminary_diagnosis?: string;
  recommended_actions?: string[];
  way_forward?: string;
  root_cause_analysis?: string;
  trigger_points?: string[];
  family_history?: string;
  patient_medical_context?: string;
  frequency_patterns?: string;
  pre_mood_value?: number;
  pre_mood_label?: string;
  pre_mood_emoji?: string;
  post_mood_value?: number;
  post_mood_label?: string;
  post_mood_emoji?: string;
  pre_assessment_type?: string;
  pre_assessment_score?: number;
  pre_assessment_severity?: string;
  transcript?: { role: string; text: string; timestamp?: string }[];
}

export function create(data: CreateSessionInput): Session {
  const id = `session-summary-${uuidv4()}`;
  db.prepare(`
    INSERT INTO sessions (
      id, session_id, user_id, date, duration, mode,
      key_takeaways, coping_strategies, homework_assignments, topics_discussed,
      emotional_themes, issues_identified, conversation_assessment, emotional_journey,
      risk_level, suggested_focus_areas, techniques_used, clinical_impression,
      preliminary_diagnosis, recommended_actions, way_forward,
      root_cause_analysis, trigger_points, family_history, patient_medical_context, frequency_patterns,
      pre_mood_value, pre_mood_label, pre_mood_emoji,
      post_mood_value, post_mood_label, post_mood_emoji,
      pre_assessment_type, pre_assessment_score, pre_assessment_severity,
      transcript
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.session_id, data.user_id, data.date, data.duration, data.mode ?? null,
    JSON.stringify(data.key_takeaways || []),
    JSON.stringify(data.coping_strategies || []),
    JSON.stringify(data.homework_assignments || []),
    JSON.stringify(data.topics_discussed || []),
    JSON.stringify(data.emotional_themes || []),
    JSON.stringify(data.issues_identified || []),
    data.conversation_assessment || '',
    data.emotional_journey || '',
    data.risk_level || 'low',
    JSON.stringify(data.suggested_focus_areas || []),
    JSON.stringify(data.techniques_used || []),
    data.clinical_impression ?? null,
    data.preliminary_diagnosis ?? null,
    JSON.stringify(data.recommended_actions || []),
    data.way_forward ?? null,
    data.root_cause_analysis ?? null,
    JSON.stringify(data.trigger_points || []),
    data.family_history ?? null,
    data.patient_medical_context ?? null,
    data.frequency_patterns ?? null,
    data.pre_mood_value ?? null,
    data.pre_mood_label ?? null,
    data.pre_mood_emoji ?? null,
    data.post_mood_value ?? null,
    data.post_mood_label ?? null,
    data.post_mood_emoji ?? null,
    data.pre_assessment_type ?? null,
    data.pre_assessment_score ?? null,
    data.pre_assessment_severity ?? null,
    JSON.stringify(data.transcript || []),
  );
  return findById(id)!;
}

export function updateReflection(id: string, reflection: string): void {
  db.prepare('UPDATE sessions SET user_reflection = ? WHERE id = ?').run(reflection, id);
}

export function updateSummary(sessionId: string, summary: Record<string, unknown>): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  const jsonArrayFields = ['key_takeaways', 'coping_strategies', 'homework_assignments', 'topics_discussed', 'emotional_themes', 'issues_identified', 'suggested_focus_areas', 'techniques_used', 'recommended_actions', 'trigger_points'];
  const stringFields = ['conversation_assessment', 'emotional_journey', 'risk_level', 'clinical_impression', 'preliminary_diagnosis', 'way_forward', 'root_cause_analysis', 'family_history', 'patient_medical_context', 'frequency_patterns'];

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
  db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE session_id = ?`).run(...values);
}

export function updatePostMood(sessionId: string, value: number, label: string, emoji: string): void {
  db.prepare('UPDATE sessions SET post_mood_value = ?, post_mood_label = ?, post_mood_emoji = ? WHERE session_id = ?')
    .run(value, label, emoji, sessionId);
}
