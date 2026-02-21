import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface ValueCard {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

const VALUES: ValueCard[] = [
  { id: 'family', name: 'Family', description: 'Close relationships with loved ones', emoji: '👨‍👩‍👧' },
  { id: 'career', name: 'Career', description: 'Professional growth and achievement', emoji: '💼' },
  { id: 'health', name: 'Health', description: 'Physical and mental well-being', emoji: '🏃' },
  { id: 'creativity', name: 'Creativity', description: 'Self-expression and imagination', emoji: '🎨' },
  { id: 'adventure', name: 'Adventure', description: 'New experiences and exploration', emoji: '🌍' },
  { id: 'security', name: 'Security', description: 'Stability and safety', emoji: '🛡️' },
  { id: 'learning', name: 'Learning', description: 'Knowledge and personal growth', emoji: '📚' },
  { id: 'friendship', name: 'Friendship', description: 'Deep, meaningful connections', emoji: '🤝' },
  { id: 'freedom', name: 'Freedom', description: 'Independence and autonomy', emoji: '🕊️' },
  { id: 'kindness', name: 'Kindness', description: 'Compassion and helping others', emoji: '💛' },
  { id: 'honesty', name: 'Honesty', description: 'Truth and integrity', emoji: '⚖️' },
  { id: 'spirituality', name: 'Spirituality', description: 'Connection to something greater', emoji: '🙏' },
  { id: 'humor', name: 'Humor', description: 'Joy, laughter, and fun', emoji: '😄' },
  { id: 'nature', name: 'Nature', description: 'Connection with the natural world', emoji: '🌿' },
  { id: 'community', name: 'Community', description: 'Belonging and social contribution', emoji: '🏘️' },
  { id: 'achievement', name: 'Achievement', description: 'Setting and reaching goals', emoji: '🏆' },
  { id: 'love', name: 'Love', description: 'Romantic partnership and intimacy', emoji: '❤️' },
  { id: 'justice', name: 'Justice', description: 'Fairness and equality', emoji: '⚔️' },
  { id: 'peace', name: 'Peace', description: 'Inner calm and harmony', emoji: '☮️' },
  { id: 'resilience', name: 'Resilience', description: 'Strength through adversity', emoji: '💪' },
];

type Importance = 'very' | 'somewhat' | 'less';

export function ValuesCardSort({ onClose }: Props) {
  const [step, setStep] = useState<'sort' | 'narrow' | 'reflect' | 'done'>('sort');
  const [sorted, setSorted] = useState<Record<string, Importance>>({});
  const [topFive, setTopFive] = useState<string[]>([]);
  const [reflection, setReflection] = useState('');

  const veryImportant = VALUES.filter(v => sorted[v.id] === 'very');
  const unsorted = VALUES.filter(v => !sorted[v.id]);
  const allSorted = unsorted.length === 0;

  function handleSort(id: string, importance: Importance) {
    setSorted(prev => ({ ...prev, [id]: importance }));
  }

  function handleProceedToNarrow() {
    if (veryImportant.length <= 5) {
      setTopFive(veryImportant.map(v => v.id));
      setStep('reflect');
    } else {
      setStep('narrow');
    }
  }

  function handleToggleTop(id: string) {
    setTopFive(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  }

  function handleSave() {
    const entry = {
      id: `vs-${Date.now()}`,
      timestamp: new Date().toISOString(),
      topValues: topFive.map(id => VALUES.find(v => v.id === id)!.name),
      reflection: reflection.trim() || undefined,
    };
    try {
      const existing = JSON.parse(localStorage.getItem('sukoon_values_sort') || '[]');
      existing.unshift(entry);
      if (existing.length > 20) existing.length = 20;
      localStorage.setItem('sukoon_values_sort', JSON.stringify(existing));
    } catch { /* */ }
    setStep('done');
  }

  function handleRestart() {
    setSorted({});
    setTopFive([]);
    setReflection('');
    setStep('sort');
  }

  return (
    <div className="exercise-overlay">
      <div className="exercise-container values-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>
        <h2>Values Card Sort</h2>

        {step === 'sort' && (
          <div className="values-sort-phase">
            <p className="exercise-subtitle">
              For each value, decide how important it is to you.
              {unsorted.length > 0 && ` (${unsorted.length} remaining)`}
            </p>

            {unsorted.length > 0 && (
              <div className="values-current-card">
                <div className="values-card-display">
                  <span className="values-card-emoji">{unsorted[0].emoji}</span>
                  <h3>{unsorted[0].name}</h3>
                  <p>{unsorted[0].description}</p>
                </div>
                <div className="values-sort-buttons">
                  <button className="values-btn very" onClick={() => handleSort(unsorted[0].id, 'very')}>
                    Very Important
                  </button>
                  <button className="values-btn somewhat" onClick={() => handleSort(unsorted[0].id, 'somewhat')}>
                    Somewhat
                  </button>
                  <button className="values-btn less" onClick={() => handleSort(unsorted[0].id, 'less')}>
                    Less Important
                  </button>
                </div>
              </div>
            )}

            {allSorted && (
              <div className="values-sorted-summary">
                <p>You marked <strong>{veryImportant.length}</strong> values as very important.</p>
                <button className="btn-primary" onClick={handleProceedToNarrow}>
                  {veryImportant.length > 5 ? 'Narrow to Top 5' : 'Continue'}
                </button>
              </div>
            )}

            <div className="values-progress">
              <div className="values-progress-bar">
                <div
                  className="values-progress-fill"
                  style={{ width: `${((VALUES.length - unsorted.length) / VALUES.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 'narrow' && (
          <div className="values-narrow-phase">
            <p className="exercise-subtitle">
              You selected {veryImportant.length} values as very important.
              Choose your <strong>top 5</strong> ({topFive.length}/5 selected).
            </p>
            <div className="values-narrow-grid">
              {veryImportant.map(v => (
                <button
                  key={v.id}
                  className={`values-narrow-card ${topFive.includes(v.id) ? 'selected' : ''}`}
                  onClick={() => handleToggleTop(v.id)}
                  disabled={!topFive.includes(v.id) && topFive.length >= 5}
                >
                  <span>{v.emoji}</span>
                  <span>{v.name}</span>
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setStep('reflect')} disabled={topFive.length < 3}>
              Continue
            </button>
          </div>
        )}

        {step === 'reflect' && (
          <div className="values-reflect-phase">
            <h3>Your Core Values</h3>
            <div className="values-top-display">
              {topFive.map(id => {
                const v = VALUES.find(x => x.id === id)!;
                return (
                  <div key={id} className="values-top-chip">
                    <span>{v.emoji}</span> {v.name}
                  </div>
                );
              })}
            </div>
            <p className="exercise-subtitle">How are you living these values today?</p>
            <textarea
              className="values-reflect-input"
              placeholder="Reflect on how your daily life aligns with these values..."
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <button className="btn-primary" onClick={handleSave}>Save & Complete</button>
          </div>
        )}

        {step === 'done' && (
          <div className="exercise-done">
            <h3>Values Identified</h3>
            <p>Understanding your core values helps guide decisions and find purpose in daily life.</p>
            <div className="exercise-done-actions">
              <button className="btn-secondary" onClick={handleRestart}><RotateCcw size={16} /> Try Again</button>
              <button className="btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
