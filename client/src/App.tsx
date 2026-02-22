import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useSession } from './hooks/useSession';
import { AuthScreen } from './components/auth/AuthScreen';
import { RoleSelectScreen } from './components/RoleSelectScreen';
import { PatientApp } from './components/patient/PatientApp';
import { TherapistApp } from './components/therapist/TherapistApp';
import './App.css';

function AppContent() {
  const { isAuthenticated, isLoading, role, doctor } = useAuth();
  const session = useSession();

  // Auth loading state
  if (isLoading) {
    return (
      <div className="app">
        <div className="session-screen">
          <div className="session-header">
            <h1>Sukoon</h1>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated: show role-select → auth screen
  if (!isAuthenticated) {
    if (session.userRole) {
      return (
        <div className="app">
          <AuthScreen
            role={session.userRole}
            onBack={() => session.goBack()}
          />
        </div>
      );
    }

    return (
      <div className="app">
        <RoleSelectScreen onSelect={session.selectRole} />
      </div>
    );
  }

  // Authenticated as doctor/admin → therapist app
  if ((role === 'doctor' || role === 'admin') && doctor) {
    return (
      <div className="app">
        <TherapistApp />
      </div>
    );
  }

  // Authenticated as patient → patient sidebar app
  return (
    <div className="app">
      <PatientApp />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
