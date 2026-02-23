import { useState, useEffect, useCallback } from 'react';
import { FileText, Pill, Clock, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Flame, BellRing, History, Star } from 'lucide-react';

const SIDE_EFFECT_CHIPS = ['Drowsy', 'Nausea', 'Headache', 'Anxious', 'Dizzy', 'No issues'];

const STREAK_MILESTONES: Record<number, { emoji: string; title: string; message: string }> = {
  7:  { emoji: '🔥', title: '7-day streak!',  message: 'One full week of consistency. That\'s real progress.' },
  14: { emoji: '⭐', title: '2-week streak!',  message: 'Two weeks strong. You\'re building a powerful habit.' },
  30: { emoji: '🏆', title: '30-day streak!',  message: 'A whole month! Your commitment is truly remarkable.' },
  60: { emoji: '💎', title: '60-day streak!',  message: 'Two months! This level of consistency changes lives.' },
  90: { emoji: '🌟', title: '90-day streak!',  message: '90 days. This is exceptional dedication to your health.' },
};
import { notes as notesApi, medications as medsApi, doctors as doctorsApi } from '../../services/api';
import { getNextDoseTime, getRefillCountdown, postMedicationsToSW, cancelMedReminderInSW } from '../../utils/medicationReminders';

interface DoctorNote {
  id: string;
  doctor_id: string;
  note_type: string;
  title: string | null;
  content: string;
  tags: string[];
  created_at: string;
}

interface Medication {
  id: string;
  doctor_id: string;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  status: string;
  patient_start_time: string | null;
  dose_times: string[];
}

interface DoseTally {
  medication_id: string;
  total: number;
  taken: number;
  skipped: number;
  missed: number;
}

interface DayLog {
  day: string;
  status: string;
  scheduled_time: string;
  taken_at: string | null;
  notes: string | null;
}

type SubTab = 'notes' | 'medications';

interface PatientDoctorInputProps {
  pendingAutoLog?: { medId: string; timeStr: string } | null;
  onAutoLogComplete?: () => void;
}

export function PatientDoctorInput({ pendingAutoLog, onAutoLogComplete }: PatientDoctorInputProps = {}) {
  const [subTab, setSubTab] = useState<SubTab>('medications');
  const [notesList, setNotesList] = useState<DoctorNote[]>([]);
  const [medsList, setMedsList] = useState<Medication[]>([]);
  const [tallies, setTallies] = useState<Map<string, DoseTally>>(new Map());
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map());
  const [recentLogs, setRecentLogs] = useState<Map<string, DayLog[]>>(new Map());
  const [doctorMap, setDoctorMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedMed, setExpandedMed] = useState<string | null>(null);
  const [collapsedDoctors, setCollapsedDoctors] = useState<Set<string>>(new Set());
  const [loggingDose, setLoggingDose] = useState(false);
  const [pendingLog, setPendingLog] = useState<{ medId: string; status: 'taken' | 'skipped' } | null>(null);
  const [doseNote, setDoseNote] = useState('');
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [streakMilestone, setStreakMilestone] = useState<{ medName: string; streak: number } | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    () => ('Notification' in window ? Notification.permission : 'denied')
  );
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(
    () => localStorage.getItem('sukoon_notif_dismissed') === 'true'
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const linkedDoctors = await doctorsApi.getMyLinkedDoctors();
      const dMap = new Map<string, string>(
        linkedDoctors.map(d => [d.id as string, (d.displayName as string) || 'Unknown'])
      );
      setDoctorMap(dMap);

      if (subTab === 'notes') {
        const data = await notesApi.list();
        setNotesList(data as unknown as DoctorNote[]);
      } else {
        const [meds, tallyData] = await Promise.all([
          medsApi.list(),
          medsApi.getAllTallies(),
        ]);
        const medsTyped = meds as unknown as Medication[];
        setMedsList(medsTyped);
        const tallyMap = new Map<string, DoseTally>();
        (tallyData as unknown as DoseTally[]).forEach(t => tallyMap.set(t.medication_id, t));
        setTallies(tallyMap);

        // Fetch today's logs to know which dose slots are already taken/skipped
        const today = new Date().toISOString().split('T')[0];
        const activeMedsWithTimes = medsTyped.filter(m => m.status === 'active' && m.dose_times?.length > 0);
        const todayLogResults = await Promise.allSettled(
          activeMedsWithTimes.map(m => medsApi.getRecentLogs(m.id, 1).then(logs => ({ medId: m.id, logs })))
        );
        // Build map: medId → set of dose-time strings already logged today
        const takenTimesMap = new Map<string, Set<string>>();
        todayLogResults.forEach(r => {
          if (r.status !== 'fulfilled') return;
          const { medId, logs } = r.value as { medId: string; logs: { day: string; status: string; scheduled_time: string }[] };
          const todayLogs = logs.filter(l => l.day === today);
          const taken = new Set<string>();
          todayLogs.forEach(l => {
            const logHour = new Date(l.scheduled_time).getHours();
            const logMin = new Date(l.scheduled_time).getMinutes();
            const logMins = logHour * 60 + logMin;
            const med = activeMedsWithTimes.find(m => m.id === medId);
            if (!med) return;
            // Find the dose_time slot closest to this log's time
            let closest = med.dose_times[0];
            let closestDiff = Infinity;
            for (const t of med.dose_times) {
              const [h, m2] = t.split(':').map(Number);
              const diff = Math.abs(h * 60 + m2 - logMins);
              if (diff < closestDiff) { closestDiff = diff; closest = t; }
            }
            taken.add(closest);
          });
          takenTimesMap.set(medId, taken);
        });

        // Post active med schedules to SW — only include dose times not yet taken today
        const activeMedsForSW = activeMedsWithTimes.map(m => {
          const taken = takenTimesMap.get(m.id) ?? new Set<string>();
          const remainingTimes = m.dose_times.filter(t => !taken.has(t));
          return { id: m.id, name: m.name, dosage: m.dosage, frequency: m.frequency, doseTimes: remainingTimes };
        }).filter(m => m.doseTimes.length > 0);
        postMedicationsToSW(activeMedsForSW);

        // Fetch streaks for active medications
        const activeMeds = medsTyped.filter(m => m.status === 'active');
        const streakResults = await Promise.allSettled(
          activeMeds.map(m => medsApi.getStreak(m.id).then(r => ({ id: m.id, streak: r.streak })))
        );
        const streakMap = new Map<string, number>();
        streakResults.forEach(r => {
          if (r.status === 'fulfilled') streakMap.set(r.value.id, r.value.streak);
        });
        setStreaks(streakMap);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [subTab]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-log dose triggered from notification "Took it" action
  useEffect(() => {
    if (!pendingAutoLog || loading || medsList.length === 0) return;
    const { medId, timeStr } = pendingAutoLog;
    if (!medsList.find(m => m.id === medId)) return;
    onAutoLogComplete?.();
    setExpandedMed(medId);
    // Use the notification's exact timeStr as scheduledTime so it maps to the right slot
    void (async () => {
      setLoggingDose(true);
      try {
        await medsApi.logDose(medId, {
          scheduledTime: (() => {
            const [h, m] = timeStr.split(':').map(Number);
            const d = new Date(); d.setHours(h, m, 0, 0);
            return d.toISOString();
          })(),
          status: 'taken',
          takenAt: new Date().toISOString(),
        });
        const [tallyData, streakData] = await Promise.all([medsApi.getAllTallies(), medsApi.getStreak(medId)]);
        const tallyMap = new Map<string, DoseTally>();
        (tallyData as unknown as DoseTally[]).forEach(t => tallyMap.set(t.medication_id, t));
        setTallies(tallyMap);
        setStreaks(prev => new Map(prev).set(medId, streakData.streak));
        setRecentLogs(prev => { const next = new Map(prev); next.delete(medId); return next; });
        cancelMedReminderInSW(medId, timeStr);
      } catch { /* ignore */ } finally {
        setLoggingDose(false);
      }
    })();
  }, [pendingAutoLog, loading, medsList]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep notifPermission in sync with the actual browser value
  useEffect(() => {
    if (!('Notification' in window)) return;
    setNotifPermission(Notification.permission);
  }, []);

  // Set up browser notification reminders at dose times
  useEffect(() => {
    if (medsList.length === 0) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const activeMeds = medsList.filter(m => m.status === 'active' && m.dose_times?.length > 0);
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function scheduleReminder(med: Medication, timeStr: string, daysFromNow: number) {
      const [h, m] = timeStr.split(':').map(Number);
      const doseTime = new Date();
      doseTime.setDate(doseTime.getDate() + daysFromNow);
      doseTime.setHours(h, m, 0, 0);
      const msUntil = doseTime.getTime() - Date.now();
      if (msUntil > 0) {
        const t = setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification(`Time to take ${med.name}`, {
              body: `${med.dosage} · ${med.frequency}`,
              icon: '/favicon.ico',
              tag: `med-${med.id}-${timeStr}-${daysFromNow}`,
            });
          }
        }, msUntil);
        timeouts.push(t);
      }
    }

    for (const med of activeMeds) {
      let scheduledAny = false;
      for (const timeStr of med.dose_times) {
        const [h, m] = timeStr.split(':').map(Number);
        const doseTime = new Date();
        doseTime.setHours(h, m, 0, 0);
        if (doseTime > new Date()) {
          scheduleReminder(med, timeStr, 0); // today
          scheduledAny = true;
        }
      }
      // If all today's dose times have passed, schedule the first dose tomorrow
      if (!scheduledAny) {
        const sorted = [...med.dose_times].sort();
        scheduleReminder(med, sorted[0], 1);
      }
    }

    return () => timeouts.forEach(t => clearTimeout(t));
  }, [medsList]);

  // Fetch recent logs when a card is expanded
  useEffect(() => {
    if (!expandedMed) return;
    if (recentLogs.has(expandedMed)) return; // already fetched

    medsApi.getRecentLogs(expandedMed, 7).then(logs => {
      setRecentLogs(prev => new Map(prev).set(expandedMed, logs as unknown as DayLog[]));
    }).catch(() => {
      // ignore
    });
  }, [expandedMed, recentLogs]);

  async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    localStorage.setItem('sukoon_notif_dismissed', 'true');
    setNotifBannerDismissed(true);
    if (permission === 'granted') {
      new Notification('Reminders enabled!', {
        body: 'You\'ll be notified when it\'s time to take your medications.',
        icon: '/favicon.ico',
        tag: 'med-reminders-enabled',
      });
    }
  }

  function initiateLogDose(medId: string, status: 'taken' | 'skipped') {
    if (status === 'taken') {
      setPendingLog({ medId, status });
      setDoseNote('');
      setSelectedEffects([]);
    } else {
      void commitLogDose(medId, status, '');
    }
  }

  function toggleEffect(effect: string) {
    setSelectedEffects(prev =>
      prev.includes(effect) ? prev.filter(e => e !== effect) : [...prev, effect]
    );
  }

  async function commitLogDose(medId: string, status: 'taken' | 'skipped', note: string) {
    setLoggingDose(true);
    setPendingLog(null);
    // Combine side effects and free text note
    const effectsText = selectedEffects.length > 0 ? `[${selectedEffects.join(', ')}]` : '';
    const fullNote = [effectsText, note.trim()].filter(Boolean).join(' ');
    setSelectedEffects([]);
    try {
      await medsApi.logDose(medId, {
        scheduledTime: new Date().toISOString(),
        status,
        takenAt: status === 'taken' ? new Date().toISOString() : undefined,
        notes: fullNote || undefined,
      });
      const [tallyData, streakData] = await Promise.all([
        medsApi.getAllTallies(),
        medsApi.getStreak(medId),
      ]);
      const tallyMap = new Map<string, DoseTally>();
      (tallyData as unknown as DoseTally[]).forEach(t => tallyMap.set(t.medication_id, t));
      setTallies(tallyMap);
      setStreaks(prev => new Map(prev).set(medId, streakData.streak));
      setRecentLogs(prev => { const next = new Map(prev); next.delete(medId); return next; });
      // Re-fetch today's logs for this med and reschedule SW without already-taken times
      const med = medsList.find(m => m.id === medId);
      if (med?.dose_times?.length) {
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        // Find the dose time closest to now and cancel it
        let closest = med.dose_times[0];
        let closestDiff = Infinity;
        for (const t of med.dose_times) {
          const [h, m] = t.split(':').map(Number);
          const diff = Math.abs(h * 60 + m - nowMins);
          if (diff < closestDiff) { closestDiff = diff; closest = t; }
        }
        cancelMedReminderInSW(medId, closest);
        // Reschedule SW with remaining (not-yet-taken) dose times for this med
        // Fetch fresh today logs then post remaining schedule to SW
        const today = new Date().toISOString().split('T')[0];
        medsApi.getRecentLogs(medId, 1).then(freshLogs => {
          const typedLogs = freshLogs as unknown as { day: string; scheduled_time: string }[];
          const todayLogs = typedLogs.filter(l => l.day === today);
          const takenSet = new Set<string>();
          todayLogs.forEach(l => {
            const logMins = new Date(l.scheduled_time).getHours() * 60 + new Date(l.scheduled_time).getMinutes();
            let c = med.dose_times[0]; let cDiff = Infinity;
            for (const t of med.dose_times) {
              const [h, m2] = t.split(':').map(Number);
              const d = Math.abs(h * 60 + m2 - logMins);
              if (d < cDiff) { cDiff = d; c = t; }
            }
            takenSet.add(c);
          });
          const remaining = med.dose_times.filter(t => !takenSet.has(t));
          if (remaining.length > 0) {
            postMedicationsToSW([{ id: med.id, name: med.name, dosage: med.dosage, frequency: med.frequency, doseTimes: remaining }]);
          }
        }).catch(() => {});
      }
      // Check for streak milestone
      if (status === 'taken' && STREAK_MILESTONES[streakData.streak]) {
        const med = medsList.find(m => m.id === medId);
        setStreakMilestone({ medName: med?.name ?? 'medication', streak: streakData.streak });
      }
    } catch {
      // ignore
    } finally {
      setLoggingDose(false);
    }
  }

  async function handleSetStartTime(medId: string) {
    try {
      await medsApi.update(medId, { patientStartTime: new Date().toISOString() });
      loadData();
    } catch {
      // ignore
    }
  }

  async function handleSetDoseTimes(medId: string, times: string[]) {
    try {
      await medsApi.update(medId, { doseTimes: times });
      loadData();
    } catch {
      // ignore
    }
  }

  function toggleDoctorCollapse(doctorId: string) {
    setCollapsedDoctors(prev => {
      const next = new Set(prev);
      if (next.has(doctorId)) next.delete(doctorId);
      else next.add(doctorId);
      return next;
    });
  }

  function getDaysUntilEnd(endDate: string | null): number | null {
    if (!endDate) return null;
    const end = new Date(endDate).getTime();
    const now = Date.now();
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  }

  function getAdherencePercent(tally: DoseTally | undefined): number {
    if (!tally || tally.total === 0) return 0;
    return Math.round((tally.taken / tally.total) * 100);
  }

  function getNextDoseLabel(doseTimes: string[]): string | null {
    const next = getNextDoseTime(doseTimes);
    if (!next) return null;
    const [h, m] = next.split(':').map(Number);
    const now = new Date();
    const doseTime = new Date();
    doseTime.setHours(h, m, 0, 0);
    if (doseTime <= now) {
      // Next dose is tomorrow
      doseTime.setDate(doseTime.getDate() + 1);
    }
    const diffMs = doseTime.getTime() - now.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffH === 0) return `${diffM}m`;
    if (diffM === 0) return `${diffH}h`;
    return `${diffH}h ${diffM}m`;
  }

  function getMissedDoseInfo(med: Medication, logs: DayLog[] | null): { time: string; hoursAgo: number } | null {
    if (!med.dose_times?.length || !logs) return null;
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.day === today && (l.status === 'taken' || l.status === 'skipped'));
    if (todayLogs.length >= med.dose_times.length) return null; // all doses logged
    const now = new Date();
    for (const timeStr of med.dose_times) {
      const [h, m] = timeStr.split(':').map(Number);
      const doseTime = new Date();
      doseTime.setHours(h, m, 0, 0);
      const hoursAgo = (now.getTime() - doseTime.getTime()) / (1000 * 60 * 60);
      if (hoursAgo > 1 && hoursAgo < 24) {
        // Check if this specific time was already logged
        const alreadyLogged = todayLogs.some(l => {
          const logTime = new Date(l.scheduled_time);
          return Math.abs(logTime.getHours() - h) <= 1;
        });
        if (!alreadyLogged) return { time: timeStr, hoursAgo: Math.round(hoursAgo) };
      }
    }
    return null;
  }

  // Group medications by doctor_id
  const medsGroupedByDoctor = new Map<string, { active: Medication[]; other: Medication[] }>();
  medsList.forEach(m => {
    if (!medsGroupedByDoctor.has(m.doctor_id)) {
      medsGroupedByDoctor.set(m.doctor_id, { active: [], other: [] });
    }
    const group = medsGroupedByDoctor.get(m.doctor_id)!;
    if (m.status === 'active') group.active.push(m);
    else group.other.push(m);
  });

  // Group notes by doctor_id
  const notesGroupedByDoctor = new Map<string, DoctorNote[]>();
  notesList.forEach(n => {
    if (!notesGroupedByDoctor.has(n.doctor_id)) notesGroupedByDoctor.set(n.doctor_id, []);
    notesGroupedByDoctor.get(n.doctor_id)!.push(n);
  });

  function renderDoctorGroupHeader(doctorId: string, count: number, label: string) {
    const isCollapsed = collapsedDoctors.has(doctorId);
    const name = doctorMap.get(doctorId) || 'Dr. Unknown';
    return (
      <div className="patient-doctor-group-header" onClick={() => toggleDoctorCollapse(doctorId)}>
        <div className="patient-doctor-group-info">
          <div className="patient-doctor-group-avatar">{name.charAt(0).toUpperCase()}</div>
          <span className="patient-doctor-group-name">Dr. {name}</span>
          <span className="patient-doctor-group-count">{count} {label}{count !== 1 ? 's' : ''}</span>
        </div>
        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </div>
    );
  }

  function renderMedCard(med: Medication) {
    const tally = tallies.get(med.id);
    const daysLeft = getDaysUntilEnd(med.end_date);
    const adherence = getAdherencePercent(tally);
    const streak = streaks.get(med.id) ?? 0;
    const isExpanded = expandedMed === med.id;
    const isEndingSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
    const hasEnded = daysLeft !== null && daysLeft <= 0;
    const nextDoseLabel = med.dose_times?.length > 0 ? getNextDoseLabel(med.dose_times) : null;
    const logs = recentLogs.get(med.id) ?? null;
    const refill = getRefillCountdown(med.end_date);
    const isPendingThisMed = pendingLog?.medId === med.id;
    const missedDose = isExpanded ? getMissedDoseInfo(med, logs) : null;

    return (
      <div key={med.id} className={`doctor-input-med-card ${isEndingSoon ? 'ending-soon' : ''} ${hasEnded ? 'ended' : ''}`}>
        {hasEnded && (
          <div className="med-warning med-warning-ended">
            <AlertTriangle size={14} />
            <span>This medication has passed its end date. Please consult your doctor.</span>
          </div>
        )}
        {isEndingSoon && !hasEnded && (
          <div className="med-warning med-warning-ending">
            <AlertTriangle size={14} />
            <span>Ending in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="med-card-main" onClick={() => setExpandedMed(isExpanded ? null : med.id)}>
          <div className="med-card-info">
            <div className="med-card-name-row">
              <span className="med-card-name">{med.name}</span>
              {streak > 0 && (
                <span className="med-streak-badge">
                  <Flame size={12} />
                  {streak}d streak
                </span>
              )}
            </div>
            <span className="med-card-dosage">{med.dosage} — {med.frequency}</span>
            <div className="med-card-meta-row">
              <span className="med-card-dates">
                Since {new Date(med.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                {med.end_date && ` until ${new Date(med.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
              </span>
              {nextDoseLabel && (
                <span className="med-next-dose">
                  <BellRing size={11} />
                  {nextDoseLabel}
                </span>
              )}
              {refill.label && (
                <span className={`med-refill-badge refill-${refill.urgency}`}>
                  <Pill size={10} />
                  {refill.label}
                </span>
              )}
            </div>
          </div>
          <div className="med-card-right">
            {tally && tally.total > 0 && (
              <div className="med-adherence">
                <div className="med-adherence-bar">
                  <div className="med-adherence-fill" style={{ width: `${adherence}%` }} />
                </div>
                <span className="med-adherence-text">{adherence}%</span>
              </div>
            )}
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {isExpanded && (
          <div className="med-card-expanded">
            {med.notes && (
              <div className="med-card-doctor-notes">
                <strong>Doctor's notes:</strong> {med.notes}
              </div>
            )}

            {tally && tally.total > 0 && (
              <div className="med-tally">
                <div className="med-tally-item med-tally-taken">
                  <CheckCircle size={14} />
                  <span>{tally.taken} taken</span>
                </div>
                <div className="med-tally-item med-tally-skipped">
                  <XCircle size={14} />
                  <span>{tally.skipped} skipped</span>
                </div>
                <div className="med-tally-item med-tally-missed">
                  <AlertTriangle size={14} />
                  <span>{tally.missed} missed</span>
                </div>
              </div>
            )}

            {/* Missed dose guidance */}
            {missedDose && (
              <div className="med-missed-guidance">
                <AlertTriangle size={14} />
                <div>
                  <strong>Missed {missedDose.time} dose</strong> ({missedDose.hoursAgo}h ago)
                  {missedDose.hoursAgo < 6
                    ? ' — You can still take it now if it won\'t be too close to your next dose.'
                    : ' — Skip this dose and take your next scheduled dose normally.'}
                </div>
              </div>
            )}

            {/* 7-day dot calendar */}
            <MedCalendar logs={logs} />

            {/* Detailed log list with times + side effects */}
            {logs && logs.length > 0 && (
              <div className="patient-dose-log-list">
                <div className="patient-dose-log-list-label">Recent doses</div>
                {logs.slice(0, 10).map((log, idx) => (
                  <div key={idx} className={`patient-dose-log-row log-${log.status}`}>
                    <div className={`patient-dose-log-dot ${log.status}`} />
                    <div className="patient-dose-log-info">
                      <span className="patient-dose-log-time">
                        {new Date(log.scheduled_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' · '}
                        {log.taken_at
                          ? `Taken at ${new Date(log.taken_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                          : new Date(log.scheduled_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`patient-dose-log-status ${log.status}`}>{log.status}</span>
                      {log.notes && (
                        <span className="patient-dose-log-note">{log.notes}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!med.patient_start_time ? (
              <button className="med-start-btn" onClick={() => handleSetStartTime(med.id)}>
                <Clock size={14} />
                <span>Mark as started (set start time)</span>
              </button>
            ) : (
              <div className="med-started-info">
                <Clock size={14} />
                <span>Started: {new Date(med.patient_start_time).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
                })}</span>
              </div>
            )}

            <DoseTimeEditor
              doseTimes={med.dose_times || []}
              onSave={(times) => handleSetDoseTimes(med.id, times)}
            />

            {/* Medication history timeline */}
            <div className="med-history-timeline">
              <div className="med-history-label">
                <History size={13} /> Timeline
              </div>
              <div className="med-history-events">
                <div className="med-history-event">
                  <div className="med-history-dot prescribed" />
                  <span className="med-history-text">Prescribed</span>
                  <span className="med-history-date">
                    {new Date(med.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {med.patient_start_time && (
                  <div className="med-history-event">
                    <div className="med-history-dot started" />
                    <span className="med-history-text">You started</span>
                    <span className="med-history-date">
                      {new Date(med.patient_start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {streak > 0 && (
                  <div className="med-history-event">
                    <div className="med-history-dot streak" />
                    <span className="med-history-text">Current streak</span>
                    <span className="med-history-date">{streak} day{streak !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {med.end_date && (
                  <div className="med-history-event">
                    <div className={`med-history-dot ${hasEnded ? 'ended' : 'future'}`} />
                    <span className="med-history-text">{hasEnded ? 'Course ended' : 'Course ends'}</span>
                    <span className="med-history-date">
                      {new Date(med.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {!isPendingThisMed ? (
              <div className="med-log-actions">
                <button
                  className="med-log-btn med-log-taken"
                  onClick={() => initiateLogDose(med.id, 'taken')}
                  disabled={loggingDose}
                >
                  <CheckCircle size={16} />
                  <span>Took dose</span>
                </button>
                <button
                  className="med-log-btn med-log-skipped"
                  onClick={() => initiateLogDose(med.id, 'skipped')}
                  disabled={loggingDose}
                >
                  <XCircle size={16} />
                  <span>Skipped dose</span>
                </button>
              </div>
            ) : (
              <div className="med-note-prompt">
                <div className="med-side-effects-label">Any side effects? (optional)</div>
                <div className="med-side-effect-chips">
                  {SIDE_EFFECT_CHIPS.map(effect => (
                    <button
                      key={effect}
                      className={`med-effect-chip ${selectedEffects.includes(effect) ? 'selected' : ''}`}
                      onClick={() => toggleEffect(effect)}
                      type="button"
                    >
                      {effect}
                    </button>
                  ))}
                </div>
                <input
                  className="med-note-input"
                  type="text"
                  placeholder="Additional notes... (optional)"
                  value={doseNote}
                  onChange={e => setDoseNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && commitLogDose(med.id, 'taken', doseNote)}
                  autoFocus
                />
                <div className="med-note-actions">
                  <button className="med-note-confirm" onClick={() => commitLogDose(med.id, 'taken', doseNote)}>
                    Confirm taken
                  </button>
                  <button className="med-note-cancel" onClick={() => { setPendingLog(null); setSelectedEffects([]); }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="patient-tab-content">
      <div className="doctor-input-container">
        <h2>Doctor's Input</h2>

        <div className="doctor-input-tabs">
          <button
            className={`doctor-input-tab ${subTab === 'medications' ? 'active' : ''}`}
            onClick={() => setSubTab('medications')}
          >
            <Pill size={16} />
            <span>Medications</span>
          </button>
          <button
            className={`doctor-input-tab ${subTab === 'notes' ? 'active' : ''}`}
            onClick={() => setSubTab('notes')}
          >
            <FileText size={16} />
            <span>Notes</span>
          </button>
        </div>

        {/* Notification permission banner */}
        {'Notification' in window && notifPermission !== 'granted' && !notifBannerDismissed && subTab === 'medications' && (
          <div className="med-notif-banner">
            <BellRing size={16} />
            <span>Enable reminders to get notified when it's time to take your medication.</span>
            <button className="med-notif-banner-btn" onClick={requestNotificationPermission}>
              Enable
            </button>
          </div>
        )}

        {loading && <div className="doctor-input-loading">Loading...</div>}

        {/* Notes Sub-tab */}
        {!loading && subTab === 'notes' && (
          <div className="doctor-input-notes">
            {notesList.length === 0 ? (
              <div className="doctor-input-empty">
                <FileText size={40} />
                <p>No notes from your therapist yet</p>
              </div>
            ) : (
              <div className="patient-doctor-groups">
                {Array.from(notesGroupedByDoctor.entries()).map(([doctorId, notes]) => {
                  const isCollapsed = collapsedDoctors.has(doctorId);
                  return (
                    <div key={doctorId} className="patient-doctor-group">
                      {renderDoctorGroupHeader(doctorId, notes.length, 'note')}
                      {!isCollapsed && (
                        <div className="doctor-input-notes-list">
                          {notes.map(note => (
                            <div key={note.id} className="doctor-input-note-card">
                              <div className="doctor-input-note-header">
                                <span className={`doctor-input-note-type ${note.note_type}`}>{note.note_type}</span>
                                <span className="doctor-input-note-date">
                                  {new Date(note.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                  })}
                                </span>
                              </div>
                              {note.title && <h4 className="doctor-input-note-title">{note.title}</h4>}
                              <p className="doctor-input-note-content">{note.content}</p>
                              {note.tags?.length > 0 && (
                                <div className="doctor-input-note-tags">
                                  {note.tags.map(t => <span key={t} className="doctor-input-tag">{t}</span>)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Medications Sub-tab */}
        {!loading && subTab === 'medications' && (
          <div className="doctor-input-meds">
            {medsList.length === 0 ? (
              <div className="doctor-input-empty">
                <Pill size={40} />
                <p>No medications prescribed yet</p>
              </div>
            ) : (
              <div className="patient-doctor-groups">
                {Array.from(medsGroupedByDoctor.entries()).map(([doctorId, groups]) => {
                  const isCollapsed = collapsedDoctors.has(doctorId);
                  const totalCount = groups.active.length + groups.other.length;
                  return (
                    <div key={doctorId} className="patient-doctor-group">
                      {renderDoctorGroupHeader(doctorId, totalCount, 'medication')}
                      {!isCollapsed && (
                        <div className="patient-doctor-group-body">
                          {groups.active.length > 0 && (
                            <div className="doctor-input-meds-section">
                              <h4 className="doctor-input-meds-section-label">Active</h4>
                              {groups.active.map(med => renderMedCard(med))}
                            </div>
                          )}
                          {groups.other.length > 0 && (
                            <div className="doctor-input-meds-section">
                              <h4 className="doctor-input-meds-section-label">Past</h4>
                              {groups.other.map(med => {
                                const tally = tallies.get(med.id);
                                return (
                                  <div key={med.id} className="doctor-input-med-card doctor-input-med-past">
                                    <div className="med-card-main">
                                      <div className="med-card-info">
                                        <span className="med-card-name">{med.name}</span>
                                        <span className="med-card-dosage">{med.dosage} — {med.frequency}</span>
                                      </div>
                                      <div className="med-card-right">
                                        <span className={`med-status med-status-${med.status}`}>{med.status}</span>
                                        {tally && tally.total > 0 && (
                                          <span className="med-adherence-text">{Math.round((tally.taken / tally.total) * 100)}% adherence</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Streak milestone celebration modal */}
      {streakMilestone && STREAK_MILESTONES[streakMilestone.streak] && (() => {
        const m = STREAK_MILESTONES[streakMilestone.streak];
        return (
          <div className="streak-milestone-overlay" onClick={() => setStreakMilestone(null)}>
            <div className="streak-milestone-modal" onClick={e => e.stopPropagation()}>
              <div className="streak-milestone-emoji">{m.emoji}</div>
              <h3 className="streak-milestone-title">{m.title}</h3>
              <p className="streak-milestone-med">{streakMilestone.medName}</p>
              <p className="streak-milestone-message">{m.message}</p>
              <div className="streak-milestone-stars">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <button className="streak-milestone-close" onClick={() => setStreakMilestone(null)}>
                Keep it up!
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// 7-day calendar component showing dose history
function MedCalendar({ logs }: { logs: DayLog[] | null }) {
  if (logs === null) {
    return <div className="med-calendar-loading">Loading history...</div>;
  }

  // Build last 7 days (today last)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  // Best status per day: taken > skipped > missed
  const statusPriority: Record<string, number> = { taken: 3, skipped: 2, missed: 1 };
  const dayStatusMap = new Map<string, string>();
  logs.forEach(l => {
    const existing = dayStatusMap.get(l.day);
    if (!existing || (statusPriority[l.status] ?? 0) > (statusPriority[existing] ?? 0)) {
      dayStatusMap.set(l.day, l.status);
    }
  });

  return (
    <div className="med-calendar">
      <span className="med-calendar-label">Last 7 days</span>
      <div className="med-calendar-row">
        {days.map(day => {
          const status = dayStatusMap.get(day);
          const d = new Date(day + 'T00:00:00');
          const isToday = day === new Date().toISOString().split('T')[0];
          const dayLabel = isToday ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' });
          return (
            <div key={day} className={`med-calendar-day ${status ? `med-cal-${status}` : 'med-cal-none'}`}>
              <div className="med-calendar-dot" title={status ?? 'no log'} />
              <span className="med-calendar-day-label">{dayLabel}</span>
            </div>
          );
        })}
      </div>
      <div className="med-calendar-legend">
        <span className="med-cal-legend-item med-cal-taken">Taken</span>
        <span className="med-cal-legend-item med-cal-skipped">Skipped</span>
        <span className="med-cal-legend-item med-cal-missed">Missed</span>
        <span className="med-cal-legend-item med-cal-none">No log</span>
      </div>
    </div>
  );
}

// Dose time editor sub-component
function DoseTimeEditor({ doseTimes, onSave }: { doseTimes: string[]; onSave: (times: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [times, setTimes] = useState<string[]>(doseTimes.length > 0 ? doseTimes : ['08:00']);

  function addTime() {
    setTimes([...times, '12:00']);
  }

  function removeTime(idx: number) {
    setTimes(times.filter((_, i) => i !== idx));
  }

  function updateTime(idx: number, value: string) {
    const updated = [...times];
    updated[idx] = value;
    setTimes(updated);
  }

  function handleSave() {
    onSave(times);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="dose-times-display">
        {doseTimes.length > 0 ? (
          <div className="dose-times-list">
            <Clock size={14} />
            <span>Dose times: {doseTimes.join(', ')}</span>
            <button className="dose-times-edit-btn" onClick={() => setEditing(true)}>Edit</button>
          </div>
        ) : (
          <button className="dose-times-set-btn" onClick={() => setEditing(true)}>
            <Clock size={14} />
            <span>Set dose reminder times</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="dose-times-editor">
      <span className="dose-times-label">Dose Times:</span>
      {times.map((t, idx) => (
        <div key={idx} className="dose-time-row">
          <input
            type="time"
            value={t}
            onChange={e => updateTime(idx, e.target.value)}
            className="dose-time-input"
          />
          {times.length > 1 && (
            <button className="dose-time-remove" onClick={() => removeTime(idx)}>
              <XCircle size={14} />
            </button>
          )}
        </div>
      ))}
      <div className="dose-times-actions">
        <button className="dose-times-add" onClick={addTime}>+ Add time</button>
        <button className="dose-times-save" onClick={handleSave}>Save</button>
        <button className="dose-times-cancel" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
}
