import { useState } from 'react';
import { X, FileText, Stethoscope, Eye, ClipboardList, Route } from 'lucide-react';
import { notes as notesApi } from '../../services/api';

interface Props {
  patientId: string;
  appointmentId?: string;
  note?: Record<string, unknown> | null;
  onSave: () => void;
  onCancel: () => void;
}

const SOAP_SECTIONS = [
  { key: 'subjective', label: 'Subjective', letter: 'S', icon: Stethoscope, color: '#60a5fa', desc: 'Patient\'s reported symptoms, feelings, concerns' },
  { key: 'objective', label: 'Objective', letter: 'O', icon: Eye, color: '#34d399', desc: 'Clinician observations, mental status exam' },
  { key: 'assessment', label: 'Assessment', letter: 'A', icon: ClipboardList, color: '#fbbf24', desc: 'Diagnosis, clinical impressions, risk level' },
  { key: 'plan', label: 'Plan', letter: 'P', icon: Route, color: '#c084fc', desc: 'Treatment plan, follow-up, homework' },
];

export function SOAPNoteEditor({ patientId, appointmentId, note, onSave, onCancel }: Props) {
  const [title, setTitle] = useState((note?.title as string) || '');
  const [subjective, setSubjective] = useState((note?.subjective as string) || '');
  const [objective, setObjective] = useState((note?.objective as string) || '');
  const [assessmentText, setAssessmentText] = useState((note?.assessmentText as string) || '');
  const [planText, setPlanText] = useState((note?.planText as string) || '');
  const [content, setContent] = useState((note?.content as string) || '');
  const [tags, setTags] = useState((note?.tags as string[])?.join(', ') || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const soapValues: Record<string, string> = { subjective, objective, assessment: assessmentText, plan: planText };
  const soapSetters: Record<string, (v: string) => void> = {
    subjective: setSubjective, objective: setObjective, assessment: setAssessmentText, plan: setPlanText,
  };

  async function handleSubmit() {
    const finalContent = content.trim() || [
      subjective && `S: ${subjective}`,
      objective && `O: ${objective}`,
      assessmentText && `A: ${assessmentText}`,
      planText && `P: ${planText}`,
    ].filter(Boolean).join('\n\n') || 'SOAP Note';

    setSubmitting(true);
    setError('');
    try {
      const tagsList = tags.split(',').map(t => t.trim()).filter(Boolean);
      const data: Record<string, unknown> = {
        patientId, appointmentId, noteType: 'soap',
        title: title.trim() || 'SOAP Note',
        content: finalContent,
        subjective: subjective.trim() || undefined,
        objective: objective.trim() || undefined,
        assessmentText: assessmentText.trim() || undefined,
        planText: planText.trim() || undefined,
        tags: tagsList,
      };
      if (note?.id) {
        await notesApi.update(note.id as string, data);
      } else {
        await notesApi.create(data);
      }
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="therapist-modal-overlay" onClick={onCancel}>
      <div className="therapist-modal soap-modal" onClick={e => e.stopPropagation()}>
        <div className="therapist-modal-header">
          <h3><FileText size={18} /> SOAP Note</h3>
          <button className="therapist-modal-close" onClick={onCancel}><X size={18} /></button>
        </div>

        <div className="therapist-modal-body">
          {error && <div className="therapist-error">{error}</div>}

          <div className="soap-title-field">
            <input type="text" className="soap-title-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Session note title..." maxLength={200} />
          </div>

          <div className="soap-sections">
            {SOAP_SECTIONS.map(section => {
              const Icon = section.icon;
              return (
                <div key={section.key} className="soap-section" style={{ '--soap-color': section.color } as React.CSSProperties}>
                  <div className="soap-section-header">
                    <div className="soap-section-letter">{section.letter}</div>
                    <div className="soap-section-info">
                      <span className="soap-section-label"><Icon size={13} /> {section.label}</span>
                      <span className="soap-section-desc">{section.desc}</span>
                    </div>
                  </div>
                  <textarea
                    className="soap-section-textarea"
                    value={soapValues[section.key]}
                    onChange={e => soapSetters[section.key](e.target.value)}
                    placeholder={`Enter ${section.label.toLowerCase()} notes...`}
                    rows={3}
                  />
                </div>
              );
            })}
          </div>

          <div className="soap-extras">
            <div className="soap-extra-field">
              <label>Additional Notes</label>
              <textarea className="soap-section-textarea" value={content} onChange={e => setContent(e.target.value)} placeholder="Any additional observations or context..." rows={2} />
            </div>
            <div className="soap-extra-field">
              <label>Tags</label>
              <input type="text" className="soap-tags-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="anxiety, CBT, follow-up" />
            </div>
          </div>
        </div>

        <div className="therapist-modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : (note?.id ? 'Update Note' : 'Save Note')}
          </button>
        </div>
      </div>
    </div>
  );
}
