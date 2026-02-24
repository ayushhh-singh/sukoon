import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface DoseLogEntry {
  id?: string;
  day?: string;
  status: string;
  scheduledTime: string;
  takenAt: string | null;
  notes: string | null;
}

interface Props {
  logs: DoseLogEntry[];
  label?: string;
  maxDays?: number;
}

/** Returns YYYY-MM-DD in the user's LOCAL timezone */
function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Group by the local date of when the dose was actually taken (or scheduled) */
function getDateKey(log: DoseLogEntry): string {
  const ts = log.takenAt ?? log.scheduledTime;
  return localDateKey(new Date(ts));
}

function getDayLabel(dateKey: string, today: string, yesterday: string): string {
  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  const [y, mo, d] = dateKey.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

export function DoseLogGrouped({ logs, label = 'Dose history', maxDays = 14 }: Props) {
  const today = localDateKey(new Date());
  const yesterday = localDateKey(new Date(Date.now() - 86400000));

  const grouped = new Map<string, DoseLogEntry[]>();
  logs.forEach(log => {
    const day = getDateKey(log);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(log);
  });

  const days = Array.from(grouped.keys()).sort().reverse().slice(0, maxDays);

  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(
    new Set(days.filter(d => d !== today && d !== yesterday))
  );

  function toggleDay(day: string) {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  if (days.length === 0) return null;

  return (
    <div className="dose-log-grouped">
      <div className="dose-log-grouped-label">{label}</div>
      {days.map(day => {
        const dayLogs = grouped.get(day)!;
        const takenCount = dayLogs.filter(l => l.status === 'taken').length;
        const isCollapsed = collapsedDays.has(day);
        const allTaken = takenCount === dayLogs.length;
        const noneTaken = takenCount === 0;

        return (
          <div key={day} className="dose-log-day-group">
            <div className="dose-log-day-header" onClick={() => toggleDay(day)}>
              <div className="dose-log-day-header-left">
                <span className="dose-log-day-label">{getDayLabel(day, today, yesterday)}</span>
                <span className={`dose-log-day-summary ${allTaken ? 'all-taken' : noneTaken ? 'none-taken' : 'partial'}`}>
                  {takenCount}/{dayLogs.length} taken
                </span>
              </div>
              {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </div>

            {!isCollapsed && (
              <div className="dose-log-day-entries">
                {dayLogs.map((log, idx) => (
                  <div key={log.id ?? idx} className={`dose-log-entry log-${log.status}`}>
                    <div className={`dose-log-entry-dot ${log.status}`} />
                    <div className="dose-log-entry-info">
                      <span className="dose-log-entry-time">
                        {log.takenAt
                          ? `Taken ${new Date(log.takenAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                          : new Date(log.scheduledTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`dose-log-entry-status ${log.status}`}>{log.status}</span>
                      {log.notes && <span className="dose-log-entry-note">{log.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
