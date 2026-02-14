import { useEffect, useRef, useState, useCallback } from 'react';
import { Clock } from 'lucide-react';

interface SessionTimerProps {
  isActive: boolean;
  onDurationUpdate: (seconds: number) => void;
  onReminder: (message: string) => void;
}

const REMINDERS: { at: number; message: string }[] = [
  { at: 20 * 60, message: "You've been chatting for 20 minutes. Take a break if you need one." },
  { at: 30 * 60, message: "It's been 30 minutes. Consider wrapping up when you're ready." },
  { at: 45 * 60, message: 'Sessions over 45 minutes may feel less productive. Dr. Aria can help you close out.' },
];

export function SessionTimer({ isActive, onDurationUpdate, onReminder }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const triggeredRef = useRef<Set<number>>(new Set());

  const checkReminders = useCallback((seconds: number) => {
    for (const reminder of REMINDERS) {
      if (seconds >= reminder.at && !triggeredRef.current.has(reminder.at)) {
        triggeredRef.current.add(reminder.at);
        onReminder(reminder.message);
      }
    }
  }, [onReminder]);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = window.setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          onDurationUpdate(next);
          checkReminders(next);
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, onDurationUpdate, checkReminders]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  if (!isActive) return null;

  return (
    <div className="session-timer">
      <Clock size={14} />
      <span>{display}</span>
    </div>
  );
}
