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
import bookmarkRoutes from './routes/bookmarks';
import journalRoutes from './routes/journal';
import retentionRoutes from './routes/retention';
import appointmentRoutes from './routes/appointments';

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

server.listen(PORT, () => {
  console.log(`[Sukoon] Server running on port ${PORT}`);
  console.log(`[Sukoon] WebSocket ready for connections`);
  console.log(`[Sukoon] Accepting clients from ${CLIENT_URL}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn(`[Sukoon] WARNING: OPENAI_API_KEY not set — chat and voice sessions will fail`);
  }
});
