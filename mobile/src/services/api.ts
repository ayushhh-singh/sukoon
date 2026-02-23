import * as SecureStore from 'expo-secure-store';

// For development: use your local server or tunnel URL
// Update this to match your server's address
const BASE_URL = __DEV__
  ? 'http://localhost:8081'   // Local dev server
  : 'https://spectrum-protein-base-literally.trycloudflare.com';
const TOKEN_KEY = 'sukoon_token';

let cachedToken: string | null = null;

async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return cachedToken;
}

export async function setToken(token: string): Promise<void> {
  cachedToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  return getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    await clearToken();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export const auth = {
  registerPatient: (data: Record<string, unknown>) =>
    request<{ token: string; user: Record<string, unknown>; role: string }>('/api/auth/register/patient', { method: 'POST', body: JSON.stringify(data) }),

  registerDoctor: (data: Record<string, unknown>) =>
    request<{ token: string; doctor: Record<string, unknown>; role: string }>('/api/auth/register/doctor', { method: 'POST', body: JSON.stringify(data) }),

  login: (email: string, password: string) =>
    request<{ token: string; user?: Record<string, unknown>; doctor?: Record<string, unknown>; role: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () =>
    request<{ user?: Record<string, unknown>; doctor?: Record<string, unknown>; role: string }>('/api/auth/me'),
};

// Users
export const users = {
  getMe: () => request<Record<string, unknown>>('/api/users/me'),
  updateMe: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  deleteMe: () => request<{ success: boolean }>('/api/users/me', { method: 'DELETE' }),
};

// Doctors
export const doctors = {
  getMe: () => request<Record<string, unknown>>('/api/doctors/me'),
  updateMe: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/doctors/me', { method: 'PUT', body: JSON.stringify(data) }),
  search: (query: string) => request<Record<string, unknown>[]>(`/api/doctors/search?q=${encodeURIComponent(query)}`),
  getById: (id: string) => request<Record<string, unknown>>(`/api/doctors/${id}`),
  link: (doctorId: string) => request<{ success: boolean }>('/api/doctors/link', { method: 'POST', body: JSON.stringify({ doctorId }) }),
  unlink: (doctorId: string) => request<{ success: boolean }>(`/api/doctors/link/${doctorId}`, { method: 'DELETE' }),
  getMyPatients: () => request<Record<string, unknown>[]>('/api/doctors/me/patients'),
  getMyLinkedDoctors: () => request<Record<string, unknown>[]>('/api/doctors/me/linked'),
};

// Sessions
export const sessions = {
  list: () => request<Record<string, unknown>[]>('/api/sessions'),
  get: (id: string) => request<Record<string, unknown>>(`/api/sessions/${id}`),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateReflection: (id: string, reflection: string) => request<{ success: boolean }>(`/api/sessions/${id}/reflection`, { method: 'PUT', body: JSON.stringify({ reflection }) }),
};

// Assessments
export const assessments = {
  list: () => request<Record<string, unknown>[]>('/api/assessments'),
  getLatest: (type: string) => request<Record<string, unknown> | null>(`/api/assessments/latest/${type}`),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/assessments', { method: 'POST', body: JSON.stringify(data) }),
};

// Moods
export const moods = {
  list: () => request<Record<string, unknown>[]>('/api/moods'),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/moods', { method: 'POST', body: JSON.stringify(data) }),
};

// Doctor Notes
export const notes = {
  list: (patientId?: string) => request<Record<string, unknown>[]>(`/api/notes${patientId ? `?patientId=${patientId}` : ''}`),
  get: (id: string) => request<Record<string, unknown>>(`/api/notes/${id}`),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/notes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ success: boolean }>(`/api/notes/${id}`, { method: 'DELETE' }),
};

// Medications
export const medications = {
  list: (patientId?: string) => request<Record<string, unknown>[]>(`/api/medications${patientId ? `?patientId=${patientId}` : ''}`),
  get: (id: string) => request<Record<string, unknown>>(`/api/medications/${id}`),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/medications', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/medications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ success: boolean }>(`/api/medications/${id}`, { method: 'DELETE' }),
};

// Bookmarks
export const bookmarks = {
  list: () => request<Record<string, unknown>[]>('/api/bookmarks'),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/bookmarks', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ success: boolean }>(`/api/bookmarks/${id}`, { method: 'DELETE' }),
};

// Journal
export const journal = {
  list: () => request<Record<string, unknown>[]>('/api/journal'),
  search: (query: string) => request<Record<string, unknown>[]>(`/api/journal/search?q=${encodeURIComponent(query)}`),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/journal', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/journal/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ success: boolean }>(`/api/journal/${id}`, { method: 'DELETE' }),
};

// Retention
export const retention = {
  get: () => request<Record<string, unknown>>('/api/retention'),
  update: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/retention', { method: 'PUT', body: JSON.stringify(data) }),
  updateSchedule: (schedule: Record<string, unknown>[]) => request<Record<string, unknown>>('/api/retention/schedule', { method: 'PUT', body: JSON.stringify({ schedule }) }),
};

// Appointments
export const appointments = {
  list: () => request<Record<string, unknown>[]>('/api/appointments'),
  upcoming: () => request<Record<string, unknown>[]>('/api/appointments/upcoming'),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/appointments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ success: boolean }>(`/api/appointments/${id}`, { method: 'DELETE' }),
};
