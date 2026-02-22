import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, User, ArrowLeft, Stethoscope, Heart } from 'lucide-react';

interface AuthScreenProps {
  role: 'patient' | 'doctor';
  onBack: () => void;
}

export function AuthScreen({ role, onBack }: AuthScreenProps) {
  const { login, registerPatient, registerDoctor } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Doctor registration extra fields
  const [experienceYears, setExperienceYears] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);

  const SPECIALIZATION_OPTIONS = [
    'CBT', 'Trauma Therapy', 'Anxiety', 'Depression', 'PTSD',
    'Couples Therapy', 'Child Psychology', 'Addiction', 'Grief Counseling',
    'Mindfulness', 'DBT', 'Family Therapy',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (role === 'patient') {
        if (!displayName.trim()) { setError('Name is required'); setIsSubmitting(false); return; }
        await registerPatient({ email, password, displayName: displayName.trim() });
      } else {
        if (!displayName.trim()) { setError('Name is required'); setIsSubmitting(false); return; }
        if (!username.trim() || username.trim().length < 3) { setError('Username must be at least 3 characters'); setIsSubmitting(false); return; }
        if (!/^[a-z0-9_]+$/.test(username.trim().toLowerCase())) { setError('Username can only contain lowercase letters, numbers, and underscores'); setIsSubmitting(false); return; }
        await registerDoctor({
          email,
          password,
          username: username.trim().toLowerCase(),
          displayName: displayName.trim(),
          experienceYears: experienceYears ? parseInt(experienceYears) : undefined,
          qualifications: qualifications.trim() || undefined,
          specializations: specializations.length > 0 ? specializations : undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSpec = (spec: string) => {
    setSpecializations(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <button className="auth-back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>

        <div className="auth-header">
          <div className="auth-icon">
            {role === 'doctor' ? <Stethoscope size={32} /> : <Heart size={32} />}
          </div>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p className="auth-subtitle">
            {role === 'doctor' ? 'Therapist / Doctor' : 'Patient'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="auth-field">
              <User size={18} />
              <input
                type="text"
                placeholder="Full name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={50}
                required
              />
            </div>
          )}

          {mode === 'register' && role === 'doctor' && (
            <div className="auth-field">
              <span className="auth-field-prefix">@</span>
              <input
                type="text"
                placeholder="Username (e.g. dr_sharma)"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                maxLength={30}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <Mail size={18} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <Lock size={18} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {mode === 'register' && role === 'doctor' && (
            <>
              <div className="auth-field">
                <input
                  type="number"
                  placeholder="Years of experience"
                  value={experienceYears}
                  onChange={e => setExperienceYears(e.target.value)}
                  min={0}
                  max={60}
                />
              </div>

              <div className="auth-field">
                <input
                  type="text"
                  placeholder="Qualifications (e.g. MD Psychiatry)"
                  value={qualifications}
                  onChange={e => setQualifications(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="auth-specializations">
                <label>Specializations</label>
                <div className="auth-spec-chips">
                  {SPECIALIZATION_OPTIONS.map(spec => (
                    <button
                      key={spec}
                      type="button"
                      className={`auth-spec-chip ${specializations.includes(spec) ? 'selected' : ''}`}
                      onClick={() => toggleSpec(spec)}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="auth-toggle">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {mode === 'register' && role === 'doctor' && (
          <p className="auth-hint">
            Share your username with patients so they can link their account to you.
          </p>
        )}
      </div>
    </div>
  );
}
