import { useState, useEffect } from 'react';
import { Lightbulb, Plus, Edit2, X, AlertCircle, Clock, Zap, RotateCcw, ShieldCheck } from 'lucide-react';
import { formulations as formulationsApi } from '../../services/api';

interface Props {
  patientId: string;
}

interface Formulation {
  id: string;
  presentingProblems: string[];
  predisposingFactors: string[];
  precipitatingFactors: string[];
  perpetuatingFactors: string[];
  protectiveFactors: string[];
  formulationSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

const SECTIONS = [
  { key: 'presentingProblems', label: 'Presenting', fullLabel: 'Presenting Problems', icon: AlertCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', desc: 'Current difficulties the patient presents with' },
  { key: 'predisposingFactors', label: 'Predisposing', fullLabel: 'Predisposing Factors', icon: Clock, color: '#f97316', bg: 'rgba(249, 115, 22, 0.08)', desc: 'Background factors that made the patient vulnerable' },
  { key: 'precipitatingFactors', label: 'Precipitating', fullLabel: 'Precipitating Factors', icon: Zap, color: '#eab308', bg: 'rgba(234, 179, 8, 0.08)', desc: 'Recent events that triggered current difficulties' },
  { key: 'perpetuatingFactors', label: 'Perpetuating', fullLabel: 'Perpetuating Factors', icon: RotateCcw, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.08)', desc: 'What maintains the current difficulties' },
  { key: 'protectiveFactors', label: 'Protective', fullLabel: 'Protective Factors', icon: ShieldCheck, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.08)', desc: 'Strengths and resources the patient has' },
];

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');
  function add() {
    const text = input.trim();
    if (text && !tags.includes(text)) { onChange([...tags, text]); setInput(''); }
  }
  return (
    <div>
      <div className="formulation-edit-tags">
        {tags.map((t, i) => (
          <span key={i} className="formulation-edit-tag">
            {t}
            <button onClick={() => onChange(tags.filter((_, j) => j !== i))}><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="formulation-edit-input-row">
        <input type="text" className="formulation-edit-input" value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button className="btn-secondary btn-sm" onClick={add} type="button">Add</button>
      </div>
    </div>
  );
}

export function ClinicalFormulationView({ patientId }: Props) {
  const [formulation, setFormulation] = useState<Formulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string[]>>({});
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const data = await formulationsApi.get(patientId);
      setFormulation(data as unknown as Formulation | null);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [patientId]);

  function startEditing() {
    setEditData({
      presentingProblems: formulation?.presentingProblems || [],
      predisposingFactors: formulation?.predisposingFactors || [],
      precipitatingFactors: formulation?.precipitatingFactors || [],
      perpetuatingFactors: formulation?.perpetuatingFactors || [],
      protectiveFactors: formulation?.protectiveFactors || [],
    });
    setSummary(formulation?.formulationSummary || '');
    setEditing(true);
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      const data = {
        patientId,
        presentingProblems: editData.presentingProblems,
        predisposingFactors: editData.predisposingFactors,
        precipitatingFactors: editData.precipitatingFactors,
        perpetuatingFactors: editData.perpetuatingFactors,
        protectiveFactors: editData.protectiveFactors,
        formulationSummary: summary.trim() || undefined,
      };
      if (formulation?.id) {
        await formulationsApi.update(formulation.id, data);
      } else {
        await formulationsApi.create(data);
      }
      setEditing(false);
      loadData();
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="therapist-loading">Loading formulation...</div>;

  if (editing) {
    return (
      <div className="formulation-view">
        <div className="section-header">
          <h3><Lightbulb size={18} /> Clinical Formulation (5P Model)</h3>
        </div>
        <div className="formulation-editor-card">
          {SECTIONS.map(section => {
            const Icon = section.icon;
            return (
              <div key={section.key} className="formulation-edit-section" style={{ '--f-color': section.color, '--f-bg': section.bg } as React.CSSProperties}>
                <div className="formulation-edit-section-header">
                  <Icon size={15} />
                  <div>
                    <label>{section.fullLabel}</label>
                    <span className="formulation-edit-desc">{section.desc}</span>
                  </div>
                </div>
                <TagInput
                  tags={editData[section.key] || []}
                  onChange={tags => setEditData({ ...editData, [section.key]: tags })}
                  placeholder={`Add ${section.label.toLowerCase()} factor...`}
                />
              </div>
            );
          })}
          <div className="formulation-edit-section" style={{ '--f-color': 'var(--text-secondary)', '--f-bg': 'rgba(255,255,255,0.02)' } as React.CSSProperties}>
            <label className="formulation-edit-summary-label">Formulation Summary</label>
            <textarea className="formulation-edit-input formulation-edit-textarea" value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Narrative summary tying the 5 factors together..." />
          </div>
          <div className="formulation-edit-actions">
            <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Formulation'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="formulation-view">
      <div className="section-header">
        <h3><Lightbulb size={18} /> Clinical Formulation (5P Model)</h3>
        <button className="btn-primary btn-sm" onClick={startEditing}>
          {formulation ? <><Edit2 size={14} /> Edit</> : <><Plus size={14} /> Create</>}
        </button>
      </div>

      {!formulation ? (
        <div className="appointments-empty">
          <Lightbulb size={36} />
          <p>No clinical formulation yet. Create one using the 5P model.</p>
        </div>
      ) : (
        <div className="formulation-cards">
          {SECTIONS.map(section => {
            const items = (formulation as unknown as Record<string, string[]>)[section.key] || [];
            if (items.length === 0) return null;
            const Icon = section.icon;
            return (
              <div key={section.key} className="formulation-card" style={{ '--f-color': section.color, '--f-bg': section.bg } as React.CSSProperties}>
                <div className="formulation-card-header">
                  <div className="formulation-card-icon"><Icon size={16} /></div>
                  <div>
                    <h4>{section.fullLabel}</h4>
                    <span className="formulation-card-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="formulation-card-tags">
                  {items.map((item, i) => (
                    <span key={i} className="formulation-tag">{item}</span>
                  ))}
                </div>
              </div>
            );
          })}

          {formulation.formulationSummary && (
            <div className="formulation-summary-card">
              <h4>Formulation Summary</h4>
              <p>{formulation.formulationSummary}</p>
            </div>
          )}

          <div className="formulation-footer">
            Last updated: {new Date(formulation.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )}
    </div>
  );
}
