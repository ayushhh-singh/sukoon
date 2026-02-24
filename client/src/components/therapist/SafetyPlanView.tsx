import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, AlertTriangle, Heart, Users, Phone, Home, Sparkles } from 'lucide-react';
import { safetyPlans as safetyApi } from '../../services/api';
import { SafetyPlanEditor } from './SafetyPlanEditor';

interface Props {
  patientId: string;
}

interface SafetyPlan {
  id: string;
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

const PLAN_SECTIONS = [
  { key: 'warningSigns', label: 'Warning Signs', stepNum: 1, icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', desc: 'Recognize these early indicators' },
  { key: 'copingStrategies', label: 'Coping Strategies', stepNum: 2, icon: Heart, color: '#f472b6', bg: 'rgba(244, 114, 182, 0.08)', desc: 'Internal strategies to manage distress' },
  { key: 'supportContacts', label: 'Support Contacts', stepNum: 3, icon: Users, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.08)', desc: 'People who can help distract or support' },
  { key: 'professionalContacts', label: 'Professional Contacts', stepNum: 4, icon: Phone, color: '#34d399', bg: 'rgba(52, 211, 153, 0.08)', desc: 'Professionals and crisis services' },
  { key: 'reasonsForLiving', label: 'Reasons for Living', stepNum: 6, icon: Sparkles, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.08)', desc: 'Important reasons to persevere' },
];

export function SafetyPlanView({ patientId }: Props) {
  const [plan, setPlan] = useState<SafetyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const data = await safetyApi.get(patientId);
      setPlan(data as unknown as SafetyPlan | null);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [patientId]);

  if (loading) return <div className="therapist-loading">Loading safety plan...</div>;

  return (
    <div className="safety-plan-view">
      <div className="section-header">
        <h3><Shield size={18} /> Safety Plan</h3>
        <button className="btn-primary btn-sm" onClick={() => setEditing(true)}>
          {plan ? <><Edit2 size={14} /> Edit</> : <><Plus size={14} /> Create</>}
        </button>
      </div>

      {!plan ? (
        <div className="appointments-empty">
          <Shield size={36} />
          <p>No safety plan created yet. Create one to track crisis strategies.</p>
        </div>
      ) : (
        <div className="safety-plan-sections">
          {PLAN_SECTIONS.map(section => {
            const items = (plan as unknown as Record<string, string[]>)[section.key] || [];
            if (items.length === 0) return null;
            const Icon = section.icon;
            return (
              <div key={section.key} className="safety-step-card" style={{ '--step-color': section.color, '--step-bg': section.bg } as React.CSSProperties}>
                <div className="safety-step-number">{section.stepNum}</div>
                <div className="safety-step-content">
                  <div className="safety-step-header">
                    <Icon size={15} />
                    <h4>{section.label}</h4>
                  </div>
                  <p className="safety-step-desc">{section.desc}</p>
                  <div className="safety-step-items">
                    {items.map((s, i) => (
                      <span key={i} className="safety-step-tag">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {plan.environmentSafety && (
            <div className="safety-step-card" style={{ '--step-color': '#a78bfa', '--step-bg': 'rgba(167, 139, 250, 0.08)' } as React.CSSProperties}>
              <div className="safety-step-number">5</div>
              <div className="safety-step-content">
                <div className="safety-step-header">
                  <Home size={15} />
                  <h4>Environment Safety</h4>
                </div>
                <p className="safety-step-desc">Steps to make environment safer</p>
                <p className="safety-step-text">{plan.environmentSafety}</p>
              </div>
            </div>
          )}

          <div className="safety-plan-footer">
            Last updated: {new Date(plan.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )}

      {editing && (
        <SafetyPlanEditor
          patientId={patientId}
          plan={plan as unknown as Record<string, unknown>}
          onSave={() => { setEditing(false); loadData(); }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}
