import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, FileText, Pill, MessageSquare, User } from 'lucide-react';
import { sessions as sessionsApi, notes as notesApi, medications as medsApi } from '../../services/api';
import { NoteEditor } from './NoteEditor';
import { MedicationEditor } from './MedicationEditor';

interface Props {
  patientId: string;
  patientName: string;
  onBack: () => void;
}

type SubTab = 'overview' | 'notes' | 'medications' | 'sessions';

export function TherapistPatientDetail({ patientId, patientName, onBack }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [sessionsList, setSessionsList] = useState<Record<string, unknown>[]>([]);
  const [notesList, setNotesList] = useState<Record<string, unknown>[]>([]);
  const [medsList, setMedsList] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Record<string, unknown> | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingMed, setEditingMed] = useState<Record<string, unknown> | null>(null);
  const [showMedEditor, setShowMedEditor] = useState(false);

  async function loadData() {
    try {
      const [sess, nts, mds] = await Promise.all([
        sessionsApi.list(),
        notesApi.list(patientId),
        medsApi.list(patientId),
      ]);
      setSessionsList(sess.filter(s => (s.userId as string) === patientId)
        .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()));
      setNotesList(nts);
      setMedsList(mds);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [patientId]);

  const latestSession = sessionsList[0];

  const tabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <User size={14} /> },
    { id: 'notes', label: 'Notes', icon: <FileText size={14} /> },
    { id: 'medications', label: 'Medications', icon: <Pill size={14} /> },
    { id: 'sessions', label: 'Sessions', icon: <MessageSquare size={14} /> },
  ];

  if (loading) {
    return <div className="therapist-page"><div className="therapist-loading">Loading...</div></div>;
  }

  return (
    <div className="therapist-page">
      <button className="therapist-back-btn" onClick={onBack}>
        <ArrowLeft size={18} />
        <span>All Patients</span>
      </button>

      <div className="therapist-patient-detail-header">
        <div className="therapist-patient-avatar-lg">{patientName.charAt(0).toUpperCase()}</div>
        <div>
          <h1 className="therapist-page-title" style={{ marginBottom: 0 }}>{patientName}</h1>
          <p className="therapist-patient-meta">{sessionsList.length} sessions</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="therapist-subtabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`therapist-subtab ${subTab === t.id ? 'active' : ''}`}
            onClick={() => setSubTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Overview */}
      {subTab === 'overview' && (
        <div className="therapist-detail-content">
          {latestSession?.clinicalImpression && (
            <div className="therapist-detail-card">
              <h3><FileText size={14} /> Latest Clinical Impression</h3>
              <p>{latestSession.clinicalImpression as string}</p>
              {latestSession.preliminaryDiagnosis && (
                <p className="therapist-diagnosis"><strong>Diagnosis:</strong> {latestSession.preliminaryDiagnosis as string}</p>
              )}
              {latestSession.riskLevel && (
                <span className={`risk-badge ${latestSession.riskLevel as string}`}>
                  <AlertTriangle size={12} /> Risk: {latestSession.riskLevel as string}
                </span>
              )}
            </div>
          )}

          {/* Mood trend */}
          {sessionsList.filter(s => s.preMoodValue != null).length > 1 && (
            <div className="therapist-detail-card">
              <h3>Mood Trend (Pre-Session)</h3>
              <div className="therapist-mood-chart">
                {sessionsList.slice(0, 10).reverse()
                  .filter(s => s.preMoodValue != null)
                  .map((s, i) => (
                    <div key={i} className="therapist-mood-bar-wrap">
                      <div
                        className="therapist-mood-bar"
                        style={{ height: `${((s.preMoodValue as number) / 5) * 100}%` }}
                      />
                      <span className="therapist-mood-label">
                        {new Date(s.date as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="therapist-detail-card">
            <h3>Summary</h3>
            <div className="therapist-detail-stats">
              <div><strong>Total Sessions:</strong> {sessionsList.length}</div>
              <div><strong>Active Medications:</strong> {medsList.filter(m => (m.status as string) === 'active').length}</div>
              <div><strong>Notes:</strong> {notesList.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {subTab === 'notes' && (
        <div className="therapist-detail-content">
          <button className="therapist-add-btn" onClick={() => { setEditingNote(null); setShowNoteEditor(true); }}>
            + Add Note
          </button>
          {notesList.length === 0 ? (
            <p className="therapist-empty">No notes yet.</p>
          ) : (
            <div className="therapist-notes-list">
              {notesList.map(n => (
                <div key={n.id as string} className="therapist-note-card">
                  <div className="therapist-note-header">
                    <span className={`therapist-note-type ${n.type as string}`}>{n.type as string}</span>
                    <span className="therapist-note-date">
                      {new Date(n.createdAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <h4 className="therapist-note-title">{n.title as string}</h4>
                  <p className="therapist-note-content">{n.content as string}</p>
                  {(n.tags as string[])?.length > 0 && (
                    <div className="therapist-note-tags">
                      {(n.tags as string[]).map(t => <span key={t} className="therapist-tag">{t}</span>)}
                    </div>
                  )}
                  <div className="therapist-note-actions">
                    <button onClick={() => { setEditingNote(n); setShowNoteEditor(true); }}>Edit</button>
                    <button onClick={async () => { await notesApi.remove(n.id as string); loadData(); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showNoteEditor && (
            <NoteEditor
              patientId={patientId}
              note={editingNote}
              onSave={() => { setShowNoteEditor(false); loadData(); }}
              onCancel={() => setShowNoteEditor(false)}
            />
          )}
        </div>
      )}

      {/* Medications */}
      {subTab === 'medications' && (
        <div className="therapist-detail-content">
          <button className="therapist-add-btn" onClick={() => { setEditingMed(null); setShowMedEditor(true); }}>
            + Add Medication
          </button>
          {medsList.length === 0 ? (
            <p className="therapist-empty">No medications prescribed.</p>
          ) : (
            <div className="therapist-meds-list">
              {medsList.map(m => (
                <div key={m.id as string} className="therapist-med-card">
                  <div className="therapist-med-header">
                    <span className="therapist-med-name">{m.name as string}</span>
                    <span className={`therapist-med-status ${m.status as string}`}>{m.status as string}</span>
                  </div>
                  <div className="therapist-med-details">
                    <span>Dosage: {m.dosage as string}</span>
                    <span>Frequency: {m.frequency as string}</span>
                    {m.startDate && <span>Started: {new Date(m.startDate as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  </div>
                  {m.notes && <p className="therapist-med-notes">{m.notes as string}</p>}
                  <div className="therapist-note-actions">
                    <button onClick={() => { setEditingMed(m); setShowMedEditor(true); }}>Edit</button>
                    <button onClick={async () => { await medsApi.remove(m.id as string); loadData(); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showMedEditor && (
            <MedicationEditor
              patientId={patientId}
              medication={editingMed}
              onSave={() => { setShowMedEditor(false); loadData(); }}
              onCancel={() => setShowMedEditor(false)}
            />
          )}
        </div>
      )}

      {/* Sessions Timeline */}
      {subTab === 'sessions' && (
        <div className="therapist-detail-content">
          {sessionsList.length === 0 ? (
            <p className="therapist-empty">No sessions yet.</p>
          ) : (
            <div className="therapist-timeline">
              {sessionsList.map(s => (
                <div key={s.id as string} className="therapist-timeline-entry">
                  <div className="therapist-timeline-dot" />
                  <div className="therapist-timeline-content">
                    <div className="therapist-timeline-header">
                      <span className="therapist-timeline-date">
                        {new Date(s.date as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="therapist-timeline-duration">{Math.round((s.duration as number) / 60)} min</span>
                      {s.mode && <span className="therapist-mode-tag">{s.mode as string}</span>}
                      {s.riskLevel && <span className={`risk-badge sm ${s.riskLevel as string}`}>{s.riskLevel as string}</span>}
                    </div>
                    {s.preMoodValue != null && s.postMoodValue != null && (
                      <p className="therapist-timeline-mood">
                        Mood: {s.preMoodValue as number} → {s.postMoodValue as number}
                      </p>
                    )}
                    {s.conversationAssessment && (
                      <p className="therapist-timeline-assessment">{s.conversationAssessment as string}</p>
                    )}
                    {(s.issuesIdentified as string[])?.length > 0 && (
                      <p className="therapist-timeline-issues">Issues: {(s.issuesIdentified as string[]).join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
