import { useState, useEffect, useCallback } from 'react';
import { Pill, CheckCircle, XCircle, ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { medications as medsApi } from '../../services/api';
import { cancelMedReminderInSW, closeAllMedNotificationsInSW, postMedicationsToSW } from '../../utils/medicationReminders';
import { useRealtimeSubscription } from '../../contexts/RealtimeContext';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  status: string;
  doseTimes: string[];
  doctorId: string;
}

interface DoseSlot {
  medId: string;
  medName: string;
  dosage: string;
  timeStr: string;
  isPast: boolean;
  logged: boolean;
  loggedStatus?: 'taken' | 'skipped';
}

interface Props {
  onNavigateToDoctorInput: () => void;
}

export function TodaysDosesCard({ onNavigateToDoctorInput }: Props) {
  const [slots, setSlots] = useState<DoseSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [logging, setLogging] = useState<string | null>(null); // timeStr+medId being logged
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const buildSlots = useCallback((meds: Medication[]) => {
    const now = new Date();
    const result: DoseSlot[] = [];

    for (const med of meds) {
      if (med.status !== 'active' || !med.doseTimes?.length) continue;
      for (const timeStr of [...med.doseTimes].sort()) {
        const [h, m] = timeStr.split(':').map(Number);
        const doseTime = new Date();
        doseTime.setHours(h, m, 0, 0);
        result.push({
          medId: med.id,
          medName: med.name,
          dosage: med.dosage,
          timeStr,
          isPast: doseTime < now,
          logged: false,
        });
      }
    }

    result.sort((a, b) => a.timeStr.localeCompare(b.timeStr));
    return result;
  }, []);

  const load = useCallback(async () => {
    try {
      const meds = await medsApi.list();
      const activeMeds = (meds as unknown as Medication[]).filter(m => m.status === 'active' && m.doseTimes?.length);
      const initialSlots = buildSlots(activeMeds);

      // Load today's existing logs to mark already-logged slots
      const today = new Date().toISOString().split('T')[0];
      const logResults = await Promise.allSettled(
        activeMeds.map(m => medsApi.getRecentLogs(m.id, 1).then(logs => ({ medId: m.id, logs })))
      );
      const todayLogMap = new Map<string, 'taken' | 'skipped'>();
      logResults.forEach(r => {
        if (r.status !== 'fulfilled') return;
        const { medId, logs } = r.value as { medId: string; logs: { day: string; status: string; scheduledTime: string }[] };
        const todayLogs = logs.filter(l => l.day === today);
        // Map dose times to statuses based on closest scheduledTime
        todayLogs.forEach(l => {
          const logHour = new Date(l.scheduledTime).getHours();
          const logMin = new Date(l.scheduledTime).getMinutes();
          const logMins = logHour * 60 + logMin;
          // Find the dose slot closest to this log's scheduledTime
          const med = activeMeds.find(m => m.id === medId);
          if (!med) return;
          let closest = med.doseTimes[0];
          let closestDiff = Infinity;
          for (const t of med.doseTimes) {
            const [h, m2] = t.split(':').map(Number);
            const diff = Math.abs(h * 60 + m2 - logMins);
            if (diff < closestDiff) { closestDiff = diff; closest = t; }
          }
          todayLogMap.set(`${medId}-${closest}`, l.status as 'taken' | 'skipped');
        });
      });

      setSlots(initialSlots.map(s => {
        const loggedStatus = todayLogMap.get(`${s.medId}-${s.timeStr}`);
        return loggedStatus ? { ...s, logged: true, loggedStatus } : s;
      }));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [buildSlots]);

  useEffect(() => { load(); }, [load]);

  // Real-time: refetch when medications change (doctor prescribes, updates, etc.)
  useRealtimeSubscription('medication:*', () => { load(); });

  /** Build an ISO timestamp for a dose slot time (e.g. "08:00") today */
  function slotToISO(timeStr: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  async function handleLog(slot: DoseSlot, status: 'taken' | 'skipped') {
    const key = `${slot.medId}-${slot.timeStr}`;
    const scheduledTime = slotToISO(slot.timeStr);

    if (noteFor === key && status === 'taken') {
      // Submit with note
      setLogging(key);
      try {
        await medsApi.logDose(slot.medId, {
          scheduledTime,
          status,
          takenAt: new Date().toISOString(),
          notes: noteText || undefined,
        });
        setSlots(prev => prev.map(s =>
          s.medId === slot.medId && s.timeStr === slot.timeStr
            ? { ...s, logged: true, loggedStatus: status }
            : s
        ));
        cancelMedReminderInSW(slot.medId, slot.timeStr);
        closeAllMedNotificationsInSW(slot.medId);
        setNoteFor(null);
        setNoteText('');
      } catch { /* ignore */ } finally {
        setLogging(null);
      }
      return;
    }

    if (status === 'taken') {
      // Show note prompt first
      setNoteFor(key);
      setNoteText('');
      return;
    }

    // Skipped — log immediately
    setLogging(key);
    try {
      await medsApi.logDose(slot.medId, {
        scheduledTime,
        status,
      });
      cancelMedReminderInSW(slot.medId, slot.timeStr);
      closeAllMedNotificationsInSW(slot.medId);
      setSlots(prev => prev.map(s =>
        s.medId === slot.medId && s.timeStr === slot.timeStr
          ? { ...s, logged: true, loggedStatus: status }
          : s
      ));
    } catch { /* ignore */ } finally {
      setLogging(null);
    }
  }

  if (loading || slots.length === 0) return null;

  const takenCount = slots.filter(s => s.loggedStatus === 'taken').length;
  const totalCount = slots.length;
  const allDone = slots.every(s => s.logged);
  const progressPct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <div className={`today-doses-card ${allDone ? 'all-done' : ''}`}>
      <div className="today-doses-header" onClick={() => setCollapsed(c => !c)}>
        <div className="today-doses-title-row">
          <Pill size={16} />
          <span className="today-doses-title">Today's Medications</span>
          <span className="today-doses-date">{today}</span>
        </div>
        <div className="today-doses-header-right">
          {allDone ? (
            <span className="today-doses-all-done">
              <Flame size={14} /> All done!
            </span>
          ) : (
            <span className="today-doses-progress-text">{takenCount}/{totalCount} taken</span>
          )}
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>

      {/* Progress bar */}
      <div className="today-doses-progress-bar">
        <div
          className="today-doses-progress-fill"
          style={{ width: `${progressPct}%`, background: allDone ? 'var(--success)' : 'var(--accent)' }}
        />
      </div>

      {!collapsed && (
        <div className="today-doses-list">
          {slots.map(slot => {
            const key = `${slot.medId}-${slot.timeStr}`;
            const isLogging = logging === key;
            const showNote = noteFor === key;

            return (
              <div
                key={key}
                className={`today-dose-slot ${slot.logged ? `logged-${slot.loggedStatus}` : slot.isPast ? 'overdue' : 'upcoming'}`}
              >
                <div className="today-dose-time">{slot.timeStr}</div>
                <div className="today-dose-info">
                  <span className="today-dose-name">{slot.medName}</span>
                  <span className="today-dose-dosage">{slot.dosage}</span>
                </div>

                {slot.logged ? (
                  <div className={`today-dose-logged-badge ${slot.loggedStatus}`}>
                    {slot.loggedStatus === 'taken' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    <span>{slot.loggedStatus}</span>
                  </div>
                ) : (
                  <div className="today-dose-actions">
                    <button
                      className="today-dose-btn take"
                      onClick={() => handleLog(slot, 'taken')}
                      disabled={isLogging}
                    >
                      <CheckCircle size={13} /> Took it
                    </button>
                    <button
                      className="today-dose-btn skip"
                      onClick={() => handleLog(slot, 'skipped')}
                      disabled={isLogging}
                    >
                      <XCircle size={13} /> Skip
                    </button>
                  </div>
                )}

                {showNote && (
                  <div className="today-dose-note-row">
                    <input
                      className="today-dose-note-input"
                      type="text"
                      placeholder="How do you feel? (optional)"
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="today-dose-note-confirm"
                      onClick={() => handleLog(slot, 'taken')}
                      disabled={isLogging}
                    >
                      {isLogging ? '...' : 'Confirm'}
                    </button>
                    <button className="today-dose-note-cancel" onClick={() => setNoteFor(null)}>Cancel</button>
                  </div>
                )}
              </div>
            );
          })}

          <button className="today-doses-view-all" onClick={onNavigateToDoctorInput}>
            View full medication details →
          </button>
        </div>
      )}
    </div>
  );
}
