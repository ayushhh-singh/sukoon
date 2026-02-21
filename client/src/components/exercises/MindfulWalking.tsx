import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, RotateCcw } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface WalkingPhase {
  name: string;
  instruction: string;
  duration: number;
  emoji: string;
}

const PHASES: WalkingPhase[] = [
  { name: 'Ground', instruction: 'Stand still. Feel your feet firmly on the ground. Notice the weight of your body.', duration: 30, emoji: '🧍' },
  { name: 'Walk Slowly', instruction: 'Begin walking very slowly. Notice each step — the lift, the movement, the placement.', duration: 60, emoji: '🚶' },
  { name: 'Sense', instruction: 'Feel the air on your skin. Notice the sounds around you. What do you see?', duration: 60, emoji: '🌬️' },
  { name: 'Breathe', instruction: 'Continue walking. Observe your breath — the inhale and exhale — as you move.', duration: 60, emoji: '🫁' },
  { name: 'Return', instruction: 'Gradually slow down. Come to a gentle stop. Stand still and take three deep breaths.', duration: 30, emoji: '🧘' },
];

const TOTAL_DURATION = PHASES.reduce((s, p) => s + p.duration, 0);

export function MindfulWalking({ onClose }: Props) {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const currentPhase = PHASES[phaseIndex];

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!started || done) return;
    clearTimer();
    setCountdown(currentPhase.duration);

    intervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (phaseIndex < PHASES.length - 1) {
            setPhaseIndex(i => i + 1);
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
  }, [started, done, phaseIndex, currentPhase, clearTimer]);

  function handleStart() {
    setStarted(true);
    setDone(false);
    setPhaseIndex(0);
    setTotalElapsed(0);
  }

  function handleRestart() {
    setDone(false);
    setPhaseIndex(0);
    setTotalElapsed(0);
    setStarted(true);
  }

  const overallProgress = TOTAL_DURATION > 0 ? (totalElapsed / TOTAL_DURATION) * 100 : 0;
  const phaseProgress = currentPhase.duration > 0
    ? ((currentPhase.duration - countdown) / currentPhase.duration) * 100
    : 0;

  // Elapsed time before current phase
  const elapsedBefore = PHASES.slice(0, phaseIndex).reduce((s, p) => s + p.duration, 0);

  return (
    <div className="exercise-overlay">
      <div className="exercise-container walking-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>
        <h2>Mindful Walking</h2>

        {!started && !done && (
          <div className="exercise-intro">
            <p>
              A guided walking meditation to ground yourself in the present moment.
              You can do this indoors or outdoors — just find a space where you can walk slowly.
            </p>
            <p className="exercise-duration">~4 minutes (5 phases)</p>
            <button className="btn-primary" onClick={handleStart}>
              <Play size={16} /> Begin
            </button>
          </div>
        )}

        {started && !done && (
          <div className="walking-active">
            {/* Overall progress */}
            <div className="walking-progress">
              <div className="walking-progress-fill" style={{ width: `${overallProgress}%` }} />
            </div>

            {/* Phase path visualization */}
            <div className="walking-path">
              {PHASES.map((p, i) => (
                <div
                  key={i}
                  className={`walking-path-step ${i < phaseIndex ? 'completed' : i === phaseIndex ? 'active' : ''}`}
                >
                  <span className="walking-path-emoji">{p.emoji}</span>
                  <span className="walking-path-name">{p.name}</span>
                </div>
              ))}
            </div>

            {/* Current phase */}
            <div className="walking-current" key={phaseIndex}>
              <span className="walking-phase-emoji">{currentPhase.emoji}</span>
              <h3 className="walking-phase-name">{currentPhase.name}</h3>
              <p className="walking-instruction">{currentPhase.instruction}</p>

              <div className="walking-timer">
                <div className="walking-phase-bar">
                  <div className="walking-phase-fill" style={{ width: `${phaseProgress}%` }} />
                </div>
                <span className="walking-countdown">{countdown}s</span>
              </div>
            </div>

            <p className="walking-overall">
              Phase {phaseIndex + 1} of {PHASES.length} — {Math.floor((TOTAL_DURATION - elapsedBefore - (currentPhase.duration - countdown)) / 60)}:{((TOTAL_DURATION - elapsedBefore - (currentPhase.duration - countdown)) % 60).toString().padStart(2, '0')} remaining
            </p>
          </div>
        )}

        {done && (
          <div className="exercise-done">
            <h3>Walking Meditation Complete</h3>
            <p>
              You took time to slow down and connect with your body and surroundings.
              Mindful walking can be practiced anytime — even for a few steps.
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
