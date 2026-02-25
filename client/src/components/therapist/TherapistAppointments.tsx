import { useState, useEffect } from 'react';
import { Calendar, Clock, Check, X, User, Play, CheckCircle, RefreshCw, ClipboardCheck, ChevronDown, ChevronUp, FileText, Loader } from 'lucide-react';
import { appointments as appointmentsApi, doctors as doctorsApi, checkins as checkinsApi } from '../../services/api';
import { useRealtimeSubscription } from '../../contexts/RealtimeContext';

interface PatientInfo {
  id: string;
  displayName: string;
}

interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  dateTime: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'in_progress';
  notes: string | null;
  createdAt: string;
}

interface CheckinData {
  moodValue: number | null;
  moodLabel: string | null;
  concerns: string[];
  goalsForSession: string | null;
  symptomsSinceLast: string | null;
  medicationIssues: string | null;
}

export function TherapistAppointments({ onOpenSOAPNote }: { onOpenSOAPNote?: (appointmentId: string, patientId: string) => void }) {
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkinData, setCheckinData] = useState<Map<string, CheckinData>>(new Map());
  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [appts, pats] = await Promise.all([
        appointmentsApi.list(),
        doctorsApi.getMyPatients(),
      ]);
      const appointments = appts as unknown as Appointment[];
      setAllAppointments(appointments);
      setPatients(pats.map(p => ({
        id: p.id as string,
        displayName: p.displayName as string,
      })));

      // Load check-in data for confirmed/in_progress appointments
      const checkins = new Map<string, CheckinData>();
      const activeIds = appointments
        .filter(a => ['confirmed', 'in_progress'].includes(a.status))
        .map(a => a.id);
      for (const id of activeIds) {
        try {
          const data = await checkinsApi.get(id);
          if (data) {
            checkins.set(id, {
              moodValue: data.moodValue as number | null,
              moodLabel: data.moodLabel as string | null,
              concerns: (data.concerns ?? []) as string[],
              goalsForSession: data.goalsForSession as string | null,
              symptomsSinceLast: data.symptomsSinceLast as string | null,
              medicationIssues: data.medicationIssues as string | null,
            });
          }
        } catch { /* ignore */ }
      }
      setCheckinData(checkins);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Real-time: refetch when patient creates/reschedules appointments
  useRealtimeSubscription('appointment:*', () => { loadData(); });

  async function handleAccept(id: string) {
    try {
      await appointmentsApi.update(id, { status: 'confirmed' });
      loadData();
    } catch { /* ignore */ }
  }

  async function handleDecline(id: string) {
    try {
      await appointmentsApi.update(id, { status: 'cancelled' });
      loadData();
    } catch { /* ignore */ }
  }

  async function handleStart(id: string) {
    try {
      await appointmentsApi.start(id);
      loadData();
    } catch { /* ignore */ }
  }

  async function handleComplete(id: string) {
    try {
      await appointmentsApi.complete(id);
      loadData();
    } catch { /* ignore */ }
  }

  async function handleReschedule(id: string) {
    if (!rescheduleDate || !rescheduleTime) return;
    setSubmitting(true);
    try {
      await appointmentsApi.reschedule(id, {
        dateTime: `${rescheduleDate}T${rescheduleTime}:00`,
        reason: rescheduleReason.trim() || undefined,
      });
      setRescheduleId(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleReason('');
      loadData();
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  }

  function getPatientName(patientId: string) {
    return patients.find(p => p.id === patientId)?.displayName || 'Patient';
  }

  function isWithinWindow(dateTime: string, minutesBefore: number): boolean {
    const diff = new Date(dateTime).getTime() - Date.now();
    return diff <= minutesBefore * 60 * 1000 && diff > -60 * 60 * 1000;
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const pendingAppts = allAppointments.filter(a => a.status === 'pending');
  const inProgressAppts = allAppointments.filter(a => a.status === 'in_progress');
  const upcomingAppts = allAppointments.filter(a =>
    a.status === 'confirmed' && new Date(a.dateTime) >= now
  );
  const pastAppts = allAppointments.filter(a =>
    a.status === 'completed' || a.status === 'cancelled' || (a.status !== 'pending' && a.status !== 'in_progress' && new Date(a.dateTime) < now)
  );

  const MOOD_EMOJIS: Record<number, string> = { 1: '😢', 2: '😔', 3: '😐', 4: '🙂', 5: '😊' };

  function renderCheckinPreview(aptId: string) {
    const data = checkinData.get(aptId);
    if (!data) return null;
    const isExpanded = expandedCheckin === aptId;

    return (
      <div className="checkin-preview">
        <button className="checkin-preview-toggle" onClick={() => setExpandedCheckin(isExpanded ? null : aptId)}>
          <ClipboardCheck size={13} />
          <span>Patient check-in</span>
          {data.moodValue && <span className="checkin-mood-chip">{MOOD_EMOJIS[data.moodValue]} {data.moodLabel}</span>}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {isExpanded && (
          <div className="checkin-preview-body">
            {data.concerns.length > 0 && (
              <div className="checkin-preview-row"><strong>Concerns:</strong> {data.concerns.join(', ')}</div>
            )}
            {data.goalsForSession && (
              <div className="checkin-preview-row"><strong>Goals:</strong> {data.goalsForSession}</div>
            )}
            {data.symptomsSinceLast && (
              <div className="checkin-preview-row"><strong>Symptoms since last:</strong> {data.symptomsSinceLast}</div>
            )}
            {data.medicationIssues && (
              <div className="checkin-preview-row"><strong>Medication issues:</strong> {data.medicationIssues}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return <div className="therapist-page"><div className="therapist-loading">Loading appointments...</div></div>;
  }

  return (
    <div className="therapist-page">
      <div className="therapist-page-header">
        <h1 className="therapist-page-title">Appointments</h1>
      </div>

      {/* In-progress sessions */}
      {inProgressAppts.length > 0 && (
        <div className="appointments-section">
          <h3 className="appointments-section-title">
            <Loader size={16} className="spin" /> Active Sessions
            <span className="appointments-count">{inProgressAppts.length}</span>
          </h3>
          <div className="appointments-list">
            {inProgressAppts.map(apt => {
              const dt = new Date(apt.dateTime);
              return (
                <div key={apt.id} className="appointment-card appointment-card-active">
                  <div className="appointment-card-info">
                    <span className="appointment-patient"><User size={14} />{getPatientName(apt.patientId)}</span>
                    <span className="appointment-datetime">
                      <Calendar size={12} />
                      {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' '}at <Clock size={12} />{dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {apt.notes && <span className="appointment-notes">{apt.notes}</span>}
                    {renderCheckinPreview(apt.id)}
                  </div>
                  <div className="appointment-card-actions">
                    <button className="appointment-complete-btn" onClick={() => handleComplete(apt.id)}>
                      <CheckCircle size={16} /><span>Complete</span>
                    </button>
                    {onOpenSOAPNote && (
                      <button className="appointment-soap-btn" onClick={() => onOpenSOAPNote(apt.id, apt.patientId)} title="Add SOAP Note">
                        <FileText size={16} /><span>SOAP Note</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending requests */}
      <div className="appointments-section">
        <h3 className="appointments-section-title">
          Pending Requests
          {pendingAppts.length > 0 && <span className="appointments-count">{pendingAppts.length}</span>}
        </h3>
        {pendingAppts.length === 0 ? (
          <div className="appointments-empty"><Calendar size={32} /><p>No pending appointment requests</p></div>
        ) : (
          <div className="appointments-list">
            {pendingAppts.map(apt => {
              const dt = new Date(apt.dateTime);
              return (
                <div key={apt.id} className="appointment-card appointment-card-pending">
                  <div className="appointment-card-info">
                    <span className="appointment-patient"><User size={14} />{getPatientName(apt.patientId)}</span>
                    <span className="appointment-datetime">
                      <Calendar size={12} />
                      {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' '}at <Clock size={12} />{dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <span className="appointment-duration">{apt.duration} min</span>
                    {apt.notes && <span className="appointment-notes">{apt.notes}</span>}
                  </div>
                  <div className="appointment-card-actions">
                    <button className="appointment-accept-btn" onClick={() => handleAccept(apt.id)} title="Accept">
                      <Check size={16} /><span>Accept</span>
                    </button>
                    <button className="appointment-decline-btn" onClick={() => handleDecline(apt.id)} title="Decline">
                      <X size={16} /><span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming confirmed */}
      <div className="appointments-section">
        <h3 className="appointments-section-title">Upcoming</h3>
        {upcomingAppts.length === 0 ? (
          <div className="appointments-empty"><p>No upcoming appointments</p></div>
        ) : (
          <div className="appointments-list">
            {upcomingAppts.map(apt => {
              const dt = new Date(apt.dateTime);
              const canStart = isWithinWindow(apt.dateTime, 15);
              return (
                <div key={apt.id} className="appointment-card">
                  <div className="appointment-card-info">
                    <span className="appointment-patient"><User size={14} />{getPatientName(apt.patientId)}</span>
                    <span className="appointment-datetime">
                      <Calendar size={12} />
                      {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' '}at <Clock size={12} />{dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {apt.notes && <span className="appointment-notes">{apt.notes}</span>}
                    {renderCheckinPreview(apt.id)}
                  </div>
                  <div className="appointment-card-actions">
                    {canStart && (
                      <button className="appointment-start-btn" onClick={() => handleStart(apt.id)}>
                        <Play size={16} /><span>Start Session</span>
                      </button>
                    )}
                    <button className="appointment-reschedule-btn" onClick={() => setRescheduleId(rescheduleId === apt.id ? null : apt.id)} title="Reschedule">
                      <RefreshCw size={14} />
                    </button>
                    <span className="appointment-status appointment-status-confirmed">confirmed</span>
                  </div>

                  {rescheduleId === apt.id && (
                    <div className="appointment-reschedule-form">
                      <div className="appointments-row">
                        <input type="date" className="appointments-input" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} min={today} />
                        <input type="time" className="appointments-input" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} />
                      </div>
                      <input type="text" className="appointments-input" placeholder="Reason (optional)" value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)} maxLength={200} />
                      <div className="appointments-form-actions" style={{ marginTop: '0.5rem' }}>
                        <button className="btn-secondary" onClick={() => setRescheduleId(null)}>Cancel</button>
                        <button className="btn-primary" onClick={() => handleReschedule(apt.id)} disabled={!rescheduleDate || !rescheduleTime || submitting}>
                          {submitting ? 'Saving...' : 'Reschedule'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past */}
      {pastAppts.length > 0 && (
        <div className="appointments-section">
          <h3 className="appointments-section-title">Past</h3>
          <div className="appointments-list">
            {pastAppts.map(apt => {
              const dt = new Date(apt.dateTime);
              return (
                <div key={apt.id} className="appointment-card appointment-card-past">
                  <div className="appointment-card-info">
                    <span className="appointment-patient"><User size={14} />{getPatientName(apt.patientId)}</span>
                    <span className="appointment-datetime">
                      <Calendar size={12} />
                      {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="appointment-card-actions">
                    <span className={`appointment-status appointment-status-${apt.status}`}>{apt.status}</span>
                    {apt.status === 'completed' && onOpenSOAPNote && (
                      <button className="appointment-soap-btn" onClick={() => onOpenSOAPNote(apt.id, apt.patientId)} title="Add Note">
                        <FileText size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
