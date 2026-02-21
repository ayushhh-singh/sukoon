import type { AssessmentResult, AssessmentConfig } from '../../types/assessments';

interface ProgressChartProps {
  results: AssessmentResult[];
  config: AssessmentConfig;
}

export function ProgressChart({ results, config }: ProgressChartProps) {
  if (results.length < 2) return null;

  const width = 320;
  const height = 160;
  const padding = { top: 20, right: 20, bottom: 30, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = results.map((r, i) => ({
    x: padding.left + (i / (results.length - 1)) * chartW,
    y: padding.top + chartH - (r.totalScore / config.maxScore) * chartH,
    score: r.totalScore,
    date: new Date(r.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    color: r.color,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Severity zones
  const zones = config.scoringRanges.map(range => ({
    y1: padding.top + chartH - (range.max / config.maxScore) * chartH,
    y2: padding.top + chartH - (range.min / config.maxScore) * chartH,
    color: range.color,
    label: range.severity,
  }));

  return (
    <div className="progress-chart">
      <h3 className="chart-title">{config.title} - Progress</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        {/* Severity zones */}
        {zones.map((zone, i) => (
          <rect
            key={i}
            x={padding.left}
            y={zone.y1}
            width={chartW}
            height={zone.y2 - zone.y1}
            fill={zone.color}
            opacity={0.08}
          />
        ))}

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padding.top + chartH * (1 - pct);
          return (
            <g key={pct}>
              <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="rgba(148,163,184,0.15)" strokeWidth={0.5} />
              <text x={padding.left - 5} y={y + 3} textAnchor="end" fill="rgba(148,163,184,0.5)" fontSize="8">
                {Math.round(pct * config.maxScore)}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--accent-light)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Points and labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={p.color} stroke="var(--bg-card)" strokeWidth={2} />
            <text x={p.x} y={height - 5} textAnchor="middle" fill="rgba(148,163,184,0.5)" fontSize="7">
              {p.date}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
