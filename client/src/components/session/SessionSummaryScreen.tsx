import { useState } from 'react';
import {
  CheckCircle, ArrowDown, ArrowUp, Minus, Download, RotateCcw,
  AlertTriangle, Shield, ShieldAlert, Brain, Target, Lightbulb,
  Stethoscope, ClipboardList, Bookmark, BookmarkCheck, History,
} from 'lucide-react';
import type { SessionSummary, BookmarkedStrategy } from '../../types/session';
import type { MoodEntry } from '../../types/mood';
import { StorageService } from '../../services/storage';

interface SessionSummaryScreenProps {
  summary: SessionSummary;
  onSaveReflection: (text: string) => void;
  onNewSession: () => void;
  onGoHome: () => void;
  bookmarks: BookmarkedStrategy[];
  onToggleBookmark: (strategy: BookmarkedStrategy) => void;
  onOpenHistory: () => void;
}

export function SessionSummaryScreen({ summary, onSaveReflection, onNewSession, onGoHome, bookmarks, onToggleBookmark, onOpenHistory }: SessionSummaryScreenProps) {
  const [reflection, setReflection] = useState(summary.userReflection || '');
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  const durationMin = Math.floor(summary.duration / 60);
  const moodDelta = summary.preMood && summary.postMood
    ? summary.postMood.value - summary.preMood.value
    : null;

  function handleSaveReflection() {
    onSaveReflection(reflection);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      const { exportSessionAsPDF } = await import('../../utils/pdfExport');
      exportSessionAsPDF(summary);
    } catch {
      // Fallback to text export
      const { exportSessionAsText } = await import('../../utils/sessionExport');
      exportSessionAsText(summary);
    } finally {
      setExporting(false);
    }
  }

  // Mood history for mini chart
  const moodHistory = StorageService.getMoods();

  return (
    <div className="summary-screen">
      <div className="summary-card">
        {/* Header */}
        <h2>Session Summary</h2>
        <p className="summary-date">
          {new Date(summary.date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
          {durationMin > 0 && ` \u2022 ${durationMin} min`}
        </p>

        {/* Mood change */}
        {summary.preMood && summary.postMood && (
          <div className="mood-change">
            <div className="mood-before">
              <span className="mood-emoji-sm">{summary.preMood.emoji}</span>
              <span>{summary.preMood.label}</span>
            </div>
            <div className={`mood-arrow ${moodDelta && moodDelta > 0 ? 'up' : moodDelta && moodDelta < 0 ? 'down' : ''}`}>
              {moodDelta !== null && moodDelta > 0 && <ArrowUp size={20} />}
              {moodDelta !== null && moodDelta < 0 && <ArrowDown size={20} />}
              {moodDelta !== null && moodDelta === 0 && <Minus size={20} />}
            </div>
            <div className="mood-after">
              <span className="mood-emoji-sm">{summary.postMood.emoji}</span>
              <span>{summary.postMood.label}</span>
            </div>
          </div>
        )}

        {/* Fallback notice if no AI summary data */}
        {!summary.conversationAssessment && !summary.clinicalImpression && summary.keyTakeaways.length === 0 && (
          <div className="summary-section summary-fallback">
            <p className="summary-fallback-notice">
              The AI summary for this session is still processing or was unavailable.
              Your conversation transcript is preserved below.
            </p>
          </div>
        )}

        {/* AI Conversation Assessment */}
        {summary.conversationAssessment && (
          <div className="summary-section summary-ai-assessment">
            <h3><Brain size={16} /> Session Assessment</h3>
            <blockquote className="ai-assessment-text">
              {summary.conversationAssessment}
            </blockquote>
          </div>
        )}

        {/* Clinical Impression */}
        {summary.clinicalImpression && (
          <div className="summary-section summary-clinical">
            <h3><Stethoscope size={16} /> Clinical Impression</h3>
            <blockquote className="clinical-impression-text">
              {summary.clinicalImpression}
            </blockquote>
          </div>
        )}

        {/* Diagnostic Impression */}
        {summary.preliminaryDiagnosis && (
          <div className="summary-section summary-diagnosis">
            <h3><ClipboardList size={16} /> Diagnostic Impression</h3>
            <p className="diagnosis-text">{summary.preliminaryDiagnosis}</p>
            <p className="diagnosis-disclaimer">
              This is a preliminary AI-generated impression based on the conversation, not a formal diagnosis.
              A formal diagnosis requires evaluation by a licensed mental health professional.
            </p>
          </div>
        )}

        {/* Risk Level Badge */}
        {summary.riskLevel && summary.riskLevel !== 'low' && (
          <div className={`summary-risk-badge risk-${summary.riskLevel}`}>
            {summary.riskLevel === 'elevated' ? <ShieldAlert size={16} /> : <AlertTriangle size={16} />}
            <span>Risk Level: {summary.riskLevel.charAt(0).toUpperCase() + summary.riskLevel.slice(1)}</span>
            {summary.riskLevel === 'elevated' && (
              <p className="risk-note">If you're in crisis, please reach out to 988 Suicide & Crisis Lifeline (call or text 988).</p>
            )}
          </div>
        )}
        {summary.riskLevel === 'low' && (
          <div className="summary-risk-badge risk-low">
            <Shield size={16} />
            <span>No safety concerns identified</span>
          </div>
        )}

        {/* Emotional Journey */}
        {summary.emotionalJourney && (
          <div className="summary-section summary-emotional-journey">
            <h3>Emotional Journey</h3>
            <p className="emotional-journey-text">{summary.emotionalJourney}</p>
          </div>
        )}

        {/* Recommended Actions */}
        {summary.recommendedActions && summary.recommendedActions.length > 0 && (
          <div className="summary-section summary-actions-list">
            <h3><Target size={16} /> Recommended Actions</h3>
            <ol className="actions-ordered-list">
              {summary.recommendedActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Way Forward */}
        {summary.wayForward && (
          <div className="summary-section summary-forward">
            <h3>Way Forward</h3>
            <p className="way-forward-text">{summary.wayForward}</p>
          </div>
        )}

        {/* Issues Identified */}
        {summary.issuesIdentified.length > 0 && (
          <div className="summary-section">
            <h3><Target size={16} /> Issues Identified</h3>
            <ul>
              {summary.issuesIdentified.map((item, i) => (
                <li key={i}><CheckCircle size={14} /> {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Key takeaways */}
        {summary.keyTakeaways.length > 0 && (
          <div className="summary-section">
            <h3><Lightbulb size={16} /> Key Takeaways</h3>
            <ul>
              {summary.keyTakeaways.map((item, i) => (
                <li key={i}><CheckCircle size={14} /> {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Coping strategies */}
        {summary.copingStrategies.length > 0 && (
          <div className="summary-section">
            <h3>Coping Strategies Discussed</h3>
            <p className="bookmark-hint">Tap <Bookmark size={12} /> to save to your Toolkit</p>
            <ul className="strategy-bookmark-list">
              {summary.copingStrategies.map((item, i) => {
                const isMarked = bookmarks.some(b => b.text === item);
                return (
                  <li key={i} className="strategy-bookmark-row">
                    <span><CheckCircle size={14} /> {item}</span>
                    <button
                      className={`bookmark-btn ${isMarked ? 'bookmarked' : ''}`}
                      onClick={() => onToggleBookmark({
                        id: `${summary.id}-coping-${i}`,
                        text: item,
                        sessionId: summary.id,
                        sessionDate: summary.date,
                        savedAt: new Date().toISOString(),
                      })}
                      title={isMarked ? 'Remove from Toolkit' : 'Save to Toolkit'}
                    >
                      {isMarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Techniques Used */}
        {summary.techniquesUsed.length > 0 && (
          <div className="summary-section summary-techniques">
            <h3>Techniques Applied</h3>
            <div className="technique-chips">
              {summary.techniquesUsed.map((tech, i) => (
                <span key={i} className="technique-chip">{tech}</span>
              ))}
            </div>
          </div>
        )}

        {/* Homework */}
        {summary.homeworkAssignments.length > 0 && (
          <div className="summary-section homework">
            <h3>Practice This Week</h3>
            <ul>
              {summary.homeworkAssignments.map((item, i) => (
                <li key={i}><CheckCircle size={14} /> {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Focus Areas */}
        {summary.suggestedFocusAreas.length > 0 && (
          <div className="summary-section">
            <h3><Target size={16} /> Suggested Focus Areas</h3>
            <ul>
              {summary.suggestedFocusAreas.map((item, i) => (
                <li key={i}><CheckCircle size={14} /> {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Mood History Mini Chart */}
        {moodHistory.length >= 2 && (
          <div className="summary-section">
            <h3>Mood History</h3>
            <MoodHistoryChart moods={moodHistory} />
          </div>
        )}

        {/* Assessment Score */}
        {summary.preAssessment && (
          <div className="summary-section">
            <h3>Assessment Score</h3>
            <div className="assessment-score-display">
              <span className="assessment-type">{summary.preAssessment.type.toUpperCase()}</span>
              <span className="assessment-score" style={{ color: summary.preAssessment.color }}>
                {summary.preAssessment.totalScore}
              </span>
              <span className="assessment-severity">{summary.preAssessment.severity}</span>
            </div>
          </div>
        )}

        {/* Reflection */}
        <div className="summary-section">
          <h3>Your Reflection</h3>
          <textarea
            className="reflection-textarea"
            placeholder="How are you feeling after this session? What's one thing you want to remember?"
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <div className="reflection-actions">
            <span className="char-count">{reflection.length}/1000</span>
            <button className="btn-secondary" onClick={handleSaveReflection} disabled={!reflection.trim()}>
              {saved ? 'Saved!' : 'Save Reflection'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="summary-actions">
          <button className="btn-secondary" onClick={onOpenHistory}>
            <History size={16} /> View History
          </button>
          <button className="btn-secondary" onClick={handleExportPDF} disabled={exporting}>
            <Download size={16} /> {exporting ? 'Generating...' : 'Export PDF'}
          </button>
          <button className="btn-primary" onClick={onNewSession}>
            <RotateCcw size={16} /> New Session
          </button>
          <button className="btn-secondary" onClick={onGoHome}>
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline SVG mood history chart
function MoodHistoryChart({ moods }: { moods: MoodEntry[] }) {
  const recent = moods.slice(-20); // Last 20 mood entries
  if (recent.length < 2) return null;

  const width = 320;
  const height = 120;
  const pad = { top: 15, right: 10, bottom: 25, left: 30 };
  const cW = width - pad.left - pad.right;
  const cH = height - pad.top - pad.bottom;

  const points = recent.map((m, i) => ({
    x: pad.left + (i / (recent.length - 1)) * cW,
    y: pad.top + cH - ((m.value - 1) / 4) * cH, // values 1-5
    emoji: m.emoji,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Gradient area
  const areaD = pathD + ` L ${points[points.length - 1].x} ${pad.top + cH} L ${points[0].x} ${pad.top + cH} Z`;

  return (
    <div className="mood-history-chart">
      <svg viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-light)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-light)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis labels */}
        {[1, 2, 3, 4, 5].map(v => {
          const y = pad.top + cH - ((v - 1) / 4) * cH;
          return (
            <g key={v}>
              <line x1={pad.left} y1={y} x2={pad.left + cW} y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth={0.5} />
              <text x={pad.left - 5} y={y + 3} textAnchor="end" fill="rgba(148,163,184,0.4)" fontSize="8">{v}</text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#moodGrad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--accent-light)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="var(--accent-light)" stroke="var(--bg-card)" strokeWidth={1.5} />
            {/* Show emoji for first, last, and every 5th */}
            {(i === 0 || i === points.length - 1 || i % 5 === 0) && (
              <text x={p.x} y={height - 5} textAnchor="middle" fontSize="10">{p.emoji}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
