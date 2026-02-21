import React, { useMemo } from 'react';
import { ArrowLeft, AlertTriangle, FileText } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { getPatientMoodTrend, getPatientAssessmentTrend } from '../../utils/therapistData';

interface PatientDetailProps {
  profileId: string;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ profileId, onBack }) => {
  const profile = useMemo(() => StorageService.getProfiles().find(p => p.id === profileId), [profileId]);
  const sessions = useMemo(() => StorageService.getSessionsForUser(profileId), [profileId]);
  const moods = useMemo(() => getPatientMoodTrend(profileId), [profileId]);
  const assessments = useMemo(() => getPatientAssessmentTrend(profileId), [profileId]);
  const latestSession = sessions[sessions.length - 1];

  if (!profile) return null;

  const preMoods = moods.filter(m => m.context === 'pre-session').slice(-10);
  const maxMood = 5;

  return (
    <div className="patient-detail">
      <button className="patient-detail-back" onClick={onBack}>
        <ArrowLeft size={18} />
        <span>All Patients</span>
      </button>

      {/* Patient Header */}
      <div className="patient-detail-header">
        <div className="patient-avatar-lg">{profile.displayName.charAt(0).toUpperCase()}</div>
        <div>
          <h2>{profile.displayName}</h2>
          <p className="patient-meta">
            {profile.onboarding.age && `${profile.onboarding.age} yrs`}
            {profile.onboarding.profession && ` · ${profile.onboarding.profession}`}
            {` · ${sessions.length} sessions`}
            {` · Therapy exp: ${profile.onboarding.therapyExperience}`}
          </p>
          <p className="patient-concerns-list">
            {profile.onboarding.primaryConcerns?.map(c => (
              <span key={c} className="concern-tag">{c}</span>
            ))}
          </p>
        </div>
      </div>

      {/* Latest Clinical Impression */}
      {latestSession?.clinicalImpression && (
        <div className="patient-section">
          <h3><FileText size={16} /> Latest Clinical Impression</h3>
          <p className="clinical-text">{latestSession.clinicalImpression}</p>
          {latestSession.preliminaryDiagnosis && (
            <p className="clinical-diagnosis">
              <strong>Diagnostic Impression:</strong> {latestSession.preliminaryDiagnosis}
            </p>
          )}
          {latestSession.riskLevel && (
            <span className={`risk-badge ${latestSession.riskLevel}`}>
              <AlertTriangle size={12} /> Risk: {latestSession.riskLevel}
            </span>
          )}
        </div>
      )}

      {/* Mood Trend Chart */}
      {preMoods.length > 1 && (
        <div className="patient-section">
          <h3>Mood Trend (Pre-Session)</h3>
          <div className="mood-trend-chart">
            {preMoods.map((m, i) => (
              <div key={i} className="mood-trend-bar-container">
                <div
                  className="mood-trend-bar"
                  style={{ height: `${(m.value / maxMood) * 100}%` }}
                  data-value={m.value}
                />
                <span className="mood-trend-label">
                  {new Date(m.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment Scores */}
      {assessments.length > 0 && (
        <div className="patient-section">
          <h3>Assessment History</h3>
          <div className="assessment-history-table">
            <div className="assessment-table-header">
              <span>Date</span>
              <span>Type</span>
              <span>Score</span>
              <span>Severity</span>
            </div>
            {assessments.slice(-10).reverse().map(a => (
              <div key={a.id} className="assessment-table-row">
                <span>{new Date(a.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                <span className="assessment-type">{a.type}</span>
                <span className="assessment-score">{a.totalScore}</span>
                <span className="assessment-severity" style={{ color: a.color }}>{a.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Timeline */}
      <div className="patient-section">
        <h3>Session History</h3>
        <div className="session-timeline">
          {sessions.slice().reverse().map(s => (
            <div key={s.id} className="timeline-entry">
              <div className="timeline-dot" />
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-date">
                    {new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="timeline-duration">{Math.round(s.duration / 60)} min</span>
                  <span className={`risk-badge sm ${s.riskLevel}`}>{s.riskLevel}</span>
                  {s.mode && <span className="mode-tag">{s.mode}</span>}
                </div>
                {s.preMood && s.postMood && (
                  <p className="timeline-mood">
                    Mood: {s.preMood.emoji} {s.preMood.value} → {s.postMood.emoji} {s.postMood.value}
                  </p>
                )}
                {s.conversationAssessment && (
                  <p className="timeline-assessment">{s.conversationAssessment}</p>
                )}
                {s.issuesIdentified.length > 0 && (
                  <p className="timeline-issues">Issues: {s.issuesIdentified.join(', ')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
