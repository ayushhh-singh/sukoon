import { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface EmotionCategory {
  name: string;
  emoji: string;
  color: string;
  subEmotions: string[];
}

const EMOTIONS: EmotionCategory[] = [
  { name: 'Happy', emoji: '😊', color: '#4dd9c0', subEmotions: ['Joyful', 'Content', 'Grateful', 'Proud', 'Hopeful', 'Amused'] },
  { name: 'Sad', emoji: '😢', color: '#6b9fff', subEmotions: ['Lonely', 'Disappointed', 'Grieving', 'Helpless', 'Nostalgic', 'Empty'] },
  { name: 'Angry', emoji: '😠', color: '#ff6b6b', subEmotions: ['Frustrated', 'Resentful', 'Irritated', 'Betrayed', 'Hostile', 'Impatient'] },
  { name: 'Fearful', emoji: '😰', color: '#ffb347', subEmotions: ['Anxious', 'Insecure', 'Overwhelmed', 'Panicked', 'Vulnerable', 'Worried'] },
  { name: 'Disgusted', emoji: '😤', color: '#c9a0dc', subEmotions: ['Repulsed', 'Contemptuous', 'Revolted', 'Judgmental', 'Uncomfortable', 'Disapproving'] },
  { name: 'Surprised', emoji: '😲', color: '#ffd93d', subEmotions: ['Amazed', 'Confused', 'Startled', 'Shocked', 'Astonished', 'Perplexed'] },
];

export function EmotionWheel({ onClose }: Props) {
  const [step, setStep] = useState<'primary' | 'sub' | 'reflect' | 'done'>('primary');
  const [selectedPrimary, setSelectedPrimary] = useState<EmotionCategory | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [trigger, setTrigger] = useState('');

  function handleSelectPrimary(emotion: EmotionCategory) {
    setSelectedPrimary(emotion);
    setStep('sub');
  }

  function handleSelectSub(sub: string) {
    setSelectedSub(sub);
    setStep('reflect');
  }

  function handleSave() {
    const entry = {
      id: `ew-${Date.now()}`,
      primaryEmotion: selectedPrimary!.name,
      specificEmotion: selectedSub!,
      trigger: trigger.trim() || undefined,
      timestamp: new Date().toISOString(),
    };
    const key = 'sukoon_emotion_wheel';
    try {
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(entry);
      if (existing.length > 50) existing.length = 50;
      localStorage.setItem(key, JSON.stringify(existing));
    } catch { /* */ }
    setStep('done');
  }

  function handleBack() {
    if (step === 'sub') { setStep('primary'); setSelectedPrimary(null); }
    else if (step === 'reflect') { setStep('sub'); setSelectedSub(null); }
  }

  return (
    <div className="exercise-overlay">
      <div className="exercise-container emotion-wheel-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>
        <h2>Emotion Wheel</h2>

        {step === 'primary' && (
          <div className="emotion-wheel-content">
            <p className="exercise-subtitle">What are you feeling right now? Choose the closest match.</p>
            <div className="emotion-primary-grid">
              {EMOTIONS.map(e => (
                <button
                  key={e.name}
                  className="emotion-primary-card"
                  style={{ borderColor: e.color, background: `${e.color}10` }}
                  onClick={() => handleSelectPrimary(e)}
                >
                  <span className="emotion-primary-emoji">{e.emoji}</span>
                  <span className="emotion-primary-name">{e.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'sub' && selectedPrimary && (
          <div className="emotion-wheel-content">
            <button className="emotion-back-btn" onClick={handleBack}>
              <ArrowLeft size={16} /> Back
            </button>
            <p className="exercise-subtitle">
              You're feeling <strong style={{ color: selectedPrimary.color }}>{selectedPrimary.emoji} {selectedPrimary.name}</strong>.
              Can you be more specific?
            </p>
            <div className="emotion-sub-grid">
              {selectedPrimary.subEmotions.map(sub => (
                <button
                  key={sub}
                  className="emotion-sub-chip"
                  style={{ borderColor: selectedPrimary.color }}
                  onClick={() => handleSelectSub(sub)}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'reflect' && selectedPrimary && selectedSub && (
          <div className="emotion-wheel-content">
            <button className="emotion-back-btn" onClick={handleBack}>
              <ArrowLeft size={16} /> Back
            </button>
            <div className="emotion-reflect-header">
              <span className="emotion-reflect-emoji">{selectedPrimary.emoji}</span>
              <span className="emotion-reflect-label" style={{ color: selectedPrimary.color }}>
                {selectedPrimary.name} — {selectedSub}
              </span>
            </div>
            <p className="exercise-subtitle">What triggered this feeling?</p>
            <textarea
              className="emotion-reflect-input"
              placeholder="Describe what happened or what you were thinking..."
              value={trigger}
              onChange={e => setTrigger(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <button className="btn-primary" onClick={handleSave}>Save & Complete</button>
          </div>
        )}

        {step === 'done' && (
          <div className="exercise-done">
            <h3>Emotion Identified</h3>
            <p>
              You identified feeling <strong>{selectedSub}</strong> ({selectedPrimary?.name}).
              Naming emotions precisely — called <em>affect labeling</em> — helps your brain
              regulate them more effectively.
            </p>
            <div className="exercise-done-actions">
              <button className="btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
