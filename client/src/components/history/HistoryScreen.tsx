import { useState, useMemo } from 'react';
import {
  X, Clock, ArrowUp, ArrowDown, Minus, Brain, Bookmark, BookmarkCheck,
  Search, ChevronDown, ChevronUp, Layers, AlertTriangle, Shield,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import type { SessionSummary, BookmarkedStrategy } from '../../types/session';

type Tab = 'sessions' | 'toolkit' | 'search';

interface HistoryScreenProps {
  onClose: () => void;
  bookmarks: BookmarkedStrategy[];
  onToggleBookmark: (strategy: BookmarkedStrategy) => void;
}

export function HistoryScreen({ onClose, bookmarks, onToggleBookmark }: HistoryScreenProps) {
  const [tab, setTab] = useState<Tab>('sessions');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sessions = useMemo(
    () => [...StorageService.getSessions()].reverse(),
    []
  );

  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <div className="history-header-top">
            <h2>Your Journey</h2>
            <button className="history-close" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="history-tabs">
            {(['sessions', 'toolkit', 'search'] as Tab[]).map(t => (
              <button
                key={t}
                className={`history-tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'sessions' && <Clock size={14} />}
                {t === 'toolkit' && <Layers size={14} />}
                {t === 'search' && <Search size={14} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'toolkit' && bookmarks.length > 0 && (
                  <span className="tab-badge">{bookmarks.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="history-body">
          {tab === 'sessions' && (
            <SessionsTab
              sessions={sessions}
              expandedSession={expandedSession}
              onToggleExpand={id => setExpandedSession(prev => prev === id ? null : id)}
              bookmarks={bookmarks}
              onToggleBookmark={onToggleBookmark}
            />
          )}
          {tab === 'toolkit' && (
            <ToolkitTab bookmarks={bookmarks} onToggleBookmark={onToggleBookmark} />
          )}
          {tab === 'search' && (
            <SearchTab
              sessions={sessions}
              query={searchQuery}
              onQueryChange={setSearchQuery}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Sessions Tab ----
function SessionsTab({
  sessions, expandedSession, onToggleExpand, bookmarks, onToggleBookmark,
}: {
  sessions: SessionSummary[];
  expandedSession: string | null;
  onToggleExpand: (id: string) => void;
  bookmarks: BookmarkedStrategy[];
  onToggleBookmark: (s: BookmarkedStrategy) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className="history-empty">
        <Clock size={40} />
        <p>No sessions yet. Your journey will appear here after your first session.</p>
      </div>
    );
  }

  return (
    <div className="sessions-list">
      {sessions.map(session => (
        <SessionCard
          key={session.id}
          session={session}
          isExpanded={expandedSession === session.id}
          onToggle={() => onToggleExpand(session.id)}
          bookmarks={bookmarks}
          onToggleBookmark={onToggleBookmark}
        />
      ))}
    </div>
  );
}

function SessionCard({
  session, isExpanded, onToggle, bookmarks, onToggleBookmark,
}: {
  session: SessionSummary;
  isExpanded: boolean;
  onToggle: () => void;
  bookmarks: BookmarkedStrategy[];
  onToggleBookmark: (s: BookmarkedStrategy) => void;
}) {
  const durationMin = Math.floor(session.duration / 60);
  const moodDelta = session.preMood && session.postMood
    ? session.postMood.value - session.preMood.value
    : null;

  return (
    <div className={`session-card-history ${isExpanded ? 'expanded' : ''}`}>
      <button className="session-card-header" onClick={onToggle}>
        <div className="session-card-meta">
          <span className="session-card-date">
            {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          {durationMin > 0 && <span className="session-card-duration"><Clock size={12} /> {durationMin}m</span>}
        </div>
        <div className="session-card-indicators">
          {moodDelta !== null && (
            <span className={`mood-delta ${moodDelta > 0 ? 'up' : moodDelta < 0 ? 'down' : 'flat'}`}>
              {moodDelta > 0 ? <ArrowUp size={14} /> : moodDelta < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
              <span>{session.preMood?.emoji}{session.postMood?.emoji}</span>
            </span>
          )}
          {session.preAssessment && (
            <span className="assessment-badge" style={{ color: session.preAssessment.color }}>
              {session.preAssessment.type.toUpperCase()} {session.preAssessment.totalScore}
            </span>
          )}
          {session.riskLevel && session.riskLevel !== 'low' && (
            <span className={`risk-mini risk-${session.riskLevel}`}>
              <AlertTriangle size={12} />
            </span>
          )}
          {session.riskLevel === 'low' && <Shield size={12} className="risk-safe" />}
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="session-card-detail">
          {session.conversationAssessment && (
            <div className="detail-section">
              <h4><Brain size={13} /> Session Assessment</h4>
              <p>{session.conversationAssessment}</p>
            </div>
          )}
          {session.keyTakeaways.length > 0 && (
            <div className="detail-section">
              <h4>Key Takeaways</h4>
              <ul>{session.keyTakeaways.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          {session.copingStrategies.length > 0 && (
            <div className="detail-section">
              <h4>Coping Strategies</h4>
              <ul>
                {session.copingStrategies.map((s, i) => {
                  const isMarked = bookmarks.some(b => b.text === s);
                  return (
                    <li key={i} className="strategy-row">
                      <span>{s}</span>
                      <button
                        className={`bookmark-btn-sm ${isMarked ? 'bookmarked' : ''}`}
                        onClick={() => onToggleBookmark({
                          id: `${session.id}-coping-${i}`,
                          text: s,
                          sessionId: session.id,
                          sessionDate: session.date,
                          savedAt: new Date().toISOString(),
                        })}
                        title={isMarked ? 'Remove from toolkit' : 'Save to toolkit'}
                      >
                        {isMarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {session.homeworkAssignments.length > 0 && (
            <div className="detail-section">
              <h4>Practice Assigned</h4>
              <ul>{session.homeworkAssignments.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </div>
          )}
          {session.emotionalJourney && (
            <div className="detail-section">
              <h4>Emotional Journey</h4>
              <p className="italic-note">{session.emotionalJourney}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Toolkit Tab ----
function ToolkitTab({
  bookmarks, onToggleBookmark,
}: {
  bookmarks: BookmarkedStrategy[];
  onToggleBookmark: (s: BookmarkedStrategy) => void;
}) {
  if (bookmarks.length === 0) {
    return (
      <div className="history-empty">
        <Bookmark size={40} />
        <p>Your personal toolkit is empty. Bookmark coping strategies from your session summaries to build it.</p>
      </div>
    );
  }

  return (
    <div className="toolkit-list">
      <p className="toolkit-intro">
        Strategies saved from your sessions. Tap the bookmark to remove.
      </p>
      {bookmarks.map(b => (
        <div key={b.id} className="toolkit-card">
          <p className="toolkit-text">{b.text}</p>
          <div className="toolkit-meta">
            <span className="toolkit-date">
              {new Date(b.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button
              className="bookmark-btn-sm bookmarked"
              onClick={() => onToggleBookmark(b)}
              title="Remove from toolkit"
            >
              <BookmarkCheck size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Search Tab ----
function SearchTab({
  sessions, query, onQueryChange,
}: {
  sessions: SessionSummary[];
  query: string;
  onQueryChange: (q: string) => void;
}) {
  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();

    const matches: { sessionDate: string; sessionId: string; role: 'You' | 'Dr. Aria'; text: string; snippet: string }[] = [];

    for (const session of sessions) {
      // Search transcripts
      for (const entry of session.transcriptEntries) {
        if (entry.text.toLowerCase().includes(q)) {
          const idx = entry.text.toLowerCase().indexOf(q);
          const start = Math.max(0, idx - 50);
          const end = Math.min(entry.text.length, idx + q.length + 50);
          const snippet = (start > 0 ? '...' : '') + entry.text.slice(start, end) + (end < entry.text.length ? '...' : '');
          matches.push({
            sessionDate: session.date,
            sessionId: session.id,
            role: entry.role === 'user' ? 'You' : 'Dr. Aria',
            text: entry.text,
            snippet,
          });
        }
      }
      // Search summaries
      const summaryFields = [
        ...session.keyTakeaways,
        ...session.copingStrategies,
        ...session.issuesIdentified,
        session.conversationAssessment,
        session.emotionalJourney,
      ].filter(Boolean);
      for (const field of summaryFields) {
        if (field.toLowerCase().includes(q) && !matches.find(m => m.text === field)) {
          matches.push({
            sessionDate: session.date,
            sessionId: session.id,
            role: 'Dr. Aria',
            text: field,
            snippet: field.length > 120 ? field.slice(0, 120) + '...' : field,
          });
        }
      }
    }
    return matches.slice(0, 50);
  }, [sessions, query]);

  // Frequency summary
  const freq = useMemo(() => {
    if (query.trim().length < 2) return null;
    const q = query.toLowerCase();
    const sessionCount = sessions.filter(s =>
      s.transcriptEntries.some(e => e.text.toLowerCase().includes(q)) ||
      [...s.keyTakeaways, ...s.copingStrategies, s.conversationAssessment].some(f => f?.toLowerCase().includes(q))
    ).length;
    return sessionCount > 0 ? { count: results.length, sessions: sessionCount } : null;
  }, [sessions, query, results]);

  return (
    <div className="search-tab">
      <div className="search-input-row">
        <Search size={16} className="search-icon-inline" />
        <input
          className="search-input"
          type="text"
          placeholder='Search across all sessions (e.g. "anxiety", "work", "mom")'
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          autoFocus
        />
        {query && <button className="search-clear" onClick={() => onQueryChange('')}><X size={14} /></button>}
      </div>

      {freq && (
        <p className="search-freq">
          Found <strong>{freq.count}</strong> mention{freq.count !== 1 ? 's' : ''} across <strong>{freq.sessions}</strong> session{freq.sessions !== 1 ? 's' : ''}
        </p>
      )}

      {query.trim().length > 1 && results.length === 0 && (
        <div className="history-empty">
          <Search size={32} />
          <p>No matches found for "{query}"</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((r, i) => (
            <div key={i} className="search-result-card">
              <div className="search-result-meta">
                <span className={`search-role ${r.role === 'You' ? 'role-user' : 'role-ai'}`}>{r.role}</span>
                <span className="search-result-date">
                  {new Date(r.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <p className="search-snippet" dangerouslySetInnerHTML={{
                __html: r.snippet.replace(
                  new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                  '<mark>$1</mark>'
                )
              }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
