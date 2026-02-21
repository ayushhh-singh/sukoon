import React, { useState, useMemo } from 'react';
import { X, Stethoscope, LogOut } from 'lucide-react';
import { AggregateStats } from './AggregateStats';
import { PatientList } from './PatientList';
import { PatientDetail } from './PatientDetail';
import { computePatientSummaries, computeAggregateStats } from '../../utils/therapistData';

interface TherapistDashboardProps {
  onClose: () => void;
  doctorUsername?: string;
  doctorDisplayName?: string;
  onLogout?: () => void;
}

export const TherapistDashboard: React.FC<TherapistDashboardProps> = ({
  onClose, doctorUsername, doctorDisplayName, onLogout,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const patients = useMemo(() => computePatientSummaries(doctorUsername), [doctorUsername]);
  const stats = useMemo(() => computeAggregateStats(doctorUsername), [doctorUsername]);

  return (
    <div className="therapist-overlay">
      <div className="therapist-dashboard">
        <div className="therapist-nav">
          <div className="therapist-nav-title">
            <Stethoscope size={20} />
            <h2>{doctorDisplayName ? `${doctorDisplayName}'s Dashboard` : 'Therapist Dashboard'}</h2>
          </div>
          <div className="therapist-nav-actions">
            {onLogout && (
              <button className="therapist-logout" onClick={onLogout} title="Sign out">
                <LogOut size={16} />
              </button>
            )}
            <button className="therapist-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {selectedPatientId ? (
          <PatientDetail
            profileId={selectedPatientId}
            onBack={() => setSelectedPatientId(null)}
          />
        ) : (
          <div className="therapist-overview">
            <AggregateStats stats={stats} />
            <div className="therapist-section">
              <h3>Patients</h3>
              <PatientList
                patients={patients}
                onSelectPatient={setSelectedPatientId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
