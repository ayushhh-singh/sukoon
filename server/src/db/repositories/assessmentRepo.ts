import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface Assessment {
  id: string;
  userId: string;
  sessionId: string | null;
  type: 'PHQ9' | 'GAD7' | 'PSS';
  responses: { questionId: number; value: number }[];
  totalScore: number;
  severity: string;
  color: string | null;
  timing: 'pre-session' | 'post-session' | 'standalone' | null;
  completedAt: string;
}

interface AssessmentRow extends Omit<Assessment, 'responses'> {
  responses: string;
}

function parse(row: AssessmentRow): Assessment {
  return { ...row, responses: JSON.parse(row.responses || '[]') };
}

export function findByUserId(userId: string): Assessment[] {
  const rows = db.prepare('SELECT * FROM assessments WHERE userId = ? ORDER BY completedAt DESC').all(userId) as AssessmentRow[];
  return rows.map(parse);
}

export function findLatest(userId: string, type: string): Assessment | undefined {
  const row = db.prepare('SELECT * FROM assessments WHERE userId = ? AND type = ? ORDER BY completedAt DESC LIMIT 1').get(userId, type) as AssessmentRow | undefined;
  return row ? parse(row) : undefined;
}


export function findTrendsByUserId(userId: string): Record<string, { score: number; date: string; severity: string }[]> {
  const rows = db.prepare('SELECT type, totalScore, severity, completedAt FROM assessments WHERE userId = ? ORDER BY completedAt ASC').all(userId) as { type: string; totalScore: number; severity: string; completedAt: string }[];
  const trends: Record<string, { score: number; date: string; severity: string }[]> = { PHQ9: [], GAD7: [], PSS: [] };
  for (const row of rows) {
    if (trends[row.type]) {
      trends[row.type].push({ score: row.totalScore, date: row.completedAt, severity: row.severity });
    }
  }
  return trends;
}

export interface CreateAssessmentInput {
  userId: string;
  sessionId?: string;
  type: 'PHQ9' | 'GAD7' | 'PSS';
  responses: { questionId: number; value: number }[];
  totalScore: number;
  severity: string;
  color?: string;
  timing?: 'pre-session' | 'post-session' | 'standalone';
  completedAt: string;
}

export function create(data: CreateAssessmentInput): Assessment {
  const id = `assess-${uuidv4()}`;
  db.prepare(`
    INSERT INTO assessments (id, userId, sessionId, type, responses, totalScore, severity, color, timing, completedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.userId, data.sessionId ?? null, data.type, JSON.stringify(data.responses), data.totalScore, data.severity, data.color ?? null, data.timing ?? null, data.completedAt);

  const row = db.prepare('SELECT * FROM assessments WHERE id = ?').get(id) as AssessmentRow;
  return parse(row);
}
