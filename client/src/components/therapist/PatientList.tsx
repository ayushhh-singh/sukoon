import React from 'react';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TherapistPatientSummary } from '../../types/therapist';

interface PatientListProps {
  patients: TherapistPatientSummary[];
  onSelectPatient: (profileId: string) => void;
}

export const PatientList: React.FC<PatientListProps> = ({ patients, onSelectPatient }) => {
  if (patients.length === 0) {
    return (
      <div className="patient-list-empty">
        <p>No patient data available yet.</p>
        <p>Session data will appear here after patients complete sessions.</p>
      </div>
    );
  }

  return (
    <div className="patient-list">
      <div className="patient-table-header">
        <span>Patient</span>
        <span>Sessions</span>
        <span>Mood Trend</span>
        <span>Risk</span>
        <span></span>
      </div>
      {patients.map(p => (
        <button
          key={p.profileId}
          className="patient-row"
          onClick={() => onSelectPatient(p.profileId)}
        >
          <div className="patient-name-cell">
            <div className="patient-avatar-sm">{p.displayName.charAt(0).toUpperCase()}</div>
            <div>
              <span className="patient-name">{p.displayName}</span>
              <span className="patient-concerns">{p.concerns.slice(0, 2).join(', ')}</span>
            </div>
          </div>
          <span className="patient-sessions">{p.sessionCount}</span>
          <span className="patient-mood-trend">
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
          <ChevronRight size={16} className="patient-chevron" />
        </button>
      ))}
    </div>
  );
};
