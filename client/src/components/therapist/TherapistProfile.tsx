import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { doctors as doctorsApi } from '../../services/api';

const SPECIALIZATIONS = [
  'Anxiety', 'Depression', 'PTSD', 'OCD', 'Bipolar Disorder',
  'ADHD', 'Relationship Issues', 'Grief & Loss', 'Stress Management',
  'Self-Esteem', 'Addiction', 'Eating Disorders', 'Sleep Issues',
  'Anger Management', 'Trauma', 'Family Therapy', 'Child Psychology',
];

export function TherapistProfile() {
  const { doctor, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [qualifications, setQualifications] = useState('');
  const [bio, setBio] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptingPatients, setAcceptingPatients] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (doctor) {
      setDisplayName((doctor.displayName as string) || '');
      setAge(doctor.age ? String(doctor.age) : '');
      setGender((doctor.gender as string) || '');
      setExperienceYears(doctor.experienceYears != null ? String(doctor.experienceYears) : '');
      setSpecializations((doctor.specializations as string[]) || []);
      setQualifications((doctor.qualifications as string) || '');
      setBio((doctor.bio as string) || '');
      setClinicName((doctor.clinicName as string) || '');
      setClinicAddress((doctor.clinicAddress as string) || '');
      setPhone((doctor.phone as string) || '');
      setAcceptingPatients(doctor.acceptingPatients !== 0);
    }
  }, [doctor]);

  function toggleSpec(spec: string) {
    setSpecializations(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await doctorsApi.updateMe({
        displayName: displayName.trim(),
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        experienceYears: experienceYears ? parseInt(experienceYears, 10) : null,
        specializations,
        qualifications: qualifications.trim() || null,
        bio: bio.trim() || null,
        clinicName: clinicName.trim() || null,
        clinicAddress: clinicAddress.trim() || null,
        phone: phone.trim() || null,
        acceptingPatients: acceptingPatients ? 1 : 0,
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="therapist-page">
      <h1 className="therapist-page-title">Profile</h1>

      <div className="therapist-profile-form">
        <div className="therapist-form-row">
          <div className="therapist-form-field">
            <label>Display Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="therapist-form-field">
            <label>Username</label>
            <input type="text" value={(doctor?.username as string) || ''} disabled className="therapist-input-disabled" />
          </div>
        </div>

        <div className="therapist-form-row">
          <div className="therapist-form-field">
            <label>Email</label>
            <input type="text" value={(doctor?.email as string) || ''} disabled className="therapist-input-disabled" />
          </div>
          <div className="therapist-form-field">
            <label>Phone</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
          </div>
        </div>

        <div className="therapist-form-row">
          <div className="therapist-form-field">
            <label>Age</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} min={20} max={100} />
          </div>
          <div className="therapist-form-field">
            <label>Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="therapist-form-field">
            <label>Experience (years)</label>
            <input type="number" value={experienceYears} onChange={e => setExperienceYears(e.target.value)} min={0} max={60} />
          </div>
        </div>

        <div className="therapist-form-field">
          <label>Specializations</label>
          <div className="therapist-spec-chips">
            {SPECIALIZATIONS.map(s => (
              <button
                key={s}
                type="button"
                className={`therapist-spec-chip ${specializations.includes(s) ? 'selected' : ''}`}
                onClick={() => toggleSpec(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="therapist-form-field">
          <label>Qualifications</label>
          <input type="text" value={qualifications} onChange={e => setQualifications(e.target.value)} placeholder="e.g. MD, PhD, MBBS, MRCPsych" />
        </div>

        <div className="therapist-form-field">
          <label>Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell patients about yourself..." rows={4} />
        </div>

        <div className="therapist-form-row">
          <div className="therapist-form-field">
            <label>Clinic Name</label>
            <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Clinic name" />
          </div>
          <div className="therapist-form-field">
            <label>Clinic Address</label>
            <input type="text" value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} placeholder="Address" />
          </div>
        </div>

        <div className="therapist-form-field">
          <label className="therapist-toggle-label">
            <input
              type="checkbox"
              checked={acceptingPatients}
              onChange={e => setAcceptingPatients(e.target.checked)}
            />
            <span>Currently accepting new patients</span>
          </label>
        </div>

        <button className="therapist-btn-primary therapist-save-btn" onClick={handleSave} disabled={saving}>
          <Save size={16} />
          <span>{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Profile'}</span>
        </button>
      </div>
    </div>
  );
}
