import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { StorageService } from '../../services/storage';
import type { UserProfile } from '../../types/session';

const LANGUAGE_OPTIONS = [
  'English', 'Hindi', 'Punjabi', 'Rajasthani', 'Spanish', 'French', 'Arabic',
];

interface SettingsPanelProps {
  onClose: () => void;
  onProfileUpdated: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onProfileUpdated }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState<'female' | 'male'>('female');
  const [doctorUsernames, setDoctorUsernames] = useState<string[]>([]);
  const [newDoctor, setNewDoctor] = useState('');
  const [doctorError, setDoctorError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = StorageService.getActiveProfile();
    if (p) {
      setProfile(p);
      setName(p.onboarding.preferredName === 'there' ? '' : p.onboarding.preferredName);
      setAge(p.onboarding.age?.toString() || '');
      setProfession(p.onboarding.profession || '');
      setLanguage(p.onboarding.language || 'English');
      setVoice(p.onboarding.voicePreference || 'female');
      setDoctorUsernames(p.doctorUsernames || []);
    }
  }, []);

  function addDoctor() {
    const trimmed = newDoctor.trim().toLowerCase();
    if (!trimmed) return;

    if (doctorUsernames.includes(trimmed)) {
      setDoctorError('This doctor is already linked');
      return;
    }

    const doctor = StorageService.getDoctorByUsername(trimmed);
    if (!doctor) {
      setDoctorError('No doctor found with this username');
      return;
    }

    setDoctorUsernames(prev => [...prev, trimmed]);
    setNewDoctor('');
    setDoctorError('');
  }

  function removeDoctor(username: string) {
    setDoctorUsernames(prev => prev.filter(d => d !== username));
  }

  function handleSave() {
    if (!profile) return;

    const updated: UserProfile = {
      ...profile,
      displayName: name.trim() || 'User',
      onboarding: {
        ...profile.onboarding,
        preferredName: name.trim() || 'there',
        age: age ? parseInt(age, 10) : undefined,
        profession: profession.trim() || undefined,
        language,
        voicePreference: voice,
        doctorUsernames: doctorUsernames.length > 0 ? doctorUsernames : undefined,
      },
      doctorUsernames: doctorUsernames.length > 0 ? doctorUsernames : undefined,
    };

    StorageService.saveProfile(updated);
    setProfile(updated);
    onProfileUpdated();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!profile) {
    return (
      <div className="settings-overlay" onClick={onClose}>
        <div className="settings-panel" onClick={e => e.stopPropagation()}>
          <div className="settings-header">
            <h2>Settings</h2>
            <button className="settings-close" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="settings-body">
            <p>No active profile. Please create a profile first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="settings-body">
          {/* Profile Section */}
          <div className="settings-section">
            <h3>Profile</h3>
            <div className="settings-field">
              <label>Name</label>
              <input
                type="text"
                className="settings-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                maxLength={30}
              />
            </div>
            <div className="settings-row">
              <div className="settings-field">
                <label>Age</label>
                <input
                  type="number"
                  className="settings-input"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="Age"
                  min={13}
                  max={120}
                />
              </div>
              <div className="settings-field">
                <label>Profession</label>
                <input
                  type="text"
                  className="settings-input"
                  value={profession}
                  onChange={e => setProfession(e.target.value)}
                  placeholder="Profession"
                  maxLength={50}
                />
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="settings-section">
            <h3>Preferences</h3>
            <div className="settings-field">
              <label>Language</label>
              <div className="settings-chips">
                {LANGUAGE_OPTIONS.map(lang => (
                  <button
                    key={lang}
                    className={`settings-chip ${language === lang ? 'selected' : ''}`}
                    onClick={() => setLanguage(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-field">
              <label>Voice</label>
              <div className="settings-chips">
                <button
                  className={`settings-chip ${voice === 'female' ? 'selected' : ''}`}
                  onClick={() => setVoice('female')}
                >
                  Female
                </button>
                <button
                  className={`settings-chip ${voice === 'male' ? 'selected' : ''}`}
                  onClick={() => setVoice('male')}
                >
                  Male
                </button>
              </div>
            </div>
          </div>

          {/* My Doctors Section */}
          <div className="settings-section">
            <h3>My Doctors</h3>
            {doctorUsernames.length > 0 ? (
              <div className="doctor-chips">
                {doctorUsernames.map(d => (
                  <span key={d} className="doctor-chip">
                    {d}
                    <button onClick={() => removeDoctor(d)} title="Remove doctor">
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="settings-hint">No doctors linked yet.</p>
            )}
            <div className="doctor-add-row">
              <input
                type="text"
                className="settings-input"
                placeholder="Doctor's username"
                value={newDoctor}
                onChange={e => { setNewDoctor(e.target.value.toLowerCase()); setDoctorError(''); }}
                onKeyDown={e => e.key === 'Enter' && addDoctor()}
              />
              <button className="doctor-add-btn" onClick={addDoctor} title="Add doctor">
                <Plus size={16} />
              </button>
            </div>
            {doctorError && <p className="settings-error">{doctorError}</p>}
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn-primary settings-save" onClick={handleSave}>
            <Save size={16} />
            <span>{saved ? 'Saved!' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
