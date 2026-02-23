import { useState } from 'react';
import { ArrowRight, ArrowLeft, SkipForward, User, BookOpen, AudioLines, Briefcase, Globe, Stethoscope, ClipboardList, X } from 'lucide-react';
import type { OnboardingData } from '../../types/session';
import { DoctorSearch } from '../DoctorSearch';

const LANGUAGE_OPTIONS = [
  { code: 'English', label: 'English', native: 'English' },
  { code: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'Punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'Rajasthani', label: 'Rajasthani', native: 'राजस्थानी' },
  { code: 'Spanish', label: 'Spanish', native: 'Español' },
  { code: 'French', label: 'French', native: 'Français' },
  { code: 'Arabic', label: 'Arabic', native: 'العربية' },
];

const TOTAL_STEPS = 7;

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
  onBack?: () => void;
}

export function OnboardingFlow({ onComplete, onSkip, onBack }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [disorders, setDisorders] = useState<string[]>([]);
  const [disorderInput, setDisorderInput] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  const [medicationInput, setMedicationInput] = useState('');
  const [experience, setExperience] = useState<OnboardingData['therapyExperience'] | null>(null);
  const [language, setLanguage] = useState('English');
  const [voice, setVoice] = useState<'female' | 'male'>('female');
  const [linkedDoctors, setLinkedDoctors] = useState<{ id: string; username: string; displayName: string }[]>([]);

  function addTag(value: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput('');
  }

  function handleTagKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    inputValue: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void,
  ) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue, list, setList, setInput);
    }
  }

  function handleComplete() {
    onComplete({
      preferredName: name.trim() || 'there',
      age: age ? parseInt(age, 10) : undefined,
      profession: profession.trim() || undefined,
      primaryConcerns: [],
      therapyExperience: experience || 'none',
      language,
      voicePreference: voice,
      knownDisorders: disorders.length > 0 ? disorders : undefined,
      currentMedications: medications.length > 0 ? medications : undefined,
      doctorIds: linkedDoctors.length > 0 ? linkedDoctors.map(d => d.id) : undefined,
    });
  }

  function canAdvance() {
    if (step === 0) return true;           // name optional
    if (step === 1) return true;           // age & profession optional
    if (step === 2) return true;           // medical history optional
    if (step === 3) return experience !== null;
    if (step === 4) return true;           // language has default
    if (step === 5) return true;           // voice has default
    if (step === 6) return true;           // doctor username optional
    return false;
  }

  function advance() {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      handleComplete();
    }
  }

  function goBack() {
    if (step > 0) {
      setStep(s => s - 1);
    } else if (onBack) {
      onBack();
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

        {/* Step 3: Medical History */}
        {step === 2 && (
          <div className="onboarding-step">
            <div className="step-icon"><ClipboardList size={28} /></div>
            <h2>Medical history</h2>
            <p>This helps Dr. Aria provide safer, more informed guidance. All information is kept confidential.</p>
            <div className="onboarding-field">
              <label className="onboarding-label">Known diagnoses or conditions (optional)</label>
              <div className="onboarding-tags-input">
                <div className="onboarding-tags">
                  {disorders.map(d => (
                    <span key={d} className="onboarding-tag">
                      {d}
                      <button type="button" onClick={() => setDisorders(prev => prev.filter(x => x !== d))}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="e.g., ADHD, Anxiety Disorder, Diabetes — press Enter to add"
                  value={disorderInput}
                  onChange={e => setDisorderInput(e.target.value)}
                  onKeyDown={e => handleTagKeyDown(e, disorderInput, disorders, setDisorders, setDisorderInput)}
                  onBlur={() => { if (disorderInput.trim()) addTag(disorderInput, disorders, setDisorders, setDisorderInput); }}
                  maxLength={100}
                  autoFocus
                />
              </div>
            </div>
            <div className="onboarding-field">
              <label className="onboarding-label">Current medications (optional)</label>
              <div className="onboarding-tags-input">
                <div className="onboarding-tags">
                  {medications.map(m => (
                    <span key={m} className="onboarding-tag">
                      {m}
                      <button type="button" onClick={() => setMedications(prev => prev.filter(x => x !== m))}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="e.g., Sertraline 50mg, Melatonin — press Enter to add"
                  value={medicationInput}
                  onChange={e => setMedicationInput(e.target.value)}
                  onKeyDown={e => handleTagKeyDown(e, medicationInput, medications, setMedications, setMedicationInput)}
                  onBlur={() => { if (medicationInput.trim()) addTag(medicationInput, medications, setMedications, setMedicationInput); }}
                  maxLength={100}
                />
              </div>
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

        {/* Step 7: Doctor Search */}
        {step === 6 && (
          <div className="onboarding-step onboarding-step-doctor">
            <div className="step-icon"><Stethoscope size={28} /></div>
            <h2>Link to your doctor</h2>
            <p>Search for your doctor or therapist on Sukoon so they can view your progress and provide better care.</p>
            <div className="onboarding-doctor-search">
              <DoctorSearch
                linkedDoctors={linkedDoctors}
                onLink={async (id) => {
                  // Store the ID — PatientApp will call doctorsApi.link() after onboarding
                  // Use a temporary display name fetched from search context
                  if (!linkedDoctors.find(d => d.id === id)) {
                    setLinkedDoctors(prev => [...prev, { id, username: '', displayName: 'Linked Doctor' }]);
                  }
                }}
                onUnlink={async (id) => {
                  setLinkedDoctors(prev => prev.filter(d => d.id !== id));
                }}
              />
            </div>
            <p className="onboarding-hint">
              You can also add or remove doctors later from Settings.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="onboarding-nav">
          <div className="onboarding-nav-left">
            {(step > 0 || onBack) && (
              <button className="onboarding-back" onClick={goBack}>
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button className="onboarding-skip" onClick={onSkip}>
              <SkipForward size={14} /> Skip
            </button>
          </div>
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
