import db from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface ClinicalFormulation {
  id: string;
  doctorId: string;
  patientId: string;
  presentingProblems: string[];
  predisposingFactors: string[];
  precipitatingFactors: string[];
  perpetuatingFactors: string[];
  protectiveFactors: string[];
  formulationSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FormulationRow extends Omit<ClinicalFormulation, 'presentingProblems' | 'predisposingFactors' | 'precipitatingFactors' | 'perpetuatingFactors' | 'protectiveFactors'> {
  presentingProblems: string;
  predisposingFactors: string;
  precipitatingFactors: string;
  perpetuatingFactors: string;
  protectiveFactors: string;
}

function parse(row: FormulationRow): ClinicalFormulation {
  return {
    ...row,
    presentingProblems: JSON.parse(row.presentingProblems || '[]'),
    predisposingFactors: JSON.parse(row.predisposingFactors || '[]'),
    precipitatingFactors: JSON.parse(row.precipitatingFactors || '[]'),
    perpetuatingFactors: JSON.parse(row.perpetuatingFactors || '[]'),
    protectiveFactors: JSON.parse(row.protectiveFactors || '[]'),
  };
}

export function findById(id: string): ClinicalFormulation | undefined {
  const row = db.prepare('SELECT * FROM clinical_formulations WHERE id = ?').get(id) as FormulationRow | undefined;
  return row ? parse(row) : undefined;
}

export function findByPatientId(patientId: string, doctorId?: string): ClinicalFormulation | undefined {
  if (doctorId) {
    const row = db.prepare('SELECT * FROM clinical_formulations WHERE patientId = ? AND doctorId = ? ORDER BY createdAt DESC LIMIT 1').get(patientId, doctorId) as FormulationRow | undefined;
    return row ? parse(row) : undefined;
  }
  const row = db.prepare('SELECT * FROM clinical_formulations WHERE patientId = ? ORDER BY createdAt DESC LIMIT 1').get(patientId) as FormulationRow | undefined;
  return row ? parse(row) : undefined;
}

export function findAllByPatientId(patientId: string): ClinicalFormulation[] {
  const rows = db.prepare('SELECT * FROM clinical_formulations WHERE patientId = ? ORDER BY createdAt DESC').all(patientId) as FormulationRow[];
  return rows.map(parse);
}

export interface CreateFormulationInput {
  doctorId: string;
  patientId: string;
  presentingProblems?: string[];
  predisposingFactors?: string[];
  precipitatingFactors?: string[];
  perpetuatingFactors?: string[];
  protectiveFactors?: string[];
  formulationSummary?: string;
}

export function create(data: CreateFormulationInput): ClinicalFormulation {
  const id = `formul-${uuidv4()}`;
  db.prepare(`
    INSERT INTO clinical_formulations (id, doctorId, patientId, presentingProblems, predisposingFactors, precipitatingFactors, perpetuatingFactors, protectiveFactors, formulationSummary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.doctorId, data.patientId, JSON.stringify(data.presentingProblems || []), JSON.stringify(data.predisposingFactors || []), JSON.stringify(data.precipitatingFactors || []), JSON.stringify(data.perpetuatingFactors || []), JSON.stringify(data.protectiveFactors || []), data.formulationSummary ?? null);
  return findById(id)!;
}

export function update(id: string, data: Partial<Omit<CreateFormulationInput, 'doctorId' | 'patientId'>>): ClinicalFormulation | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.presentingProblems !== undefined) { fields.push('presentingProblems = ?'); values.push(JSON.stringify(data.presentingProblems)); }
  if (data.predisposingFactors !== undefined) { fields.push('predisposingFactors = ?'); values.push(JSON.stringify(data.predisposingFactors)); }
  if (data.precipitatingFactors !== undefined) { fields.push('precipitatingFactors = ?'); values.push(JSON.stringify(data.precipitatingFactors)); }
  if (data.perpetuatingFactors !== undefined) { fields.push('perpetuatingFactors = ?'); values.push(JSON.stringify(data.perpetuatingFactors)); }
  if (data.protectiveFactors !== undefined) { fields.push('protectiveFactors = ?'); values.push(JSON.stringify(data.protectiveFactors)); }
  if (data.formulationSummary !== undefined) { fields.push('formulationSummary = ?'); values.push(data.formulationSummary); }

  if (fields.length === 0) return findById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE clinical_formulations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}
