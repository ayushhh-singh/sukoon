const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';
const TOKEN_KEY = 'sukoon_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredToken(): string | null {
  return getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
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
    clearToken();
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
  getPatientTrends: (patientId: string) => request<Record<string, unknown>>(`/api/assessments/patient/${patientId}/trends`),
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
  // Dose logs
  getLogs: (medId: string) => request<Record<string, unknown>[]>(`/api/medications/${medId}/logs`),
  getTally: (medId: string) => request<Record<string, unknown>>(`/api/medications/${medId}/tally`),
  logDose: (medId: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/medications/${medId}/logs`, { method: 'POST', body: JSON.stringify(data) }),
  getAllTallies: (patientId?: string) => request<Record<string, unknown>[]>(`/api/medications/tallies/all${patientId ? `?patientId=${patientId}` : ''}`),
  // Streak & calendar
  getStreak: (medId: string) => request<{ streak: number }>(`/api/medications/${medId}/streak`),
  getRecentLogs: (medId: string, days?: number) => request<Record<string, unknown>[]>(`/api/medications/${medId}/recent-logs${days ? `?days=${days}` : ''}`),
  adherenceOverview: () => request<Record<string, unknown>[]>('/api/medications/adherence/overview'),
  getActiveMedContext: () => request<Record<string, unknown>[]>('/api/medications/active-context'),
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
  start: (id: string) => request<Record<string, unknown>>(`/api/appointments/${id}/start`, { method: 'PUT' }),
  complete: (id: string) => request<Record<string, unknown>>(`/api/appointments/${id}/complete`, { method: 'PUT' }),
  reschedule: (id: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/appointments/${id}/reschedule`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Appointment check-ins
export const checkins = {
  get: (appointmentId: string) => request<Record<string, unknown> | null>(`/api/checkins/${appointmentId}`),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/checkins', { method: 'POST', body: JSON.stringify(data) }),
};

// Treatment plans
export const treatmentPlans = {
  list: (patientId: string) => request<Record<string, unknown>[]>(`/api/treatment-plans?patientId=${patientId}`),
  get: (id: string) => request<Record<string, unknown>>(`/api/treatment-plans/${id}`),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/treatment-plans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/treatment-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ success: boolean }>(`/api/treatment-plans/${id}`, { method: 'DELETE' }),
  getGoals: (planId: string) => request<Record<string, unknown>[]>(`/api/treatment-plans/${planId}/goals`),
  createGoal: (planId: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/treatment-plans/${planId}/goals`, { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (planId: string, goalId: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/treatment-plans/${planId}/goals/${goalId}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeGoal: (planId: string, goalId: string) => request<{ success: boolean }>(`/api/treatment-plans/${planId}/goals/${goalId}`, { method: 'DELETE' }),
};

// Safety plans
export const safetyPlans = {
  get: (patientId: string) => request<Record<string, unknown> | null>(`/api/safety-plans?patientId=${patientId}`),
  getById: (id: string) => request<Record<string, unknown>>(`/api/safety-plans/${id}`),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/safety-plans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/safety-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ success: boolean }>(`/api/safety-plans/${id}`, { method: 'DELETE' }),
};

// Clinical formulations
export const formulations = {
  get: (patientId: string) => request<Record<string, unknown> | null>(`/api/formulations?patientId=${patientId}`),
  create: (data: Record<string, unknown>) => request<Record<string, unknown>>('/api/formulations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/formulations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Clinical timeline
export const timeline = {
  get: (patientId: string, types?: string) => request<Record<string, unknown>[]>(`/api/timeline/${patientId}${types ? `?types=${types}` : ''}`),
};

// Notifications
export const notifications = {
  list: (unreadOnly?: boolean) => request<Record<string, unknown>[]>(`/api/notifications${unreadOnly ? '?unread=true' : ''}`),
  unreadCount: () => request<{ count: number }>('/api/notifications/unread-count'),
  markRead: (id: string) => request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request<{ success: boolean }>('/api/notifications/read-all', { method: 'PUT' }),
  remove: (id: string) => request<{ success: boolean }>(`/api/notifications/${id}`, { method: 'DELETE' }),
  clearAll: () => request<{ success: boolean }>('/api/notifications', { method: 'DELETE' }),
};
