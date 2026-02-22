import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Users, FileText, Pill, UserCircle, LogOut, Stethoscope } from 'lucide-react';
import { TherapistOverview } from './TherapistOverview';
import { TherapistPatients } from './TherapistPatients';
import { TherapistNotes } from './TherapistNotes';
import { TherapistMedications } from './TherapistMedications';
import { TherapistProfile } from './TherapistProfile';
import { ThemeToggle } from '../ThemeToggle';

type Tab = 'dashboard' | 'patients' | 'notes' | 'medications' | 'profile';

export function TherapistApp() {
  const { doctor, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'patients', label: 'Patients', icon: <Users size={18} /> },
    { id: 'notes', label: 'Notes', icon: <FileText size={18} /> },
    { id: 'medications', label: 'Medications', icon: <Pill size={18} /> },
    { id: 'profile', label: 'Profile', icon: <UserCircle size={18} /> },
  ];

  return (
    <div className="therapist-app">
      <aside className="therapist-sidebar">
        <div className="therapist-sidebar-brand">
          <Stethoscope size={20} />
          <span>Sukoon</span>
        </div>
        <div className="therapist-sidebar-doctor">
          <div className="therapist-sidebar-avatar">
            {((doctor?.displayName as string) || 'D').charAt(0).toUpperCase()}
          </div>
          <div className="therapist-sidebar-info">
            <span className="therapist-sidebar-name">{(doctor?.displayName as string) || 'Doctor'}</span>
            <span className="therapist-sidebar-role">Therapist</span>
          </div>
        </div>
        <nav className="therapist-sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`therapist-sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="therapist-sidebar-footer">
          <ThemeToggle />
          <button className="therapist-sidebar-logout" onClick={logout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="therapist-main">
        {activeTab === 'dashboard' && <TherapistOverview />}
        {activeTab === 'patients' && <TherapistPatients />}
        {activeTab === 'notes' && <TherapistNotes />}
        {activeTab === 'medications' && <TherapistMedications />}
        {activeTab === 'profile' && <TherapistProfile />}
      </main>
    </div>
  );
}
