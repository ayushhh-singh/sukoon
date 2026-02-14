import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle, BookOpen, Clock } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface EmotionEntry {
  name: string;
  intensity: number;
}

interface JournalEntry {
  id: string;
  date: string;
  situation: string;
  automaticThought: string;
  emotions: EmotionEntry[];
  evidenceFor: string;
  evidenceAgainst: string;
  balancedThought: string;
  reRatedEmotions: EmotionEntry[];
  reaction?: string;
}

const JOURNAL_KEY = 'sukoon_thought_journal';

const EMOTION_OPTIONS = [
  'Anxious', 'Sad', 'Angry', 'Guilty', 'Ashamed',
  'Frustrated', 'Hopeless', 'Fearful', 'Overwhelmed', 'Lonely',
];

const STEPS = [
  'What happened?',
  'The thought',
  'Emotions',
  'Supporting evidence',
  'Counter evidence',
  'Balanced view',
  'Re-rate',
];

const WISDOM_QUOTES = [
  { text: 'Between stimulus and response there is a space. In that space is our freedom.', author: 'Viktor Frankl' },
  { text: "You don't have to control your thoughts. You just have to stop letting them control you.", author: 'Dan Millman' },
  { text: 'The greatest discovery of my generation is that a human being can alter his life by altering his attitudes.', author: 'William James' },
  { text: 'Nothing can harm you as much as your own thoughts unguarded.', author: 'Buddha' },
  { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },
  { text: 'The mind is its own place, and in itself can make a heaven of hell, a hell of heaven.', author: 'John Milton' },
  { text: 'What we think, we become.', author: 'Buddha' },
  { text: 'You are not your thoughts. You are the observer of your thoughts.', author: 'Eckhart Tolle' },
  { text: 'Every thought is a seed. If you plant crab apples, don\'t count on harvesting Golden Delicious.', author: 'Bill Meyer' },
  { text: 'The happiness of your life depends upon the quality of your thoughts.', author: 'Marcus Aurelius' },
];

const REACTIONS = ['\u{1F31F}', '\u{1F4AA}', '\u{1F9E0}', '\u{1F49C}', '\u{1F308}', '\u{1F3AF}'];

function loadJournalEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveJournalEntry(entry: JournalEntry) {
  try {
    const entries = loadJournalEntries();
    entries.unshift(entry);
    if (entries.length > 20) entries.length = 20;
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  } catch { /* */ }
}

export function ThoughtRecord({ onClose }: Props) {
  const [view, setView] = useState<'new' | 'past'>('new');
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState('');
  const [automaticThought, setAutomaticThought] = useState('');
  const [emotions, setEmotions] = useState<EmotionEntry[]>([]);
  const [evidenceFor, setEvidenceFor] = useState('');
  const [evidenceAgainst, setEvidenceAgainst] = useState('');
  const [balancedThought, setBalancedThought] = useState('');
  const [reRatedEmotions, setReRatedEmotions] = useState<EmotionEntry[]>([]);
  const [done, setDone] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [wisdomQuote] = useState(() => WISDOM_QUOTES[Math.floor(Math.random() * WISDOM_QUOTES.length)]);
  const [pastEntries] = useState(loadJournalEntries);

  function toggleEmotion(name: string) {
    setEmotions(prev => {
      const exists = prev.find(e => e.name === name);
      if (exists) return prev.filter(e => e.name !== name);
      return [...prev, { name, intensity: 5 }];
    });
  }

  function updateIntensity(name: string, intensity: number) {
    setEmotions(prev => prev.map(e => e.name === name ? { ...e, intensity } : e));
  }

  function updateReRatedIntensity(name: string, intensity: number) {
    setReRatedEmotions(prev => prev.map(e => e.name === name ? { ...e, intensity } : e));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0: return situation.trim().length > 0;
      case 1: return automaticThought.trim().length > 0;
      case 2: return emotions.length > 0;
      case 3: return evidenceFor.trim().length > 0;
      case 4: return evidenceAgainst.trim().length > 0;
      case 5: return balancedThought.trim().length > 0;
      case 6: return true;
      default: return false;
    }
  }

  function handleNext() {
    if (step === 5) {
      setReRatedEmotions(emotions.map(e => ({ ...e })));
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setDone(true);
      // Save entry to localStorage
      saveJournalEntry({
        id: `journal-${Date.now()}`,
        date: new Date().toISOString(),
        situation,
        automaticThought,
        emotions,
        evidenceFor,
        evidenceAgainst,
        balancedThought,
        reRatedEmotions,
      });
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleReaction(emoji: string) {
    setSelectedReaction(emoji);
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  return (
    <div className="exercise-overlay">
      <div className="exercise-container thought-record-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>

        <h2>Thought Journal</h2>

        {/* View toggle */}
        {!done && (
          <div className="journal-view-toggle">
            <button
              className={`journal-view-btn ${view === 'new' ? 'active' : ''}`}
              onClick={() => setView('new')}
            >
              <BookOpen size={14} /> New Entry
            </button>
            <button
              className={`journal-view-btn ${view === 'past' ? 'active' : ''}`}
              onClick={() => setView('past')}
            >
              <Clock size={14} /> Past Entries ({pastEntries.length})
            </button>
          </div>
        )}

        {/* Past entries view */}
        {view === 'past' && !done && (
          <div className="journal-past-entries">
            {pastEntries.length === 0 ? (
              <p className="journal-empty">No entries yet. Complete a thought journal to see it here.</p>
            ) : (
              pastEntries.map(entry => (
                <div key={entry.id} className="journal-entry-card">
                  <div className="journal-entry-date">{formatDate(entry.date)}</div>
                  <p className="journal-entry-situation">{entry.situation.slice(0, 100)}{entry.situation.length > 100 ? '...' : ''}</p>
                  <div className="journal-entry-emotions">
                    {entry.emotions.map(e => (
                      <span key={e.name} className="journal-entry-emotion">{e.name}</span>
                    ))}
                  </div>
                  <p className="journal-entry-balanced">
                    <strong>Balanced:</strong> {entry.balancedThought.slice(0, 80)}{entry.balancedThought.length > 80 ? '...' : ''}
                  </p>
                  {entry.reaction && <span className="journal-entry-reaction">{entry.reaction}</span>}
                </div>
              ))
            )}
          </div>
        )}

        {/* New entry view */}
        {view === 'new' && !done && (
          <>
            {/* Stepper */}
            <div className="thought-record-stepper">
              {STEPS.map((label, i) => (
                <div key={i} className={`stepper-step ${i === step ? 'active' : i < step ? 'completed' : ''}`}>
                  <div className="stepper-dot">{i < step ? <CheckCircle size={14} /> : i + 1}</div>
                  <span className="stepper-label">{label}</span>
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="thought-record-content">
              {step === 0 && (
                <div className="tr-step">
                  <h3>What happened?</h3>
                  <p>Briefly describe the situation that triggered the difficult thought or feeling.</p>
                  <textarea
                    className="journal-textarea"
                    value={situation}
                    onChange={e => setSituation(e.target.value)}
                    placeholder="e.g., My boss criticized my report in front of the team..."
                    rows={4}
                    maxLength={500}
                  />
                </div>
              )}

              {step === 1 && (
                <div className="tr-step">
                  <h3>What went through your mind?</h3>
                  <p>What was the automatic thought? What did you tell yourself?</p>
                  <textarea
                    className="journal-textarea"
                    value={automaticThought}
                    onChange={e => setAutomaticThought(e.target.value)}
                    placeholder="e.g., I'm terrible at my job. Everyone thinks I'm incompetent..."
                    rows={4}
                    maxLength={500}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="tr-step">
                  <h3>How did you feel?</h3>
                  <p>Select all that apply and rate their intensity (1-10).</p>
                  <div className="emotion-chips">
                    {EMOTION_OPTIONS.map(name => {
                      const selected = emotions.find(e => e.name === name);
                      return (
                        <button
                          key={name}
                          className={`emotion-chip ${selected ? 'selected' : ''}`}
                          onClick={() => toggleEmotion(name)}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                  {emotions.length > 0 && (
                    <div className="emotion-intensities">
                      {emotions.map(e => (
                        <div key={e.name} className="emotion-intensity-row">
                          <span>{e.name}</span>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={e.intensity}
                            onChange={ev => updateIntensity(e.name, Number(ev.target.value))}
                          />
                          <span className="intensity-value">{e.intensity}/10</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="tr-step">
                  <h3>Supporting evidence</h3>
                  <p>What facts support your automatic thought? (Not feelings — actual evidence.)</p>
                  <textarea
                    className="journal-textarea"
                    value={evidenceFor}
                    onChange={e => setEvidenceFor(e.target.value)}
                    placeholder="e.g., He pointed out three errors in the report..."
                    rows={4}
                    maxLength={500}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="tr-step">
                  <h3>Counter evidence</h3>
                  <p>What facts contradict or don't fully support the thought?</p>
                  <textarea
                    className="journal-textarea"
                    value={evidenceAgainst}
                    onChange={e => setEvidenceAgainst(e.target.value)}
                    placeholder="e.g., He also said the overall structure was good. My last review was positive..."
                    rows={4}
                    maxLength={500}
                  />
                </div>
              )}

              {step === 5 && (
                <div className="tr-step">
                  <h3>A balanced view</h3>
                  <p>Now write a more balanced, realistic way of looking at the situation.</p>
                  <textarea
                    className="journal-textarea"
                    value={balancedThought}
                    onChange={e => setBalancedThought(e.target.value)}
                    placeholder="e.g., The report had some errors, but that doesn't mean I'm terrible at my job..."
                    rows={4}
                    maxLength={500}
                  />
                </div>
              )}

              {step === 6 && (
                <div className="tr-step">
                  <h3>How do you feel now?</h3>
                  <p>After considering the balanced thought, re-rate your emotions.</p>
                  <div className="emotion-intensities">
                    {reRatedEmotions.map(e => (
                      <div key={e.name} className="emotion-intensity-row">
                        <span>{e.name}</span>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={e.intensity}
                          onChange={ev => updateReRatedIntensity(e.name, Number(ev.target.value))}
                        />
                        <span className="intensity-value">{e.intensity}/10</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="thought-record-nav">
              <button className="btn-secondary" onClick={handleBack} disabled={step === 0}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn-primary" onClick={handleNext} disabled={!canAdvance()}>
                {step === STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {done && (
          <div className="thought-record-summary">
            <h3>Journal Entry Complete</h3>

            {/* Wisdom quote */}
            <blockquote className="journal-wisdom-quote">
              <p>"{wisdomQuote.text}"</p>
              <cite>— {wisdomQuote.author}</cite>
            </blockquote>

            <div className="tr-summary-section">
              <strong>Situation:</strong>
              <p>{situation}</p>
            </div>
            <div className="tr-summary-section">
              <strong>Automatic Thought:</strong>
              <p>{automaticThought}</p>
            </div>
            <div className="tr-summary-section">
              <strong>Balanced Thought:</strong>
              <p>{balancedThought}</p>
            </div>
            <div className="tr-summary-section">
              <strong>Emotion Changes:</strong>
              <div className="emotion-comparison">
                {emotions.map(original => {
                  const reRated = reRatedEmotions.find(e => e.name === original.name);
                  const diff = reRated ? reRated.intensity - original.intensity : 0;
                  return (
                    <div key={original.name} className="emotion-change-row">
                      <span>{original.name}</span>
                      <span>{original.intensity} → {reRated?.intensity ?? original.intensity}</span>
                      <span className={`change-indicator ${diff < 0 ? 'improved' : diff > 0 ? 'worsened' : ''}`}>
                        {diff < 0 ? `↓${Math.abs(diff)}` : diff > 0 ? `↑${diff}` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Emoji reactions */}
            <div className="journal-reactions">
              <p>How does completing this make you feel?</p>
              <div className="reaction-row">
                {REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    className={`reaction-btn ${selectedReaction === emoji ? 'selected' : ''}`}
                    onClick={() => handleReaction(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
