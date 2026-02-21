import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { MOOD_OPTIONS } from '../../types/mood';
import type { MoodEntry } from '../../types/mood';

interface MoodPickerProps {
  context: 'pre-session' | 'post-session';
  title?: string;
  onSelect: (mood: MoodEntry) => void;
  onBack?: () => void;
}

export function MoodPicker({ context, title, onSelect, onBack }: MoodPickerProps) {
  const [selected, setSelected] = useState<number | null>(null);

  function handleConfirm() {
    if (selected === null) return;
    const option = MOOD_OPTIONS.find(o => o.value === selected)!;
    const mood: MoodEntry = {
      id: `mood-${Date.now()}`,
      timestamp: new Date().toISOString(),
      value: selected,
      label: option.label,
      emoji: option.emoji,
      context,
    };
    onSelect(mood);
  }

  return (
    <div className="mood-screen">
      <div className="mood-card">
        {onBack && (
          <button className="step-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <h2>{title || (context === 'pre-session' ? 'How are you feeling right now?' : 'How are you feeling after your session?')}</h2>
        <p className="mood-subtitle">Select the option that best matches your current mood</p>

        <div className="mood-options">
          {MOOD_OPTIONS.map(option => (
            <button
              key={option.value}
              className={`mood-option ${selected === option.value ? 'selected' : ''}`}
              onClick={() => setSelected(option.value)}
              style={{
                borderColor: selected === option.value ? option.color : undefined,
                boxShadow: selected === option.value ? `0 0 20px ${option.color}30` : undefined,
              }}
            >
              <span className="mood-emoji">{option.emoji}</span>
              <span className="mood-label">{option.label}</span>
            </button>
          ))}
        </div>

        <button className="btn-primary" onClick={handleConfirm} disabled={selected === null}>
          Continue
        </button>
      </div>
    </div>
  );
}
