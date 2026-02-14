import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Wind } from 'lucide-react';

type Technique = 'box' | '478';

interface BreathingExerciseProps {
  technique?: Technique;
  onClose: () => void;
}

const TECHNIQUES: Record<Technique, { name: string; phases: { label: string; duration: number }[]; cycles: number }> = {
  box: {
    name: 'Box Breathing',
    phases: [
      { label: 'Breathe In', duration: 4 },
      { label: 'Hold', duration: 4 },
      { label: 'Breathe Out', duration: 4 },
      { label: 'Hold', duration: 4 },
    ],
    cycles: 4,
  },
  '478': {
    name: '4-7-8 Breathing',
    phases: [
      { label: 'Breathe In', duration: 4 },
      { label: 'Hold', duration: 7 },
      { label: 'Breathe Out', duration: 8 },
    ],
    cycles: 3,
  },
};

export function BreathingExercise({ technique = 'box', onClose }: BreathingExerciseProps) {
  const config = TECHNIQUES[technique];
  const [started, setStarted] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const phase = config.phases[currentPhase];
  const isInhale = phase?.label === 'Breathe In';
  const isExhale = phase?.label === 'Breathe Out';

  const tick = useCallback(() => {
    setCountdown(prev => {
      if (prev <= 1) {
        // Move to next phase
        setCurrentPhase(p => {
          const nextPhase = p + 1;
          if (nextPhase >= config.phases.length) {
            // End of cycle
            setCurrentCycle(c => {
              const nextCycle = c + 1;
              if (nextCycle >= config.cycles) {
                setDone(true);
                return c;
              }
              return nextCycle;
            });
            return 0;
          }
          return nextPhase;
        });
        return 0; // Will be set properly by the effect below
      }
      return prev - 1;
    });
  }, [config.phases.length, config.cycles]);

  // Set countdown when phase changes
  useEffect(() => {
    if (started && !done) {
      setCountdown(config.phases[currentPhase].duration);
    }
  }, [currentPhase, currentCycle, started, done, config.phases]);

  // Timer
  useEffect(() => {
    if (started && !done) {
      intervalRef.current = window.setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [started, done, tick]);

  // Circle scale based on phase
  const scale = isInhale ? 1.3 : isExhale ? 0.7 : (isInhale ? 1.3 : 1.0);

  return (
    <div className="exercise-overlay">
      <div className="exercise-container">
        <button className="exercise-close" onClick={onClose}>
          <X size={20} />
        </button>

        <Wind size={24} className="exercise-icon" />
        <h2>{config.name}</h2>

        {!started && !done && (
          <>
            <p className="exercise-desc">
              Find a comfortable position. We'll guide you through {config.cycles} cycles.
            </p>
            <button className="btn-primary" onClick={() => setStarted(true)}>
              Begin
            </button>
          </>
        )}

        {started && !done && (
          <div className="breathing-visual">
            <div className="breathing-circle-wrapper">
              {/* Ripple rings */}
              <div className="breathing-ripple breathing-ripple-1" style={{ animationDuration: `${config.phases[currentPhase].duration}s` }} />
              <div className="breathing-ripple breathing-ripple-2" style={{ animationDuration: `${config.phases[currentPhase].duration * 1.2}s` }} />
              <div className="breathing-ripple breathing-ripple-3" style={{ animationDuration: `${config.phases[currentPhase].duration * 1.5}s` }} />

              <div
                className="breathing-circle"
                style={{
                  transform: `scale(${scale})`,
                  transition: `transform ${config.phases[currentPhase].duration}s ease-in-out`,
                }}
              >
                <span className="breathing-countdown">{countdown}</span>
              </div>
            </div>
            <p className="breathing-label">{phase.label}</p>
            <p className="breathing-cycle">Cycle {currentCycle + 1} of {config.cycles}</p>
          </div>
        )}

        {done && (
          <div className="exercise-complete">
            <p>Well done. Take a moment to notice how you feel now.</p>
            <button className="btn-primary" onClick={onClose}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
