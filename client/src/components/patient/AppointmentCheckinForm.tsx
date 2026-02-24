import { useState } from 'react';
import { X, SmilePlus, ChevronRight, ChevronLeft, Check, Heart, MessageCircle, Activity, Pill } from 'lucide-react';
import { checkins as checkinsApi } from '../../services/api';

interface Props {
  appointmentId: string;
  onSave: () => void;
  onCancel: () => void;
}

const MOOD_OPTIONS = [
  { value: 1, label: 'Very Low', emoji: '😢', color: '#ef4444' },
  { value: 2, label: 'Low', emoji: '😔', color: '#f97316' },
  { value: 3, label: 'Okay', emoji: '😐', color: '#eab308' },
  { value: 4, label: 'Good', emoji: '🙂', color: '#22c55e' },
  { value: 5, label: 'Great', emoji: '😊', color: '#10b981' },
];

const STEPS = [
  { key: 'mood', label: 'How are you feeling?', icon: Heart },
  { key: 'concerns', label: 'Today\'s concerns', icon: MessageCircle },
  { key: 'symptoms', label: 'Changes & symptoms', icon: Activity },
  { key: 'medication', label: 'Medication check', icon: Pill },
];

export function AppointmentCheckinForm({ appointmentId, onSave, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [moodValue, setMoodValue] = useState<number | null>(null);
  const [concerns, setConcerns] = useState('');
  const [goalsForSession, setGoalsForSession] = useState('');
  const [symptomsSinceLast, setSymptomsSinceLast] = useState('');
  const [medicationIssues, setMedicationIssues] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canProceed = step === 0 ? moodValue !== null : true;
  const isLastStep = step === STEPS.length - 1;

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const moodLabel = MOOD_OPTIONS.find(m => m.value === moodValue)?.label || '';
      const concernsList = concerns.split(',').map(c => c.trim()).filter(Boolean);
      await checkinsApi.create({
        appointmentId,
        moodValue,
        moodLabel,
        concerns: concernsList,
        goalsForSession: goalsForSession.trim() || undefined,
        symptomsSinceLast: symptomsSinceLast.trim() || undefined,
        medicationIssues: medicationIssues.trim() || undefined,
      });
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit check-in');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (isLastStep) handleSubmit();
    else setStep(s => s + 1);
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div className="therapist-modal-overlay" onClick={onCancel}>
      <div className="therapist-modal checkin-modal" onClick={e => e.stopPropagation()}>
        <div className="checkin-header">
          <div className="checkin-header-left">
            <SmilePlus size={20} />
            <span>Pre-Session Check-In</span>
          </div>
          <button className="therapist-modal-close" onClick={onCancel}><X size={18} /></button>
        </div>

        {/* Progress dots */}
        <div className="checkin-progress">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`checkin-progress-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="checkin-progress-dot">
                {i < step ? <Check size={10} /> : <span>{i + 1}</span>}
              </div>
              <span className="checkin-progress-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="checkin-body">
          {error && <div className="therapist-error">{error}</div>}

          <div className="checkin-step-header">
            <StepIcon size={16} />
            <span>{STEPS[step].label}</span>
          </div>

          {/* Step 0: Mood */}
          {step === 0 && (
            <div className="checkin-mood-section">
              <div className="checkin-mood-row">
                {MOOD_OPTIONS.map(m => (
                  <button
                    key={m.value}
                    className={`checkin-mood-btn ${moodValue === m.value ? 'active' : ''}`}
                    onClick={() => setMoodValue(m.value)}
                    type="button"
                    style={{ '--mood-color': m.color } as React.CSSProperties}
                  >
                    <span className="checkin-mood-emoji">{m.emoji}</span>
                    <span className="checkin-mood-label">{m.label}</span>
                  </button>
                ))}
              </div>
              {moodValue !== null && (
                <div className="checkin-mood-feedback" style={{ color: MOOD_OPTIONS[moodValue - 1].color }}>
                  Feeling {MOOD_OPTIONS[moodValue - 1].label.toLowerCase()} today
                </div>
              )}
            </div>
          )}

          {/* Step 1: Concerns & Goals */}
          {step === 1 && (
            <div className="checkin-fields">
              <div className="checkin-field">
                <label>What would you like to focus on?</label>
                <input
                  type="text"
                  className="checkin-input"
                  placeholder="e.g. anxiety, sleep issues, work stress"
                  value={concerns}
                  onChange={e => setConcerns(e.target.value)}
                  maxLength={300}
                />
                <span className="checkin-hint">Separate multiple concerns with commas</span>
              </div>
              <div className="checkin-field">
                <label>Goals for this session</label>
                <textarea
                  className="checkin-input checkin-textarea"
                  placeholder="What do you hope to get from today's session?"
                  value={goalsForSession}
                  onChange={e => setGoalsForSession(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
          )}

          {/* Step 2: Symptoms */}
          {step === 2 && (
            <div className="checkin-fields">
              <div className="checkin-field">
                <label>Any changes since your last session?</label>
                <textarea
                  className="checkin-input checkin-textarea"
                  placeholder="New symptoms, changes in mood, sleep, appetite, energy levels..."
                  value={symptomsSinceLast}
                  onChange={e => setSymptomsSinceLast(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
              </div>
            </div>
          )}

          {/* Step 3: Medication */}
          {step === 3 && (
            <div className="checkin-fields">
              <div className="checkin-field">
                <label>Any medication concerns?</label>
                <textarea
                  className="checkin-input checkin-textarea"
                  placeholder="Side effects, missed doses, changes, questions about medication..."
                  value={medicationIssues}
                  onChange={e => setMedicationIssues(e.target.value)}
                  rows={3}
                  maxLength={300}
                />
                <span className="checkin-hint">Leave empty if no concerns</span>
              </div>
            </div>
          )}
        </div>

        <div className="checkin-footer">
          {step > 0 ? (
            <button className="checkin-back-btn" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          )}
          <button
            className="checkin-next-btn"
            onClick={handleNext}
            disabled={!canProceed || submitting}
          >
            {submitting ? 'Submitting...' : isLastStep ? (
              <><Check size={16} /> Submit Check-In</>
            ) : (
              <>Next <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
