import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface TreatmentGoal {
  id: string;
  planId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: 'active' | 'achieved' | 'paused' | 'discontinued';
  progress: number;
  interventions: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GoalRow extends Omit<TreatmentGoal, 'interventions'> {
  interventions: string;
}

function parse(row: GoalRow): TreatmentGoal {
  return { ...row, interventions: JSON.parse(row.interventions || '[]') };
}

export function findById(id: string): TreatmentGoal | undefined {
  const row = db.prepare('SELECT * FROM treatment_goals WHERE id = ?').get(id) as GoalRow | undefined;
  return row ? parse(row) : undefined;
}

export function findByPlanId(planId: string): TreatmentGoal[] {
  const rows = db.prepare('SELECT * FROM treatment_goals WHERE planId = ? ORDER BY createdAt ASC').all(planId) as GoalRow[];
  return rows.map(parse);
}

export interface CreateGoalInput {
  planId: string;
  title: string;
  description?: string;
  targetDate?: string;
  interventions?: string[];
  notes?: string;
}

export function create(data: CreateGoalInput): TreatmentGoal {
  const id = `goal-${uuidv4()}`;
  db.prepare(`
    INSERT INTO treatment_goals (id, planId, title, description, targetDate, interventions, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.planId, data.title, data.description ?? null, data.targetDate ?? null, JSON.stringify(data.interventions || []), data.notes ?? null);
  return findById(id)!;
}

export function update(id: string, data: Partial<Pick<TreatmentGoal, 'title' | 'description' | 'targetDate' | 'status' | 'progress' | 'interventions' | 'notes'>>): TreatmentGoal | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.targetDate !== undefined) { fields.push('targetDate = ?'); values.push(data.targetDate); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.progress !== undefined) { fields.push('progress = ?'); values.push(data.progress); }
  if (data.interventions !== undefined) { fields.push('interventions = ?'); values.push(JSON.stringify(data.interventions)); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }

  if (fields.length === 0) return findById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE treatment_goals SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM treatment_goals WHERE id = ?').run(id);
}
