import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { setupWebSocket } from './websocket';
import { setupEventWebSocket, emitToUser } from './realtimeEvents';

// Initialize database (runs schema)
import './db/database';

// Routes
import { authMiddleware } from './middleware/auth';
import { hashPassword, ADMIN_EMAIL } from './auth/auth';
import * as doctorRepo from './db/repositories/doctorRepo';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import doctorRoutes from './routes/doctors';
import sessionRoutes from './routes/sessions';
import assessmentRoutes from './routes/assessments';
import moodRoutes from './routes/moods';
import doctorNoteRoutes from './routes/doctorNotes';
import medicationRoutes from './routes/medications';
import * as medRepo from './db/repositories/medicationRepo';
import * as medLogRepo from './db/repositories/medicationLogRepo';
import * as notificationRepo from './db/repositories/notificationRepo';
import * as retentionRepo from './db/repositories/retentionRepo';
import bookmarkRoutes from './routes/bookmarks';
import journalRoutes from './routes/journal';
import retentionRoutes from './routes/retention';
import appointmentRoutes from './routes/appointments';
import checkinRoutes from './routes/checkins';
import treatmentPlanRoutes from './routes/treatmentPlans';
import safetyPlanRoutes from './routes/safetyPlans';
import clinicalFormulationRoutes from './routes/clinicalFormulations';
import timelineRoutes from './routes/clinicalTimeline';
import notificationRoutes from './routes/notifications';

const app = express();
const PORT = process.env.PORT || 8081;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: process.env.TUNNEL_MODE === 'true' ? true : CLIENT_URL }));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/doctors', authMiddleware, doctorRoutes);
app.use('/api/sessions', authMiddleware, sessionRoutes);
app.use('/api/assessments', authMiddleware, assessmentRoutes);
app.use('/api/moods', authMiddleware, moodRoutes);
app.use('/api/notes', authMiddleware, doctorNoteRoutes);
app.use('/api/medications', authMiddleware, medicationRoutes);
app.use('/api/bookmarks', authMiddleware, bookmarkRoutes);
app.use('/api/journal', authMiddleware, journalRoutes);
app.use('/api/retention', authMiddleware, retentionRoutes);
app.use('/api/appointments', authMiddleware, appointmentRoutes);
app.use('/api/checkins', authMiddleware, checkinRoutes);
app.use('/api/treatment-plans', authMiddleware, treatmentPlanRoutes);
app.use('/api/safety-plans', authMiddleware, safetyPlanRoutes);
app.use('/api/formulations', authMiddleware, clinicalFormulationRoutes);
app.use('/api/timeline', authMiddleware, timelineRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);

const server = http.createServer(app);

const sessionWss = setupWebSocket(server);
const eventWss = setupEventWebSocket(server);

// Manual upgrade routing — required when multiple WebSocketServers share one HTTP server
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

  if (pathname === '/ws') {
    sessionWss.handleUpgrade(request, socket, head, (ws) => {
      sessionWss.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/events') {
    eventWss.handleUpgrade(request, socket, head, (ws) => {
      eventWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Seed admin account if it doesn't exist
function seedAdmin() {
  const existing = doctorRepo.findByEmail(ADMIN_EMAIL);
  if (!existing) {
    const defaultPassword = 'admin123';
    doctorRepo.create({
      email: ADMIN_EMAIL,
      passwordHash: hashPassword(defaultPassword),
      username: 'admin_sukoon',
      displayName: 'Ayush Singh',
      experienceYears: 5,
      qualifications: 'Platform Administrator',
      specializations: [],
    });
    console.log(`[Sukoon] Admin account created: ${ADMIN_EMAIL} / ${defaultPassword}`);
    console.log(`[Sukoon] IMPORTANT: Change the admin password after first login!`);
  }
}

seedAdmin();

// Weekly summary cron — runs every hour, fires Sunday 8–9 PM
let weeklySummaryFiredAt: string | null = null;

function sendWeeklySummaries() {
  try {
    const doctorPatientMap = new Map<string, Set<string>>();
    const recentPatientLogs = medLogRepo.getAllActivePatients();

    for (const { patientId, doctorId } of recentPatientLogs) {
      // Patient summary
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

      // Doctor summary per patient
      if (!doctorPatientMap.has(doctorId)) doctorPatientMap.set(doctorId, new Set());
      doctorPatientMap.get(doctorId)!.add(`${patientId}:${adherencePct}`);
    }

    // Doctor digest
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
        med.doctorId, 'medication_expiring', med.id, 23 // once per day
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
        // Also notify patient
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
    const currentDay = now.getDay(); // 0=Sun, 1=Mon, ...
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const allRetention = retentionRepo.findAllWithSchedules();

    for (const ret of allRetention) {
      const matchingEntry = ret.schedule.find(entry => {
        if (!entry.enabled || entry.dayOfWeek !== currentDay) return false;
        const [h, m] = entry.time.split(':').map(Number);
        // Match if within a 15-minute window
        const entryMinutes = h * 60 + m;
        const nowMinutes = currentHour * 60 + currentMinute;
        return nowMinutes >= entryMinutes && nowMinutes < entryMinutes + 15;
      });

      if (!matchingEntry) continue;

      // Prevent duplicate: check if we already sent a reminder today
      const todayKey = now.toISOString().split('T')[0];
      if (ret.lastReminderShown === todayKey) continue;

      // Create notification
      notificationRepo.create({
        userId: ret.userId,
        userRole: 'patient',
        type: 'session_reminder',
        title: 'Time for your session',
        message: `You scheduled a session for today at ${matchingEntry.time}. Take a moment to check in with yourself.`,
        referenceType: 'session',
      });

      // Emit real-time notification
      emitToUser(ret.userId, { type: 'notification:new', payload: { type: 'session_reminder' } });

      // Mark as sent for today
      retentionRepo.updateLastReminderShown(ret.userId, todayKey);

      console.log(`[Sukoon] Session reminder sent to ${ret.userId} for ${matchingEntry.time}`);
    }
  } catch (err) {
    console.error('[Sukoon] Session reminder error:', err);
  }
}

// Run reminder check every 15 minutes
setInterval(sendSessionReminders, 15 * 60 * 1000);
// Also run on startup
sendSessionReminders();

// Check every hour whether it's time for Sunday evening summaries
setInterval(() => {
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  if (now.getDay() === 0 && now.getHours() === 20 && weeklySummaryFiredAt !== dateKey) {
    weeklySummaryFiredAt = dateKey;
    sendWeeklySummaries();
  }
  // Run expiry check once per day at 9am
  if (now.getHours() === 9 && expiryAlertFiredAt !== dateKey) {
    expiryAlertFiredAt = dateKey;
    sendMedicationExpiryAlerts();
  }
}, 60 * 60 * 1000);

// Run expiry check once on server start too
sendMedicationExpiryAlerts();

server.listen(PORT, () => {
  console.log(`[Sukoon] Server running on port ${PORT}`);
  console.log(`[Sukoon] WebSocket ready for connections`);
  console.log(`[Sukoon] Accepting clients from ${CLIENT_URL}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn(`[Sukoon] WARNING: OPENAI_API_KEY not set — chat and voice sessions will fail`);
  }
});
