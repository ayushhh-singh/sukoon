import { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { doctors as doctorsApi, sessions as sessionsApi } from '../../services/api';
import { TherapistPatientDetail } from './TherapistPatientDetail';

interface PatientSummary {
  id: string;
  displayName: string;
  email: string;
  primaryConcerns: string[];
  knownDisorders: string[];
  currentMedications: string[];
  age: number | null;
  profession: string | null;
  sessionCount: number;
  lastSessionDate: string | null;
  avgMoodChange: number | null;
  latestRiskLevel: string | null;
}

export function TherapistPatients() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [pats, sess] = await Promise.all([
          doctorsApi.getMyPatients(),
          sessionsApi.list(),
        ]);

        const summaries: PatientSummary[] = pats.map(p => {
          const pid = p.id as string;
          const patientSessions = sess.filter(s => (s.userId as string) === pid);
          const lastSession = patientSessions.sort(
            (a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
          )[0];

          const moodDeltas = patientSessions
            .filter(s => s.preMoodValue != null && s.postMoodValue != null)
            .map(s => (s.postMoodValue as number) - (s.preMoodValue as number));
          const avgMoodChange = moodDeltas.length > 0
            ? moodDeltas.reduce((a, b) => a + b, 0) / moodDeltas.length
            : null;

          return {
            id: pid,
            displayName: p.displayName as string,
            email: p.email as string,
            primaryConcerns: (p.primaryConcerns as string[]) || [],
            knownDisorders: (p.knownDisorders as string[]) || [],
            currentMedications: (p.currentMedications as string[]) || [],
            age: (p.age as number | null) || null,
            profession: (p.profession as string | null) || null,
            sessionCount: patientSessions.length,
            lastSessionDate: lastSession ? (lastSession.date as string) : null,
            avgMoodChange,
            latestRiskLevel: lastSession ? (lastSession.riskLevel as string) || null : null,
          };
        });

        setPatients(summaries);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (selectedPatientId) {
    const patient = patients.find(p => p.id === selectedPatientId);
    return (
      <TherapistPatientDetail
        patientId={selectedPatientId}
        patientName={patient?.displayName || 'Patient'}
        patientInfo={patient}
        onBack={() => setSelectedPatientId(null)}
      />
    );
  }

  const filtered = patients.filter(p =>
    p.displayName.toLowerCase().includes(search.toLowerCase()) ||
    p.primaryConcerns.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <div className="therapist-page"><div className="therapist-loading">Loading patients...</div></div>;
  }

  return (
    <div className="therapist-page">
      <h1 className="therapist-page-title">Patients</h1>

      <div className="therapist-search-bar">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="therapist-empty">
          {patients.length === 0
            ? 'No patients linked yet. Patients can find and link to you from their settings.'
            : 'No patients match your search.'}
        </div>
      ) : (
        <div className="therapist-patient-list">
          <div className="therapist-patient-header">
            <span>Patient</span>
            <span>Sessions</span>
            <span>Mood Trend</span>
            <span>Risk</span>
            <span></span>
          </div>
          {filtered.map(p => (
            <button
              key={p.id}
              className="therapist-patient-row"
              onClick={() => setSelectedPatientId(p.id)}
            >
              <div className="therapist-patient-name-cell">
                <div className="therapist-patient-avatar">{p.displayName.charAt(0).toUpperCase()}</div>
                <div>
                  <span className="therapist-patient-name">{p.displayName}</span>
                  <span className="therapist-patient-concerns">{p.primaryConcerns.slice(0, 2).join(', ')}</span>
                </div>
              </div>
              <span className="therapist-patient-sessions">{p.sessionCount}</span>
              <span className="therapist-patient-mood">
                {p.avgMoodChange === null ? (
                  <Minus size={14} />
                ) : p.avgMoodChange > 0 ? (
                  <span className="trend-up"><TrendingUp size={14} /> +{p.avgMoodChange.toFixed(1)}</span>
                ) : (
                  <span className="trend-down"><TrendingDown size={14} /> {p.avgMoodChange.toFixed(1)}</span>
                )}
              </span>
              <span className={`risk-badge ${p.latestRiskLevel || 'none'}`}>
                {p.latestRiskLevel || '—'}
              </span>
              <ChevronRight size={16} className="therapist-patient-chevron" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
