import type { AssessmentResult } from '../types/assessments';
import type { MoodEntry } from '../types/mood';
import type { SessionSummary, OnboardingData, BookmarkedStrategy, AmbientSound } from '../types/session';

const KEYS = {
  SESSIONS: 'sukoon_sessions',
  ASSESSMENTS: 'sukoon_assessments',
  MOODS: 'sukoon_moods',
  ONBOARDING: 'sukoon_onboarding',
  CONSENT: 'sukoon_consent',
  BOOKMARKS: 'sukoon_bookmarks',
  AMBIENT: 'sukoon_ambient',
} as const;

const MAX_SESSIONS = 50;

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

  // Onboarding
  getOnboarding(): OnboardingData | null {
    return getItem<OnboardingData | null>(KEYS.ONBOARDING, null);
  },

  saveOnboarding(data: OnboardingData): void {
    setItem(KEYS.ONBOARDING, data);
  },

  clearOnboarding(): void {
    localStorage.removeItem(KEYS.ONBOARDING);
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
