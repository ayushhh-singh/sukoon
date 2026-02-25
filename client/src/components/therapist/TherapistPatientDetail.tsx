import { useState, useEffect, type ReactNode } from 'react';
import { ArrowLeft, AlertTriangle, FileText, Pill, MessageSquare, User, ClipboardList, ChevronDown, ChevronUp, Brain, Target, TrendingUp, Compass, Shield, Activity, Lightbulb, Clock } from 'lucide-react';
import { sessions as sessionsApi, notes as notesApi, medications as medsApi } from '../../services/api';
import { NoteEditor } from './NoteEditor';
import { MedicationEditor } from './MedicationEditor';
import { TreatmentPlanView } from './TreatmentPlanView';
import { AssessmentChart } from './AssessmentChart';
import { SafetyPlanView } from './SafetyPlanView';
import { ClinicalTimeline } from './ClinicalTimeline';
import { ClinicalFormulationView } from './ClinicalFormulationView';

interface PatientInfo {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  age: number | null;
  profession: string | null;
  primaryConcerns: string[];
  knownDisorders: string[];
  currentMedications: string[];
}

interface Props {
  patientId: string;
  patientName: string;
  patientInfo?: PatientInfo;
  onBack: () => void;
}

type SubTab = 'overview' | 'notes' | 'medications' | 'sessions' | 'treatment' | 'assessments' | 'safety' | 'timeline' | 'formulation';

export function TherapistPatientDetail({ patientId, patientName, patientInfo, onBack }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [sessionsList, setSessionsList] = useState<Record<string, unknown>[]>([]);
  const [notesList, setNotesList] = useState<Record<string, unknown>[]>([]);
  const [medsList, setMedsList] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Record<string, unknown> | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingMed, setEditingMed] = useState<Record<string, unknown> | null>(null);
  const [showMedEditor, setShowMedEditor] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

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

  const tabs: { id: SubTab; label: string; icon: ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <User size={14} /> },
    { id: 'notes', label: 'Notes', icon: <FileText size={14} /> },
    { id: 'medications', label: 'Medications', icon: <Pill size={14} /> },
    { id: 'sessions', label: 'Sessions', icon: <MessageSquare size={14} /> },
    { id: 'treatment', label: 'Treatment', icon: <Target size={14} /> },
    { id: 'assessments', label: 'Assessments', icon: <Activity size={14} /> },
    { id: 'safety', label: 'Safety Plan', icon: <Shield size={14} /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
    { id: 'formulation', label: 'Formulation', icon: <Lightbulb size={14} /> },
  ];

  if (loading) {
    return <div className="therapist-page"><div className="therapist-loading">Loading...</div></div>;
  }

  const hasMedicalInfo = (patientInfo?.knownDisorders?.length ?? 0) > 0 ||
    (patientInfo?.currentMedications?.length ?? 0) > 0;

  function toggleSession(id: string) {
    setExpandedSessionId(prev => prev === id ? null : id);
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
          <p className="therapist-patient-meta">
            {sessionsList.length} sessions
            {patientInfo?.age ? ` · Age ${patientInfo.age}` : ''}
            {patientInfo?.profession ? ` · ${patientInfo.profession}` : ''}
          </p>
          {(patientInfo?.email || patientInfo?.phone) && (
            <p className="therapist-patient-meta" style={{ marginTop: '0.2rem' }}>
              {patientInfo.email && <a href={`mailto:${patientInfo.email}`}>{patientInfo.email}</a>}
              {patientInfo.email && patientInfo.phone && ' · '}
              {patientInfo.phone && <a href={`tel:${patientInfo.phone}`}>{patientInfo.phone}</a>}
            </p>
          )}
          {patientInfo?.primaryConcerns && patientInfo.primaryConcerns.length > 0 && (
            <p className="therapist-patient-meta" style={{ marginTop: '0.2rem' }}>
              {patientInfo.primaryConcerns.join(', ')}
            </p>
          )}
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
          {/* Medical history from patient profile */}
          {hasMedicalInfo && (
            <div className="therapist-detail-card therapist-medical-card">
              <h3><ClipboardList size={14} /> Medical History (Patient-Reported)</h3>
              {patientInfo!.knownDisorders.length > 0 && (
                <div className="therapist-medical-row">
                  <span className="therapist-medical-label">Diagnoses / Conditions</span>
                  <div className="therapist-medical-tags">
                    {patientInfo!.knownDisorders.map(d => (
                      <span key={d} className="therapist-medical-tag disorder">{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {patientInfo!.currentMedications.length > 0 && (
                <div className="therapist-medical-row">
                  <span className="therapist-medical-label">Current Medications</span>
                  <div className="therapist-medical-tags">
                    {patientInfo!.currentMedications.map(m => (
                      <span key={m} className="therapist-medical-tag medication">{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!!latestSession?.clinicalImpression && (
            <div className="therapist-detail-card">
              <h3><FileText size={14} /> Latest Clinical Impression</h3>
              <p>{latestSession.clinicalImpression as string}</p>
              {!!latestSession.preliminaryDiagnosis && (
                <p className="therapist-diagnosis"><strong>Diagnostic Impression:</strong> {latestSession.preliminaryDiagnosis as string}</p>
              )}
              {!!latestSession.riskLevel && (
                <span className={`risk-badge ${latestSession.riskLevel as string}`}>
                  <AlertTriangle size={12} /> Risk: {latestSession.riskLevel as string}
                </span>
              )}
            </div>
          )}

          {/* Clinical Picture card */}
          {latestSession && (!!latestSession.rootCauseAnalysis || (latestSession.triggerPoints as string[])?.length > 0 || !!latestSession.frequencyPatterns || !!latestSession.familyHistory) && (
            <div className="therapist-detail-card therapist-clinical-picture-card">
              <h3><Brain size={14} /> Clinical Picture</h3>
              {!!latestSession.rootCauseAnalysis && (
                <div className="therapist-clinical-row">
                  <span className="therapist-clinical-label">Root Cause Analysis</span>
                  <p className="therapist-clinical-value">{latestSession.rootCauseAnalysis as string}</p>
                </div>
              )}
              {(latestSession.triggerPoints as string[])?.length > 0 && (
                <div className="therapist-clinical-row">
                  <span className="therapist-clinical-label">Trigger Points</span>
                  <div className="therapist-medical-tags">
                    {(latestSession.triggerPoints as string[]).map(t => (
                      <span key={t} className="therapist-medical-tag trigger">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {!!latestSession.frequencyPatterns && (
                <div className="therapist-clinical-row">
                  <span className="therapist-clinical-label">Frequency / Patterns</span>
                  <p className="therapist-clinical-value">{latestSession.frequencyPatterns as string}</p>
                </div>
              )}
              {!!latestSession.familyHistory && (
                <div className="therapist-clinical-row">
                  <span className="therapist-clinical-label">Family History</span>
                  <p className="therapist-clinical-value">{latestSession.familyHistory as string}</p>
                </div>
              )}
            </div>
          )}

          {/* Treatment Direction card */}
          {latestSession && (!!latestSession.wayForward || (latestSession.recommendedActions as string[])?.length > 0) && (
            <div className="therapist-detail-card therapist-treatment-card">
              <h3><Compass size={14} /> Treatment Direction</h3>
              {!!latestSession.wayForward && (
                <div className="therapist-clinical-row">
                  <span className="therapist-clinical-label">Way Forward</span>
                  <p className="therapist-clinical-value">{latestSession.wayForward as string}</p>
                </div>
              )}
              {(latestSession.recommendedActions as string[])?.length > 0 && (
                <div className="therapist-clinical-row">
                  <span className="therapist-clinical-label">Recommended Actions</span>
                  <ol className="therapist-actions-list">
                    {(latestSession.recommendedActions as string[]).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {!!latestSession?.treatmentPlanAlignment && (
            <div className="therapist-detail-card treatment-alignment-card">
              <h3><Target size={14} /> AI Session Alignment with Your Treatment Plan</h3>
              <p className="therapist-clinical-value">{latestSession.treatmentPlanAlignment as string}</p>
            </div>
          )}

          {/* Mood trend */}
          {sessionsList.filter(s => s.preMoodValue != null).length > 1 && (
            <div className="therapist-detail-card">
              <h3><TrendingUp size={14} /> Mood Trend (Pre-Session)</h3>
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
                    {!!m.startDate && <span>Started: {new Date(m.startDate as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  </div>
                  {!!m.notes && <p className="therapist-med-notes">{m.notes as string}</p>}
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
              {sessionsList.map(s => {
                const sid = s.id as string;
                const isExpanded = expandedSessionId === sid;
                return (
                  <div key={sid} className={`therapist-timeline-entry ${isExpanded ? 'therapist-session-expanded' : ''}`}>
                    <div className="therapist-timeline-dot" />
                    <div className="therapist-timeline-content">
                      {/* Always-visible header row */}
                      <div className="therapist-timeline-header">
                        <span className="therapist-timeline-date">
                          {new Date(s.date as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="therapist-timeline-duration">{Math.round((s.duration as number) / 60)} min</span>
                        {!!s.mode && <span className="therapist-mode-tag">{s.mode as string}</span>}
                        {!!s.riskLevel && <span className={`risk-badge sm ${s.riskLevel as string}`}>{s.riskLevel as string}</span>}
                        <button
                          className="therapist-session-toggle"
                          onClick={() => toggleSession(sid)}
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          <span>{isExpanded ? 'Less' : 'Details'}</span>
                        </button>
                      </div>

                      {/* Mood */}
                      {s.preMoodValue != null && s.postMoodValue != null && (
                        <p className="therapist-timeline-mood">
                          Mood: {s.preMoodValue as number} → {s.postMoodValue as number}
                          {(s.postMoodValue as number) > (s.preMoodValue as number) && <span className="mood-improved"> ↑</span>}
                          {(s.postMoodValue as number) < (s.preMoodValue as number) && <span className="mood-declined"> ↓</span>}
                        </p>
                      )}

                      {/* Assessment brief */}
                      {!!s.conversationAssessment && (
                        <p className="therapist-timeline-assessment">{s.conversationAssessment as string}</p>
                      )}

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="therapist-session-details">
                          {(s.issuesIdentified as string[])?.length > 0 && (
                            <div className="therapist-session-detail-row">
                              <span className="therapist-session-detail-label"><Target size={11} /> Issues Identified</span>
                              <div className="therapist-medical-tags">
                                {(s.issuesIdentified as string[]).map(issue => (
                                  <span key={issue} className="therapist-medical-tag issue">{issue}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {!!s.emotionalJourney && (
                            <div className="therapist-session-detail-row">
                              <span className="therapist-session-detail-label">Emotional Journey</span>
                              <p className="therapist-session-detail-value">{s.emotionalJourney as string}</p>
                            </div>
                          )}

                          {!!s.rootCauseAnalysis && (
                            <div className="therapist-session-detail-row">
                              <span className="therapist-session-detail-label"><Brain size={11} /> Root Cause Analysis</span>
                              <p className="therapist-session-detail-value">{s.rootCauseAnalysis as string}</p>
                            </div>
                          )}

                          {(s.triggerPoints as string[])?.length > 0 && (
                            <div className="therapist-session-detail-row">
                              <span className="therapist-session-detail-label">Trigger Points</span>
                              <div className="therapist-medical-tags">
                                {(s.triggerPoints as string[]).map(t => (
                                  <span key={t} className="therapist-medical-tag trigger">{t}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {!!s.frequencyPatterns && (
                            <div className="therapist-session-detail-row">
                              <span className="therapist-session-detail-label">Frequency / Patterns</span>
                              <p className="therapist-session-detail-value">{s.frequencyPatterns as string}</p>
                            </div>
                          )}

                          {!!s.familyHistory && (
                            <div className="therapist-session-detail-row">
                              <span className="therapist-session-detail-label">Family History</span>
                              <p className="therapist-session-detail-value">{s.familyHistory as string}</p>
                            </div>
                          )}

                          {(s.keyTakeaways as string[])?.length > 0 && (
                            <div className="therapist-session-detail-row">
                              <span className="therapist-session-detail-label">Key Takeaways</span>
                              <ul className="therapist-session-list">
                                {(s.keyTakeaways as string[]).map((k, i) => <li key={i}>{k}</li>)}
                              </ul>
                            </div>
                          )}

                          {!!s.clinicalImpression && (
                            <div className="therapist-session-detail-row">
                              <span className="therapist-session-detail-label">Clinical Impression</span>
                              <p className="therapist-session-detail-value">{s.clinicalImpression as string}</p>
                              {!!s.preliminaryDiagnosis && (
                                <p className="therapist-diagnosis" style={{ marginTop: '0.4rem' }}>
                                  <strong>Diagnostic Impression:</strong> {s.preliminaryDiagnosis as string}
                                </p>
                              )}
                            </div>
                          )}

                          {(s.recommendedActions as string[])?.length > 0 && (
                            <div className="therapist-session-detail-row">
                              <span className="therapist-session-detail-label"><Compass size={11} /> Recommended Actions</span>
                              <ol className="therapist-actions-list">
                                {(s.recommendedActions as string[]).map((a, i) => <li key={i}>{a}</li>)}
                              </ol>
                            </div>
                          )}

                          {!!s.wayForward && (
                            <div className="therapist-session-detail-row">
                              <span className="therapist-session-detail-label">Way Forward</span>
                              <p className="therapist-session-detail-value">{s.wayForward as string}</p>
                            </div>
                          )}

                          {!!s.patientMedicalContext && (
                            <div className="therapist-session-detail-row">
                              <span className="therapist-session-detail-label">Medical Context</span>
                              <p className="therapist-session-detail-value">{s.patientMedicalContext as string}</p>
                            </div>
                          )}

                          {!!s.treatmentPlanAlignment && (
                            <div className="therapist-session-detail-row treatment-alignment-card">
                              <span className="therapist-session-detail-label">AI Session Alignment with Your Treatment Plan</span>
                              <p className="therapist-session-detail-value">{s.treatmentPlanAlignment as string}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Treatment Plans */}
      {subTab === 'treatment' && (
        <div className="therapist-detail-content">
          <TreatmentPlanView patientId={patientId} />
        </div>
      )}

      {/* Assessments */}
      {subTab === 'assessments' && (
        <div className="therapist-detail-content">
          <AssessmentChart patientId={patientId} />
        </div>
      )}

      {/* Safety Plan */}
      {subTab === 'safety' && (
        <div className="therapist-detail-content">
          <SafetyPlanView patientId={patientId} />
        </div>
      )}

      {/* Clinical Timeline */}
      {subTab === 'timeline' && (
        <div className="therapist-detail-content">
          <ClinicalTimeline patientId={patientId} />
        </div>
      )}

      {/* Clinical Formulation */}
      {subTab === 'formulation' && (
        <div className="therapist-detail-content">
          <ClinicalFormulationView patientId={patientId} />
        </div>
      )}
    </div>
  );
}
