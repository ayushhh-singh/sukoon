// Sukoon Medication Reminder Service Worker
// Handles persistent dose reminders with snooze + "took it" actions

// Map from key (`${medId}-${timeStr}-${daysFromNow}`) to timeoutId
const scheduledMap = new Map();

function clearScheduled() {
  scheduledMap.forEach(t => clearTimeout(t));
  scheduledMap.clear();
}

function scheduleNotification(med, timeStr, daysFromNow) {
  const [h, m] = timeStr.split(':').map(Number);
  const doseTime = new Date();
  doseTime.setDate(doseTime.getDate() + daysFromNow);
  doseTime.setHours(h, m, 0, 0);

  const msUntil = doseTime.getTime() - Date.now();
  if (msUntil <= 0) return;

  const key = `${med.id}-${timeStr}-${daysFromNow}`;
  if (scheduledMap.has(key)) return; // already scheduled

  const t = setTimeout(() => {
    scheduledMap.delete(key);
    // Format timeStr as human-readable (e.g. "08:00" → "8:00 AM")
    const [th, tm] = timeStr.split(':').map(Number);
    const ampm = th >= 12 ? 'PM' : 'AM';
    const hour12 = th % 12 || 12;
    const timeLabel = `${hour12}:${String(tm).padStart(2, '0')} ${ampm}`;
    self.registration.showNotification(`💊 ${med.name} — ${timeLabel}`, {
      body: `${med.dosage} · Tap "Took it" to log this dose`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `med-${med.id}-${timeStr}-${daysFromNow}`,
      data: { medId: med.id, medName: med.name, medDosage: med.dosage, medFrequency: med.frequency, timeStr },
      actions: [
        { action: 'taken', title: 'Took it ✓' },
        { action: 'snooze', title: 'Remind in 30m' },
      ],
      requireInteraction: true,
    });
  }, msUntil);

  scheduledMap.set(key, t);
}

function scheduleMedications(medications) {
  clearScheduled();

  for (const med of medications) {
    if (!med.doseTimes || med.doseTimes.length === 0) continue;

    let scheduledAny = false;
    for (const timeStr of med.doseTimes) {
      const [h, m] = timeStr.split(':').map(Number);
      const doseTime = new Date();
      doseTime.setHours(h, m, 0, 0);
      if (doseTime > new Date()) {
        scheduleNotification(med, timeStr, 0);
        scheduledAny = true;
      }
    }

    if (!scheduledAny) {
      const sorted = [...med.doseTimes].sort();
      scheduleNotification(med, sorted[0], 1);
    }
  }
}

function cancelMedReminder(medId, timeStr) {
  // Cancel pending timeout for today and tomorrow
  for (const days of [0, 1]) {
    const key = `${medId}-${timeStr}-${days}`;
    const t = scheduledMap.get(key);
    if (t !== undefined) {
      clearTimeout(t);
      scheduledMap.delete(key);
    }
  }
  // Also close any already-shown notification for this med+time
  self.registration.getNotifications().then(notifs => {
    notifs.forEach(n => {
      if (n.data && n.data.medId === medId && n.data.timeStr === timeStr) n.close();
    });
  });
}

// Skip waiting so new SW version takes over immediately (no page reload needed)
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// Claim clients immediately on activation so controller is set without page reload
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_MED_REMINDERS') {
    scheduleMedications(event.data.medications);
  }
  if (event.data.type === 'CLEAR_MED_REMINDERS') {
    clearScheduled();
  }
  if (event.data.type === 'CANCEL_MED_REMINDER') {
    cancelMedReminder(event.data.medId, event.data.timeStr);
  }
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();

  if (event.action === 'snooze') {
    // Re-fire in 30 minutes
    setTimeout(() => {
      self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        tag: `${notification.tag}-snoozed`,
        data: notification.data,
        actions: notification.actions,
        requireInteraction: true,
      });
    }, 30 * 60 * 1000);
    return;
  }

  const { medId, timeStr } = notification.data;
  // 'taken' action or default click — open app to doctor-input tab
  // Include timeStr so the app knows exactly which dose slot was acknowledged
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
