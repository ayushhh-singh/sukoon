import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, Building, Award, Briefcase, User, Stethoscope } from 'lucide-react';
import { doctors as doctorsApi } from '../../services/api';

interface DoctorProfile {
  id: string;
  displayName: string;
  username: string;
  email?: string;
  phone?: string;
  specializations: string[];
  experienceYears: number | null;
  qualifications: string | null;
  bio: string | null;
  clinicName: string | null;
  clinicAddress: string | null;
  acceptingPatients: number;
}

interface Props {
  doctorId: string;
  onBack: () => void;
}

export function LinkedDoctorProfile({ doctorId, onBack }: Props) {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await doctorsApi.getById(doctorId);
        setDoctor({
          id: data.id as string,
          displayName: data.displayName as string,
          username: data.username as string,
          email: data.email as string | undefined,
          phone: data.phone as string | undefined,
          specializations: (data.specializations || []) as string[],
          experienceYears: data.experienceYears as number | null,
          qualifications: data.qualifications as string | null,
          bio: data.bio as string | null,
          clinicName: data.clinicName as string | null,
          clinicAddress: data.clinicAddress as string | null,
          acceptingPatients: (data.acceptingPatients ?? 1) as number,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="doctor-profile-view">
        <button className="doctor-profile-back" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <div className="doctor-profile-loading">Loading doctor profile...</div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="doctor-profile-view">
        <button className="doctor-profile-back" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <div className="doctor-profile-loading">Doctor not found</div>
      </div>
    );
  }

  return (
    <div className="doctor-profile-view">
      <button className="doctor-profile-back" onClick={onBack}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="doctor-profile-card">
        <div className="doctor-profile-header">
          <div className="doctor-profile-avatar">
            {doctor.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="doctor-profile-name-section">
            <h2>Dr. {doctor.displayName}</h2>
            <span className="doctor-profile-username">@{doctor.username}</span>
            {doctor.acceptingPatients ? (
              <span className="doctor-profile-accepting">Accepting patients</span>
            ) : (
              <span className="doctor-profile-not-accepting">Not accepting patients</span>
            )}
          </div>
        </div>

        {doctor.bio && (
          <div className="doctor-profile-section">
            <h3><User size={16} /> About</h3>
            <p>{doctor.bio}</p>
          </div>
        )}

        <div className="doctor-profile-section">
          <h3><Stethoscope size={16} /> Professional Details</h3>
          <div className="doctor-profile-details">
            {doctor.specializations.length > 0 && (
              <div className="doctor-profile-detail">
                <Award size={14} />
                <span><strong>Specializations:</strong> {doctor.specializations.join(', ')}</span>
              </div>
            )}
            {doctor.experienceYears != null && (
              <div className="doctor-profile-detail">
                <Briefcase size={14} />
                <span><strong>Experience:</strong> {doctor.experienceYears} year{doctor.experienceYears !== 1 ? 's' : ''}</span>
              </div>
            )}
            {doctor.qualifications && (
              <div className="doctor-profile-detail">
                <Award size={14} />
                <span><strong>Qualifications:</strong> {doctor.qualifications}</span>
              </div>
            )}
          </div>
        </div>

        {(doctor.clinicName || doctor.clinicAddress) && (
          <div className="doctor-profile-section">
            <h3><Building size={16} /> Clinic</h3>
            <div className="doctor-profile-details">
              {doctor.clinicName && (
                <div className="doctor-profile-detail">
                  <Building size={14} />
                  <span>{doctor.clinicName}</span>
                </div>
              )}
              {doctor.clinicAddress && (
                <div className="doctor-profile-detail">
                  <MapPin size={14} />
                  <span>{doctor.clinicAddress}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(doctor.email || doctor.phone) && (
          <div className="doctor-profile-section">
            <h3><Phone size={16} /> Contact</h3>
            <div className="doctor-profile-details">
              {doctor.email && (
                <div className="doctor-profile-detail">
                  <Mail size={14} />
                  <a href={`mailto:${doctor.email}`}>{doctor.email}</a>
                </div>
              )}
              {doctor.phone && (
                <div className="doctor-profile-detail">
                  <Phone size={14} />
                  <a href={`tel:${doctor.phone}`}>{doctor.phone}</a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
