import { useState } from 'react';
import { X, Info } from 'lucide-react';
import { medications as medsApi } from '../../services/api';

interface Props {
  patientId: string;
  medication: Record<string, unknown> | null;
  onSave: () => void;
  onCancel: () => void;
}

const FREQUENCIES = ['daily', 'twice daily', 'three times daily', 'weekly', 'as needed', 'other'];
const STATUSES = ['active', 'discontinued', 'completed'];

export function MedicationEditor({ patientId, medication, onSave, onCancel }: Props) {
  const [name, setName] = useState((medication?.name as string) || '');
  const [dosage, setDosage] = useState((medication?.dosage as string) || '');
  const [frequency, setFrequency] = useState((medication?.frequency as string) || 'daily');
  const [startDate, setStartDate] = useState((medication?.startDate as string) || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState((medication?.endDate as string) || '');
  const [notes, setNotes] = useState((medication?.notes as string) || '');
  const [patientInfo, setPatientInfo] = useState((medication?.patientInfo as string) || '');
  const [status, setStatus] = useState((medication?.status as string) || 'active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) {
      setError('Name and dosage are required');
      return;
    }

    setSaving(true);
    try {
      const data = {
        patientId,
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        startDate,
        endDate: endDate || undefined,
        notes: notes.trim() || null,
        patientInfo: patientInfo.trim() || null,
        status,
      };

      if (medication) {
        await medsApi.update(medication.id as string, data);
      } else {
        await medsApi.create(data);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="therapist-modal-overlay" onClick={onCancel}>
      <div className="therapist-modal med-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="therapist-modal-header">
          <h3>{medication ? 'Edit Medication' : 'New Medication'}</h3>
          <button className="therapist-modal-close" onClick={onCancel}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="therapist-form-row">
            <div className="therapist-form-field">
              <label>Medication Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sertraline" />
            </div>
            <div className="therapist-form-field">
              <label>Dosage *</label>
              <input type="text" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g. 50mg" />
            </div>
          </div>

          <div className="therapist-form-row">
            <div className="therapist-form-field">
              <label>Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
              </select>
            </div>
            <div className="therapist-form-field">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="therapist-form-row">
            <div className="therapist-form-field">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="therapist-form-field">
              <label>End Date <span className="therapist-form-optional">(optional)</span></label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
            </div>
          </div>

          <div className="therapist-form-field">
            <label>Clinical Notes <span className="therapist-form-optional">(private — not shown to patient)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Dosing rationale, clinical observations..." rows={2} />
          </div>

          <div className="therapist-form-field">
            <label className="therapist-form-label-with-icon">
              <Info size={13} />
              Patient Information <span className="therapist-form-optional">(shown to patient)</span>
            </label>
            <textarea
              value={patientInfo}
              onChange={e => setPatientInfo(e.target.value)}
              placeholder={`What to expect — e.g. "This helps reduce anxiety. Takes 2–4 weeks to take full effect. You may feel slightly drowsy at first."`}
              rows={3}
              className="therapist-form-patient-info"
            />
          </div>

          {error && <p className="therapist-form-error">{error}</p>}
          <div className="therapist-form-actions">
            <button type="button" className="therapist-btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="therapist-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
