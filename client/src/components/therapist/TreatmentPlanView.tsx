import { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, ChevronDown, ChevronUp, CheckCircle, Calendar, TrendingUp } from 'lucide-react';
import { treatmentPlans as plansApi } from '../../services/api';
import { TreatmentPlanEditor } from './TreatmentPlanEditor';

interface Props {
  patientId: string;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  progress: number;
  interventions: string[];
  notes: string | null;
}

interface Plan {
  id: string;
  title: string;
  diagnosis: string | null;
  status: string;
  startDate: string;
  targetEndDate: string | null;
  notes: string | null;
  goals: Goal[];
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  active: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  completed: { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' },
  paused: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
  revised: { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)' },
  achieved: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  discontinued: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

export function TreatmentPlanView({ patientId }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null | 'new'>(null);

  async function loadData() {
    setLoading(true);
    try {
      const data = await plansApi.list(patientId);
      setPlans(data as unknown as Plan[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [patientId]);

  async function handleDeletePlan(planId: string) {
    try {
      await plansApi.remove(planId);
      loadData();
    } catch { /* ignore */ }
  }

  if (loading) return <div className="therapist-loading">Loading treatment plans...</div>;

  return (
    <div className="treatment-plans-view">
      <div className="section-header">
        <h3><Target size={18} /> Treatment Plans</h3>
        <button className="btn-primary btn-sm" onClick={() => setEditingPlan('new')}>
          <Plus size={14} /> New Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="appointments-empty">
          <Target size={36} />
          <p>No treatment plans yet. Create one to track goals and progress.</p>
        </div>
      ) : (
        <div className="treatment-plans-list">
          {plans.map(plan => {
            const isExpanded = expandedPlan === plan.id;
            const goals = plan.goals || [];
            const achievedGoals = goals.filter(g => g.status === 'achieved').length;
            const avgProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;
            const statusConf = STATUS_CONFIG[plan.status] || { color: 'var(--text-muted)', bg: 'transparent' };

            return (
              <div key={plan.id} className={`tp-card ${isExpanded ? 'tp-card-expanded' : ''}`}>
                <div className="tp-card-header" onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}>
                  <div className="tp-card-left">
                    <div className="tp-status-indicator" style={{ background: statusConf.color }} />
                    <div className="tp-card-info">
                      <div className="tp-card-title-row">
                        <h4>{plan.title}</h4>
                        <span className="tp-status-badge" style={{ color: statusConf.color, background: statusConf.bg }}>
                          {plan.status}
                        </span>
                      </div>
                      {plan.diagnosis && <span className="tp-diagnosis">{plan.diagnosis}</span>}
                      <div className="tp-card-stats">
                        <span><Target size={11} /> {goals.length} goals</span>
                        <span><CheckCircle size={11} /> {achievedGoals} achieved</span>
                        <span><TrendingUp size={11} /> {avgProgress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="tp-card-right">
                    <div className="tp-progress-ring">
                      <svg viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke={statusConf.color} strokeWidth="3"
                          strokeDasharray={`${avgProgress} ${100 - avgProgress}`}
                          strokeDashoffset="25" strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 0.5s ease' }} />
                      </svg>
                      <span className="tp-progress-text">{avgProgress}%</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="tp-progress-bar">
                  <div className="tp-progress-fill" style={{ width: `${avgProgress}%`, background: statusConf.color }} />
                </div>

                {isExpanded && (
                  <div className="tp-card-body">
                    {plan.notes && <p className="tp-notes">{plan.notes}</p>}
                    <div className="tp-dates">
                      <span><Calendar size={12} /> Started: {new Date(plan.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {plan.targetEndDate && (
                        <span>Target: {new Date(plan.targetEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      )}
                    </div>

                    <div className="tp-goals-section">
                      <h5>Goals ({goals.length})</h5>
                      {goals.length === 0 ? (
                        <p className="text-muted" style={{ fontSize: '0.75rem' }}>No goals added yet.</p>
                      ) : (
                        <div className="tp-goals-list">
                          {goals.map(goal => {
                            const goalConf = STATUS_CONFIG[goal.status] || { color: 'var(--text-muted)', bg: 'transparent' };
                            return (
                              <div key={goal.id} className="tp-goal-card" style={{ '--goal-color': goalConf.color } as React.CSSProperties}>
                                <div className="tp-goal-top">
                                  <div className="tp-goal-icon">
                                    {goal.status === 'achieved' ? <CheckCircle size={14} /> : <Target size={14} />}
                                  </div>
                                  <div className="tp-goal-info">
                                    <span className="tp-goal-title">{goal.title}</span>
                                    {goal.description && <span className="tp-goal-desc">{goal.description}</span>}
                                  </div>
                                  <span className="tp-goal-status" style={{ color: goalConf.color, background: goalConf.bg }}>
                                    {goal.status}
                                  </span>
                                </div>
                                <div className="tp-goal-progress">
                                  <div className="tp-goal-progress-bar">
                                    <div className="tp-goal-progress-fill" style={{ width: `${goal.progress}%` }} />
                                  </div>
                                  <span className="tp-goal-progress-label">{goal.progress}%</span>
                                </div>
                                {goal.interventions && goal.interventions.length > 0 && (
                                  <div className="tp-goal-interventions">
                                    {goal.interventions.map((inv, i) => <span key={i} className="tp-intervention-tag">{inv}</span>)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="tp-card-actions">
                      <button className="btn-secondary btn-sm" onClick={() => setEditingPlan(plan)}>
                        <Edit2 size={13} /> Edit Plan
                      </button>
                      <button className="btn-secondary btn-sm btn-danger-text" onClick={() => handleDeletePlan(plan.id)}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingPlan && (
        <TreatmentPlanEditor
          patientId={patientId}
          plan={editingPlan === 'new' ? null : editingPlan as unknown as Record<string, unknown>}
          onSave={() => { setEditingPlan(null); loadData(); }}
          onCancel={() => setEditingPlan(null)}
        />
      )}
    </div>
  );
}
