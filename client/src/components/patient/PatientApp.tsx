import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../hooks/useSession';
import {
  MessageCircle, History, BarChart3, BookOpen, Layers, Calendar, UserCircle,
  Heart, LogOut, PanelLeftOpen, Stethoscope, ShieldCheck,
} from 'lucide-react';
import { PatientSessions } from './PatientSessions';
import { PatientHistory } from './PatientHistory';
import { PatientProgress } from './PatientProgress';
import { PatientJournal } from './PatientJournal';
import { PatientExercises } from './PatientExercises';
import { PatientAppointments } from './PatientAppointments';
import { PatientDoctorInput } from './PatientDoctorInput';
import { PatientSettings } from './PatientSettings';
import { PatientAwareness } from './PatientAwareness';
import { TodaysDosesCard } from './TodaysDosesCard';
import { NotificationBell } from '../NotificationBell';
import { ThemeToggle } from '../ThemeToggle';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { users as usersApi, doctors as doctorsApi } from '../../services/api';
import { registerMedicationServiceWorker } from '../../utils/medicationReminders';
import type { OnboardingData } from '../../types/session';

type Tab = 'sessions' | 'history' | 'progress' | 'journal' | 'exercises' | 'appointments' | 'doctor-input' | 'awareness' | 'settings';

function isProfileIncomplete(user: Record<string, unknown> | null): boolean {
  if (!user) return false;
  const concerns = (user.primaryConcerns as string[]) || [];
  // Show onboarding if user has no age AND no primary concerns set
  return !user.age && concerns.length === 0;
}

export function PatientApp() {
  const { user, logout, refreshProfile } = useAuth();
  const session = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('sessions');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => {
    const id = (user as Record<string, unknown> | null)?.id as string | undefined;
    if (!id) return false;
    return localStorage.getItem(`onboarding_done_${id}`) === 'true';
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'sessions', label: 'New Session', icon: <MessageCircle size={18} /> },
    { id: 'history', label: 'History', icon: <History size={18} /> },
    { id: 'progress', label: 'Progress', icon: <BarChart3 size={18} /> },
    { id: 'journal', label: 'Journal', icon: <BookOpen size={18} /> },
    { id: 'exercises', label: 'Exercises', icon: <Layers size={18} /> },
    { id: 'doctor-input', label: "Doctor's Input", icon: <Stethoscope size={18} /> },
    { id: 'appointments', label: 'Appointments', icon: <Calendar size={18} /> },
    { id: 'awareness', label: 'Awareness', icon: <ShieldCheck size={18} /> },
    { id: 'settings', label: 'User Profile', icon: <UserCircle size={18} /> },
  ];

  const isSessionActive = session.phase === 'active';
  const showOnboarding = !onboardingDone && isProfileIncomplete(user as Record<string, unknown> | null);

  // Register service worker for persistent medication reminders
  useEffect(() => {
    registerMedicationServiceWorker();
  }, []);

  function handleSessionActive() {
    setSidebarCollapsed(true);
  }

  function handleSessionInactive() {
    setSidebarCollapsed(false);
  }

  const handleOnboardingComplete = useCallback(async (data: OnboardingData) => {
    try {
      // Link doctors by ID if provided (from DoctorSearch in onboarding)
      if (data.doctorIds && data.doctorIds.length > 0) {
        for (const id of data.doctorIds) {
          try { await doctorsApi.link(id); } catch { /* ignore */ }
        }
      }
      // Fallback: link by username if usernames provided
      if (data.doctorUsernames && data.doctorUsernames.length > 0) {
        for (const username of data.doctorUsernames) {
          try {
            const results = await doctorsApi.search(username);
            const match = results.find(d => (d.username as string) === username);
            if (match) { await doctorsApi.link(match.id as string); }
          } catch { /* ignore */ }
        }
      }
      // Save all profile data
      await usersApi.updateMe({
        displayName: data.preferredName !== 'there' ? data.preferredName : undefined,
        age: data.age,
        profession: data.profession,
        primaryConcerns: data.primaryConcerns,
        therapyExperience: data.therapyExperience,
        language: data.language,
        voicePreference: data.voicePreference,
        knownDisorders: data.knownDisorders,
        currentMedications: data.currentMedications,
      });
      await refreshProfile();
    } catch {
      // Silently continue even if save fails
    } finally {
      const id = (user as Record<string, unknown> | null)?.id as string | undefined;
      if (id) localStorage.setItem(`onboarding_done_${id}`, 'true');
      setOnboardingDone(true);
    }
  }, [refreshProfile, user]);

  const handleOnboardingSkip = useCallback(() => {
    const id = (user as Record<string, unknown> | null)?.id as string | undefined;
    if (id) localStorage.setItem(`onboarding_done_${id}`, 'true');
    setOnboardingDone(true);
  }, [user]);

  // Show onboarding fullscreen for new/incomplete profiles
  if (showOnboarding) {
    return (
      <div className="app">
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      </div>
    );
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
          <NotificationBell onNavigate={(tab) => setActiveTab(tab as Tab)} />
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
        {!isSessionActive && (
          <TodaysDosesCard onNavigateToDoctorInput={() => setActiveTab('doctor-input')} />
        )}
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
        {activeTab === 'doctor-input' && <PatientDoctorInput />}
        {activeTab === 'appointments' && <PatientAppointments />}
        {activeTab === 'awareness' && (
          <PatientAwareness onStartSession={() => setActiveTab('sessions')} />
        )}
        {activeTab === 'settings' && (
          <PatientSettings onProfileUpdated={session.refreshProfile} />
        )}
      </main>
    </div>
  );
}
