import { useState, useMemo } from 'react';
import { X, Moon, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  tip: string;
}

const CHECKLIST: ChecklistItem[] = [
  { id: 'caffeine', label: 'Avoided caffeine after 2 PM', tip: 'Caffeine stays in your system for 6-8 hours' },
  { id: 'screens', label: 'Reduced screen time 30 min before bed', tip: 'Blue light suppresses melatonin production' },
  { id: 'room', label: 'Room is cool and dark', tip: 'Ideal sleeping temperature is 60-67°F (15-19°C)' },
  { id: 'relaxation', label: 'Completed a relaxation activity', tip: 'Reading, stretching, or breathing exercises work great' },
  { id: 'tasks', label: 'Wrote down tomorrow\'s tasks', tip: 'Clears your mind of planning thoughts' },
  { id: 'meals', label: 'No heavy meals close to bedtime', tip: 'Finish eating 2-3 hours before sleep' },
  { id: 'consistent', label: 'Maintaining consistent bedtime', tip: 'Regularity strengthens your circadian rhythm' },
  { id: 'naps', label: 'Limited naps to 20 minutes', tip: 'Long naps can interfere with nighttime sleep' },
];

interface DayRecord {
  date: string;
  score: number;
  total: number;
}

function getHistory(): DayRecord[] {
  try {
    return JSON.parse(localStorage.getItem('sukoon_sleep_hygiene') || '[]');
  } catch { return []; }
}

function saveToday(score: number) {
  const today = new Date().toISOString().split('T')[0];
  const history = getHistory();
  const idx = history.findIndex(r => r.date === today);
  const record: DayRecord = { date: today, score, total: CHECKLIST.length };
  if (idx >= 0) {
    history[idx] = record;
  } else {
    history.push(record);
  }
  if (history.length > 30) history.splice(0, history.length - 30);
  localStorage.setItem('sukoon_sleep_hygiene', JSON.stringify(history));
}

export function SleepHygiene({ onClose }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const history = useMemo(() => getHistory().slice(-7), []);

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSaved(false);
  }

  function handleSave() {
    saveToday(checked.size);
    setSaved(true);
  }

  const score = checked.size;
  const total = CHECKLIST.length;
  const percentage = Math.round((score / total) * 100);

  return (
    <div className="exercise-overlay">
      <div className="exercise-container sleep-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>
        <h2><Moon size={20} /> Sleep Hygiene Checklist</h2>
        <p className="exercise-subtitle">Track your evening wind-down routine for better sleep.</p>

        <div className="sleep-checklist">
          {CHECKLIST.map(item => (
            <button
              key={item.id}
              className={`sleep-item ${checked.has(item.id) ? 'checked' : ''}`}
              onClick={() => toggle(item.id)}
            >
              <span className="sleep-check-box">
                {checked.has(item.id) && <Check size={14} />}
              </span>
              <div className="sleep-item-text">
                <span className="sleep-item-label">{item.label}</span>
                <span className="sleep-item-tip">{item.tip}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="sleep-score">
          <div className="sleep-score-bar">
            <div className="sleep-score-fill" style={{ width: `${percentage}%` }} />
          </div>
          <span className="sleep-score-text">
            {score}/{total} — {percentage >= 75 ? 'Great sleep prep!' : percentage >= 50 ? 'Good effort!' : 'Try to check off more items'}
          </span>
        </div>

        {history.length > 0 && (
          <div className="sleep-history">
            <h4>Last 7 Days</h4>
            <div className="sleep-history-bars">
              {history.map(day => (
                <div key={day.date} className="sleep-history-bar-wrapper">
                  <div className="sleep-history-bar">
                    <div
                      className="sleep-history-bar-fill"
                      style={{ height: `${(day.score / day.total) * 100}%` }}
                    />
                  </div>
                  <span className="sleep-history-label">
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn-primary" onClick={saved ? onClose : handleSave}>
          {saved ? 'Done' : 'Save Today\'s Check-in'}
        </button>
      </div>
    </div>
  );
}
