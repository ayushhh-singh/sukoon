import type { SessionPhase } from '../types';

const FLOW_STEPS: { phase: SessionPhase; label: string }[] = [
  { phase: 'concern-select', label: 'Concerns' },
  { phase: 'doctor-context', label: 'Doctor' },
  { phase: 'pre-mood', label: 'Mood' },
  { phase: 'pre-assessment', label: 'Assessment' },
  { phase: 'mode-select', label: 'Mode' },
  { phase: 'ready', label: 'Ready' },
];

interface FlowProgressProps {
  currentPhase: SessionPhase;
}

export function FlowProgress({ currentPhase }: FlowProgressProps) {
  const stepIndex = FLOW_STEPS.findIndex(s => s.phase === currentPhase);
  if (stepIndex < 0) return null;

  return (
    <div className="flow-progress">
      {FLOW_STEPS.map((step, i) => (
        <div key={step.phase} className="flow-progress-step">
          <div className={`flow-dot ${i < stepIndex ? 'completed' : ''} ${i === stepIndex ? 'current' : ''}`} />
          {i < FLOW_STEPS.length - 1 && (
            <div className={`flow-line ${i < stepIndex ? 'completed' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}
