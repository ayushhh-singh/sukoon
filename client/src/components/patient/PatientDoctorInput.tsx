import { useState, useEffect, useCallback } from 'react';
import { FileText, Pill, Clock, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Flame, BellRing, History } from 'lucide-react';
import { notes as notesApi, medications as medsApi, doctors as doctorsApi } from '../../services/api';
import { getNextDoseTime, getRefillCountdown, postMedicationsToSW } from '../../utils/medicationReminders';

interface DoctorNote {
  id: string;
  doctor_id: string;
  note_type: string;
  title: string | null;
  content: string;
  tags: string[];
  created_at: string;
}

interface Medication {
  id: string;
  doctor_id: string;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  status: string;
  patient_start_time: string | null;
  dose_times: string[];
}

interface DoseTally {
  medication_id: string;
  total: number;
  taken: number;
  skipped: number;
  missed: number;
}

interface DayLog {
  day: string;
  status: string;
  scheduled_time: string;
}

type SubTab = 'notes' | 'medications';

export function PatientDoctorInput() {
  const [subTab, setSubTab] = useState<SubTab>('medications');
  const [notesList, setNotesList] = useState<DoctorNote[]>([]);
  const [medsList, setMedsList] = useState<Medication[]>([]);
  const [tallies, setTallies] = useState<Map<string, DoseTally>>(new Map());
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map());
  const [recentLogs, setRecentLogs] = useState<Map<string, DayLog[]>>(new Map());
  const [doctorMap, setDoctorMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedMed, setExpandedMed] = useState<string | null>(null);
  const [collapsedDoctors, setCollapsedDoctors] = useState<Set<string>>(new Set());
  const [loggingDose, setLoggingDose] = useState(false);
  const [pendingLog, setPendingLog] = useState<{ medId: string; status: 'taken' | 'skipped' } | null>(null);
  const [doseNote, setDoseNote] = useState('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    () => ('Notification' in window ? Notification.permission : 'denied')
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const linkedDoctors = await doctorsApi.getMyLinkedDoctors();
      const dMap = new Map<string, string>(
        linkedDoctors.map(d => [d.id as string, (d.displayName as string) || 'Dr. Unknown'])
      );
      setDoctorMap(dMap);

      if (subTab === 'notes') {
        const data = await notesApi.list();
        setNotesList(data as unknown as DoctorNote[]);
      } else {
        const [meds, tallyData] = await Promise.all([
          medsApi.list(),
          medsApi.getAllTallies(),
        ]);
        const medsTyped = meds as unknown as Medication[];
        setMedsList(medsTyped);
        const tallyMap = new Map<string, DoseTally>();
        (tallyData as unknown as DoseTally[]).forEach(t => tallyMap.set(t.medication_id, t));
        setTallies(tallyMap);

        // Post active med schedules to service worker for persistent reminders
        const activeMedsForSW = medsTyped
          .filter(m => m.status === 'active' && m.dose_times?.length > 0)
          .map(m => ({ id: m.id, name: m.name, dosage: m.dosage, frequency: m.frequency, doseTimes: m.dose_times }));
        postMedicationsToSW(activeMedsForSW);

        // Fetch streaks for active medications
        const activeMeds = medsTyped.filter(m => m.status === 'active');
        const streakResults = await Promise.allSettled(
          activeMeds.map(m => medsApi.getStreak(m.id).then(r => ({ id: m.id, streak: r.streak })))
        );
        const streakMap = new Map<string, number>();
        streakResults.forEach(r => {
          if (r.status === 'fulfilled') streakMap.set(r.value.id, r.value.streak);
        });
        setStreaks(streakMap);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [subTab]);

  useEffect(() => { loadData(); }, [loadData]);

  // Keep notifPermission in sync with the actual browser value
  useEffect(() => {
    if (!('Notification' in window)) return;
    setNotifPermission(Notification.permission);
  }, []);

  // Set up browser notification reminders at dose times
  useEffect(() => {
    if (medsList.length === 0) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const activeMeds = medsList.filter(m => m.status === 'active' && m.dose_times?.length > 0);
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function scheduleReminder(med: Medication, timeStr: string, daysFromNow: number) {
      const [h, m] = timeStr.split(':').map(Number);
      const doseTime = new Date();
      doseTime.setDate(doseTime.getDate() + daysFromNow);
      doseTime.setHours(h, m, 0, 0);
      const msUntil = doseTime.getTime() - Date.now();
      if (msUntil > 0) {
        const t = setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification(`Time to take ${med.name}`, {
              body: `${med.dosage} · ${med.frequency}`,
              icon: '/favicon.ico',
              tag: `med-${med.id}-${timeStr}-${daysFromNow}`,
            });
          }
        }, msUntil);
        timeouts.push(t);
      }
    }

    for (const med of activeMeds) {
      let scheduledAny = false;
      for (const timeStr of med.dose_times) {
        const [h, m] = timeStr.split(':').map(Number);
        const doseTime = new Date();
        doseTime.setHours(h, m, 0, 0);
        if (doseTime > new Date()) {
          scheduleReminder(med, timeStr, 0); // today
          scheduledAny = true;
        }
      }
      // If all today's dose times have passed, schedule the first dose tomorrow
      if (!scheduledAny) {
        const sorted = [...med.dose_times].sort();
        scheduleReminder(med, sorted[0], 1);
      }
    }

    return () => timeouts.forEach(t => clearTimeout(t));
  }, [medsList]);

  // Fetch recent logs when a card is expanded
  useEffect(() => {
    if (!expandedMed) return;
    if (recentLogs.has(expandedMed)) return; // already fetched

    medsApi.getRecentLogs(expandedMed, 7).then(logs => {
      setRecentLogs(prev => new Map(prev).set(expandedMed, logs as unknown as DayLog[]));
    }).catch(() => {
      // ignore
    });
  }, [expandedMed, recentLogs]);

  async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      // Fire a test notification so user knows it's working
      new Notification('Reminders enabled!', {
        body: 'You\'ll be notified when it\'s time to take your medications.',
        icon: '/favicon.ico',
        tag: 'med-reminders-enabled',
      });
    }
  }

  function initiateLogDose(medId: string, status: 'taken' | 'skipped') {
    if (status === 'taken') {
      setPendingLog({ medId, status });
      setDoseNote('');
    } else {
      void commitLogDose(medId, status, '');
    }
  }

  async function commitLogDose(medId: string, status: 'taken' | 'skipped', note: string) {
    setLoggingDose(true);
    setPendingLog(null);
    try {
      await medsApi.logDose(medId, {
        scheduledTime: new Date().toISOString(),
        status,
        takenAt: status === 'taken' ? new Date().toISOString() : undefined,
        notes: note || undefined,
      });
      const [tallyData, streakData] = await Promise.all([
        medsApi.getAllTallies(),
        medsApi.getStreak(medId),
      ]);
      const tallyMap = new Map<string, DoseTally>();
      (tallyData as unknown as DoseTally[]).forEach(t => tallyMap.set(t.medication_id, t));
      setTallies(tallyMap);
      setStreaks(prev => new Map(prev).set(medId, streakData.streak));
      setRecentLogs(prev => { const next = new Map(prev); next.delete(medId); return next; });
    } catch {
      // ignore
    } finally {
      setLoggingDose(false);
    }
  }

  async function handleSetStartTime(medId: string) {
    try {
      await medsApi.update(medId, { patientStartTime: new Date().toISOString() });
      loadData();
    } catch {
      // ignore
    }
  }

  async function handleSetDoseTimes(medId: string, times: string[]) {
    try {
      await medsApi.update(medId, { doseTimes: times });
      loadData();
    } catch {
      // ignore
    }
  }

  function toggleDoctorCollapse(doctorId: string) {
    setCollapsedDoctors(prev => {
      const next = new Set(prev);
      if (next.has(doctorId)) next.delete(doctorId);
      else next.add(doctorId);
      return next;
    });
  }

  function getDaysUntilEnd(endDate: string | null): number | null {
    if (!endDate) return null;
    const end = new Date(endDate).getTime();
    const now = Date.now();
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  }

  function getAdherencePercent(tally: DoseTally | undefined): number {
    if (!tally || tally.total === 0) return 0;
    return Math.round((tally.taken / tally.total) * 100);
  }

  function getNextDoseLabel(doseTimes: string[]): string | null {
    const next = getNextDoseTime(doseTimes);
    if (!next) return null;
    const [h, m] = next.split(':').map(Number);
    const now = new Date();
    const doseTime = new Date();
    doseTime.setHours(h, m, 0, 0);
    if (doseTime <= now) {
      // Next dose is tomorrow
      doseTime.setDate(doseTime.getDate() + 1);
    }
    const diffMs = doseTime.getTime() - now.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffH === 0) return `${diffM}m`;
    if (diffM === 0) return `${diffH}h`;
    return `${diffH}h ${diffM}m`;
  }

  // Group medications by doctor_id
  const medsGroupedByDoctor = new Map<string, { active: Medication[]; other: Medication[] }>();
  medsList.forEach(m => {
    if (!medsGroupedByDoctor.has(m.doctor_id)) {
      medsGroupedByDoctor.set(m.doctor_id, { active: [], other: [] });
    }
    const group = medsGroupedByDoctor.get(m.doctor_id)!;
    if (m.status === 'active') group.active.push(m);
    else group.other.push(m);
  });

  // Group notes by doctor_id
  const notesGroupedByDoctor = new Map<string, DoctorNote[]>();
  notesList.forEach(n => {
    if (!notesGroupedByDoctor.has(n.doctor_id)) notesGroupedByDoctor.set(n.doctor_id, []);
    notesGroupedByDoctor.get(n.doctor_id)!.push(n);
  });

  function renderDoctorGroupHeader(doctorId: string, count: number, label: string) {
    const isCollapsed = collapsedDoctors.has(doctorId);
    const name = doctorMap.get(doctorId) || 'Dr. Unknown';
    return (
      <div className="patient-doctor-group-header" onClick={() => toggleDoctorCollapse(doctorId)}>
        <div className="patient-doctor-group-info">
          <div className="patient-doctor-group-avatar">{name.charAt(0).toUpperCase()}</div>
          <span className="patient-doctor-group-name">Dr. {name}</span>
          <span className="patient-doctor-group-count">{count} {label}{count !== 1 ? 's' : ''}</span>
        </div>
        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </div>
    );
  }

  function renderMedCard(med: Medication) {
    const tally = tallies.get(med.id);
    const daysLeft = getDaysUntilEnd(med.end_date);
    const adherence = getAdherencePercent(tally);
    const streak = streaks.get(med.id) ?? 0;
    const isExpanded = expandedMed === med.id;
    const isEndingSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
    const hasEnded = daysLeft !== null && daysLeft <= 0;
    const nextDoseLabel = med.dose_times?.length > 0 ? getNextDoseLabel(med.dose_times) : null;
    const logs = recentLogs.get(med.id) ?? null;
    const refill = getRefillCountdown(med.end_date);
    const isPendingThisMed = pendingLog?.medId === med.id;

    return (
      <div key={med.id} className={`doctor-input-med-card ${isEndingSoon ? 'ending-soon' : ''} ${hasEnded ? 'ended' : ''}`}>
        {hasEnded && (
          <div className="med-warning med-warning-ended">
            <AlertTriangle size={14} />
            <span>This medication has passed its end date. Please consult your doctor.</span>
          </div>
        )}
        {isEndingSoon && !hasEnded && (
          <div className="med-warning med-warning-ending">
            <AlertTriangle size={14} />
            <span>Ending in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="med-card-main" onClick={() => setExpandedMed(isExpanded ? null : med.id)}>
          <div className="med-card-info">
            <div className="med-card-name-row">
              <span className="med-card-name">{med.name}</span>
              {streak > 0 && (
                <span className="med-streak-badge">
                  <Flame size={12} />
                  {streak}d streak
                </span>
              )}
            </div>
            <span className="med-card-dosage">{med.dosage} — {med.frequency}</span>
            <div className="med-card-meta-row">
              <span className="med-card-dates">
                Since {new Date(med.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                {med.end_date && ` until ${new Date(med.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
              </span>
              {nextDoseLabel && (
                <span className="med-next-dose">
                  <BellRing size={11} />
                  {nextDoseLabel}
                </span>
              )}
              {refill.label && (
                <span className={`med-refill-badge refill-${refill.urgency}`}>
                  <Pill size={10} />
                  {refill.label}
                </span>
              )}
            </div>
          </div>
          <div className="med-card-right">
            {tally && tally.total > 0 && (
              <div className="med-adherence">
                <div className="med-adherence-bar">
                  <div className="med-adherence-fill" style={{ width: `${adherence}%` }} />
                </div>
                <span className="med-adherence-text">{adherence}%</span>
              </div>
            )}
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {isExpanded && (
          <div className="med-card-expanded">
            {med.notes && (
              <div className="med-card-doctor-notes">
                <strong>Doctor's notes:</strong> {med.notes}
              </div>
            )}

            {tally && tally.total > 0 && (
              <div className="med-tally">
                <div className="med-tally-item med-tally-taken">
                  <CheckCircle size={14} />
                  <span>{tally.taken} taken</span>
                </div>
                <div className="med-tally-item med-tally-skipped">
                  <XCircle size={14} />
                  <span>{tally.skipped} skipped</span>
                </div>
                <div className="med-tally-item med-tally-missed">
                  <AlertTriangle size={14} />
                  <span>{tally.missed} missed</span>
                </div>
              </div>
            )}

            {/* 7-day calendar */}
            <MedCalendar logs={logs} />

            {!med.patient_start_time ? (
              <button className="med-start-btn" onClick={() => handleSetStartTime(med.id)}>
                <Clock size={14} />
                <span>Mark as started (set start time)</span>
              </button>
            ) : (
              <div className="med-started-info">
                <Clock size={14} />
                <span>Started: {new Date(med.patient_start_time).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
                })}</span>
              </div>
            )}

            <DoseTimeEditor
              doseTimes={med.dose_times || []}
              onSave={(times) => handleSetDoseTimes(med.id, times)}
            />

            {/* Medication history timeline */}
            <div className="med-history-timeline">
              <div className="med-history-label">
                <History size={13} /> Timeline
              </div>
              <div className="med-history-events">
                <div className="med-history-event">
                  <div className="med-history-dot prescribed" />
                  <span className="med-history-text">Prescribed</span>
                  <span className="med-history-date">
                    {new Date(med.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {med.patient_start_time && (
                  <div className="med-history-event">
                    <div className="med-history-dot started" />
                    <span className="med-history-text">You started</span>
                    <span className="med-history-date">
                      {new Date(med.patient_start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {streak > 0 && (
                  <div className="med-history-event">
                    <div className="med-history-dot streak" />
                    <span className="med-history-text">Current streak</span>
                    <span className="med-history-date">{streak} day{streak !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {med.end_date && (
                  <div className="med-history-event">
                    <div className={`med-history-dot ${hasEnded ? 'ended' : 'future'}`} />
                    <span className="med-history-text">{hasEnded ? 'Course ended' : 'Course ends'}</span>
                    <span className="med-history-date">
                      {new Date(med.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="med-log-actions">
              <button
                className="med-log-btn med-log-taken"
                onClick={() => initiateLogDose(med.id, 'taken')}
                disabled={loggingDose}
              >
                <CheckCircle size={16} />
                <span>Took dose</span>
              </button>
              <button
                className="med-log-btn med-log-skipped"
                onClick={() => initiateLogDose(med.id, 'skipped')}
                disabled={loggingDose}
              >
                <XCircle size={16} />
                <span>Skipped dose</span>
              </button>
            </div>

            {isPendingThisMed && (
              <div className="med-note-prompt">
                <input
                  className="med-note-input"
                  type="text"
                  placeholder="How are you feeling? (optional note)"
                  value={doseNote}
                  onChange={e => setDoseNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && commitLogDose(med.id, 'taken', doseNote)}
                  autoFocus
                />
                <div className="med-note-actions">
                  <button className="med-note-confirm" onClick={() => commitLogDose(med.id, 'taken', doseNote)}>
                    Confirm taken
                  </button>
                  <button className="med-note-cancel" onClick={() => setPendingLog(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="patient-tab-content">
      <div className="doctor-input-container">
        <h2>Doctor's Input</h2>

        <div className="doctor-input-tabs">
          <button
            className={`doctor-input-tab ${subTab === 'medications' ? 'active' : ''}`}
            onClick={() => setSubTab('medications')}
          >
            <Pill size={16} />
            <span>Medications</span>
          </button>
          <button
            className={`doctor-input-tab ${subTab === 'notes' ? 'active' : ''}`}
            onClick={() => setSubTab('notes')}
          >
            <FileText size={16} />
            <span>Notes</span>
          </button>
        </div>

        {/* Notification permission banner */}
        {'Notification' in window && notifPermission === 'default' && subTab === 'medications' && (
          <div className="med-notif-banner">
            <BellRing size={16} />
            <span>Enable reminders to get notified when it's time to take your medication.</span>
            <button className="med-notif-banner-btn" onClick={requestNotificationPermission}>
              Enable
            </button>
          </div>
        )}

        {loading && <div className="doctor-input-loading">Loading...</div>}

        {/* Notes Sub-tab */}
        {!loading && subTab === 'notes' && (
          <div className="doctor-input-notes">
            {notesList.length === 0 ? (
              <div className="doctor-input-empty">
                <FileText size={40} />
                <p>No notes from your therapist yet</p>
              </div>
            ) : (
              <div className="patient-doctor-groups">
                {Array.from(notesGroupedByDoctor.entries()).map(([doctorId, notes]) => {
                  const isCollapsed = collapsedDoctors.has(doctorId);
                  return (
                    <div key={doctorId} className="patient-doctor-group">
                      {renderDoctorGroupHeader(doctorId, notes.length, 'note')}
                      {!isCollapsed && (
                        <div className="doctor-input-notes-list">
                          {notes.map(note => (
                            <div key={note.id} className="doctor-input-note-card">
                              <div className="doctor-input-note-header">
                                <span className={`doctor-input-note-type ${note.note_type}`}>{note.note_type}</span>
                                <span className="doctor-input-note-date">
                                  {new Date(note.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                  })}
                                </span>
                              </div>
                              {note.title && <h4 className="doctor-input-note-title">{note.title}</h4>}
                              <p className="doctor-input-note-content">{note.content}</p>
                              {note.tags?.length > 0 && (
                                <div className="doctor-input-note-tags">
                                  {note.tags.map(t => <span key={t} className="doctor-input-tag">{t}</span>)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Medications Sub-tab */}
        {!loading && subTab === 'medications' && (
          <div className="doctor-input-meds">
            {medsList.length === 0 ? (
              <div className="doctor-input-empty">
                <Pill size={40} />
                <p>No medications prescribed yet</p>
              </div>
            ) : (
              <div className="patient-doctor-groups">
                {Array.from(medsGroupedByDoctor.entries()).map(([doctorId, groups]) => {
                  const isCollapsed = collapsedDoctors.has(doctorId);
                  const totalCount = groups.active.length + groups.other.length;
                  return (
                    <div key={doctorId} className="patient-doctor-group">
                      {renderDoctorGroupHeader(doctorId, totalCount, 'medication')}
                      {!isCollapsed && (
                        <div className="patient-doctor-group-body">
                          {groups.active.length > 0 && (
                            <div className="doctor-input-meds-section">
                              <h4 className="doctor-input-meds-section-label">Active</h4>
                              {groups.active.map(med => renderMedCard(med))}
                            </div>
                          )}
                          {groups.other.length > 0 && (
                            <div className="doctor-input-meds-section">
                              <h4 className="doctor-input-meds-section-label">Past</h4>
                              {groups.other.map(med => {
                                const tally = tallies.get(med.id);
                                return (
                                  <div key={med.id} className="doctor-input-med-card doctor-input-med-past">
                                    <div className="med-card-main">
                                      <div className="med-card-info">
                                        <span className="med-card-name">{med.name}</span>
                                        <span className="med-card-dosage">{med.dosage} — {med.frequency}</span>
                                      </div>
                                      <div className="med-card-right">
                                        <span className={`med-status med-status-${med.status}`}>{med.status}</span>
                                        {tally && tally.total > 0 && (
                                          <span className="med-adherence-text">{Math.round((tally.taken / tally.total) * 100)}% adherence</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 7-day calendar component showing dose history
function MedCalendar({ logs }: { logs: DayLog[] | null }) {
  if (logs === null) {
    return <div className="med-calendar-loading">Loading history...</div>;
  }

  // Build last 7 days (today last)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  // Best status per day: taken > skipped > missed
  const statusPriority: Record<string, number> = { taken: 3, skipped: 2, missed: 1 };
  const dayStatusMap = new Map<string, string>();
  logs.forEach(l => {
    const existing = dayStatusMap.get(l.day);
    if (!existing || (statusPriority[l.status] ?? 0) > (statusPriority[existing] ?? 0)) {
      dayStatusMap.set(l.day, l.status);
    }
  });

  return (
    <div className="med-calendar">
      <span className="med-calendar-label">Last 7 days</span>
      <div className="med-calendar-row">
        {days.map(day => {
          const status = dayStatusMap.get(day);
          const d = new Date(day + 'T00:00:00');
          const isToday = day === new Date().toISOString().split('T')[0];
          const dayLabel = isToday ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' });
          return (
            <div key={day} className={`med-calendar-day ${status ? `med-cal-${status}` : 'med-cal-none'}`}>
              <div className="med-calendar-dot" title={status ?? 'no log'} />
              <span className="med-calendar-day-label">{dayLabel}</span>
            </div>
          );
        })}
      </div>
      <div className="med-calendar-legend">
        <span className="med-cal-legend-item med-cal-taken">Taken</span>
        <span className="med-cal-legend-item med-cal-skipped">Skipped</span>
        <span className="med-cal-legend-item med-cal-missed">Missed</span>
        <span className="med-cal-legend-item med-cal-none">No log</span>
      </div>
    </div>
  );
}

// Dose time editor sub-component
function DoseTimeEditor({ doseTimes, onSave }: { doseTimes: string[]; onSave: (times: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [times, setTimes] = useState<string[]>(doseTimes.length > 0 ? doseTimes : ['08:00']);

  function addTime() {
    setTimes([...times, '12:00']);
  }

  function removeTime(idx: number) {
    setTimes(times.filter((_, i) => i !== idx));
  }

  function updateTime(idx: number, value: string) {
    const updated = [...times];
    updated[idx] = value;
    setTimes(updated);
  }

  function handleSave() {
    onSave(times);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="dose-times-display">
        {doseTimes.length > 0 ? (
          <div className="dose-times-list">
            <Clock size={14} />
            <span>Dose times: {doseTimes.join(', ')}</span>
            <button className="dose-times-edit-btn" onClick={() => setEditing(true)}>Edit</button>
          </div>
        ) : (
          <button className="dose-times-set-btn" onClick={() => setEditing(true)}>
            <Clock size={14} />
            <span>Set dose reminder times</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="dose-times-editor">
      <span className="dose-times-label">Dose Times:</span>
      {times.map((t, idx) => (
        <div key={idx} className="dose-time-row">
          <input
            type="time"
            value={t}
            onChange={e => updateTime(idx, e.target.value)}
            className="dose-time-input"
          />
          {times.length > 1 && (
            <button className="dose-time-remove" onClick={() => removeTime(idx)}>
              <XCircle size={14} />
            </button>
          )}
        </div>
      ))}
      <div className="dose-times-actions">
        <button className="dose-times-add" onClick={addTime}>+ Add time</button>
        <button className="dose-times-save" onClick={handleSave}>Save</button>
        <button className="dose-times-cancel" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
}
