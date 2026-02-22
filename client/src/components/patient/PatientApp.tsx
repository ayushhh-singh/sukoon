import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../hooks/useSession';
import {
  MessageCircle, History, BarChart3, BookOpen, Layers, Calendar, Settings,
  Heart, LogOut, PanelLeftOpen,
} from 'lucide-react';
import { PatientSessions } from './PatientSessions';
import { PatientHistory } from './PatientHistory';
import { PatientProgress } from './PatientProgress';
import { PatientJournal } from './PatientJournal';
import { PatientExercises } from './PatientExercises';
import { PatientAppointments } from './PatientAppointments';
import { PatientSettings } from './PatientSettings';
import { ThemeToggle } from '../ThemeToggle';

type Tab = 'sessions' | 'history' | 'progress' | 'journal' | 'exercises' | 'appointments' | 'settings';

export function PatientApp() {
  const { user, logout } = useAuth();
  const session = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('sessions');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'sessions', label: 'Sessions', icon: <MessageCircle size={18} /> },
    { id: 'history', label: 'History', icon: <History size={18} /> },
    { id: 'progress', label: 'Progress', icon: <BarChart3 size={18} /> },
    { id: 'journal', label: 'Journal', icon: <BookOpen size={18} /> },
    { id: 'exercises', label: 'Exercises', icon: <Layers size={18} /> },
    { id: 'appointments', label: 'Appointments', icon: <Calendar size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const isSessionActive = session.phase === 'active';

  function handleSessionActive() {
    setSidebarCollapsed(true);
  }

  function handleSessionInactive() {
    setSidebarCollapsed(false);
  }

  return (
    <div className="patient-app">
      {/* Sidebar */}
      <aside className={`patient-sidebar ${isSessionActive || sidebarCollapsed ? 'patient-sidebar-collapsed' : ''}`}>
        <div className="patient-sidebar-brand">
          <Heart size={20} />
          <span>Sukoon</span>
        </div>
        <div className="patient-sidebar-user">
          <div className="patient-sidebar-avatar">
            {((user?.displayName as string) || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="patient-sidebar-info">
            <span className="patient-sidebar-name">{(user?.displayName as string) || 'User'}</span>
            <span className="patient-sidebar-role">Patient</span>
          </div>
        </div>
        <nav className="patient-sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`patient-sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="patient-sidebar-footer">
          <ThemeToggle />
          <button className="patient-sidebar-logout" onClick={logout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Expand button when sidebar is collapsed during active session */}
      {(isSessionActive || sidebarCollapsed) && (
        <button
          className="patient-sidebar-expand"
          onClick={() => setSidebarCollapsed(false)}
          title="Show sidebar"
        >
          <PanelLeftOpen size={20} />
        </button>
      )}

      {/* Main content */}
      <main className="patient-main">
        {activeTab === 'sessions' && (
          <PatientSessions
            session={session}
            onSessionActive={handleSessionActive}
            onSessionInactive={handleSessionInactive}
          />
        )}
        {activeTab === 'history' && (
          <PatientHistory
            bookmarks={session.bookmarks}
            onToggleBookmark={session.toggleBookmark}
          />
        )}
        {activeTab === 'progress' && <PatientProgress />}
        {activeTab === 'journal' && <PatientJournal />}
        {activeTab === 'exercises' && (
          <PatientExercises
            activeExercises={session.activeExercises}
            onToggleExercise={session.toggleExercise}
          />
        )}
        {activeTab === 'appointments' && <PatientAppointments />}
        {activeTab === 'settings' && (
          <PatientSettings onProfileUpdated={session.refreshProfile} />
        )}
      </main>
    </div>
  );
}
