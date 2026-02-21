import type { AssessmentResult } from '../types/assessments';
import type { MoodEntry } from '../types/mood';
import type { SessionSummary, OnboardingData, BookmarkedStrategy, AmbientSound, UserProfile, DoctorProfile } from '../types/session';
import type { RetentionData, MilestoneId } from '../types/retention';

const KEYS = {
  SESSIONS: 'sukoon_sessions',
  ASSESSMENTS: 'sukoon_assessments',
  MOODS: 'sukoon_moods',
  CONSENT: 'sukoon_consent',
  BOOKMARKS: 'sukoon_bookmarks',
  AMBIENT: 'sukoon_ambient',
  PROFILES: 'sukoon_profiles',
  ACTIVE_PROFILE: 'sukoon_active_profile',
  DOCTORS: 'sukoon_doctors',
  ACTIVE_DOCTOR: 'sukoon_active_doctor',
  USER_ROLE: 'sukoon_user_role',
} as const;

const MAX_SESSIONS = 100;

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be full or unavailable
  }
}

export const StorageService = {
  // Sessions
  getSessions(): SessionSummary[] {
    return getItem<SessionSummary[]>(KEYS.SESSIONS, []);
  },

  getSessionsForUser(userId: string): SessionSummary[] {
    return this.getSessions().filter(s => s.userId === userId);
  },

  saveSession(session: SessionSummary): void {
    const sessions = this.getSessions();
    sessions.push(session);
    while (sessions.length > MAX_SESSIONS) sessions.shift();
    setItem(KEYS.SESSIONS, sessions);
  },

  // Assessments
  getAssessments(): AssessmentResult[] {
    return getItem<AssessmentResult[]>(KEYS.ASSESSMENTS, []);
  },

  saveAssessment(result: AssessmentResult): void {
    const assessments = this.getAssessments();
    assessments.push(result);
    setItem(KEYS.ASSESSMENTS, assessments);
  },

  getLatestAssessment(type: string): AssessmentResult | null {
    const all = this.getAssessments().filter(a => a.type === type);
    return all.length > 0 ? all[all.length - 1] : null;
  },

  // Moods
  getMoods(): MoodEntry[] {
    return getItem<MoodEntry[]>(KEYS.MOODS, []);
  },

  saveMood(mood: MoodEntry): void {
    const moods = this.getMoods();
    moods.push(mood);
    setItem(KEYS.MOODS, moods);
  },

  // User Profiles
  getProfiles(): UserProfile[] {
    return getItem<UserProfile[]>(KEYS.PROFILES, []);
  },

  saveProfile(profile: UserProfile): void {
    const profiles = this.getProfiles();
    const idx = profiles.findIndex(p => p.id === profile.id);
    if (idx >= 0) {
      profiles[idx] = profile;
    } else {
      profiles.push(profile);
    }
    setItem(KEYS.PROFILES, profiles);
  },

  deleteProfile(id: string): void {
    const profiles = this.getProfiles().filter(p => p.id !== id);
    setItem(KEYS.PROFILES, profiles);
  },

  getActiveProfileId(): string | null {
    return localStorage.getItem(KEYS.ACTIVE_PROFILE);
  },

  setActiveProfileId(id: string): void {
    localStorage.setItem(KEYS.ACTIVE_PROFILE, id);
  },

  getActiveProfile(): UserProfile | null {
    const id = this.getActiveProfileId();
    if (!id) return null;
    return this.getProfiles().find(p => p.id === id) ?? null;
  },

  // Onboarding (derived from active profile — kept for backward compat)
  getOnboarding(): OnboardingData | null {
    return this.getActiveProfile()?.onboarding ?? null;
  },

  // Doctor Profiles
  getDoctors(): DoctorProfile[] {
    return getItem<DoctorProfile[]>(KEYS.DOCTORS, []);
  },

  saveDoctor(doctor: DoctorProfile): void {
    const doctors = this.getDoctors();
    const idx = doctors.findIndex(d => d.id === doctor.id);
    if (idx >= 0) {
      doctors[idx] = doctor;
    } else {
      doctors.push(doctor);
    }
    setItem(KEYS.DOCTORS, doctors);
  },

  getDoctorByUsername(username: string): DoctorProfile | null {
    return this.getDoctors().find(d => d.username.toLowerCase() === username.toLowerCase()) ?? null;
  },

  getActiveDoctorId(): string | null {
    return localStorage.getItem(KEYS.ACTIVE_DOCTOR);
  },

  setActiveDoctorId(id: string): void {
    localStorage.setItem(KEYS.ACTIVE_DOCTOR, id);
  },

  getActiveDoctor(): DoctorProfile | null {
    const id = this.getActiveDoctorId();
    if (!id) return null;
    return this.getDoctors().find(d => d.id === id) ?? null;
  },

  // Role
  getUserRole(): 'patient' | 'doctor' | null {
    return localStorage.getItem(KEYS.USER_ROLE) as 'patient' | 'doctor' | null;
  },

  setUserRole(role: 'patient' | 'doctor'): void {
    localStorage.setItem(KEYS.USER_ROLE, role);
  },

  // Get patients linked to a specific doctor username
  getPatientsForDoctor(doctorUsername: string): UserProfile[] {
    const lower = doctorUsername.toLowerCase();
    return this.getProfiles().filter(
      p => p.doctorUsernames?.some(d => d.toLowerCase() === lower)
    );
  },

  // Last session concerns per profile (used to pre-fill concern picker)
  getLastConcerns(profileId: string): string[] {
    return getItem<string[]>(`sukoon_last_concerns_${profileId}`, []);
  },

  saveLastConcerns(profileId: string, concerns: string[]): void {
    if (concerns.length > 0) setItem(`sukoon_last_concerns_${profileId}`, concerns);
  },

  // Consent
  hasConsented(): boolean {
    return localStorage.getItem(KEYS.CONSENT) === 'true';
  },

  setConsented(): void {
    localStorage.setItem(KEYS.CONSENT, 'true');
  },

  // Bookmarks
  getBookmarks(): BookmarkedStrategy[] {
    return getItem<BookmarkedStrategy[]>(KEYS.BOOKMARKS, []);
  },

  addBookmark(strategy: BookmarkedStrategy): void {
    const bookmarks = this.getBookmarks();
    if (!bookmarks.find(b => b.text === strategy.text)) {
      bookmarks.push(strategy);
      setItem(KEYS.BOOKMARKS, bookmarks);
    }
  },

  removeBookmark(text: string): void {
    const bookmarks = this.getBookmarks().filter(b => b.text !== text);
    setItem(KEYS.BOOKMARKS, bookmarks);
  },

  isBookmarked(text: string): boolean {
    return this.getBookmarks().some(b => b.text === text);
  },

  // Ambient sound preference
  getAmbientSound(): AmbientSound {
    return getItem<AmbientSound>(KEYS.AMBIENT, 'none');
  },

  saveAmbientSound(sound: AmbientSound): void {
    setItem(KEYS.AMBIENT, sound);
  },

  // Retention
  getRetention(profileId: string): RetentionData {
    const key = `sukoon_retention_${profileId}`;
    return getItem<RetentionData>(key, {
      profileId,
      streak: { currentStreak: 0, longestStreak: 0, lastSessionDate: '' },
      milestones: {},
      schedule: [],
      lastReminderShown: null,
    });
  },

  saveRetention(data: RetentionData): void {
    setItem(`sukoon_retention_${data.profileId}`, data);
  },

  updateStreak(profileId: string): void {
    const data = this.getRetention(profileId);
    const today = new Date().toISOString().split('T')[0];
    const last = data.streak.lastSessionDate;

    if (last === today) {
      // Already counted today
      this.saveRetention(data);
      return;
    }

    if (last) {
      const lastDate = new Date(last);
      const todayDate = new Date(today);
      const diffMs = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        data.streak.currentStreak += 1;
      } else {
        data.streak.currentStreak = 1;
      }
    } else {
      data.streak.currentStreak = 1;
    }

    if (data.streak.currentStreak > data.streak.longestStreak) {
      data.streak.longestStreak = data.streak.currentStreak;
    }
    data.streak.lastSessionDate = today;
    this.saveRetention(data);
  },

  checkAndUnlockMilestones(profileId: string): MilestoneId[] {
    const data = this.getRetention(profileId);
    const sessions = this.getSessionsForUser(profileId);
    const assessments = this.getAssessments().filter(a => a.sessionId && sessions.some(s => s.sessionId === a.sessionId));
    const now = new Date().toISOString();
    const newlyUnlocked: MilestoneId[] = [];

    const unlock = (id: MilestoneId) => {
      if (!data.milestones[id]) {
        data.milestones[id] = now;
        newlyUnlocked.push(id);
      }
    };

    // Session count milestones
    if (sessions.length >= 1) unlock('first-session');
    if (sessions.length >= 5) unlock('sessions-5');
    if (sessions.length >= 10) unlock('sessions-10');
    if (sessions.length >= 25) unlock('sessions-25');

    // Streak milestones
    if (data.streak.currentStreak >= 3) unlock('streak-3');
    if (data.streak.currentStreak >= 7) unlock('streak-7');
    if (data.streak.currentStreak >= 14) unlock('streak-14');
    if (data.streak.currentStreak >= 30) unlock('streak-30');

    // Assessment milestone
    if (assessments.length >= 1) unlock('first-assessment');

    // Mood improved milestone
    const latestSession = sessions[sessions.length - 1];
    if (latestSession?.preMood && latestSession?.postMood) {
      if (latestSession.postMood.value > latestSession.preMood.value) {
        unlock('mood-improved');
      }
    }

    // Reflection milestone
    if (sessions.some(s => s.userReflection && s.userReflection.trim().length > 0)) {
      unlock('reflection-written');
    }

    this.saveRetention(data);
    return newlyUnlocked;
  },

  saveSchedule(profileId: string, schedule: RetentionData['schedule']): void {
    const data = this.getRetention(profileId);
    data.schedule = schedule;
    this.saveRetention(data);
  },

  // Data management
  clearAll(): void {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  },

  getStorageSize(): string {
    let total = 0;
    Object.values(KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) total += item.length * 2;
    });
    return `${(total / 1024).toFixed(1)} KB`;
  },
};
