import type { AssessmentResult } from '../types/assessments';
import type { MoodEntry } from '../types/mood';
import type { SessionSummary, OnboardingData, BookmarkedStrategy, AmbientSound, UserProfile } from '../types/session';

const KEYS = {
  SESSIONS: 'sukoon_sessions',
  ASSESSMENTS: 'sukoon_assessments',
  MOODS: 'sukoon_moods',
  CONSENT: 'sukoon_consent',
  BOOKMARKS: 'sukoon_bookmarks',
  AMBIENT: 'sukoon_ambient',
  PROFILES: 'sukoon_profiles',
  ACTIVE_PROFILE: 'sukoon_active_profile',
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

  // Last session concerns per profile (used to pre-fill concern picker)
  getLastConcerns(profileId: string): string[] {
    return getItem<string[]>(`sukoon_last_concerns_${profileId}`, []);
  },

  saveLastConcerns(profileId: string, concerns: string[]): void {
    if (concerns.length > 0) {
      try { localStorage.setItem(`sukoon_last_concerns_${profileId}`, JSON.stringify(concerns)); } catch { /* */ }
    }
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
