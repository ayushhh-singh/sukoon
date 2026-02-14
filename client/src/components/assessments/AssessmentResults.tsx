import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { AssessmentConfig, AssessmentResult } from '../../types/assessments';

interface AssessmentResultsProps {
  result: AssessmentResult;
  config: AssessmentConfig;
  previousResult?: AssessmentResult | null;
  onContinue: () => void;
}

export function AssessmentResults({ result, config, previousResult, onContinue }: AssessmentResultsProps) {
  const scorePercent = (result.totalScore / config.maxScore) * 100;
  const delta = previousResult ? result.totalScore - previousResult.totalScore : null;

  return (
    <div className="assessment-screen">
      <div className="assessment-card results">
        <h2>Your Results</h2>
        <p className="assessment-desc">{config.title}</p>

        {/* Score display */}
        <div className="score-display">
          <div className="score-number" style={{ color: result.color }}>
            {result.totalScore}
          </div>
          <div className="score-max">/ {config.maxScore}</div>
        </div>

        <div className="severity-label" style={{ color: result.color }}>
          {result.severity}
        </div>

        {/* Score bar */}
        <div className="score-bar-container">
          <div className="score-bar-track">
            {config.scoringRanges.map(range => {
              const width = ((range.max - range.min + 1) / (config.maxScore + 1)) * 100;
              return (
                <div
                  key={range.severity}
                  className="score-bar-segment"
                  style={{ width: `${width}%`, backgroundColor: range.color }}
                  title={range.severity}
                />
              );
            })}
          </div>
          <div
            className="score-bar-indicator"
            style={{ left: `${scorePercent}%` }}
          />
        </div>

        {/* Score legend */}
        <div className="score-legend">
          {config.scoringRanges.map(range => (
            <div key={range.severity} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: range.color }} />
              <span>{range.severity} ({range.min}-{range.max})</span>
            </div>
          ))}
        </div>

        {/* Trend */}
        {delta !== null && (
          <div className={`score-trend ${delta < 0 ? 'improved' : delta > 0 ? 'worsened' : 'same'}`}>
            {delta < 0 && `Score decreased by ${Math.abs(delta)} since last time`}
            {delta > 0 && `Score increased by ${delta} since last time`}
            {delta === 0 && 'Score unchanged since last time'}
          </div>
        )}

        {/* Disclaimer */}
        <div className="assessment-disclaimer">
          <AlertTriangle size={14} />
          <span>
            This is a screening tool, not a clinical diagnosis. Results should be
            discussed with a licensed mental health professional.
          </span>
        </div>

        <button className="btn-primary" onClick={onContinue}>
          Continue <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
