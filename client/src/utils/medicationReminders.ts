export interface MedicationInfo {
  name: string;
  frequency: string;
  doseTimes: string[];
  startDate: string;
  endDate: string | null;
  status: string;
  patientStartTime: string | null;
}

export function getDaysUntilEnd(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export function isEndingSoon(endDate: string | null, withinDays = 7): boolean {
  const days = getDaysUntilEnd(endDate);
  return days !== null && days > 0 && days <= withinDays;
}

export function hasEnded(endDate: string | null): boolean {
  const days = getDaysUntilEnd(endDate);
  return days !== null && days <= 0;
}

export function getNextDoseTime(doseTimes: string[]): string | null {
  if (!doseTimes || doseTimes.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find next dose time today
  for (const time of doseTimes.sort()) {
    const [hours, minutes] = time.split(':').map(Number);
    const doseMinutes = hours * 60 + minutes;
    if (doseMinutes > currentMinutes) {
      return time;
    }
  }

  // All doses passed today, next is first dose tomorrow
  return doseTimes.sort()[0];
}

export function parseFrequencyCount(frequency: string): number {
  const lower = frequency.toLowerCase().trim();

  if (lower.includes('once') || lower === '1x daily' || lower === 'daily') return 1;
  if (lower.includes('twice') || lower === '2x daily' || lower.includes('bid')) return 2;
  if (lower.includes('three') || lower.includes('thrice') || lower === '3x daily' || lower.includes('tid')) return 3;
  if (lower.includes('four') || lower === '4x daily' || lower.includes('qid')) return 4;

  // Try to parse number
  const match = lower.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);

  return 1; // default
}

// Returns days of supply remaining based on end_date, or null if no end date.
// Also classifies urgency: 'ok' | 'soon' | 'urgent' | 'overdue'
export function getRefillCountdown(endDate: string | null): {
  days: number | null;
  urgency: 'ok' | 'soon' | 'urgent' | 'overdue' | null;
  label: string | null;
} {
  if (!endDate) return { days: null, urgency: null, label: null };
  const days = getDaysUntilEnd(endDate);
  if (days === null) return { days: null, urgency: null, label: null };
  if (days <= 0) return { days, urgency: 'overdue', label: 'Supply ended' };
  if (days <= 3) return { days, urgency: 'urgent', label: `${days}d left — refill now` };
  if (days <= 7) return { days, urgency: 'soon', label: `${days}d supply left` };
  return { days, urgency: 'ok', label: `${days}d supply left` };
}

export function registerMedicationServiceWorker(): Promise<ServiceWorker | null> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then(reg => reg.active || reg.installing || reg.waiting)
    .catch(() => null);
}

function postToSW(message: Record<string, unknown>): void {
  if (!('serviceWorker' in navigator)) return;
  // Use navigator.serviceWorker.ready so we wait for the SW to be active
  // (navigator.serviceWorker.controller is null on first install until clients.claim())
  navigator.serviceWorker.ready
    .then(reg => { reg.active?.postMessage(message); })
    .catch(() => {});
}

export function postMedicationsToSW(medications: { id: string; name: string; dosage: string; frequency: string; doseTimes: string[] }[]) {
  postToSW({ type: 'SCHEDULE_MED_REMINDERS', medications });
}

export function cancelMedReminderInSW(medId: string, timeStr: string) {
  postToSW({ type: 'CANCEL_MED_REMINDER', medId, timeStr });
}

export function getDefaultDoseTimes(frequency: string): string[] {
  const count = parseFrequencyCount(frequency);
  const lower = frequency.toLowerCase();

  // Special cases
  if (lower.includes('morning') || lower.includes('breakfast')) return ['08:00'];
  if (lower.includes('night') || lower.includes('bedtime')) return ['21:00'];
  if (lower.includes('morning and night')) return ['08:00', '21:00'];

  // Generic spacing
  switch (count) {
    case 1: return ['08:00'];
    case 2: return ['08:00', '20:00'];
    case 3: return ['08:00', '14:00', '20:00'];
    case 4: return ['08:00', '12:00', '16:00', '20:00'];
    default: return ['08:00'];
  }
}
