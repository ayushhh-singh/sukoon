import * as medRepo from '../db/repositories/medicationRepo';
import * as medLogRepo from '../db/repositories/medicationLogRepo';
import * as notificationRepo from '../db/repositories/notificationRepo';
import * as retentionRepo from '../db/repositories/retentionRepo';
import { emitToUser } from '../realtimeEvents';

// Weekly summary cron — fires Sunday 8–9 PM
let weeklySummaryFiredAt: string | null = null;

function sendWeeklySummaries() {
  try {
    const doctorPatientMap = new Map<string, Set<string>>();
    const recentPatientLogs = medLogRepo.getAllActivePatients();

    for (const { patientId, doctorId } of recentPatientLogs) {
      const summary = medLogRepo.getPatientWeekSummary(patientId);
      if (summary.total === 0) continue;
      const adherencePct = Math.round((summary.taken / summary.total) * 100);
      const streakMsg = summary.taken === summary.total ? ' — perfect week!' : '';

      notificationRepo.create({
        userId: patientId,
        userRole: 'patient',
        type: 'weekly_summary',
        title: 'Your weekly medication summary',
        message: `This week: ${summary.taken}/${summary.total} doses taken (${adherencePct}%)${streakMsg}`,
        referenceType: 'medication',
      });

      if (!doctorPatientMap.has(doctorId)) doctorPatientMap.set(doctorId, new Set());
      doctorPatientMap.get(doctorId)!.add(`${patientId}:${adherencePct}`);
    }

    for (const [doctorId, patientSet] of doctorPatientMap) {
      const lowAdherence = [...patientSet].filter(s => parseInt(s.split(':')[1]) < 70);
      if (lowAdherence.length > 0) {
        notificationRepo.create({
          userId: doctorId,
          userRole: 'doctor',
          type: 'weekly_adherence_report',
          title: 'Weekly adherence report',
          message: `${lowAdherence.length} patient(s) had adherence below 70% this week — review recommended`,
          referenceType: 'medication',
        });
      }
    }

    console.log(`[Sukoon] Weekly summaries sent to ${recentPatientLogs.length} active patients`);
  } catch (err) {
    console.error('[Sukoon] Weekly summary error:', err);
  }
}

// Medication expiry alerts — notify doctor 14 days before a patient's medication ends
let expiryAlertFiredAt: string | null = null;

function sendMedicationExpiryAlerts() {
  try {
    const endingSoon = medRepo.findEndingSoon(14);
    for (const med of endingSoon) {
      const daysLeft = Math.ceil((new Date(med.endDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const alreadyAlerted = notificationRepo.hasRecentNotification(
        med.doctorId, 'medication_expiring', med.id, 23
      );
      if (!alreadyAlerted) {
        notificationRepo.create({
          userId: med.doctorId,
          userRole: 'doctor',
          type: 'medication_expiring',
          title: 'Medication ending soon',
          message: `${med.name} (${med.dosage}) for a patient ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — consider renewal or adjustment`,
          referenceId: med.id,
          referenceType: 'medication',
        });
        const alreadyAlertedPatient = notificationRepo.hasRecentNotification(
          med.patientId, 'medication_expiring_patient', med.id, 23
        );
        if (!alreadyAlertedPatient) {
          notificationRepo.create({
            userId: med.patientId,
            userRole: 'patient',
            type: 'medication_expiring_patient',
            title: 'Medication supply running low',
            message: `Your ${med.name} (${med.dosage}) course ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — speak with your doctor about renewal`,
            referenceId: med.id,
            referenceType: 'medication',
          });
        }
      }
    }
    if (endingSoon.length > 0) {
      console.log(`[Sukoon] Expiry alerts checked: ${endingSoon.length} medications ending within 14 days`);
    }
  } catch (err) {
    console.error('[Sukoon] Expiry alert error:', err);
  }
}

// Session reminder check — runs every 15 minutes
function sendSessionReminders() {
  try {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const allRetention = retentionRepo.findAllWithSchedules();

    for (const ret of allRetention) {
      const matchingEntry = ret.schedule.find(entry => {
        if (!entry.enabled || entry.dayOfWeek !== currentDay) return false;
        const [h, m] = entry.time.split(':').map(Number);
        const entryMinutes = h * 60 + m;
        const nowMinutes = currentHour * 60 + currentMinute;
        return nowMinutes >= entryMinutes && nowMinutes < entryMinutes + 15;
      });

      if (!matchingEntry) continue;

      const todayKey = now.toISOString().split('T')[0];
      if (ret.lastReminderShown === todayKey) continue;

      notificationRepo.create({
        userId: ret.userId,
        userRole: 'patient',
        type: 'session_reminder',
        title: 'Time for your session',
        message: `You scheduled a session for today at ${matchingEntry.time}. Take a moment to check in with yourself.`,
        referenceType: 'session',
      });

      emitToUser(ret.userId, { type: 'notification:new', payload: { type: 'session_reminder' } });
      retentionRepo.updateLastReminderShown(ret.userId, todayKey);

      console.log(`[Sukoon] Session reminder sent to ${ret.userId} for ${matchingEntry.time}`);
    }
  } catch (err) {
    console.error('[Sukoon] Session reminder error:', err);
  }
}

export function startScheduledJobs(): void {
  // Session reminders every 15 minutes + on startup
  setInterval(sendSessionReminders, 15 * 60 * 1000);
  sendSessionReminders();

  // Weekly summaries + daily expiry check every hour
  setInterval(() => {
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    if (now.getDay() === 0 && now.getHours() === 20 && weeklySummaryFiredAt !== dateKey) {
      weeklySummaryFiredAt = dateKey;
      sendWeeklySummaries();
    }
    if (now.getHours() === 9 && expiryAlertFiredAt !== dateKey) {
      expiryAlertFiredAt = dateKey;
      sendMedicationExpiryAlerts();
    }
  }, 60 * 60 * 1000);

  // Run expiry check once on server start
  sendMedicationExpiryAlerts();
}
