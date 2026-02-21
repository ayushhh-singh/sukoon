import { useState, useMemo } from 'react';
import { Clock, ChevronDown, ChevronRight, Check, SkipForward, ArrowLeft } from 'lucide-react';
import type { SessionSummary } from '../types/session';
import { formatDuration, formatSessionDate } from '../utils/format';

interface PriorSessionPickerProps {
  sessions: SessionSummary[];
  selectedConcerns: string[];
  onSelect: (session: SessionSummary) => void;
  onSkip: () => void;
  onBack?: () => void;
}

// Maps exact SessionConcernPicker labels → keywords to detect in session data
const CONCERN_KEYWORDS: Record<string, string[]> = {
  'Stress & Overwhelm':        ['stress', 'overwhelm', 'burnout', 'overload', 'pressure', 'exhausted'],
  'Anxiety & Worry':           ['anxiety', 'anxious', 'worry', 'panic', 'fear', 'nervous', 'worried'],
  'Low Mood & Depression':     ['depression', 'depressed', 'sad', 'low mood', 'hopeless', 'empty', 'numb'],
  'Relationship Difficulties': ['relationship', 'partner', 'spouse', 'family', 'marriage', 'breakup', 'divorce', 'conflict'],
  'Sleep Problems':            ['sleep', 'insomnia', 'fatigue', 'tired', 'rest', 'sleepless'],
  'Self-Esteem':               ['self-worth', 'confidence', 'self-esteem', 'imposter', 'inadequate', 'shame'],
  'Grief & Loss':              ['grief', 'loss', 'bereavement', 'death', 'mourning', 'missing'],
  'Work/Life Balance':         ['work', 'career', 'job', 'workplace', 'boss', 'colleague', 'balance'],
  'Loneliness':                ['loneliness', 'lonely', 'alone', 'isolated', 'social'],
  'Just Need to Talk':         [],
};

function sessionMatchesConcern(session: SessionSummary, concern: string): boolean {
  const keywords = CONCERN_KEYWORDS[concern];
  if (!keywords) return false;
  if (keywords.length === 0) return true; // "Just Need to Talk" matches anything
  const text = [
    ...(session.issuesIdentified ?? []),
    ...(session.topicsDiscussed ?? []),
    ...(session.emotionalThemes ?? []),
  ].join(' ').toLowerCase();
  return keywords.some(kw => text.includes(kw));
}


export function PriorSessionPicker({ sessions, selectedConcerns, onSelect, onSkip, onBack }: PriorSessionPickerProps) {
  const sorted = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions]
  );

  // Build groups: one per selected concern (if it has matching sessions) + "Other Sessions"
  const groups = useMemo(() => {
    const matched = new Set<string>();
    const concernGroups: { label: string; items: SessionSummary[] }[] = [];

    for (const concern of selectedConcerns) {
      const items = sorted.filter(s => sessionMatchesConcern(s, concern));
      if (items.length > 0) {
        concernGroups.push({ label: concern, items });
        items.forEach(s => matched.add(s.id));
      }
    }

    const others = sorted.filter(s => !matched.has(s.id));
    if (others.length > 0) {
      concernGroups.push({ label: 'Other Sessions', items: others });
    }

    // If no concerns selected, show all as "Recent Sessions"
    if (selectedConcerns.length === 0) {
      return [{ label: 'Recent Sessions', items: sorted }];
    }

    return concernGroups;
  }, [sorted, selectedConcerns]);

  const [selected, setSelected] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(groups.length > 0 ? [groups[0].label] : [])
  );

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const selectedSession = sessions.find(s => s.id === selected) ?? null;

  return (
    <div className="prior-session-screen">
      {onBack && (
        <button className="step-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
      )}
      <div className="prior-session-header">
        <h2>Continue from a past session?</h2>
        <p>
          Select a previous conversation to give Dr. Aria context —
          she'll check in on your progress and build on what you've already worked on.
        </p>
      </div>

      <div className="prior-session-groups">
        {groups.map(({ label, items }) => {
          const isOpen = expandedGroups.has(label);
          return (
            <div key={label} className="prior-session-category">
              <button
                className="prior-category-header"
                onClick={() => toggleGroup(label)}
                aria-expanded={isOpen}
              >
                <span className="prior-category-label">{label}</span>
                <span className="prior-category-meta">{items.length} session{items.length !== 1 ? 's' : ''}</span>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {isOpen && (
                <div className="prior-session-list">
                  {items.slice(0, 4).map(s => {
                    const isSelected = s.id === selected;
                    return (
                      <button
                        key={s.id}
                        className={`prior-session-card${isSelected ? ' selected' : ''}`}
                        onClick={() => setSelected(isSelected ? null : s.id)}
                      >
                        <div className="prior-session-card-top">
                          <span className="prior-session-date">{formatSessionDate(s.date)}</span>
                          <span className="prior-session-duration">
                            <Clock size={11} /> {formatDuration(s.duration)}
                          </span>
                          {isSelected && <Check size={15} className="prior-session-check" />}
                        </div>
                        {s.issuesIdentified?.length > 0 && (
                          <div className="prior-session-issues">
                            {s.issuesIdentified.slice(0, 2).map((issue, i) => (
                              <span key={i} className="prior-session-tag">{issue}</span>
                            ))}
                          </div>
                        )}
                        {s.emotionalJourney && (
                          <p className="prior-session-journey">{s.emotionalJourney}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="prior-session-actions">
        {selectedSession ? (
          <button className="btn-primary" onClick={() => onSelect(selectedSession)}>
            <Check size={16} /> Continue from this session
          </button>
        ) : (
          <button className="btn-primary" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
            Select a session above
          </button>
        )}
        <button className="btn-ghost prior-skip-btn" onClick={onSkip}>
          <SkipForward size={15} /> Start fresh
        </button>
      </div>
    </div>
  );
}
