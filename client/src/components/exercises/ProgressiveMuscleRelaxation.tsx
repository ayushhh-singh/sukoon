import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, RotateCcw } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface MuscleGroup {
  name: string;
  instruction: string;
  tenseDuration: number;
  relaxDuration: number;
}

// Ordered top-to-bottom to match the SVG body outline
const MUSCLE_GROUPS: MuscleGroup[] = [
  { name: 'Face & Jaw', instruction: 'Scrunch your face tightly — squeeze your eyes, clench your jaw.', tenseDuration: 5, relaxDuration: 10 },
  { name: 'Shoulders', instruction: 'Raise your shoulders up toward your ears. Feel the tension building.', tenseDuration: 5, relaxDuration: 10 },
  { name: 'Arms & Biceps', instruction: 'Bend your elbows and flex your biceps. Hold the tension in your upper arms.', tenseDuration: 5, relaxDuration: 10 },
  { name: 'Hands & Fists', instruction: 'Clench both fists tightly. Feel the tension in your fingers and forearms.', tenseDuration: 5, relaxDuration: 10 },
  { name: 'Chest & Back', instruction: 'Take a deep breath and tighten your chest muscles. Squeeze your shoulder blades together.', tenseDuration: 5, relaxDuration: 10 },
  { name: 'Stomach', instruction: 'Tighten your abdominal muscles as if bracing for impact.', tenseDuration: 5, relaxDuration: 10 },
  { name: 'Legs & Feet', instruction: 'Press your legs together, point your toes, and tighten your thighs and calves.', tenseDuration: 5, relaxDuration: 10 },
];

// Maps groupIndex → which SVG body parts to highlight
// SVG is drawn top-to-bottom: head, neck, chest, abdomen, arms, hands, legs, feet
const BODY_MAP: Record<number, number[]> = {
  0: [0],          // Face & Jaw → head
  1: [1],          // Shoulders → neck/shoulders
  2: [2, 3],       // Arms → left arm, right arm
  3: [4, 5],       // Hands → left hand, right hand
  4: [6],          // Chest & Back → chest
  5: [7],          // Stomach → abdomen
  6: [8, 9, 10, 11], // Legs & Feet → legs + feet
};

type PMRPhase = 'idle' | 'tense' | 'relax' | 'transition';

export function ProgressiveMuscleRelaxation({ onClose }: Props) {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const [phase, setPhase] = useState<PMRPhase>('idle');
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const currentGroup = MUSCLE_GROUPS[groupIndex];

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTense = useCallback(() => {
    setPhase('tense');
    setCountdown(currentGroup.tenseDuration);
  }, [currentGroup]);

  const startRelax = useCallback(() => {
    setPhase('relax');
    setCountdown(currentGroup.relaxDuration);
  }, [currentGroup]);

  const advanceGroup = useCallback(() => {
    if (groupIndex < MUSCLE_GROUPS.length - 1) {
      // Brief transition pause between groups
      setPhase('transition');
      setCountdown(2);
    } else {
      setDone(true);
      setPhase('idle');
    }
  }, [groupIndex]);

  const startNextGroup = useCallback(() => {
    setGroupIndex(prev => prev + 1);
    setPhase('idle');
    setCountdown(0);
  }, []);

  // Countdown timer
  useEffect(() => {
    clearTimer();

    if (phase === 'idle' || countdown <= 0) return;

    intervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearTimer();
          if (phase === 'tense') {
            startRelax();
          } else if (phase === 'relax') {
            advanceGroup();
          } else if (phase === 'transition') {
            startNextGroup();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [phase, countdown, clearTimer, startRelax, advanceGroup, startNextGroup]);

  // Auto-start tense phase when group changes and we're in idle after starting
  useEffect(() => {
    if (started && !done && phase === 'idle' && countdown === 0) {
      startTense();
    }
  }, [started, done, phase, countdown, groupIndex, startTense]);

  function handleStart() {
    setStarted(true);
    setGroupIndex(0);
    setDone(false);
    startTense();
  }

  function handleRestart() {
    setGroupIndex(0);
    setDone(false);
    setPhase('idle');
    setCountdown(0);
    startTense();
  }

  // Helper: get CSS class for a body part based on its SVG index
  function getPartClass(svgPartIndex: number): string {
    for (const [gi, parts] of Object.entries(BODY_MAP)) {
      const gIdx = Number(gi);
      if (parts.includes(svgPartIndex)) {
        if (gIdx === groupIndex) return 'active-region';
        if (gIdx < groupIndex) return 'done-region';
      }
    }
    return '';
  }

  // Circle progress for countdown visual
  const maxTime = phase === 'tense' ? currentGroup.tenseDuration
    : phase === 'relax' ? currentGroup.relaxDuration
    : 2;
  const progress = maxTime > 0 ? countdown / maxTime : 0;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="exercise-overlay">
      <div className="exercise-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>

        <h2>Progressive Muscle Relaxation</h2>

        {!started && !done && (
          <div className="exercise-intro">
            <p>This exercise guides you through tensing and relaxing 7 major muscle groups to release physical tension.</p>
            <p className="exercise-duration">~3 minutes</p>
            <button className="btn-primary" onClick={handleStart}><Play size={16} /> Begin</button>
          </div>
        )}

        {started && !done && (
          <div className="pmr-active">
            {/* Progress dots */}
            <div className="pmr-progress-dots">
              {MUSCLE_GROUPS.map((_, i) => (
                <span
                  key={i}
                  className={`pmr-dot ${i < groupIndex ? 'completed' : i === groupIndex ? 'active' : ''}`}
                />
              ))}
            </div>

            {/* Body outline */}
            <div className="pmr-body-outline">
              <svg viewBox="0 0 100 170" className="pmr-body-svg">
                {/* 0: Head */}
                <ellipse cx="50" cy="18" rx="13" ry="15" className={`pmr-body-part ${getPartClass(0)}`} />
                {/* 1: Neck + Shoulders */}
                <rect x="35" y="33" width="30" height="10" rx="4" className={`pmr-body-part ${getPartClass(1)}`} />
                {/* 2: Left arm */}
                <rect x="12" y="43" width="16" height="38" rx="7" className={`pmr-body-part ${getPartClass(2)}`} />
                {/* 3: Right arm */}
                <rect x="72" y="43" width="16" height="38" rx="7" className={`pmr-body-part ${getPartClass(3)}`} />
                {/* 4: Left hand */}
                <ellipse cx="20" cy="87" rx="7" ry="8" className={`pmr-body-part ${getPartClass(4)}`} />
                {/* 5: Right hand */}
                <ellipse cx="80" cy="87" rx="7" ry="8" className={`pmr-body-part ${getPartClass(5)}`} />
                {/* 6: Chest */}
                <rect x="32" y="43" width="36" height="28" rx="5" className={`pmr-body-part ${getPartClass(6)}`} />
                {/* 7: Abdomen */}
                <rect x="35" y="71" width="30" height="18" rx="4" className={`pmr-body-part ${getPartClass(7)}`} />
                {/* 8: Left leg */}
                <rect x="35" y="91" width="12" height="48" rx="5" className={`pmr-body-part ${getPartClass(8)}`} />
                {/* 9: Right leg */}
                <rect x="53" y="91" width="12" height="48" rx="5" className={`pmr-body-part ${getPartClass(9)}`} />
                {/* 10: Left foot */}
                <ellipse cx="39" cy="145" rx="9" ry="6" className={`pmr-body-part ${getPartClass(10)}`} />
                {/* 11: Right foot */}
                <ellipse cx="61" cy="145" rx="9" ry="6" className={`pmr-body-part ${getPartClass(11)}`} />
              </svg>
            </div>

            {/* Transition message */}
            {phase === 'transition' ? (
              <div className="pmr-transition">
                <p className="pmr-transition-text">Take a deep breath...</p>
                <p className="pmr-transition-next">Next: {MUSCLE_GROUPS[groupIndex + 1]?.name}</p>
              </div>
            ) : (
              <>
                <p className="pmr-group-label">{currentGroup.name}</p>
                <p className="pmr-instruction">{currentGroup.instruction}</p>
              </>
            )}

            {/* Countdown circle */}
            <div className="pmr-visual">
              <svg className="pmr-circle" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--surface)" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke={phase === 'tense' ? 'var(--rose)' : phase === 'transition' ? 'var(--amber)' : 'var(--green)'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />
              </svg>
              <div className="pmr-circle-inner">
                <span className="pmr-countdown">{countdown}</span>
                <span className={`pmr-phase-label ${phase}`}>
                  {phase === 'tense' ? 'TENSE' : phase === 'transition' ? 'BREATHE' : 'RELAX'}
                </span>
              </div>
            </div>

            <p className="pmr-step-count">
              {groupIndex + 1} of {MUSCLE_GROUPS.length}
            </p>
          </div>
        )}

        {done && (
          <div className="exercise-done">
            <h3>Great job!</h3>
            <p>You've completed the full body progressive muscle relaxation. Notice how your body feels now compared to when you started.</p>
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
