import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { auth, setToken, clearToken, getStoredToken } from '../services/api';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  [key: string]: unknown;
}

interface AuthDoctor {
  id: string;
  email: string;
  username: string;
  displayName: string;
  [key: string]: unknown;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  role: 'patient' | 'doctor' | 'admin' | null;
  user: AuthUser | null;
  doctor: AuthDoctor | null;
  login: (email: string, password: string) => Promise<void>;
  registerPatient: (data: Record<string, unknown>) => Promise<void>;
  registerDoctor: (data: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin' | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [doctor, setDoctor] = useState<AuthDoctor | null>(null);

  // Rehydrate from stored token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    auth.me()
      .then((data) => {
        if (data.role === 'patient' && data.user) {
          setRole('patient');
          setUser(normalizeUser(data.user));
        } else if ((data.role === 'doctor' || data.role === 'admin') && data.doctor) {
          setRole(data.role as 'doctor' | 'admin');
          setDoctor(normalizeDoctor(data.doctor));
        }
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await auth.login(email, password);
    setToken(data.token);
    if (data.role === 'patient' && data.user) {
      setRole('patient');
      setUser(normalizeUser(data.user));
    } else if ((data.role === 'doctor' || data.role === 'admin') && data.doctor) {
      setRole(data.role as 'doctor' | 'admin');
      setDoctor(normalizeDoctor(data.doctor));
    }
  }, []);

  const registerPatient = useCallback(async (regData: Record<string, unknown>) => {
    const data = await auth.registerPatient(regData);
    setToken(data.token);
    setRole('patient');
    setUser(normalizeUser(data.user));
  }, []);

  const registerDoctor = useCallback(async (regData: Record<string, unknown>) => {
    const data = await auth.registerDoctor(regData);
    setToken(data.token);
    setRole('doctor');
    setDoctor(normalizeDoctor(data.doctor));
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setRole(null);
    setUser(null);
    setDoctor(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await auth.me();
      if (data.role === 'patient' && data.user) {
        setUser(normalizeUser(data.user));
      } else if ((data.role === 'doctor' || data.role === 'admin') && data.doctor) {
        setDoctor(normalizeDoctor(data.doctor));
      }
    } catch {
      // Silently fail
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!role,
      isLoading,
      role,
      user,
      doctor,
      login,
      registerPatient,
      registerDoctor,
      logout,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function normalizeUser(raw: Record<string, unknown>): AuthUser {
  return {
    id: raw.id as string,
    email: raw.email as string,
    displayName: (raw.display_name || raw.displayName) as string,
    age: raw.age as number | null,
    profession: raw.profession as string | null,
    primaryConcerns: (raw.primary_concerns || raw.primaryConcerns || []) as string[],
    therapyExperience: (raw.therapy_experience || raw.therapyExperience || 'none') as string,
    language: (raw.language || 'English') as string,
    voicePreference: (raw.voice_preference || raw.voicePreference || 'female') as string,
    ambientSound: (raw.ambient_sound || raw.ambientSound || 'none') as string,
    consentGiven: raw.consent_given as number,
    createdAt: (raw.created_at || raw.createdAt) as string,
  };
}

function normalizeDoctor(raw: Record<string, unknown>): AuthDoctor {
  return {
    id: raw.id as string,
    email: raw.email as string,
    username: raw.username as string,
    displayName: (raw.display_name || raw.displayName) as string,
    age: raw.age as number | null,
    gender: raw.gender as string | null,
    experienceYears: (raw.experience_years || raw.experienceYears) as number | null,
    specializations: (raw.specializations || []) as string[],
    qualifications: raw.qualifications as string | null,
    bio: raw.bio as string | null,
    clinicName: (raw.clinic_name || raw.clinicName) as string | null,
    phone: raw.phone as string | null,
    acceptingPatients: (raw.accepting_patients ?? raw.acceptingPatients ?? 1) as number,
    createdAt: (raw.created_at || raw.createdAt) as string,
  };
}
