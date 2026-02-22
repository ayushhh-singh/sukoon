import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { users as usersApi, doctors as doctorsApi } from '../../services/api';
import { DoctorSearch } from '../DoctorSearch';

const LANGUAGE_OPTIONS = [
  'English', 'Hindi', 'Punjabi', 'Rajasthani', 'Spanish', 'French', 'Arabic',
];

interface LinkedDoctor {
  id: string;
  username: string;
  displayName: string;
}

interface SettingsPanelProps {
  onClose: () => void;
  onProfileUpdated: () => void;
  isInline?: boolean;
}

// Inline tag-input component for disorders / medications
function TagInput({ tags, setTags, placeholder }: { tags: string[]; setTags: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');

  function addTag() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  return (
    <div className="settings-tags-container">
      <div className="settings-tags">
        {tags.map(tag => (
          <span key={tag} className="settings-tag">
            {tag}
            <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))}>×</button>
          </span>
        ))}
        <input
          className="settings-tags-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : '+ add more'}
          maxLength={100}
        />
      </div>
    </div>
  );
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onProfileUpdated, isInline }) => {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState<'female' | 'male'>('female');
  const [disorders, setDisorders] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [linkedDoctors, setLinkedDoctors] = useState<LinkedDoctor[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (user) {
          setName((user.displayName as string) || '');
          setAge(user.age ? String(user.age) : '');
          setProfession((user.profession as string) || '');
          setLanguage((user.language as string) || 'English');
          setVoice((user.voicePreference as 'female' | 'male') || 'female');
          setDisorders((user.knownDisorders as string[]) || []);
          setMedications((user.currentMedications as string[]) || []);
        }
        const docs = await doctorsApi.getMyLinkedDoctors();
        setLinkedDoctors(docs.map(d => ({
          id: d.id as string,
          username: d.username as string,
          displayName: d.displayName as string,
        })));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  async function handleLink(doctorId: string) {
    await doctorsApi.link(doctorId);
    const docs = await doctorsApi.getMyLinkedDoctors();
    setLinkedDoctors(docs.map(d => ({
      id: d.id as string,
      username: d.username as string,
      displayName: d.displayName as string,
    })));
  }

  async function handleUnlink(doctorId: string) {
    await doctorsApi.unlink(doctorId);
    setLinkedDoctors(prev => prev.filter(d => d.id !== doctorId));
  }

  async function handleSave() {
    try {
      await usersApi.updateMe({
        displayName: name.trim() || 'User',
        age: age ? parseInt(age, 10) : null,
        profession: profession.trim() || null,
        language,
        voicePreference: voice,
        knownDisorders: disorders,
        currentMedications: medications,
      });
      await refreshProfile();
      onProfileUpdated();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    }
  }

  if (loading) {
    const loadingPanel = (
      <div className={`settings-panel ${isInline ? 'settings-panel-inline' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          {!isInline && <button className="settings-close" onClick={onClose}><X size={20} /></button>}
        </div>
        <div className="settings-body">
          <p>Loading...</p>
        </div>
      </div>
    );
    if (isInline) return loadingPanel;
    return (
      <div className="settings-overlay" onClick={onClose}>
        {loadingPanel}
      </div>
    );
  }

  const panel = (
    <div className={`settings-panel ${isInline ? 'settings-panel-inline' : ''}`} onClick={e => e.stopPropagation()}>
      <div className="settings-header">
        <h2>Settings</h2>
        {!isInline && <button className="settings-close" onClick={onClose}><X size={20} /></button>}
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

        {/* Medical History Section */}
        <div className="settings-section">
          <h3>Medical History</h3>
          <p className="settings-section-hint">Used by Dr. Aria to provide safer, more informed support. Shared with your linked therapist.</p>
          <div className="settings-field">
            <label>Known diagnoses / conditions</label>
            <TagInput
              tags={disorders}
              setTags={setDisorders}
              placeholder="e.g., ADHD, Anxiety Disorder — press Enter to add"
            />
          </div>
          <div className="settings-field">
            <label>Current medications</label>
            <TagInput
              tags={medications}
              setTags={setMedications}
              placeholder="e.g., Sertraline 50mg — press Enter to add"
            />
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
          <DoctorSearch
            linkedDoctors={linkedDoctors}
            onLink={handleLink}
            onUnlink={handleUnlink}
          />
        </div>
      </div>

      <div className="settings-footer">
        <button className="btn-primary settings-save" onClick={handleSave}>
          <Save size={16} />
          <span>{saved ? 'Saved!' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );

  if (isInline) return panel;

  return (
    <div className="settings-overlay" onClick={onClose}>
      {panel}
    </div>
  );
};
