import { useState, useEffect } from 'react';
import { Calendar, Clock, Check, X, User } from 'lucide-react';
import { appointments as appointmentsApi, doctors as doctorsApi } from '../../services/api';

interface PatientInfo {
  id: string;
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
  created_at: string;
}

export function TherapistAppointments() {
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [appts, pats] = await Promise.all([
        appointmentsApi.list(),
        doctorsApi.getMyPatients(),
      ]);
      setAllAppointments(appts as unknown as Appointment[]);
      setPatients(pats.map(p => ({
        id: p.id as string,
        displayName: (p.displayName || p.display_name) as string,
      })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

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

  function getPatientName(patientId: string) {
    return patients.find(p => p.id === patientId)?.displayName || 'Patient';
  }

  const now = new Date();
  const pendingAppts = allAppointments.filter(a => a.status === 'pending');
  const upcomingAppts = allAppointments.filter(a =>
    a.status === 'confirmed' && new Date(a.date_time) >= now
  );
  const pastAppts = allAppointments.filter(a =>
    a.status === 'completed' || a.status === 'cancelled' || (a.status !== 'pending' && new Date(a.date_time) < now)
  );

  if (loading) {
    return <div className="therapist-page"><div className="therapist-loading">Loading appointments...</div></div>;
  }

  return (
    <div className="therapist-page">
      <div className="therapist-page-header">
        <h1 className="therapist-page-title">Appointments</h1>
      </div>

      {/* Pending requests */}
      <div className="appointments-section">
        <h3 className="appointments-section-title">
          Pending Requests
          {pendingAppts.length > 0 && <span className="appointments-count">{pendingAppts.length}</span>}
        </h3>
        {pendingAppts.length === 0 ? (
          <div className="appointments-empty">
            <Calendar size={32} />
            <p>No pending appointment requests</p>
          </div>
        ) : (
          <div className="appointments-list">
            {pendingAppts.map(apt => {
              const dt = new Date(apt.date_time);
              return (
                <div key={apt.id} className="appointment-card appointment-card-pending">
                  <div className="appointment-card-info">
                    <span className="appointment-patient">
                      <User size={14} />
                      {getPatientName(apt.patient_id)}
                    </span>
                    <span className="appointment-datetime">
                      <Calendar size={12} />
                      {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' '}at{' '}
                      <Clock size={12} />
                      {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <span className="appointment-duration">{apt.duration} min</span>
                    {apt.notes && <span className="appointment-notes">{apt.notes}</span>}
                  </div>
                  <div className="appointment-card-actions">
                    <button
                      className="appointment-accept-btn"
                      onClick={() => handleAccept(apt.id)}
                      title="Accept appointment"
                    >
                      <Check size={16} />
                      <span>Accept</span>
                    </button>
                    <button
                      className="appointment-decline-btn"
                      onClick={() => handleDecline(apt.id)}
                      title="Decline appointment"
                    >
                      <X size={16} />
                      <span>Decline</span>
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
          <div className="appointments-empty">
            <p>No upcoming appointments</p>
          </div>
        ) : (
          <div className="appointments-list">
            {upcomingAppts.map(apt => {
              const dt = new Date(apt.date_time);
              return (
                <div key={apt.id} className="appointment-card">
                  <div className="appointment-card-info">
                    <span className="appointment-patient">
                      <User size={14} />
                      {getPatientName(apt.patient_id)}
                    </span>
                    <span className="appointment-datetime">
                      <Calendar size={12} />
                      {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' '}at{' '}
                      <Clock size={12} />
                      {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {apt.notes && <span className="appointment-notes">{apt.notes}</span>}
                  </div>
                  <span className="appointment-status appointment-status-confirmed">confirmed</span>
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
              const dt = new Date(apt.date_time);
              return (
                <div key={apt.id} className="appointment-card appointment-card-past">
                  <div className="appointment-card-info">
                    <span className="appointment-patient">
                      <User size={14} />
                      {getPatientName(apt.patient_id)}
                    </span>
                    <span className="appointment-datetime">
                      <Calendar size={12} />
                      {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <span className={`appointment-status appointment-status-${apt.status}`}>{apt.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
