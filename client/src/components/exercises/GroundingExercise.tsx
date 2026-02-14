import { useState } from 'react';
import { X, Eye, Hand, Ear, Wind, Coffee, ArrowRight, Check } from 'lucide-react';

interface GroundingExerciseProps {
  onClose: () => void;
}

const STEPS = [
  { count: 5, sense: 'SEE', icon: Eye, prompt: 'Name 5 things you can see around you', color: '#6366f1' },
  { count: 4, sense: 'TOUCH', icon: Hand, prompt: 'Name 4 things you can physically feel', color: '#8b5cf6' },
  { count: 3, sense: 'HEAR', icon: Ear, prompt: 'Name 3 things you can hear right now', color: '#2dd4bf' },
  { count: 2, sense: 'SMELL', icon: Wind, prompt: 'Name 2 things you can smell', color: '#f59e0b' },
  { count: 1, sense: 'TASTE', icon: Coffee, prompt: 'Name 1 thing you can taste', color: '#f43f5e' },
];

export function GroundingExercise({ onClose }: GroundingExerciseProps) {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [counts, setCounts] = useState<number[]>(STEPS.map(() => 0));
  const [done, setDone] = useState(false);

  const step = STEPS[stepIndex];
  const currentCount = counts[stepIndex];
  const isStepComplete = currentCount >= step.count;

  function increment() {
    if (currentCount < step.count) {
      const updated = [...counts];
      updated[stepIndex] = currentCount + 1;
      setCounts(updated);
    }
  }

  function nextStep() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(s => s + 1);
    } else {
      setDone(true);
    }
  }

  return (
    <div className="exercise-overlay">
      <div className="exercise-container">
        <button className="exercise-close" onClick={onClose}>
          <X size={20} />
        </button>

        <h2>5-4-3-2-1 Grounding</h2>

        {!started && !done && (
          <>
            <p className="exercise-desc">
              This exercise helps you reconnect with the present moment using your five senses.
            </p>
            <button className="btn-primary" onClick={() => setStarted(true)}>
              Begin
            </button>
          </>
        )}

        {started && !done && (
          <div
            className={`grounding-step ${isStepComplete ? 'grounding-step-complete' : ''}`}
            style={{ position: 'relative' }}
          >
            {/* Sense-specific ambient animation */}
            <div className="grounding-ambient">
              {step.sense === 'SEE' && (
                <>
                  <div className="ambient-shimmer" style={{ top: '10%', left: '15%', animationDelay: '0s' }} />
                  <div className="ambient-shimmer" style={{ top: '60%', right: '10%', animationDelay: '1s' }} />
                  <div className="ambient-shimmer" style={{ bottom: '15%', left: '40%', animationDelay: '2s' }} />
                </>
              )}
              {step.sense === 'TOUCH' && (
                <>
                  <div className="ambient-ripple" style={{ animationDelay: '0s' }} />
                  <div className="ambient-ripple" style={{ animationDelay: '1.5s' }} />
                </>
              )}
              {step.sense === 'HEAR' && (
                <div className="ambient-waves">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
              {step.sense === 'SMELL' && (
                <>
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className="ambient-particle"
                      style={{ animationDelay: `${i * 0.4}s`, left: `${20 + i * 12}%` }}
                    />
                  ))}
                </>
              )}
              {step.sense === 'TASTE' && (
                <>
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className={`ambient-sparkle ambient-sparkle-${i + 1}`} style={{ animationDelay: `${i * 0.3}s` }} />
                  ))}
                </>
              )}
            </div>

            <div className="grounding-number" style={{ color: step.color }}>
              {step.count}
            </div>
            <div className="grounding-sense">
              <step.icon size={24} style={{ color: step.color }} />
              <span>{step.sense}</span>
            </div>
            <p className="grounding-prompt">{step.prompt}</p>

            {/* Counter buttons */}
            <div className="grounding-counter">
              {Array.from({ length: step.count }, (_, i) => (
                <button
                  key={i}
                  className={`counter-dot ${i < currentCount ? 'filled' : ''}`}
                  onClick={increment}
                  style={{ borderColor: step.color, backgroundColor: i < currentCount ? step.color : undefined }}
                  disabled={i < currentCount}
                >
                  {i < currentCount && <Check size={14} />}
                </button>
              ))}
            </div>

            <p className="grounding-count-label">
              Tap each circle as you notice something ({currentCount}/{step.count})
            </p>

            {isStepComplete && (
              <button className="btn-primary grounding-next" onClick={nextStep}>
                {stepIndex < STEPS.length - 1 ? <>Next Sense <ArrowRight size={16} /></> : 'Complete'}
              </button>
            )}

            {/* Step progress */}
            <div className="grounding-progress">
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`gp-dot ${i === stepIndex ? 'current' : ''} ${i < stepIndex ? 'done' : ''}`}
                  style={{ backgroundColor: i <= stepIndex ? s.color : undefined }}
                />
              ))}
            </div>
          </div>
        )}

        {done && (
          <div className="exercise-complete">
            <p>
              Well done. Notice how you feel more present and grounded. Take a moment to
              appreciate your senses.
            </p>
            <button className="btn-primary" onClick={onClose}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
