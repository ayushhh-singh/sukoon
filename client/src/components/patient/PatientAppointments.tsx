import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, User, X } from 'lucide-react';
import { doctors as doctorsApi, appointments as appointmentsApi } from '../../services/api';

interface LinkedDoctor {
  id: string;
  username: string;
  displayName: string;
}

interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  date_time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
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

  useEffect(() => {
    loadData();
  }, []);

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
        displayName: (d.display_name || d.displayName) as string,
      })));
      setAllAppointments(appts as unknown as Appointment[]);
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
      const appts = await appointmentsApi.list();
      setAllAppointments(appts as unknown as Appointment[]);
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
      const appts = await appointmentsApi.list();
      setAllAppointments(appts as unknown as Appointment[]);
    } catch {
      // ignore
    }
  }

  function getDoctorName(doctorId: string) {
    return linkedDoctors.find(d => d.id === doctorId)?.displayName || 'Doctor';
  }

  const now = new Date();
  const upcomingAppointments = allAppointments.filter(a =>
    a.status !== 'cancelled' && a.status !== 'completed' && new Date(a.date_time) >= now
  );
  const pastAppointments = allAppointments.filter(a =>
    a.status === 'completed' || a.status === 'cancelled' || new Date(a.date_time) < now
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
                  const dt = new Date(apt.date_time);
                  return (
                    <div key={apt.id} className="appointment-card">
                      <div className="appointment-card-info">
                        <span className="appointment-doctor">{getDoctorName(apt.doctor_id)}</span>
                        <span className="appointment-datetime">
                          <Calendar size={12} />
                          {dt.toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                          })}
                          {' '}at {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {apt.notes && <span className="appointment-notes">{apt.notes}</span>}
                      </div>
                      <div className="appointment-card-actions">
                        <span className={`appointment-status appointment-status-${apt.status}`}>
                          {apt.status}
                        </span>
                        <button
                          className="appointment-cancel-btn"
                          onClick={() => handleCancel(apt.id)}
                          title="Cancel appointment"
                        >
                          <X size={14} />
                        </button>
                      </div>
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
                const dt = new Date(apt.date_time);
                return (
                  <div key={apt.id} className="appointment-card appointment-card-past">
                    <div className="appointment-card-info">
                      <span className="appointment-doctor">{getDoctorName(apt.doctor_id)}</span>
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
    </div>
  );
}
