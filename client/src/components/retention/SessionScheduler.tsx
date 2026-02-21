import React, { useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import type { ScheduleEntry } from '../../types/retention';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface SessionSchedulerProps {
  schedule: ScheduleEntry[];
  onSave: (schedule: ScheduleEntry[]) => void;
  onClose: () => void;
}

export const SessionScheduler: React.FC<SessionSchedulerProps> = ({ schedule, onSave, onClose }) => {
  const [entries, setEntries] = useState<ScheduleEntry[]>(() => {
    if (schedule.length > 0) return schedule;
    return DAYS.map((_, i) => ({ dayOfWeek: i, time: '19:00', enabled: false }));
  });

  const toggleDay = (dayIndex: number) => {
    setEntries(prev => prev.map(e =>
      e.dayOfWeek === dayIndex ? { ...e, enabled: !e.enabled } : e
    ));
  };

  const setTime = (dayIndex: number, time: string) => {
    setEntries(prev => prev.map(e =>
      e.dayOfWeek === dayIndex ? { ...e, time } : e
    ));
  };

  const handleSave = () => {
    onSave(entries);
    onClose();
  };

  return (
    <div className="scheduler-overlay">
      <div className="scheduler-card">
        <div className="scheduler-header">
          <Calendar size={20} />
          <h3>Session Reminders</h3>
          <button className="scheduler-close" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="scheduler-subtitle">Choose your preferred session days and times</p>

        <div className="scheduler-days">
          {DAYS.map((day, i) => {
            const entry = entries.find(e => e.dayOfWeek === i)!;
            return (
              <div key={day} className={`scheduler-day ${entry.enabled ? 'active' : ''}`}>
                <button className="scheduler-day-toggle" onClick={() => toggleDay(i)}>
                  {day}
                </button>
                {entry.enabled && (
                  <div className="scheduler-time">
                    <Clock size={12} />
                    <input
                      type="time"
                      value={entry.time}
                      onChange={e => setTime(i, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button className="btn-primary scheduler-save" onClick={handleSave}>
          Save Reminders
        </button>
      </div>
    </div>
  );
};
