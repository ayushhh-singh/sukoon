import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface GratitudeEntry {
  id: string;
  date: string;
  items: string[];
}

const STORAGE_KEY = 'sukoon_gratitude_journal';
const STREAK_KEY = 'sukoon_gratitude_streak';

const PLACEHOLDERS = [
  ['A person who made me smile today...', 'Something beautiful I noticed...', 'A small comfort I\'m thankful for...'],
  ['Something I\'m proud of recently...', 'A kind gesture someone showed me...', 'A simple pleasure I enjoyed today...'],
  ['Something that made me laugh...', 'A skill or ability I appreciate having...', 'A peaceful moment I experienced...'],
  ['A challenge that helped me grow...', 'Something in nature I\'m grateful for...', 'A memory that warms my heart...'],
  ['Someone who believed in me...', 'A lesson I\'m thankful I learned...', 'Something I often take for granted...'],
];

function loadEntries(): GratitudeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntry(entry: GratitudeEntry) {
  try {
    const entries = loadEntries();
    entries.unshift(entry);
    if (entries.length > 30) entries.length = 30;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* */ }
}

function getStreak(): { count: number; lastDate: string } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lastDate: '' };
  } catch {
    return { count: 0, lastDate: '' };
  }
}

function updateStreak(): number {
  const today = new Date().toISOString().split('T')[0];
  const streak = getStreak();
  if (streak.lastDate === today) return streak.count;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
  localStorage.setItem(STREAK_KEY, JSON.stringify({ count: newCount, lastDate: today }));
  return newCount;
}

export function GratitudeJournal({ onClose }: Props) {
  const [items, setItems] = useState(['', '', '']);
  const [done, setDone] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [streak, setStreak] = useState(getStreak().count);
  const [view, setView] = useState<'new' | 'past'>('new');
  const [pastEntries] = useState(loadEntries);
  const [placeholderSet] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);

  useEffect(() => {
    setStreak(updateStreak());
  }, []);

  function updateItem(index: number, value: string) {
    setItems(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function canSubmit() {
    return items.some(item => item.trim().length > 0);
  }

  function handleSubmit() {
    const filled = items.filter(item => item.trim().length > 0);
    if (filled.length === 0) return;

    saveEntry({
      id: `gratitude-${Date.now()}`,
      date: new Date().toISOString(),
      items: filled,
    });

    setCelebrating(true);
    setTimeout(() => {
      setCelebrating(false);
      setDone(true);
    }, 1500);
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
      <div className="exercise-container gratitude-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>

        <h2><Sparkles size={20} className="gratitude-icon" /> Gratitude Journal</h2>

        {streak > 0 && (
          <div className="gratitude-streak-badge">
            {streak} day{streak > 1 ? 's' : ''} streak
          </div>
        )}

        {/* Celebration overlay */}
        {celebrating && (
          <div className="gratitude-celebration">
            <div className="celebration-burst" />
            <span className="celebration-text">Beautiful!</span>
          </div>
        )}

        {!done && !celebrating && (
          <>
            {/* View toggle */}
            <div className="journal-view-toggle">
              <button
                className={`journal-view-btn ${view === 'new' ? 'active' : ''}`}
                onClick={() => setView('new')}
              >
                <Sparkles size={14} /> New Entry
              </button>
              <button
                className={`journal-view-btn ${view === 'past' ? 'active' : ''}`}
                onClick={() => setView('past')}
              >
                Past Entries ({pastEntries.length})
              </button>
            </div>

            {view === 'new' && (
              <>
                <p className="exercise-subtitle">
                  Write down three things you're grateful for today. Even small things count.
                </p>

                <div className="gratitude-inputs">
                  {items.map((item, i) => (
                    <div key={i} className="gratitude-input-row">
                      <span className="gratitude-number">{i + 1}</span>
                      <input
                        type="text"
                        className="gratitude-input"
                        value={item}
                        onChange={e => updateItem(i, e.target.value)}
                        placeholder={placeholderSet[i]}
                        maxLength={200}
                      />
                    </div>
                  ))}
                </div>

                <button className="btn-primary gratitude-submit" onClick={handleSubmit} disabled={!canSubmit()}>
                  Save Gratitude
                </button>
              </>
            )}

            {view === 'past' && (
              <div className="gratitude-past-entries">
                {pastEntries.length === 0 ? (
                  <p className="journal-empty">No entries yet. Start by writing what you're grateful for today.</p>
                ) : (
                  pastEntries.map(entry => (
                    <div key={entry.id} className="gratitude-entry-card">
                      <div className="journal-entry-date">{formatDate(entry.date)}</div>
                      <ul className="gratitude-entry-list">
                        {entry.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {done && (
          <div className="exercise-done">
            <h3>Gratitude Recorded</h3>
            <p>Practicing gratitude rewires your brain towards positivity. Come back tomorrow to keep your streak going!</p>
            <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
