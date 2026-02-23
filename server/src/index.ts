import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { setupWebSocket } from './websocket';

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
import bookmarkRoutes from './routes/bookmarks';
import journalRoutes from './routes/journal';
import retentionRoutes from './routes/retention';
import appointmentRoutes from './routes/appointments';
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
app.use('/api/notifications', authMiddleware, notificationRoutes);

const server = http.createServer(app);

setupWebSocket(server);

// Seed admin account if it doesn't exist
function seedAdmin() {
  const existing = doctorRepo.findByEmail(ADMIN_EMAIL);
  if (!existing) {
    const defaultPassword = 'admin123';
    doctorRepo.create({
      email: ADMIN_EMAIL,
      password_hash: hashPassword(defaultPassword),
      username: 'admin_sukoon',
      display_name: 'Ayush Singh',
      experience_years: 5,
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

    for (const { patient_id, doctor_id } of recentPatientLogs) {
      // Patient summary
      const summary = medLogRepo.getPatientWeekSummary(patient_id);
      if (summary.total === 0) continue;
      const adherencePct = Math.round((summary.taken / summary.total) * 100);
      const streakMsg = summary.taken === summary.total ? ' — perfect week!' : '';

      notificationRepo.create({
        user_id: patient_id,
        user_role: 'patient',
        type: 'weekly_summary',
        title: 'Your weekly medication summary',
        message: `This week: ${summary.taken}/${summary.total} doses taken (${adherencePct}%)${streakMsg}`,
        reference_type: 'medication',
      });

      // Doctor summary per patient
      if (!doctorPatientMap.has(doctor_id)) doctorPatientMap.set(doctor_id, new Set());
      doctorPatientMap.get(doctor_id)!.add(`${patient_id}:${adherencePct}`);
    }

    // Doctor digest
    for (const [doctor_id, patientSet] of doctorPatientMap) {
      const lowAdherence = [...patientSet].filter(s => parseInt(s.split(':')[1]) < 70);
      if (lowAdherence.length > 0) {
        notificationRepo.create({
          user_id: doctor_id,
          user_role: 'doctor',
          type: 'weekly_adherence_report',
          title: 'Weekly adherence report',
          message: `${lowAdherence.length} patient(s) had adherence below 70% this week — review recommended`,
          reference_type: 'medication',
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
      const daysLeft = Math.ceil((new Date(med.end_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const alreadyAlerted = notificationRepo.hasRecentNotification(
        med.doctor_id, 'medication_expiring', med.id, 23 // once per day
      );
      if (!alreadyAlerted) {
        notificationRepo.create({
          user_id: med.doctor_id,
          user_role: 'doctor',
          type: 'medication_expiring',
          title: 'Medication ending soon',
          message: `${med.name} (${med.dosage}) for a patient ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — consider renewal or adjustment`,
          reference_id: med.id,
          reference_type: 'medication',
        });
        // Also notify patient
        const alreadyAlertedPatient = notificationRepo.hasRecentNotification(
          med.patient_id, 'medication_expiring_patient', med.id, 23
        );
        if (!alreadyAlertedPatient) {
          notificationRepo.create({
            user_id: med.patient_id,
            user_role: 'patient',
            type: 'medication_expiring_patient',
            title: 'Medication supply running low',
            message: `Your ${med.name} (${med.dosage}) course ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — speak with your doctor about renewal`,
            reference_id: med.id,
            reference_type: 'medication',
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
