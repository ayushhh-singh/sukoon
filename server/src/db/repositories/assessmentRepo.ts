import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Assessment {
  id: string;
  user_id: string;
  session_id: string | null;
  type: 'PHQ9' | 'GAD7' | 'PSS';
  responses: { questionId: number; value: number }[];
  total_score: number;
  severity: string;
  color: string | null;
  timing: 'pre-session' | 'post-session' | 'standalone' | null;
  completed_at: string;
}

interface AssessmentRow extends Omit<Assessment, 'responses'> {
  responses: string;
}

function parse(row: AssessmentRow): Assessment {
  return { ...row, responses: JSON.parse(row.responses || '[]') };
}

export function findByUserId(userId: string): Assessment[] {
  const rows = db.prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY completed_at DESC').all(userId) as AssessmentRow[];
  return rows.map(parse);
}

export function findLatest(userId: string, type: string): Assessment | undefined {
  const row = db.prepare('SELECT * FROM assessments WHERE user_id = ? AND type = ? ORDER BY completed_at DESC LIMIT 1').get(userId, type) as AssessmentRow | undefined;
  return row ? parse(row) : undefined;
}

export interface CreateAssessmentInput {
  user_id: string;
  session_id?: string;
  type: 'PHQ9' | 'GAD7' | 'PSS';
  responses: { questionId: number; value: number }[];
  total_score: number;
  severity: string;
  color?: string;
  timing?: 'pre-session' | 'post-session' | 'standalone';
  completed_at: string;
}

export function create(data: CreateAssessmentInput): Assessment {
  const id = `assess-${uuidv4()}`;
  db.prepare(`
    INSERT INTO assessments (id, user_id, session_id, type, responses, total_score, severity, color, timing, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.user_id, data.session_id ?? null, data.type, JSON.stringify(data.responses), data.total_score, data.severity, data.color ?? null, data.timing ?? null, data.completed_at);

  const row = db.prepare('SELECT * FROM assessments WHERE id = ?').get(id) as AssessmentRow;
  return parse(row);
}
