import { useState } from 'react';
import { ArrowRight, SkipForward, User, Heart, BookOpen, AudioLines, Briefcase, Globe } from 'lucide-react';
import type { OnboardingData } from '../../types/session';

const CONCERN_OPTIONS = [
  'Stress & Overwhelm',
  'Anxiety & Worry',
  'Low Mood & Depression',
  'Relationship Difficulties',
  'Sleep Problems',
  'Self-Esteem',
  'Grief & Loss',
  'Work/Life Balance',
  'Loneliness',
  'Just Need to Talk',
];

const LANGUAGE_OPTIONS = [
  { code: 'English', label: 'English', native: 'English' },
  { code: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'Punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'Rajasthani', label: 'Rajasthani', native: 'राजस्थानी' },
  { code: 'Spanish', label: 'Spanish', native: 'Español' },
  { code: 'French', label: 'French', native: 'Français' },
  { code: 'Arabic', label: 'Arabic', native: 'العربية' },
];

const TOTAL_STEPS = 6;

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [experience, setExperience] = useState<OnboardingData['therapyExperience'] | null>(null);
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState<'female' | 'male'>('female');

  function toggleConcern(concern: string) {
    setConcerns(prev =>
      prev.includes(concern) ? prev.filter(c => c !== concern) : [...prev, concern]
    );
  }

  function handleComplete() {
    onComplete({
      preferredName: name.trim() || 'there',
      age: age ? parseInt(age, 10) : undefined,
      profession: profession.trim() || undefined,
      primaryConcerns: concerns,
      therapyExperience: experience || 'none',
      language,
      voicePreference: voice,
    });
  }

  function canAdvance() {
    if (step === 0) return true;           // name optional
    if (step === 1) return true;           // age & profession optional
    if (step === 2) return concerns.length > 0;
    if (step === 3) return experience !== null;
    if (step === 4) return true;           // language has default
    if (step === 5) return true;           // voice has default
    return false;
  }

  function advance() {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      handleComplete();
    }
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        {/* Progress dots */}
        <div className="onboarding-dots">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span key={i} className={`dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
          ))}
        </div>

        {/* Step 1: Name */}
        {step === 0 && (
          <div className="onboarding-step">
            <div className="step-icon"><User size={28} /></div>
            <h2>What should we call you?</h2>
            <p>This helps Dr. Aria personalize your conversation.</p>
            <input
              type="text"
              className="onboarding-input"
              placeholder="Your first name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={30}
              autoFocus
            />
          </div>
        )}

        {/* Step 2: Age & Profession */}
        {step === 1 && (
          <div className="onboarding-step">
            <div className="step-icon"><Briefcase size={28} /></div>
            <h2>A little more about you</h2>
            <p>This helps Dr. Aria provide age-appropriate and relevant guidance.</p>
            <div className="onboarding-dual-inputs">
              <div className="onboarding-field">
                <label className="onboarding-label">Your Age (optional)</label>
                <input
                  type="number"
                  className="onboarding-input"
                  placeholder="e.g., 28"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  min={13}
                  max={120}
                  autoFocus
                />
              </div>
              <div className="onboarding-field">
                <label className="onboarding-label">Your Profession (optional)</label>
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="e.g., Software Engineer, Student, Nurse"
                  value={profession}
                  onChange={e => setProfession(e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Concerns */}
        {step === 2 && (
          <div className="onboarding-step">
            <div className="step-icon"><Heart size={28} /></div>
            <h2>What brings you here today?</h2>
            <p>Select all that apply. This helps us tailor your experience.</p>
            <div className="concern-chips">
              {CONCERN_OPTIONS.map(concern => (
                <button
                  key={concern}
                  className={`concern-chip ${concerns.includes(concern) ? 'selected' : ''}`}
                  onClick={() => toggleConcern(concern)}
                >
                  {concern}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Experience */}
        {step === 3 && (
          <div className="onboarding-step">
            <div className="step-icon"><BookOpen size={28} /></div>
            <h2>Have you spoken with a therapist before?</h2>
            <p>This helps Dr. Aria adjust the conversation style.</p>
            <div className="experience-options">
              {([
                { value: 'none' as const, label: 'No, this is new to me', desc: "We'll take things at a comfortable pace" },
                { value: 'some' as const, label: 'A few times', desc: 'Some familiarity with therapeutic conversations' },
                { value: 'regular' as const, label: 'Yes, regularly', desc: "We can dive deeper into techniques" },
              ]).map(opt => (
                <button
                  key={opt.value}
                  className={`experience-option ${experience === opt.value ? 'selected' : ''}`}
                  onClick={() => setExperience(opt.value)}
                >
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Language Selection */}
        {step === 4 && (
          <div className="onboarding-step">
            <div className="step-icon"><Globe size={28} /></div>
            <h2>Choose your language</h2>
            <p>Dr. Aria will speak and understand you in your preferred language.</p>
            <div className="language-options">
              {LANGUAGE_OPTIONS.map(lang => (
                <button
                  key={lang.code}
                  className={`language-option ${language === lang.code ? 'selected' : ''}`}
                  onClick={() => setLanguage(lang.code)}
                >
                  <strong>{lang.label}</strong>
                  <span>{lang.native}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Voice Selection */}
        {step === 5 && (
          <div className="onboarding-step">
            <div className="step-icon"><AudioLines size={28} /></div>
            <h2>Choose Dr. Aria's voice</h2>
            <p>Select the voice you'd feel most comfortable with.</p>
            <div className="voice-options">
              <button
                className={`voice-option ${voice === 'female' ? 'selected' : ''}`}
                onClick={() => setVoice('female')}
              >
                <AudioLines size={24} />
                <strong>Female Voice</strong>
                <span>Warm & soothing tone</span>
              </button>
              <button
                className={`voice-option ${voice === 'male' ? 'selected' : ''}`}
                onClick={() => setVoice('male')}
              >
                <AudioLines size={24} />
                <strong>Male Voice</strong>
                <span>Calm & grounded tone</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="onboarding-nav">
          <button className="onboarding-skip" onClick={onSkip}>
            <SkipForward size={14} /> Skip
          </button>
          <button
            className="btn-primary onboarding-next"
            onClick={advance}
            disabled={!canAdvance()}
          >
            {step < TOTAL_STEPS - 1 ? <>Next <ArrowRight size={18} /></> : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
