// Sukoon Medication Reminder Service Worker
// Handles persistent dose reminders with snooze + "took it" actions

let scheduledTimeouts = [];

function clearScheduled() {
  scheduledTimeouts.forEach(t => clearTimeout(t));
  scheduledTimeouts = [];
}

function scheduleNotification(med, timeStr, daysFromNow) {
  const [h, m] = timeStr.split(':').map(Number);
  const doseTime = new Date();
  doseTime.setDate(doseTime.getDate() + daysFromNow);
  doseTime.setHours(h, m, 0, 0);

  const msUntil = doseTime.getTime() - Date.now();
  if (msUntil <= 0) return;

  const t = setTimeout(() => {
    self.registration.showNotification(`Time to take ${med.name}`, {
      body: `${med.dosage} · ${med.frequency}`,
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

  scheduledTimeouts.push(t);
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

self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_MED_REMINDERS') {
    scheduleMedications(event.data.medications);
  }
  if (event.data.type === 'CLEAR_MED_REMINDERS') {
    clearScheduled();
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

  // 'taken' action or default click — open app to doctor-input tab
  const url = event.action === 'taken'
    ? `/?tab=doctor-input&logDose=${notification.data.medId}`
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'SW_NOTIFICATION_CLICK', medId: notification.data.medId, action: event.action });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
