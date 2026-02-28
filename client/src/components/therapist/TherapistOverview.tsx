import { useState, useEffect } from 'react';
import { Users, MessageSquare, TrendingUp, Activity, AlertTriangle, Pill } from 'lucide-react';
import { doctors as doctorsApi, sessions as sessionsApi, medications as medsApi } from '../../services/api';

interface PatientData {
  id: string;
  displayName: string;
  primaryConcerns: string[];
}

interface SessionData {
  id: string;
  userId: string;
  date: string;
  duration: number;
  mode: string;
  riskLevel: string | null;
  preMoodValue: number | null;
  postMoodValue: number | null;
  conversationAssessment: string | null;
  patientName?: string;
}

interface AdherenceRow {
  patientId: string;
  activeMedCount: number;
  weekTaken: number;
  weekTotal: number;
  weekAdherence: number | null;
}

export function TherapistOverview() {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [allSessions, setAllSessions] = useState<SessionData[]>([]);
  const [adherenceRows, setAdherenceRows] = useState<AdherenceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [pats, sess, adherence] = await Promise.all([
          doctorsApi.getMyPatients(),
          sessionsApi.list(),
          Promise.resolve([]),
        ]);
        const patientList = pats.map(p => ({
          id: p.id as string,
          displayName: p.displayName as string,
          primaryConcerns: (p.primaryConcerns as string[]) || [],
        }));
        setPatients(patientList);

        const patientMap = new Map(patientList.map(p => [p.id, p.displayName]));
        setAllSessions(sess.map(s => ({
          id: s.id as string,
          userId: s.userId as string,
          date: s.date as string,
          duration: (s.duration as number) || 0,
          mode: (s.mode as string) || 'voice',
          riskLevel: (s.riskLevel as string) || null,
          preMoodValue: s.preMoodValue != null ? (s.preMoodValue as number) : null,
          postMoodValue: s.postMoodValue != null ? (s.postMoodValue as number) : null,
          conversationAssessment: (s.conversationAssessment as string) || null,
          patientName: patientMap.get(s.userId as string) || 'Unknown',
        })));

        setAdherenceRows((adherence as unknown as AdherenceRow[]).filter(r => r.activeMedCount > 0));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="therapist-page"><div className="therapist-loading">Loading dashboard...</div></div>;
  }

  // Stats
  const totalPatients = patients.length;
  const totalSessions = allSessions.length;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const sessionsThisWeek = allSessions.filter(s => new Date(s.date) >= weekAgo).length;

  const moodDeltas = allSessions
    .filter(s => s.preMoodValue != null && s.postMoodValue != null)
    .map(s => s.postMoodValue! - s.preMoodValue!);
  const avgMoodDelta = moodDeltas.length > 0
    ? moodDeltas.reduce((a, b) => a + b, 0) / moodDeltas.length
    : 0;
  const moodSign = avgMoodDelta >= 0 ? '+' : '';

  // Recent sessions (last 5)
  const recentSessions = [...allSessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Risk alerts
  const elevatedRiskSessions = allSessions.filter(s => s.riskLevel === 'elevated');
  const uniqueRiskPatients = [...new Set(elevatedRiskSessions.map(s => s.userId))];

  // Sort adherence rows: low adherence first, then no-data, then good
  const patientMap = new Map(patients.map(p => [p.id, p.displayName]));
  const sortedAdherence = [...adherenceRows].sort((a, b) => {
    const aVal = a.weekAdherence ?? 101;
    const bVal = b.weekAdherence ?? 101;
    return aVal - bVal;
  });

  function adherenceColor(pct: number | null): string {
    if (pct === null) return 'adherence-none';
    if (pct < 50) return 'adherence-red';
    if (pct < 75) return 'adherence-yellow';
    return 'adherence-green';
  }

  return (
    <div className="therapist-page">
      <h1 className="therapist-page-title">Dashboard</h1>

      {/* Stats */}
      <div className="therapist-stats-grid">
        <div className="therapist-stat-card">
          <Users size={20} />
          <span className="therapist-stat-value">{totalPatients}</span>
          <span className="therapist-stat-label">Patients</span>
        </div>
        <div className="therapist-stat-card">
          <MessageSquare size={20} />
          <span className="therapist-stat-value">{totalSessions}</span>
          <span className="therapist-stat-label">Total Sessions</span>
        </div>
        <div className="therapist-stat-card">
          <Activity size={20} />
          <span className="therapist-stat-value">{sessionsThisWeek}</span>
          <span className="therapist-stat-label">This Week</span>
        </div>
        <div className="therapist-stat-card">
          <TrendingUp size={20} />
          <span className="therapist-stat-value">{moodSign}{avgMoodDelta.toFixed(1)}</span>
          <span className="therapist-stat-label">Avg Mood Change</span>
        </div>
      </div>

      {/* Medication Adherence Overview */}
      {sortedAdherence.length > 0 && (
        <div className="therapist-section">
          <h2 className="therapist-section-title"><Pill size={16} /> Medication Adherence (7-day)</h2>
          <div className="therapist-adherence-table">
            <div className="therapist-adherence-header">
              <span>Patient</span>
              <span>Active Meds</span>
              <span>Doses This Week</span>
              <span>Adherence</span>
            </div>
            {sortedAdherence.map(row => {
              const name = patientMap.get(row.patientId) || 'Unknown';
              const colorClass = adherenceColor(row.weekAdherence);
              return (
                <div key={row.patientId} className={`therapist-adherence-row ${colorClass}`}>
                  <div className="adherence-patient">
                    <div className="adherence-avatar">{name.charAt(0).toUpperCase()}</div>
                    <span>{name}</span>
                  </div>
                  <span className="adherence-med-count">
                    <Pill size={12} /> {row.activeMedCount}
                  </span>
                  <span className="adherence-doses">
                    {row.weekTotal > 0 ? `${row.weekTaken}/${row.weekTotal}` : '—'}
                  </span>
                  <div className="adherence-pct-cell">
                    {row.weekAdherence !== null ? (
                      <>
                        <div className="adherence-mini-bar">
                          <div className="adherence-mini-fill" style={{ width: `${row.weekAdherence}%` }} />
                        </div>
                        <span className="adherence-pct-label">{row.weekAdherence}%</span>
                      </>
                    ) : (
                      <span className="adherence-no-data">No logs yet</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk Alerts */}
      {uniqueRiskPatients.length > 0 && (
        <div className="therapist-section">
          <h2 className="therapist-section-title"><AlertTriangle size={16} /> Risk Alerts</h2>
          <div className="therapist-risk-alerts">
            {uniqueRiskPatients.map(pid => {
              const patient = patients.find(p => p.id === pid);
              const latestRisk = elevatedRiskSessions
                .filter(s => s.userId === pid)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
              return (
                <div key={pid} className="therapist-risk-card">
                  <span className="risk-badge elevated">Elevated</span>
                  <span className="therapist-risk-name">{patient?.displayName || 'Unknown'}</span>
                  <span className="therapist-risk-date">
                    {new Date(latestRisk.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="therapist-section">
        <h2 className="therapist-section-title">Recent Sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="therapist-empty">No sessions yet.</p>
        ) : (
          <div className="therapist-recent-list">
            {recentSessions.map(s => (
              <div key={s.id} className="therapist-recent-item">
                <div className="therapist-recent-avatar">
                  {(s.patientName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="therapist-recent-info">
                  <span className="therapist-recent-name">{s.patientName}</span>
                  <span className="therapist-recent-meta">
                    {new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {' · '}{Math.round(s.duration / 60)} min
                    {' · '}{s.mode}
                  </span>
                </div>
                {s.riskLevel && (
                  <span className={`risk-badge sm ${s.riskLevel}`}>{s.riskLevel}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
