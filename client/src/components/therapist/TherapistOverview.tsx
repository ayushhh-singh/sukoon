import { useState, useEffect } from 'react';
import { Users, MessageSquare, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import { doctors as doctorsApi, sessions as sessionsApi } from '../../services/api';

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

export function TherapistOverview() {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [allSessions, setAllSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [pats, sess] = await Promise.all([
          doctorsApi.getMyPatients(),
          sessionsApi.list(),
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
