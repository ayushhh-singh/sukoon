import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface SafetyPlan {
  id: string;
  doctorId: string;
  patientId: string;
  warningSigns: string[];
  copingStrategies: string[];
  supportContacts: string[];
  professionalContacts: string[];
  environmentSafety: string | null;
  reasonsForLiving: string[];
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

interface SafetyPlanRow extends Omit<SafetyPlan, 'warningSigns' | 'copingStrategies' | 'supportContacts' | 'professionalContacts' | 'reasonsForLiving'> {
  warningSigns: string;
  copingStrategies: string;
  supportContacts: string;
  professionalContacts: string;
  reasonsForLiving: string;
}

function parse(row: SafetyPlanRow): SafetyPlan {
  return {
    ...row,
    warningSigns: JSON.parse(row.warningSigns || '[]'),
    copingStrategies: JSON.parse(row.copingStrategies || '[]'),
    supportContacts: JSON.parse(row.supportContacts || '[]'),
    professionalContacts: JSON.parse(row.professionalContacts || '[]'),
    reasonsForLiving: JSON.parse(row.reasonsForLiving || '[]'),
  };
}

export function findById(id: string): SafetyPlan | undefined {
  const row = db.prepare('SELECT * FROM safety_plans WHERE id = ?').get(id) as SafetyPlanRow | undefined;
  return row ? parse(row) : undefined;
}

export function findActiveByPatientId(patientId: string): SafetyPlan | undefined {
  const row = db.prepare('SELECT * FROM safety_plans WHERE patientId = ? AND isActive = 1 ORDER BY createdAt DESC LIMIT 1').get(patientId) as SafetyPlanRow | undefined;
  return row ? parse(row) : undefined;
}

export function findAllByPatientId(patientId: string): SafetyPlan[] {
  const rows = db.prepare('SELECT * FROM safety_plans WHERE patientId = ? ORDER BY createdAt DESC').all(patientId) as SafetyPlanRow[];
  return rows.map(parse);
}

export interface CreateSafetyPlanInput {
  doctorId: string;
  patientId: string;
  warningSigns?: string[];
  copingStrategies?: string[];
  supportContacts?: string[];
  professionalContacts?: string[];
  environmentSafety?: string;
  reasonsForLiving?: string[];
}

export function create(data: CreateSafetyPlanInput): SafetyPlan {
  db.prepare("UPDATE safety_plans SET isActive = 0, updatedAt = datetime('now') WHERE patientId = ? AND isActive = 1").run(data.patientId);

  const id = `safety-${uuidv4()}`;
  db.prepare(`
    INSERT INTO safety_plans (id, doctorId, patientId, warningSigns, copingStrategies, supportContacts, professionalContacts, environmentSafety, reasonsForLiving)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.doctorId, data.patientId, JSON.stringify(data.warningSigns || []), JSON.stringify(data.copingStrategies || []), JSON.stringify(data.supportContacts || []), JSON.stringify(data.professionalContacts || []), data.environmentSafety ?? null, JSON.stringify(data.reasonsForLiving || []));
  return findById(id)!;
}

export function update(id: string, data: Partial<Omit<CreateSafetyPlanInput, 'doctorId' | 'patientId'>>): SafetyPlan | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.warningSigns !== undefined) { fields.push('warningSigns = ?'); values.push(JSON.stringify(data.warningSigns)); }
  if (data.copingStrategies !== undefined) { fields.push('copingStrategies = ?'); values.push(JSON.stringify(data.copingStrategies)); }
  if (data.supportContacts !== undefined) { fields.push('supportContacts = ?'); values.push(JSON.stringify(data.supportContacts)); }
  if (data.professionalContacts !== undefined) { fields.push('professionalContacts = ?'); values.push(JSON.stringify(data.professionalContacts)); }
  if (data.environmentSafety !== undefined) { fields.push('environmentSafety = ?'); values.push(data.environmentSafety); }
  if (data.reasonsForLiving !== undefined) { fields.push('reasonsForLiving = ?'); values.push(JSON.stringify(data.reasonsForLiving)); }

  if (fields.length === 0) return findById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE safety_plans SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function deactivate(id: string): void {
  db.prepare("UPDATE safety_plans SET isActive = 0, updatedAt = datetime('now') WHERE id = ?").run(id);
}

export function remove(id: string): void {
  db.prepare('DELETE FROM safety_plans WHERE id = ?').run(id);
}
