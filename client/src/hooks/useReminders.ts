import { useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';

export function useReminders() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    intervalRef.current = setInterval(() => {
      const profileId = StorageService.getActiveProfileId();
      if (!profileId) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const data = StorageService.getRetention(profileId);
      if (data.schedule.length === 0) return;

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentDay = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Don't show more than one reminder per day
      if (data.lastReminderShown === today) return;

      const match = data.schedule.find(
        e => e.enabled && e.dayOfWeek === currentDay && e.time === currentTime
      );

      if (match) {
        new Notification('Sukoon — Time for your session', {
          body: `Your scheduled session is now. Take a moment for yourself today.`,
          icon: '/favicon.ico',
        });
        data.lastReminderShown = today;
        StorageService.saveRetention(data);
      }
    }, 60000); // Check every minute

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
