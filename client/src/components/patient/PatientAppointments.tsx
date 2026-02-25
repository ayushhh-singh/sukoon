import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, User, X, ClipboardCheck, RefreshCw, Loader } from 'lucide-react';
import { doctors as doctorsApi, appointments as appointmentsApi, checkins as checkinsApi } from '../../services/api';
import { useRealtimeSubscription } from '../../contexts/RealtimeContext';
import { AppointmentCheckinForm } from './AppointmentCheckinForm';

interface LinkedDoctor {
  id: string;
  username: string;
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
  rescheduleReason: string | null;
}

export function PatientAppointments() {
  const [linkedDoctors, setLinkedDoctors] = useState<LinkedDoctor[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkinAppointmentId, setCheckinAppointmentId] = useState<string | null>(null);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Real-time: refetch when doctor updates appointment status
  useRealtimeSubscription('appointment:*', () => { loadData(); });

  async function loadData() {
    setLoading(true);
    try {
      const [docs, appts] = await Promise.all([
        doctorsApi.getMyLinkedDoctors(),
        appointmentsApi.list(),
      ]);
      setLinkedDoctors(docs.map(d => ({
        id: d.id as string,
        username: d.username as string,
        displayName: d.displayName as string,
      })));
      const appointments = appts as unknown as Appointment[];
      setAllAppointments(appointments);

      // Check which appointments have check-ins
      const confirmedIds = appointments
        .filter(a => a.status === 'confirmed' || a.status === 'in_progress')
        .map(a => a.id);
      const checkedIn = new Set<string>();
      for (const id of confirmedIds) {
        try {
          const checkin = await checkinsApi.get(id);
          if (checkin) checkedIn.add(id);
        } catch { /* ignore */ }
      }
      setCheckedInIds(checkedIn);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSchedule() {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    try {
      const dateTime = `${selectedDate}T${selectedTime}:00`;
      await appointmentsApi.create({
        doctorId: selectedDoctor,
        dateTime,
        duration: 30,
        notes: appointmentNotes.trim() || undefined,
      });
      await loadData();
      setShowScheduleForm(false);
      setSelectedDoctor('');
      setSelectedDate('');
      setSelectedTime('');
      setAppointmentNotes('');
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await appointmentsApi.update(id, { status: 'cancelled' });
      await loadData();
    } catch {
      // ignore
    }
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
      await loadData();
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  }

  function getDoctorName(doctorId: string) {
    return linkedDoctors.find(d => d.id === doctorId)?.displayName || 'Doctor';
  }

  function canCheckin(apt: Appointment): boolean {
    if (apt.status !== 'confirmed') return false;
    if (checkedInIds.has(apt.id)) return false;
    const diff = new Date(apt.dateTime).getTime() - Date.now();
    return diff > 0 && diff <= 24 * 60 * 60 * 1000; // within 24h
  }

  const now = new Date();
  const upcomingAppointments = allAppointments.filter(a =>
    a.status !== 'cancelled' && a.status !== 'completed' && new Date(a.dateTime) >= now
  );
  const pastAppointments = allAppointments.filter(a =>
    a.status === 'completed' || a.status === 'cancelled' || new Date(a.dateTime) < now
  );

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="patient-tab-content">
      <div className="appointments-container">
        <div className="appointments-header">
          <h2>Appointments</h2>
          <button
            className="btn-primary appointments-schedule-btn"
            onClick={() => setShowScheduleForm(true)}
          >
            <Plus size={16} />
            <span>Schedule Appointment</span>
          </button>
        </div>

        {/* Schedule form */}
        {showScheduleForm && (
          <div className="appointments-form">
            <h3>Schedule New Appointment</h3>

            <div className="appointments-field">
              <label>
                <User size={14} /> Doctor
              </label>
              {loading ? (
                <p>Loading doctors...</p>
              ) : linkedDoctors.length === 0 ? (
                <p className="appointments-hint">
                  No linked doctors. Go to Settings to link with a doctor first.
                </p>
              ) : (
                <select
                  className="appointments-select"
                  value={selectedDoctor}
                  onChange={e => setSelectedDoctor(e.target.value)}
                >
                  <option value="">Select a doctor</option>
                  {linkedDoctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.displayName} (@{d.username})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="appointments-row">
              <div className="appointments-field">
                <label>
                  <Calendar size={14} /> Date
                </label>
                <input
                  type="date"
                  className="appointments-input"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  min={today}
                />
              </div>
              <div className="appointments-field">
                <label>
                  <Clock size={14} /> Time
                </label>
                <input
                  type="time"
                  className="appointments-input"
                  value={selectedTime}
                  onChange={e => setSelectedTime(e.target.value)}
                />
              </div>
            </div>

            <div className="appointments-field">
              <label>Notes (optional)</label>
              <input
                type="text"
                className="appointments-input"
                placeholder="What would you like to discuss?"
                value={appointmentNotes}
                onChange={e => setAppointmentNotes(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="appointments-form-actions">
              <button className="btn-secondary" onClick={() => setShowScheduleForm(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSchedule}
                disabled={!selectedDoctor || !selectedDate || !selectedTime || submitting}
              >
                {submitting ? 'Scheduling...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        {loading && <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</p>}

        {/* Upcoming appointments */}
        {!loading && (
          <div className="appointments-section">
            <h3>Upcoming</h3>
            {upcomingAppointments.length === 0 ? (
              <div className="appointments-empty">
                <Calendar size={40} />
                <p>No upcoming appointments. Schedule one to get started.</p>
              </div>
            ) : (
              <div className="appointments-list">
                {upcomingAppointments.map(apt => {
                  const dt = new Date(apt.dateTime);
                  return (
                    <div key={apt.id} className={`appointment-card ${apt.status === 'in_progress' ? 'appointment-card-active' : ''}`}>
                      <div className="appointment-card-info">
                        <span className="appointment-doctor">{getDoctorName(apt.doctorId)}</span>
                        <span className="appointment-datetime">
                          <Calendar size={12} />
                          {dt.toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                          })}
                          {' '}at {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {apt.notes && <span className="appointment-notes">{apt.notes}</span>}
                        {apt.status === 'in_progress' && (
                          <span className="appointment-live-badge"><Loader size={12} className="spin" /> Session in progress</span>
                        )}
                        {checkedInIds.has(apt.id) && apt.status !== 'in_progress' && (
                          <span className="appointment-checkedin-badge"><ClipboardCheck size={12} /> Check-in submitted</span>
                        )}
                      </div>
                      <div className="appointment-card-actions">
                        <span className={`appointment-status appointment-status-${apt.status}`}>
                          {apt.status === 'in_progress' ? 'in progress' : apt.status}
                        </span>
                        {canCheckin(apt) && (
                          <button
                            className="btn-primary appointment-checkin-btn"
                            onClick={() => setCheckinAppointmentId(apt.id)}
                          >
                            <ClipboardCheck size={14} /> Check In
                          </button>
                        )}
                        {(apt.status === 'confirmed' || apt.status === 'pending') && (
                          <button
                            className="appointment-reschedule-btn"
                            onClick={() => setRescheduleId(rescheduleId === apt.id ? null : apt.id)}
                            title="Reschedule"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                        {apt.status !== 'in_progress' && (
                          <button
                            className="appointment-cancel-btn"
                            onClick={() => handleCancel(apt.id)}
                            title="Cancel appointment"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Inline reschedule form */}
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
        )}

        {/* Past appointments */}
        {!loading && pastAppointments.length > 0 && (
          <div className="appointments-section">
            <h3>Past</h3>
            <div className="appointments-list">
              {pastAppointments.map(apt => {
                const dt = new Date(apt.dateTime);
                return (
                  <div key={apt.id} className="appointment-card appointment-card-past">
                    <div className="appointment-card-info">
                      <span className="appointment-doctor">{getDoctorName(apt.doctorId)}</span>
                      <span className="appointment-datetime">
                        <Calendar size={12} />
                        {dt.toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                        {' '}at {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className={`appointment-status appointment-status-${apt.status}`}>
                      {apt.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Check-in modal */}
      {checkinAppointmentId && (
        <AppointmentCheckinForm
          appointmentId={checkinAppointmentId}
          onSave={() => {
            setCheckinAppointmentId(null);
            loadData();
          }}
          onCancel={() => setCheckinAppointmentId(null)}
        />
      )}
    </div>
  );
}
