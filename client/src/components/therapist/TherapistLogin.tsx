import React, { useState } from 'react';
import { Stethoscope, ArrowRight, ArrowLeft, UserPlus } from 'lucide-react';
import { StorageService } from '../../services/storage';
import type { DoctorProfile } from '../../types/session';

interface TherapistLoginProps {
  onAuthenticate: (doctor: DoctorProfile) => void;
  onBack: () => void;
}

export const TherapistLogin: React.FC<TherapistLoginProps> = ({ onAuthenticate, onBack }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your username'); return; }

    const doctor = StorageService.getDoctorByUsername(trimmed);
    if (doctor) {
      StorageService.setActiveDoctorId(doctor.id);
      sessionStorage.setItem('sukoon_therapist_auth', 'true');
      onAuthenticate(doctor);
    } else {
      setError('No doctor account found with this username');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = username.trim().toLowerCase();
    const trimmedName = displayName.trim();

    if (!trimmedUser) { setError('Please choose a username'); return; }
    if (trimmedUser.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (!/^[a-z0-9_]+$/.test(trimmedUser)) { setError('Username can only contain letters, numbers, and underscores'); return; }
    if (!trimmedName) { setError('Please enter your display name'); return; }

    const existing = StorageService.getDoctorByUsername(trimmedUser);
    if (existing) { setError('This username is already taken'); return; }

    const doctor: DoctorProfile = {
      id: `doctor-${Date.now()}`,
      username: trimmedUser,
      displayName: trimmedName,
      createdAt: new Date().toISOString(),
    };

    StorageService.saveDoctor(doctor);
    StorageService.setActiveDoctorId(doctor.id);
    sessionStorage.setItem('sukoon_therapist_auth', 'true');
    onAuthenticate(doctor);
  };

  return (
    <div className="therapist-login-screen">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={18} />
        <span>Back</span>
      </button>

      <div className="therapist-login-card">
        <div className="therapist-login-icon">
          <Stethoscope size={36} />
        </div>
        <h2>Doctor Portal</h2>
        <p>{mode === 'login' ? 'Sign in to view your patient dashboard' : 'Create your doctor account'}</p>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <input
              type="text"
              className="therapist-code-input"
              placeholder="Your username"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              autoFocus
            />
            {error && <p className="therapist-login-error">{error}</p>}
            <button type="submit" className="btn-primary therapist-login-btn">
              <span>Sign In</span>
              <ArrowRight size={16} />
            </button>
            <button type="button" className="therapist-switch-mode" onClick={() => { setMode('register'); setError(''); }}>
              <UserPlus size={14} />
              <span>New here? Create an account</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <input
              type="text"
              className="therapist-code-input"
              placeholder="Your full name (e.g. Dr. Sharma)"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setError(''); }}
              autoFocus
            />
            <input
              type="text"
              className="therapist-code-input"
              placeholder="Choose a username (e.g. dr_sharma)"
              value={username}
              onChange={e => { setUsername(e.target.value.toLowerCase()); setError(''); }}
            />
            <p className="therapist-username-hint">
              Share this username with your patients so they can link their data to you
            </p>
            {error && <p className="therapist-login-error">{error}</p>}
            <button type="submit" className="btn-primary therapist-login-btn">
              <span>Create Account</span>
              <ArrowRight size={16} />
            </button>
            <button type="button" className="therapist-switch-mode" onClick={() => { setMode('login'); setError(''); }}>
              <span>Already have an account? Sign in</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
