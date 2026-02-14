import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, RotateCcw } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface BodyRegion {
  name: string;
  instruction: string;
  duration: number;
}

const REGIONS: BodyRegion[] = [
  { name: 'Feet & Toes', instruction: 'Bring your attention to your feet. Notice any sensations — warmth, tingling, pressure against the ground.', duration: 30 },
  { name: 'Legs', instruction: 'Slowly move your awareness up through your calves and thighs. Notice any tension and gently let it go.', duration: 30 },
  { name: 'Stomach & Hips', instruction: 'Focus on your abdomen. Feel it rise and fall with each breath. Allow any tightness to soften.', duration: 30 },
  { name: 'Chest & Back', instruction: 'Notice your chest expanding with each breath. Feel your back against the chair or surface. Release any tension.', duration: 30 },
  { name: 'Arms & Hands', instruction: 'Bring awareness to your shoulders, arms, and fingertips. Let your arms feel heavy and relaxed.', duration: 30 },
  { name: 'Head & Face', instruction: 'Notice your jaw, eyes, and forehead. Soften any tension in your face. Let your expression be neutral and peaceful.', duration: 30 },
];

const TOTAL_DURATION = REGIONS.reduce((sum, r) => sum + r.duration, 0);

// Maps regionIndex (bottom-up) → SVG body part indices
const SCAN_BODY_MAP: Record<number, number[]> = {
  0: [10, 11],       // Feet & Toes → feet SVG parts
  1: [8, 9],         // Legs → leg SVG parts
  2: [7],            // Stomach & Hips → abdomen
  3: [6],            // Chest & Back → chest
  4: [2, 3, 4, 5],   // Arms & Hands → arms + hands
  5: [0, 1],         // Head & Face → head + neck
};

export function BodyScanMeditation({ onClose }: Props) {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [regionIndex, setRegionIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const currentRegion = REGIONS[regionIndex];

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (!started || done) return;
    clearTimer();

    setCountdown(currentRegion.duration);

    intervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Move to next region or finish
          if (regionIndex < REGIONS.length - 1) {
            setRegionIndex(i => i + 1);
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
  }, [started, done, regionIndex, currentRegion, clearTimer]);

  function handleStart() {
    setStarted(true);
    setDone(false);
    setRegionIndex(0);
    setTotalElapsed(0);
  }

  function handleRestart() {
    setDone(false);
    setRegionIndex(0);
    setTotalElapsed(0);
    setStarted(true);
  }

  // Helper: get CSS class for a body SVG part
  function getScanPartClass(svgPartIndex: number): string {
    for (const [ri, parts] of Object.entries(SCAN_BODY_MAP)) {
      const rIdx = Number(ri);
      if (parts.includes(svgPartIndex)) {
        if (rIdx === regionIndex) return 'scan-active';
        if (rIdx < regionIndex) return 'scan-done';
      }
    }
    return '';
  }

  const overallProgress = TOTAL_DURATION > 0 ? (totalElapsed / TOTAL_DURATION) * 100 : 0;
  const regionProgress = currentRegion && currentRegion.duration > 0
    ? ((currentRegion.duration - countdown) / currentRegion.duration) * 100
    : 0;

  return (
    <div className="exercise-overlay">
      <div className="exercise-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>

        <h2>Body Scan Meditation</h2>

        {!started && !done && (
          <div className="exercise-intro">
            <p>A guided body scan to help you tune into physical sensations and release tension from head to toe.</p>
            <p className="exercise-duration">~3 minutes ({REGIONS.length} regions × {REGIONS[0].duration}s)</p>
            <button className="btn-primary" onClick={handleStart}><Play size={16} /> Begin</button>
          </div>
        )}

        {started && !done && (
          <div className="body-scan-active">
            {/* Overall progress bar */}
            <div className="body-scan-progress">
              <div className="body-scan-progress-fill" style={{ width: `${overallProgress}%` }} />
            </div>

            {/* Body SVG visualization */}
            <div className="body-scan-body-outline">
              <svg viewBox="0 0 100 170" className="body-scan-body-svg">
                {/* 0: Head */}
                <ellipse cx="50" cy="18" rx="13" ry="15" className={`body-scan-part ${getScanPartClass(0)}`} />
                {/* 1: Neck */}
                <rect x="35" y="33" width="30" height="10" rx="4" className={`body-scan-part ${getScanPartClass(1)}`} />
                {/* 2: Left arm */}
                <rect x="12" y="43" width="16" height="38" rx="7" className={`body-scan-part ${getScanPartClass(2)}`} />
                {/* 3: Right arm */}
                <rect x="72" y="43" width="16" height="38" rx="7" className={`body-scan-part ${getScanPartClass(3)}`} />
                {/* 4: Left hand */}
                <ellipse cx="20" cy="87" rx="7" ry="8" className={`body-scan-part ${getScanPartClass(4)}`} />
                {/* 5: Right hand */}
                <ellipse cx="80" cy="87" rx="7" ry="8" className={`body-scan-part ${getScanPartClass(5)}`} />
                {/* 6: Chest */}
                <rect x="32" y="43" width="36" height="28" rx="5" className={`body-scan-part ${getScanPartClass(6)}`} />
                {/* 7: Abdomen */}
                <rect x="35" y="71" width="30" height="18" rx="4" className={`body-scan-part ${getScanPartClass(7)}`} />
                {/* 8: Left leg */}
                <rect x="35" y="91" width="12" height="48" rx="5" className={`body-scan-part ${getScanPartClass(8)}`} />
                {/* 9: Right leg */}
                <rect x="53" y="91" width="12" height="48" rx="5" className={`body-scan-part ${getScanPartClass(9)}`} />
                {/* 10: Left foot */}
                <ellipse cx="39" cy="145" rx="9" ry="6" className={`body-scan-part ${getScanPartClass(10)}`} />
                {/* 11: Right foot */}
                <ellipse cx="61" cy="145" rx="9" ry="6" className={`body-scan-part ${getScanPartClass(11)}`} />
              </svg>
            </div>

            {/* Region indicators */}
            <div className="body-scan-regions">
              {REGIONS.map((region, i) => (
                <span
                  key={i}
                  className={`body-region ${i < regionIndex ? 'completed' : i === regionIndex ? 'active' : ''}`}
                >
                  {region.name}
                </span>
              ))}
            </div>

            {/* Current region */}
            <div className="body-scan-current">
              <h3>{currentRegion.name}</h3>
              <p className="body-scan-instruction">{currentRegion.instruction}</p>

              {/* Region countdown */}
              <div className="body-scan-countdown">
                <div className="body-scan-region-progress">
                  <div className="body-scan-region-fill" style={{ width: `${regionProgress}%` }} />
                </div>
                <span className="body-scan-time">{countdown}s</span>
              </div>
            </div>

            <p className="body-scan-overall">
              Region {regionIndex + 1} of {REGIONS.length}
            </p>
          </div>
        )}

        {done && (
          <div className="exercise-done">
            <h3>Body Scan Complete</h3>
            <p>Take a moment to notice your whole body as one connected, relaxed unit. Carry this awareness with you.</p>
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
