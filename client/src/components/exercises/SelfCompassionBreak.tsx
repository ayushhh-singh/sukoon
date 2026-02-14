import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, RotateCcw } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface Step {
  name: string;
  title: string;
  instruction: string;
  prompt: string;
  duration: number;
  color: string;
}

const STEPS: Step[] = [
  {
    name: 'Mindfulness',
    title: 'Acknowledge the Difficulty',
    instruction: 'Place your hand on your heart. Take a deep breath and say to yourself:',
    prompt: '"This is a moment of suffering. This is hard right now."',
    duration: 20,
    color: '#9b6dff',
  },
  {
    name: 'Common Humanity',
    title: 'You Are Not Alone',
    instruction: 'Remind yourself that struggle is part of being human. Say to yourself:',
    prompt: '"Suffering is a part of life. I am not alone in this. Others feel this way too."',
    duration: 20,
    color: '#4dd9c0',
  },
  {
    name: 'Self-Kindness',
    title: 'Be Kind to Yourself',
    instruction: 'Gently press your hand to your heart. Speak to yourself as you would a dear friend:',
    prompt: '"May I be kind to myself. May I give myself the compassion I need."',
    duration: 25,
    color: '#ff6b8a',
  },
];

const TOTAL_DURATION = STEPS.reduce((sum, s) => sum + s.duration, 0);

export function SelfCompassionBreak({ onClose }: Props) {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [kindPhrase, setKindPhrase] = useState('');
  const intervalRef = useRef<number | null>(null);

  const currentStep = STEPS[stepIndex];

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!started || done) return;
    clearTimer();
    setCountdown(currentStep.duration);

    intervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (stepIndex < STEPS.length - 1) {
            setStepIndex(i => i + 1);
          } else {
            setDone(true);
            clearTimer();
          }
          return 0;
        }
        return prev - 1;
      });
      setTotalElapsed(prev => prev + 1);
    }, 1000);

    return clearTimer;
  }, [started, done, stepIndex, currentStep, clearTimer]);

  function handleStart() {
    setStarted(true);
    setDone(false);
    setStepIndex(0);
    setTotalElapsed(0);
    setKindPhrase('');
  }

  function handleRestart() {
    setDone(false);
    setStepIndex(0);
    setTotalElapsed(0);
    setKindPhrase('');
    setStarted(true);
  }

  const overallProgress = TOTAL_DURATION > 0 ? (totalElapsed / TOTAL_DURATION) * 100 : 0;
  const stepProgress = currentStep.duration > 0
    ? ((currentStep.duration - countdown) / currentStep.duration) * 100
    : 0;

  return (
    <div className="exercise-overlay">
      <div className="exercise-container compassion-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>

        <h2>Self-Compassion Break</h2>

        {!started && !done && (
          <div className="exercise-intro">
            <p>
              Based on Dr. Kristin Neff's research, this 3-step practice helps you respond to
              difficult moments with kindness instead of self-criticism.
            </p>
            <p className="exercise-duration">~1 minute (3 steps)</p>
            <button className="btn-primary" onClick={handleStart}><Play size={16} /> Begin</button>
          </div>
        )}

        {started && !done && (
          <div className="compassion-active">
            {/* Overall progress */}
            <div className="compassion-progress">
              <div className="compassion-progress-fill" style={{ width: `${overallProgress}%` }} />
            </div>

            {/* Step indicators */}
            <div className="compassion-steps">
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`compassion-step-dot ${i < stepIndex ? 'completed' : i === stepIndex ? 'active' : ''}`}
                  style={{ borderColor: s.color, backgroundColor: i <= stepIndex ? s.color : undefined }}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Current step content */}
            <div className="compassion-content" key={stepIndex}>
              {/* Heart glow */}
              <div className="compassion-heart-glow" style={{ background: `radial-gradient(circle, ${currentStep.color}22 0%, transparent 70%)` }} />

              <span className="compassion-step-name" style={{ color: currentStep.color }}>
                Step {stepIndex + 1}: {currentStep.name}
              </span>
              <h3 className="compassion-title">{currentStep.title}</h3>
              <p className="compassion-instruction">{currentStep.instruction}</p>
              <p className="compassion-prompt" style={{ borderLeftColor: currentStep.color }}>
                {currentStep.prompt}
              </p>

              {/* Self-kindness step: text input */}
              {stepIndex === 2 && (
                <div className="compassion-kind-phrase">
                  <label>Write a kind phrase to yourself (optional):</label>
                  <input
                    type="text"
                    className="compassion-input"
                    value={kindPhrase}
                    onChange={e => setKindPhrase(e.target.value)}
                    placeholder="I am doing my best..."
                    maxLength={150}
                  />
                </div>
              )}

              {/* Step timer */}
              <div className="compassion-timer">
                <div className="compassion-step-progress">
                  <div
                    className="compassion-step-fill"
                    style={{ width: `${stepProgress}%`, backgroundColor: currentStep.color }}
                  />
                </div>
                <span className="compassion-countdown">{countdown}s</span>
              </div>
            </div>

            <p className="compassion-overall">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
          </div>
        )}

        {done && (
          <div className="exercise-done">
            <h3>Self-Compassion Break Complete</h3>
            <p>
              You showed up for yourself today. Remember — you deserve the same kindness you give to others.
              {kindPhrase && (
                <span className="compassion-saved-phrase">
                  <br />Your kind phrase: <em>"{kindPhrase}"</em>
                </span>
              )}
            </p>
            <div className="exercise-done-actions">
              <button className="btn-secondary" onClick={handleRestart}><RotateCcw size={16} /> Repeat</button>
              <button className="btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
