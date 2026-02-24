// Sukoon Medication Reminder Service Worker
// Progressive-urgency reminders: on-time → overdue (+1h) → critical (+2h)
//
// Schedule is persisted in Cache Storage so that when the browser kills and
// restarts the SW, we can restore upcoming dose notifications automatically.
//
// Key formats in scheduledMap:
//   primary:  `${medId}-${timeStr}-${daysFromNow}`
//   overdue:  `${medId}-${timeStr}-${daysFromNow}-overdue`
//   critical: `${medId}-${timeStr}-${daysFromNow}-critical`
//   snooze:   `${medId}-snooze-${uniqueN}`

const CACHE_KEY = 'sukoon-med-schedule';
const CACHE_URL = '/sukoon-med-schedule.json'; // synthetic URL for Cache API
const scheduledMap = new Map();

function clearScheduled() {
  scheduledMap.forEach(t => clearTimeout(t));
  scheduledMap.clear();
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

async function saveScheduleToCache(medications) {
  try {
    const cache = await caches.open(CACHE_KEY);
    const response = new Response(JSON.stringify({
      medications,
      savedAt: Date.now(),
    }), { headers: { 'Content-Type': 'application/json' } });
    await cache.put(CACHE_URL, response);
  } catch { /* ignore cache errors */ }
}

async function loadScheduleFromCache() {
  try {
    const cache = await caches.open(CACHE_KEY);
    const response = await cache.match(CACHE_URL);
    if (!response) return null;
    const data = await response.json();
    // Only use cached data if it's less than 24 hours old
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) return null;
    return data.medications;
  } catch {
    return null;
  }
}

async function clearScheduleCache() {
  try {
    const cache = await caches.open(CACHE_KEY);
    await cache.delete(CACHE_URL);
  } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildTimeLabel(timeStr) {
  const [th, tm] = timeStr.split(':').map(Number);
  const ampm = th >= 12 ? 'PM' : 'AM';
  const hour12 = th % 12 || 12;
  return `${hour12}:${String(tm).padStart(2, '0')} ${ampm}`;
}

function isReasonableHour(h) {
  return h >= 7 && h < 22; // 7 AM – 10 PM only
}

// ── Urgency config ────────────────────────────────────────────────────────────

const URGENCY = {
  ontime:   { vibrate: [200, 100, 200],                    snoozeLabel: 'Remind in 30m', snoozeMs: 30 * 60 * 1000 },
  overdue:  { vibrate: [300, 100, 300, 100, 300],          snoozeLabel: 'Remind in 15m', snoozeMs: 15 * 60 * 1000 },
  critical: { vibrate: [500, 100, 500, 100, 500, 100, 500], snoozeLabel: 'Remind in 10m', snoozeMs: 10 * 60 * 1000 },
};

// ── Show notification ─────────────────────────────────────────────────────────

function showMedNotification(medId, medName, medDosage, medFrequency, timeStr, level, tag) {
  const u = URGENCY[level] || URGENCY.ontime;
  const timeLabel = buildTimeLabel(timeStr);

  const titleMap = {
    ontime:   `💊 ${medName} — ${timeLabel}`,
    overdue:  `⏰ ${medName} — 1 hour overdue`,
    critical: `🚨 ${medName} — 2 hours overdue`,
  };
  const bodyMap = {
    ontime:   `${medDosage}  ·  Scheduled for ${timeLabel}`,
    overdue:  `${medDosage}  ·  Was due at ${timeLabel} — still time to take it`,
    critical: `${medDosage}  ·  Scheduled at ${timeLabel} — please take it or skip`,
  };

  self.registration.showNotification(titleMap[level] || titleMap.ontime, {
    body: bodyMap[level] || bodyMap.ontime,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag,
    data: { medId, medName, medDosage, medFrequency, timeStr, level },
    actions: [
      { action: 'taken', title: 'Took it ✓' },
      { action: 'snooze', title: u.snoozeLabel },
    ],
    requireInteraction: true,
    vibrate: u.vibrate,
    renotify: true,  // always play sound/vibration even when replacing a tag
  });
}

// ── Schedule one dose slot ────────────────────────────────────────────────────

function scheduleNotification(med, timeStr, daysFromNow) {
  const [h, m] = timeStr.split(':').map(Number);
  const doseTime = new Date();
  doseTime.setDate(doseTime.getDate() + daysFromNow);
  doseTime.setHours(h, m, 0, 0);

  const msUntil = doseTime.getTime() - Date.now();
  if (msUntil <= 0) return;

  const primaryKey = `${med.id}-${timeStr}-${daysFromNow}`;
  if (scheduledMap.has(primaryKey)) return;

  const tag = `med-${med.id}-${timeStr}-${daysFromNow}`;

  const t = setTimeout(() => {
    scheduledMap.delete(primaryKey);

    // Level 1: on-time notification
    showMedNotification(med.id, med.name, med.dosage, med.frequency, timeStr, 'ontime', tag);

    // Level 2: overdue at +1 hour
    const overdueKey = `${med.id}-${timeStr}-${daysFromNow}-overdue`;
    if (!scheduledMap.has(overdueKey)) {
      const overdueFireAt = new Date(doseTime.getTime() + 60 * 60 * 1000);
      if (isReasonableHour(overdueFireAt.getHours())) {
        const ot = setTimeout(() => {
          scheduledMap.delete(overdueKey);
          showMedNotification(med.id, med.name, med.dosage, med.frequency, timeStr, 'overdue', tag);

          // Level 3: critical at +2 hours
          const criticalKey = `${med.id}-${timeStr}-${daysFromNow}-critical`;
          if (!scheduledMap.has(criticalKey)) {
            const critFireAt = new Date(doseTime.getTime() + 2 * 60 * 60 * 1000);
            if (isReasonableHour(critFireAt.getHours())) {
              const ct = setTimeout(() => {
                scheduledMap.delete(criticalKey);
                showMedNotification(med.id, med.name, med.dosage, med.frequency, timeStr, 'critical', tag);
              }, 60 * 60 * 1000);
              scheduledMap.set(criticalKey, ct);
            }
          }
        }, 60 * 60 * 1000);
        scheduledMap.set(overdueKey, ot);
      }
    }
  }, msUntil);

  scheduledMap.set(primaryKey, t);
}

// ── Schedule all medications ──────────────────────────────────────────────────

function scheduleMedications(medications) {
  clearScheduled();

  for (const med of medications) {
    if (!med.doseTimes || med.doseTimes.length === 0) continue;

    let scheduledAny = false;
    for (const timeStr of med.doseTimes) {
      const [h, m2] = timeStr.split(':').map(Number);
      const doseTime = new Date();
      doseTime.setHours(h, m2, 0, 0);
      if (doseTime > new Date()) {
        scheduleNotification(med, timeStr, 0);
        scheduledAny = true;
      }
    }

    if (!scheduledAny) {
      // All today's doses passed — schedule first dose tomorrow
      const sorted = [...med.doseTimes].sort();
      scheduleNotification(med, sorted[0], 1);
    }
  }
}

// ── Restore schedule from cache (called on SW restart) ────────────────────────

async function restoreFromCache() {
  if (scheduledMap.size > 0) return; // already have active timers
  const medications = await loadScheduleFromCache();
  if (medications && medications.length > 0) {
    scheduleMedications(medications);
  }
}

// ── Cancel one dose slot (all urgency levels) ─────────────────────────────────

function cancelMedReminder(medId, timeStr) {
  for (const days of [0, 1]) {
    for (const suffix of ['', '-overdue', '-critical']) {
      const key = `${medId}-${timeStr}-${days}${suffix}`;
      const t = scheduledMap.get(key);
      if (t !== undefined) { clearTimeout(t); scheduledMap.delete(key); }
    }
  }
  // Close any already-shown notifications for this dose slot
  self.registration.getNotifications().then(notifs => {
    notifs.forEach(n => {
      if (n.data && n.data.medId === medId && n.data.timeStr === timeStr) n.close();
    });
  });
}

// ── SW lifecycle ──────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => restoreFromCache())
  );
});

// ── Restore on any fetch (SW wake-up opportunity) ─────────────────────────────
// When the browser restarts the SW for a fetch event, check if we lost our
// schedule and restore it from cache.

self.addEventListener('fetch', (event) => {
  // Only intercept our heartbeat ping — pass everything else through
  if (event.request.url.includes('/__sukoon_sw_heartbeat')) {
    event.respondWith(new Response(JSON.stringify({
      alive: true,
      timers: scheduledMap.size,
    }), { headers: { 'Content-Type': 'application/json' } }));
    // Opportunistically restore schedule if timers were lost
    if (scheduledMap.size === 0) {
      restoreFromCache();
    }
    return;
  }
  // Don't interfere with other fetches
});

// ── Message handling ──────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_MED_REMINDERS') {
    scheduleMedications(event.data.medications);
    // Persist to cache so we can recover after SW restart
    saveScheduleToCache(event.data.medications);
  }
  if (event.data.type === 'CLEAR_MED_REMINDERS') {
    clearScheduled();
    clearScheduleCache();
  }
  if (event.data.type === 'CANCEL_MED_REMINDER') {
    cancelMedReminder(event.data.medId, event.data.timeStr);
  }
  if (event.data.type === 'CLOSE_MED_NOTIFICATIONS') {
    const medId = event.data.medId;
    // Cancel ALL pending timeouts for this med (primary, overdue, critical, snooze)
    scheduledMap.forEach((t, key) => {
      if (key.startsWith(`${medId}-`)) { clearTimeout(t); scheduledMap.delete(key); }
    });
    // Close any already-shown notifications for this med
    self.registration.getNotifications().then(notifs => {
      notifs.forEach(n => { if (n.data && n.data.medId === medId) n.close(); });
    });
  }
  if (event.data.type === 'HEARTBEAT') {
    // Keep-alive ping from main thread — restore schedule if we lost timers
    if (scheduledMap.size === 0) {
      restoreFromCache();
    }
  }
});

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();

  const { medId, timeStr, level } = notification.data ?? {};

  if (event.action === 'snooze') {
    const u = URGENCY[level] || URGENCY.ontime;
    // Track snooze in scheduledMap so CLOSE_MED_NOTIFICATIONS can cancel it
    const snoozeKey = `${medId}-snooze-${Date.now()}`;
    const t = setTimeout(() => {
      scheduledMap.delete(snoozeKey);
      // Re-show at same urgency level; use snoozed tag to avoid replacing original
      showMedNotification(medId, notification.data.medName, notification.data.medDosage,
        notification.data.medFrequency, timeStr, level ?? 'ontime',
        `${notification.tag}-snoozed`);
    }, u.snoozeMs);
    scheduledMap.set(snoozeKey, t);
    return;
  }

  // 'taken' action or body-tap → open app
  const url = event.action === 'taken'
    ? `/?tab=doctor-input&logDose=${medId}&at=${encodeURIComponent(timeStr)}`
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'SW_NOTIFICATION_CLICK', medId, action: event.action, timeStr });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
