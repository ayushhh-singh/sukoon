import { useState } from 'react';
import { X, Shield } from 'lucide-react';
import { safetyPlans as safetyApi } from '../../services/api';

interface Props {
  patientId: string;
  plan: Record<string, unknown> | null;
  onSave: () => void;
  onCancel: () => void;
}

function TagInput({ label, tags, onChange, placeholder }: { label: string; tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');

  function add() {
    const text = input.trim();
    if (text && !tags.includes(text)) {
      onChange([...tags, text]);
      setInput('');
    }
  }

  return (
    <div className="safety-editor-field">
      <label>{label}</label>
      <div className="safety-editor-tags">
        {tags.map((t, i) => (
          <span key={i} className="treatment-goal-tag">
            {t}
            <button onClick={() => onChange(tags.filter((_, j) => j !== i))}><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="safety-editor-input-row">
        <input
          type="text"
          className="appointments-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button className="btn-secondary btn-sm" onClick={add} type="button">Add</button>
      </div>
    </div>
  );
}

export function SafetyPlanEditor({ patientId, plan, onSave, onCancel }: Props) {
  const [warningSigns, setWarningSigns] = useState<string[]>((plan?.warningSigns as string[]) || []);
  const [copingStrategies, setCopingStrategies] = useState<string[]>((plan?.copingStrategies as string[]) || []);
  const [supportContacts, setSupportContacts] = useState<string[]>((plan?.supportContacts as string[]) || []);
  const [professionalContacts, setProfessionalContacts] = useState<string[]>((plan?.professionalContacts as string[]) || []);
  const [environmentSafety, setEnvironmentSafety] = useState((plan?.environmentSafety as string) || '');
  const [reasonsForLiving, setReasonsForLiving] = useState<string[]>((plan?.reasonsForLiving as string[]) || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const data = {
        patientId,
        warningSigns,
        copingStrategies,
        supportContacts,
        professionalContacts,
        environmentSafety: environmentSafety.trim() || undefined,
        reasonsForLiving,
      };
      if (plan?.id) {
        await safetyApi.update(plan.id as string, data);
      } else {
        await safetyApi.create(data);
      }
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="therapist-modal-overlay" onClick={onCancel}>
      <div className="therapist-modal safety-modal" onClick={e => e.stopPropagation()}>
        <div className="therapist-modal-header">
          <h3><Shield size={18} /> {plan ? 'Edit Safety Plan' : 'Create Safety Plan'}</h3>
          <button className="therapist-modal-close" onClick={onCancel}><X size={18} /></button>
        </div>

        <div className="therapist-modal-body">
          {error && <div className="therapist-error">{error}</div>}

          <TagInput label="Warning Signs" tags={warningSigns} onChange={setWarningSigns} placeholder="e.g. Increased isolation, hopelessness" />
          <TagInput label="Coping Strategies" tags={copingStrategies} onChange={setCopingStrategies} placeholder="e.g. Deep breathing, going for a walk" />
          <TagInput label="Support Contacts" tags={supportContacts} onChange={setSupportContacts} placeholder="e.g. Friend — John (555-1234)" />
          <TagInput label="Professional Contacts" tags={professionalContacts} onChange={setProfessionalContacts} placeholder="e.g. Crisis Helpline — 988" />

          <div className="safety-editor-field">
            <label>Environment Safety Notes</label>
            <textarea className="appointments-input checkin-textarea" value={environmentSafety} onChange={e => setEnvironmentSafety(e.target.value)} placeholder="Steps to make environment safer..." rows={2} />
          </div>

          <TagInput label="Reasons for Living" tags={reasonsForLiving} onChange={setReasonsForLiving} placeholder="e.g. Family, pets, future goals" />
        </div>

        <div className="therapist-modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : (plan ? 'Update Plan' : 'Create Plan')}
          </button>
        </div>
      </div>
    </div>
  );
}
