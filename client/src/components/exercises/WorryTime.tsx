import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Plus, Trash2, CheckCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface Worry {
  id: string;
  text: string;
  category: 'actionable' | 'let-go' | null;
  nextStep: string;
}

export function WorryTime({ onClose }: Props) {
  const [step, setStep] = useState<'setup' | 'write' | 'categorize' | 'summary'>('setup');
  const [duration, setDuration] = useState(15);
  const [timeLeft, setTimeLeft] = useState(0);
  const [worries, setWorries] = useState<Worry[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [categorizeIndex, setCategorizeIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (step !== 'write') return;
    clearTimer();
    setTimeLeft(duration * 60);
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          if (worries.length > 0) setStep('categorize');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, duration, clearTimer]);

  function handleAddWorry() {
    const trimmed = currentInput.trim();
    if (!trimmed) return;
    setWorries(prev => [...prev, { id: `w-${Date.now()}`, text: trimmed, category: null, nextStep: '' }]);
    setCurrentInput('');
  }

  function handleRemoveWorry(id: string) {
    setWorries(prev => prev.filter(w => w.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleAddWorry(); }
  }

  function handleCategorize(category: 'actionable' | 'let-go') {
    setWorries(prev => prev.map((w, i) => i === categorizeIndex ? { ...w, category } : w));
    if (category === 'actionable') return; // Stay to enter next step
    if (categorizeIndex < worries.length - 1) {
      setCategorizeIndex(i => i + 1);
    } else {
      setStep('summary');
    }
  }

  function handleNextStepChange(text: string) {
    setWorries(prev => prev.map((w, i) => i === categorizeIndex ? { ...w, nextStep: text } : w));
  }

  function handleNextAfterStep() {
    if (categorizeIndex < worries.length - 1) {
      setCategorizeIndex(i => i + 1);
    } else {
      setStep('summary');
    }
  }

  function handleFinishWriting() {
    clearTimer();
    if (worries.length > 0) {
      setStep('categorize');
    } else {
      setStep('summary');
    }
  }

  function handleSave() {
    const entry = {
      id: `wt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      worries: worries.map(w => ({ text: w.text, category: w.category, nextStep: w.nextStep })),
    };
    try {
      const existing = JSON.parse(localStorage.getItem('sukoon_worry_time') || '[]');
      existing.unshift(entry);
      if (existing.length > 30) existing.length = 30;
      localStorage.setItem('sukoon_worry_time', JSON.stringify(existing));
    } catch { /* */ }
    onClose();
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const actionable = worries.filter(w => w.category === 'actionable');
  const letGo = worries.filter(w => w.category === 'let-go');
  const currentWorry = worries[categorizeIndex];

  return (
    <div className="exercise-overlay">
      <div className="exercise-container worry-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>
        <h2>Worry Time</h2>

        {step === 'setup' && (
          <div className="exercise-intro">
            <p>
              Scheduled worry time prevents worries from consuming your whole day.
              Set a timer, write out your worries, then categorize them.
            </p>
            <div className="worry-duration-select">
              <span>Duration:</span>
              {[5, 10, 15, 20].map(m => (
                <button
                  key={m}
                  className={`worry-duration-btn ${duration === m ? 'selected' : ''}`}
                  onClick={() => setDuration(m)}
                >
                  {m} min
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setStep('write')}>
              <Play size={16} /> Start
            </button>
          </div>
        )}

        {step === 'write' && (
          <div className="worry-write">
            <div className="worry-timer">
              <span className="worry-timer-text">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
              <span className="worry-timer-label">remaining</span>
            </div>

            <p className="exercise-subtitle">Write out everything that's worrying you.</p>

            <div className="worry-input-row">
              <input
                type="text"
                className="worry-input"
                placeholder="What's on your mind?"
                value={currentInput}
                onChange={e => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={200}
              />
              <button className="worry-add-btn" onClick={handleAddWorry} disabled={!currentInput.trim()}>
                <Plus size={16} />
              </button>
            </div>

            <div className="worry-list">
              {worries.map(w => (
                <div key={w.id} className="worry-item">
                  <span>{w.text}</span>
                  <button className="worry-remove-btn" onClick={() => handleRemoveWorry(w.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button className="btn-secondary worry-finish-btn" onClick={handleFinishWriting}>
              Done Writing ({worries.length} {worries.length === 1 ? 'worry' : 'worries'})
            </button>
          </div>
        )}

        {step === 'categorize' && currentWorry && (
          <div className="worry-categorize">
            <p className="exercise-subtitle">
              Worry {categorizeIndex + 1} of {worries.length}
            </p>
            <div className="worry-categorize-card">
              <p className="worry-categorize-text">"{currentWorry.text}"</p>

              {!currentWorry.category && (
                <div className="worry-category-buttons">
                  <button className="worry-cat-btn actionable" onClick={() => handleCategorize('actionable')}>
                    <CheckCircle size={16} /> I Can Act On This
                  </button>
                  <button className="worry-cat-btn let-go" onClick={() => handleCategorize('let-go')}>
                    Let This Go
                  </button>
                </div>
              )}

              {currentWorry.category === 'actionable' && (
                <div className="worry-next-step">
                  <p>What's one small step you can take?</p>
                  <input
                    type="text"
                    className="worry-input"
                    placeholder="e.g., Send that email tomorrow morning"
                    value={currentWorry.nextStep}
                    onChange={e => handleNextStepChange(e.target.value)}
                    maxLength={200}
                  />
                  <button className="btn-primary" onClick={handleNextAfterStep}>
                    {categorizeIndex < worries.length - 1 ? 'Next Worry' : 'View Summary'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'summary' && (
          <div className="worry-summary">
            <h3>Worry Summary</h3>

            {actionable.length > 0 && (
              <div className="worry-summary-section">
                <h4>Actionable ({actionable.length})</h4>
                {actionable.map(w => (
                  <div key={w.id} className="worry-summary-item actionable">
                    <span>{w.text}</span>
                    {w.nextStep && <span className="worry-next-step-text">Next step: {w.nextStep}</span>}
                  </div>
                ))}
              </div>
            )}

            {letGo.length > 0 && (
              <div className="worry-summary-section">
                <h4>Letting Go ({letGo.length})</h4>
                {letGo.map(w => (
                  <div key={w.id} className="worry-summary-item let-go">
                    <span>{w.text}</span>
                  </div>
                ))}
              </div>
            )}

            {worries.length === 0 && (
              <p>No worries recorded. That's great!</p>
            )}

            <div className="exercise-done-actions">
              <button className="btn-primary" onClick={handleSave}>Save & Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
