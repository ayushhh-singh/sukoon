import React from 'react';
import { Stethoscope, Heart } from 'lucide-react';
import type { UserRole } from '../types';

interface RoleSelectScreenProps {
  onSelect: (role: UserRole) => void;
}

export const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({ onSelect }) => {
  return (
    <div className="role-select-screen">
      <div className="role-select-brand">
        <h1>Sukoon</h1>
        <p>AI-powered mental health support</p>
      </div>

      <div className="role-select-header">
        <h2>I am a...</h2>
      </div>

      <div className="role-cards">
        <button className="role-card" onClick={() => onSelect('patient')}>
          <div className="role-card-icon patient-icon">
            <Heart size={36} />
          </div>
          <h3>Patient</h3>
          <p>Start a supportive conversation with Dr. Aria, your AI psychologist</p>
        </button>

        <button className="role-card" onClick={() => onSelect('doctor')}>
          <div className="role-card-icon doctor-icon">
            <Stethoscope size={36} />
          </div>
          <h3>Doctor / Therapist</h3>
          <p>Access your patient dashboard to monitor progress and clinical data</p>
        </button>
      </div>
    </div>
  );
};
