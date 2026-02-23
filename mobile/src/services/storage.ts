import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SESSIONS: 'sukoon_sessions',
  ASSESSMENTS: 'sukoon_assessments',
  MOODS: 'sukoon_moods',
  ACTIVE_PROFILE: 'sukoon_active_profile',
  PROFILES: 'sukoon_profiles',
  RETENTION: 'sukoon_retention',
  BOOKMARKS: 'sukoon_bookmarks',
  JOURNAL: 'sukoon_journal',
  AMBIENT: 'sukoon_ambient',
  ROLE: 'sukoon_role',
  CONSENT: 'sukoon_consent',
  CONCERNS: 'sukoon_concerns',
};

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function setJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const StorageService = {
  // Role
  getRole: () => AsyncStorage.getItem(KEYS.ROLE),
  setRole: (role: string) => AsyncStorage.setItem(KEYS.ROLE, role),
  clearRole: () => AsyncStorage.removeItem(KEYS.ROLE),

  // Consent
  getConsent: async () => (await AsyncStorage.getItem(KEYS.CONSENT)) === 'true',
  setConsent: (v: boolean) => AsyncStorage.setItem(KEYS.CONSENT, String(v)),

  // Active profile
  getActiveProfileId: () => AsyncStorage.getItem(KEYS.ACTIVE_PROFILE),
  setActiveProfileId: (id: string) => AsyncStorage.setItem(KEYS.ACTIVE_PROFILE, id),

  // Sessions
  getSessions: () => getJSON<Record<string, unknown>[]>(KEYS.SESSIONS, []),
  saveSessions: (s: Record<string, unknown>[]) => setJSON(KEYS.SESSIONS, s),

  // Assessments
  getAssessments: () => getJSON<Record<string, unknown>[]>(KEYS.ASSESSMENTS, []),
  saveAssessments: (a: Record<string, unknown>[]) => setJSON(KEYS.ASSESSMENTS, a),

  // Moods
  getMoods: () => getJSON<Record<string, unknown>[]>(KEYS.MOODS, []),
  saveMoods: (m: Record<string, unknown>[]) => setJSON(KEYS.MOODS, m),

  // Bookmarks
  getBookmarks: () => getJSON<Record<string, unknown>[]>(KEYS.BOOKMARKS, []),
  saveBookmarks: (b: Record<string, unknown>[]) => setJSON(KEYS.BOOKMARKS, b),

  // Journal
  getJournalEntries: () => getJSON<Record<string, unknown>[]>(KEYS.JOURNAL, []),
  saveJournalEntries: (j: Record<string, unknown>[]) => setJSON(KEYS.JOURNAL, j),

  // Retention
  getRetention: () => getJSON<Record<string, unknown> | null>(KEYS.RETENTION, null),
  saveRetention: (r: Record<string, unknown>) => setJSON(KEYS.RETENTION, r),

  // Ambient sound
  getAmbientSound: async () => (await AsyncStorage.getItem(KEYS.AMBIENT)) || 'none',
  setAmbientSound: (s: string) => AsyncStorage.setItem(KEYS.AMBIENT, s),

  // Concerns
  getLastConcerns: () => getJSON<string[]>(KEYS.CONCERNS, []),
  setLastConcerns: (c: string[]) => setJSON(KEYS.CONCERNS, c),

  // Clear all
  clearAll: () => AsyncStorage.multiRemove(Object.values(KEYS)),
};
