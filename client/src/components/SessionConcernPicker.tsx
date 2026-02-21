import { useState } from 'react';
import { ArrowRight, ArrowLeft, SkipForward, Heart } from 'lucide-react';
import { StorageService } from '../services/storage';

const CONCERN_OPTIONS = [
  'Stress & Overwhelm',
  'Anxiety & Worry',
  'Low Mood & Depression',
  'Relationship Difficulties',
  'Sleep Problems',
  'Self-Esteem',
  'Grief & Loss',
  'Work/Life Balance',
  'Loneliness',
  'Just Need to Talk',
];

interface SessionConcernPickerProps {
  name: string;
  onComplete: (concerns: string[]) => void;
  onSkip: () => void;
  onBack?: () => void;
}

export function SessionConcernPicker({ name, onComplete, onSkip, onBack }: SessionConcernPickerProps) {
  const [lastConcerns] = useState<string[]>(() => {
    const id = StorageService.getActiveProfileId();
    return id ? StorageService.getLastConcerns(id) : [];
  });

  const [selected, setSelected] = useState<string[]>([]);

  function toggle(concern: string) {
    setSelected(prev =>
      prev.includes(concern) ? prev.filter(c => c !== concern) : [...prev, concern]
    );
  }

  function handleSkip() {
    if (lastConcerns.length > 0) {
      onComplete(lastConcerns);
    } else {
      onSkip();
    }
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        {onBack && (
          <button className="step-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <div className="onboarding-step">
          <div className="step-icon"><Heart size={28} /></div>
          <h2>What's on your mind today?</h2>
          <p>
            {name && name !== 'there' ? `Welcome back, ${name}. ` : ''}
            Select all that apply.
          </p>
          <div className="concern-chips">
            {CONCERN_OPTIONS.map(concern => (
              <button
                key={concern}
                className={`concern-chip ${selected.includes(concern) ? 'selected' : ''}`}
                onClick={() => toggle(concern)}
              >
                {concern}
              </button>
            ))}
          </div>

          {lastConcerns.length > 0 && selected.length === 0 && (
            <p className="concern-skip-hint">
              Skipping will continue with your last session's topics:
              {' '}<strong>{lastConcerns.join(', ')}</strong>
            </p>
          )}
        </div>

        <div className="onboarding-nav">
          <button className="onboarding-skip" onClick={handleSkip}>
            <SkipForward size={14} />
            {lastConcerns.length > 0 ? 'Skip (use last)' : 'Skip'}
          </button>
          <button
            className="btn-primary onboarding-next"
            onClick={() => onComplete(selected)}
            disabled={selected.length === 0}
          >
            Continue <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
