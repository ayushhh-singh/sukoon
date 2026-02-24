import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { treatmentPlans as plansApi } from '../../services/api';

interface Goal {
  id?: string;
  title: string;
  description: string;
  targetDate: string;
  interventions: string[];
  status: string;
  progress: number;
}

interface Props {
  patientId: string;
  plan: Record<string, unknown> | null;
  onSave: () => void;
  onCancel: () => void;
}

export function TreatmentPlanEditor({ patientId, plan, onSave, onCancel }: Props) {
  const [title, setTitle] = useState((plan?.title as string) || '');
  const [diagnosis, setDiagnosis] = useState((plan?.diagnosis as string) || '');
  const [status, setStatus] = useState((plan?.status as string) || 'active');
  const [startDate, setStartDate] = useState((plan?.startDate) as string || new Date().toISOString().split('T')[0]);
  const [targetEndDate, setTargetEndDate] = useState((plan?.targetEndDate) as string || '');
  const [notes, setNotes] = useState((plan?.notes as string) || '');
  const [goals, setGoals] = useState<Goal[]>(
    ((plan?.goals as Goal[]) || []).map(g => ({
      id: g.id,
      title: g.title || '',
      description: g.description || '',
      targetDate: g.targetDate || '',
      interventions: g.interventions || [],
      status: g.status || 'active',
      progress: g.progress || 0,
    }))
  );
  const [newInterventionMap, setNewInterventionMap] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function addGoal() {
    setGoals([...goals, { title: '', description: '', targetDate: '', interventions: [], status: 'active', progress: 0 }]);
  }

  function updateGoal(idx: number, field: keyof Goal, value: unknown) {
    const updated = [...goals];
    (updated[idx] as unknown as Record<string, unknown>)[field] = value;
    setGoals(updated);
  }

  function removeGoal(idx: number) {
    setGoals(goals.filter((_, i) => i !== idx));
  }

  function addIntervention(idx: number) {
    const text = (newInterventionMap[idx] || '').trim();
    if (!text) return;
    const updated = [...goals];
    updated[idx].interventions = [...updated[idx].interventions, text];
    setGoals(updated);
    setNewInterventionMap({ ...newInterventionMap, [idx]: '' });
  }

  function removeIntervention(goalIdx: number, intIdx: number) {
    const updated = [...goals];
    updated[goalIdx].interventions = updated[goalIdx].interventions.filter((_, i) => i !== intIdx);
    setGoals(updated);
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      if (plan?.id) {
        // Update plan
        await plansApi.update(plan.id as string, { title, diagnosis, status, startDate, targetEndDate: targetEndDate || undefined, notes });
        // Update/create goals
        const planId = plan.id as string;
        const existingGoalIds = ((plan.goals as { id: string }[]) || []).map(g => g.id);
        for (const goal of goals) {
          if (goal.id && existingGoalIds.includes(goal.id)) {
            await plansApi.updateGoal(planId, goal.id, {
              title: goal.title, description: goal.description, targetDate: goal.targetDate || undefined,
              status: goal.status, progress: goal.progress, interventions: goal.interventions,
            });
          } else {
            await plansApi.createGoal(planId, {
              title: goal.title, description: goal.description, targetDate: goal.targetDate || undefined,
              interventions: goal.interventions,
            });
          }
        }
        // Delete removed goals
        for (const existingId of existingGoalIds) {
          if (!goals.find(g => g.id === existingId)) {
            await plansApi.removeGoal(planId, existingId);
          }
        }
      } else {
        // Create plan
        const created = await plansApi.create({ patientId, title, diagnosis, startDate, targetEndDate: targetEndDate || undefined, notes });
        const planId = (created as Record<string, unknown>).id as string;
        for (const goal of goals) {
          if (goal.title.trim()) {
            await plansApi.createGoal(planId, {
              title: goal.title, description: goal.description, targetDate: goal.targetDate || undefined,
              interventions: goal.interventions,
            });
          }
        }
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
      <div className="therapist-modal treatment-plan-modal" onClick={e => e.stopPropagation()}>
        <div className="therapist-modal-header">
          <h3>{plan ? 'Edit Treatment Plan' : 'New Treatment Plan'}</h3>
          <button className="therapist-modal-close" onClick={onCancel}><X size={18} /></button>
        </div>

        <div className="therapist-modal-body">
          {error && <div className="therapist-error">{error}</div>}

          <div className="soap-field">
            <label>Title *</label>
            <input type="text" className="appointments-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Anxiety Management Plan" maxLength={200} />
          </div>

          <div className="soap-field">
            <label>Diagnosis</label>
            <input type="text" className="appointments-input" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Generalized Anxiety Disorder" />
          </div>

          <div className="appointments-row">
            <div className="soap-field" style={{ flex: 1 }}>
              <label>Status</label>
              <select className="appointments-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="revised">Revised</option>
              </select>
            </div>
            <div className="soap-field" style={{ flex: 1 }}>
              <label>Start Date</label>
              <input type="date" className="appointments-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="soap-field" style={{ flex: 1 }}>
              <label>Target End</label>
              <input type="date" className="appointments-input" value={targetEndDate} onChange={e => setTargetEndDate(e.target.value)} />
            </div>
          </div>

          <div className="soap-field">
            <label>Notes</label>
            <textarea className="appointments-input checkin-textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Overall treatment approach..." />
          </div>

          <div className="treatment-goals-editor">
            <div className="section-header">
              <label>Goals</label>
              <button className="btn-secondary btn-sm" onClick={addGoal}><Plus size={13} /> Add Goal</button>
            </div>

            {goals.map((goal, idx) => (
              <div key={idx} className="treatment-goal-edit-card">
                <div className="treatment-goal-edit-header">
                  <input type="text" className="appointments-input" value={goal.title} onChange={e => updateGoal(idx, 'title', e.target.value)} placeholder="Goal title" />
                  <button className="appointment-cancel-btn" onClick={() => removeGoal(idx)}><Trash2 size={14} /></button>
                </div>
                <textarea className="appointments-input checkin-textarea" value={goal.description} onChange={e => updateGoal(idx, 'description', e.target.value)} placeholder="Description" rows={2} />
                <div className="appointments-row">
                  <div className="soap-field" style={{ flex: 1 }}>
                    <label>Target Date</label>
                    <input type="date" className="appointments-input" value={goal.targetDate} onChange={e => updateGoal(idx, 'targetDate', e.target.value)} />
                  </div>
                  {plan && (
                    <>
                      <div className="soap-field" style={{ flex: 1 }}>
                        <label>Status</label>
                        <select className="appointments-select" value={goal.status} onChange={e => updateGoal(idx, 'status', e.target.value)}>
                          <option value="active">Active</option>
                          <option value="achieved">Achieved</option>
                          <option value="paused">Paused</option>
                          <option value="discontinued">Discontinued</option>
                        </select>
                      </div>
                      <div className="soap-field" style={{ flex: 1 }}>
                        <label>Progress ({goal.progress}%)</label>
                        <input type="range" min="0" max="100" value={goal.progress} onChange={e => updateGoal(idx, 'progress', parseInt(e.target.value))} />
                      </div>
                    </>
                  )}
                </div>
                <div className="treatment-goal-interventions-edit">
                  <label>Interventions</label>
                  <div className="treatment-goal-tags-row">
                    {goal.interventions.map((inv, i) => (
                      <span key={i} className="treatment-goal-tag">
                        {inv}
                        <button onClick={() => removeIntervention(idx, i)}><X size={10} /></button>
                      </span>
                    ))}
                    <div className="treatment-goal-tag-input">
                      <input
                        type="text"
                        placeholder="Add intervention..."
                        value={newInterventionMap[idx] || ''}
                        onChange={e => setNewInterventionMap({ ...newInterventionMap, [idx]: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIntervention(idx); } }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
