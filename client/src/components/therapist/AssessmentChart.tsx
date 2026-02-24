import { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { assessments as assessmentsApi } from '../../services/api';

interface Props {
  patientId: string;
}

interface TrendPoint {
  score: number;
  date: string;
  severity: string;
}

const TYPES = [
  { key: 'PHQ9', label: 'PHQ-9', fullLabel: 'Depression', color: '#a78bfa', maxScore: 27 },
  { key: 'GAD7', label: 'GAD-7', fullLabel: 'Anxiety', color: '#34d399', maxScore: 21 },
  { key: 'PSS', label: 'PSS', fullLabel: 'Stress', color: '#fbbf24', maxScore: 40 },
];

const SEVERITY_THRESHOLDS: Record<string, { label: string; value: number }[]> = {
  PHQ9: [
    { label: 'Minimal', value: 5 },
    { label: 'Mild', value: 10 },
    { label: 'Moderate', value: 15 },
    { label: 'Severe', value: 20 },
  ],
  GAD7: [
    { label: 'Minimal', value: 5 },
    { label: 'Mild', value: 10 },
    { label: 'Moderate', value: 15 },
  ],
  PSS: [
    { label: 'Low', value: 14 },
    { label: 'Moderate', value: 27 },
  ],
};

const SEVERITY_COLORS: Record<string, string> = {
  Minimal: '#22c55e', Mild: '#eab308', Moderate: '#f97316', Severe: '#ef4444',
  Low: '#22c55e', High: '#ef4444',
};

export function AssessmentChart({ patientId }: Props) {
  const [trends, setTrends] = useState<Record<string, TrendPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>('PHQ9');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await assessmentsApi.getPatientTrends(patientId);
        setTrends(data as Record<string, TrendPoint[]>);
        for (const type of ['PHQ9', 'GAD7', 'PSS']) {
          if ((data as Record<string, TrendPoint[]>)[type]?.length > 0) {
            setActiveType(type);
            break;
          }
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    load();
  }, [patientId]);

  if (loading) return <div className="therapist-loading">Loading assessments...</div>;

  const allEmpty = Object.values(trends).every(t => t.length === 0);
  if (allEmpty) {
    return (
      <div className="assessment-chart-view">
        <div className="section-header">
          <h3><BarChart3 size={18} /> Assessment Trends</h3>
        </div>
        <div className="appointments-empty">
          <BarChart3 size={36} />
          <p>No assessment data available yet.</p>
        </div>
      </div>
    );
  }

  const typeConf = TYPES.find(t => t.key === activeType)!;
  const points = trends[activeType] || [];
  const maxScore = typeConf.maxScore;
  const thresholds = SEVERITY_THRESHOLDS[activeType] || [];

  // Chart dimensions
  const W = 600, H = 220, PAD = 44, RPAD = 20, TPAD = 20, BPAD = 28;
  const chartW = W - PAD - RPAD;
  const chartH = H - TPAD - BPAD;

  function toX(i: number) { return PAD + (points.length <= 1 ? chartW / 2 : (i / (points.length - 1)) * chartW); }
  function toY(score: number) { return TPAD + chartH - (score / maxScore) * chartH; }

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.score)}`).join(' ');
  // Area fill path
  const areaD = pathD + ` L ${toX(points.length - 1)} ${TPAD + chartH} L ${toX(0)} ${TPAD + chartH} Z`;

  const latest = points[points.length - 1];
  const prev = points.length >= 2 ? points[points.length - 2] : null;
  const trend = prev ? latest.score - prev.score : 0;

  return (
    <div className="assessment-chart-view">
      <div className="section-header">
        <h3><BarChart3 size={18} /> Assessment Trends</h3>
      </div>

      {/* Type selector */}
      <div className="ac-type-tabs">
        {TYPES.map(type => {
          const count = (trends[type.key] || []).length;
          const isActive = activeType === type.key;
          return (
            <button
              key={type.key}
              className={`ac-type-tab ${isActive ? 'active' : ''}`}
              style={{ '--tab-color': type.color } as React.CSSProperties}
              onClick={() => setActiveType(type.key)}
              disabled={count === 0}
            >
              <span className="ac-tab-label">{type.label}</span>
              <span className="ac-tab-full">{type.fullLabel}</span>
              {count > 0 && <span className="ac-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {points.length === 0 ? (
        <p className="text-muted" style={{ padding: '1rem' }}>No {typeConf.label} data.</p>
      ) : (
        <div className="ac-chart-container">
          <svg viewBox={`0 0 ${W} ${H}`} className="ac-chart-svg">
            <defs>
              <linearGradient id={`area-gradient-${activeType}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={typeConf.color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={typeConf.color} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Threshold zones */}
            {thresholds.map((t, i) => (
              <g key={i}>
                <line x1={PAD} y1={toY(t.value)} x2={W - RPAD} y2={toY(t.value)} stroke="var(--border)" strokeDasharray="3 3" strokeOpacity="0.5" />
                <text x={PAD - 6} y={toY(t.value) + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)" fontFamily="inherit">{t.value}</text>
                <text x={W - RPAD + 4} y={toY(t.value) + 3} textAnchor="start" fontSize="8" fill="var(--text-muted)" fontFamily="inherit" opacity="0.6">{t.label}</text>
              </g>
            ))}

            {/* Area fill */}
            <path d={areaD} fill={`url(#area-gradient-${activeType})`} />

            {/* Line */}
            <path d={pathD} fill="none" stroke={typeConf.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

            {/* Points */}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={toX(i)} cy={toY(p.score)} r="5" fill={typeConf.color} stroke="var(--bg-card)" strokeWidth="2.5" />
                <text x={toX(i)} y={toY(p.score) - 12} textAnchor="middle" fontSize="10" fill="var(--text-primary)" fontWeight="600" fontFamily="inherit">{p.score}</text>
                <text x={toX(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="var(--text-muted)" fontFamily="inherit">
                  {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </text>
              </g>
            ))}
          </svg>

          {/* Latest score card */}
          <div className="ac-latest-card">
            <div className="ac-latest-left">
              <span className="ac-latest-label">Latest Score</span>
              <div className="ac-latest-score-row">
                <span className="ac-latest-score" style={{ color: typeConf.color }}>{latest.score}</span>
                <span className="ac-latest-of">/ {maxScore}</span>
              </div>
            </div>
            <div className="ac-latest-right">
              <span className="ac-latest-severity" style={{ color: SEVERITY_COLORS[latest.severity] || 'var(--text-muted)' }}>
                {latest.severity}
              </span>
              {trend !== 0 && (
                <span className={`ac-latest-trend ${trend > 0 ? 'up' : 'down'}`}>
                  {trend > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {trend > 0 ? '+' : ''}{trend} from last
                </span>
              )}
              {trend === 0 && prev && (
                <span className="ac-latest-trend neutral"><Minus size={13} /> No change</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
