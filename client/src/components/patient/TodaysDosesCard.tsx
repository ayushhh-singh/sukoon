import { useState, useEffect, useCallback } from 'react';
import { Pill, CheckCircle, XCircle, ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { medications as medsApi } from '../../services/api';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  status: string;
  dose_times: string[];
  doctor_id: string;
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
    const todayKey = now.toISOString().split('T')[0];
    const result: DoseSlot[] = [];

    for (const med of meds) {
      if (med.status !== 'active' || !med.dose_times?.length) continue;
      for (const timeStr of [...med.dose_times].sort()) {
        const [h, m] = timeStr.split(':').map(Number);
        const doseTime = new Date(todayKey + 'T00:00:00');
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
      setSlots(buildSlots(meds as unknown as Medication[]));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [buildSlots]);

  useEffect(() => { load(); }, [load]);

  async function handleLog(slot: DoseSlot, status: 'taken' | 'skipped') {
    const key = `${slot.medId}-${slot.timeStr}`;
    if (noteFor === key && status === 'taken') {
      // Submit with note
      setLogging(key);
      try {
        await medsApi.logDose(slot.medId, {
          scheduledTime: new Date().toISOString(),
          status,
          takenAt: new Date().toISOString(),
          notes: noteText || undefined,
        });
        setSlots(prev => prev.map(s =>
          s.medId === slot.medId && s.timeStr === slot.timeStr
            ? { ...s, logged: true, loggedStatus: status }
            : s
        ));
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
        scheduledTime: new Date().toISOString(),
        status,
      });
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
