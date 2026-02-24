-- Users (patients)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  displayName TEXT NOT NULL,
  age INTEGER,
  profession TEXT,
  primaryConcerns TEXT DEFAULT '[]',
  therapyExperience TEXT DEFAULT 'none' CHECK(therapyExperience IN ('none','some','regular')),
  language TEXT DEFAULT 'English',
  voicePreference TEXT DEFAULT 'female',
  ambientSound TEXT DEFAULT 'none',
  consentGiven INTEGER DEFAULT 0,
  knownDisorders TEXT DEFAULT '[]',
  currentMedications TEXT DEFAULT '[]',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Doctors (therapists)
CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  displayName TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  experienceYears INTEGER,
  specializations TEXT DEFAULT '[]',
  qualifications TEXT,
  bio TEXT,
  clinicName TEXT,
  clinicAddress TEXT,
  phone TEXT,
  acceptingPatients INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Doctor-Patient links (many-to-many)
CREATE TABLE IF NOT EXISTS doctor_patient_links (
  id TEXT PRIMARY KEY,
  doctorId TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
  linkedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(doctorId, patientId)
);

-- Sessions (AI therapy sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  sessionId TEXT UNIQUE NOT NULL,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  mode TEXT CHECK(mode IN ('voice','chat')),

  -- AI-generated summary fields
  keyTakeaways TEXT DEFAULT '[]',
  copingStrategies TEXT DEFAULT '[]',
  homeworkAssignments TEXT DEFAULT '[]',
  topicsDiscussed TEXT DEFAULT '[]',
  emotionalThemes TEXT DEFAULT '[]',
  issuesIdentified TEXT DEFAULT '[]',
  conversationAssessment TEXT DEFAULT '',
  emotionalJourney TEXT DEFAULT '',
  riskLevel TEXT DEFAULT 'low' CHECK(riskLevel IN ('low','moderate','elevated')),
  suggestedFocusAreas TEXT DEFAULT '[]',
  techniquesUsed TEXT DEFAULT '[]',
  clinicalImpression TEXT,
  preliminaryDiagnosis TEXT,
  recommendedActions TEXT DEFAULT '[]',
  wayForward TEXT,

  -- Enhanced analysis
  rootCauseAnalysis TEXT,
  triggerPoints TEXT DEFAULT '[]',
  familyHistory TEXT,
  patientMedicalContext TEXT,
  frequencyPatterns TEXT,

  -- Mood snapshots
  preMoodValue INTEGER,
  preMoodLabel TEXT,
  preMoodEmoji TEXT,
  postMoodValue INTEGER,
  postMoodLabel TEXT,
  postMoodEmoji TEXT,

  -- Assessment snapshot
  preAssessmentType TEXT,
  preAssessmentScore INTEGER,
  preAssessmentSeverity TEXT,

  userReflection TEXT,
  transcript TEXT DEFAULT '[]',

  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Assessments (PHQ-9, GAD-7, PSS)
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sessionId TEXT,
  type TEXT NOT NULL CHECK(type IN ('PHQ9','GAD7','PSS')),
  responses TEXT NOT NULL DEFAULT '[]',
  totalScore INTEGER NOT NULL,
  severity TEXT NOT NULL,
  color TEXT,
  timing TEXT CHECK(timing IN ('pre-session','post-session','standalone')),
  completedAt TEXT NOT NULL
);

-- Moods
CREATE TABLE IF NOT EXISTS moods (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sessionId TEXT,
  value INTEGER NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT,
  context TEXT CHECK(context IN ('pre-session','post-session','standalone')),
  timestamp TEXT NOT NULL
);

-- Doctor notes (therapist's private notes per patient)
CREATE TABLE IF NOT EXISTS doctor_notes (
  id TEXT PRIMARY KEY,
  doctorId TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sessionId TEXT,
  appointmentId TEXT,
  noteType TEXT DEFAULT 'general' CHECK(noteType IN ('general','session','intake','discharge','soap')),
  title TEXT,
  content TEXT NOT NULL,
  subjective TEXT,
  objective TEXT,
  assessmentText TEXT,
  planText TEXT,
  tags TEXT DEFAULT '[]',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Medications (prescribed by doctor per patient)
CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  doctorId TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT,
  notes TEXT,
  patientInfo TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','discontinued','completed')),
  patientStartTime TEXT,
  doseTimes TEXT DEFAULT '[]',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  concern TEXT,
  sessionId TEXT,
  sessionDate TEXT,
  savedAt TEXT NOT NULL
);

-- Journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  moodTag TEXT,
  moodLabel TEXT,
  tags TEXT DEFAULT '[]',
  templateUsed TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Retention data
CREATE TABLE IF NOT EXISTS retention (
  userId TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  currentStreak INTEGER DEFAULT 0,
  longestStreak INTEGER DEFAULT 0,
  lastSessionDate TEXT,
  milestones TEXT DEFAULT '{}',
  schedule TEXT DEFAULT '[]',
  lastReminderShown TEXT
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctorId TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  dateTime TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled','completed','in_progress')),
  notes TEXT,
  rescheduleReason TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Appointment check-ins (patient pre-session form)
CREATE TABLE IF NOT EXISTS appointment_checkins (
  id TEXT PRIMARY KEY,
  appointmentId TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  moodValue INTEGER,
  moodLabel TEXT,
  concerns TEXT DEFAULT '[]',
  goalsForSession TEXT,
  symptomsSinceLast TEXT,
  medicationIssues TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Medication dose logs (patient adherence tracking)
CREATE TABLE IF NOT EXISTS medication_logs (
  id TEXT PRIMARY KEY,
  medicationId TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduledTime TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('taken','skipped','missed')),
  takenAt TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  userRole TEXT NOT NULL CHECK(userRole IN ('patient','doctor')),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  referenceId TEXT,
  referenceType TEXT,
  isRead INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Treatment plans (therapist creates per patient)
CREATE TABLE IF NOT EXISTS treatment_plans (
  id TEXT PRIMARY KEY,
  doctorId TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  diagnosis TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','paused','revised')),
  startDate TEXT NOT NULL,
  targetEndDate TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Treatment goals (belong to a treatment plan)
CREATE TABLE IF NOT EXISTS treatment_goals (
  id TEXT PRIMARY KEY,
  planId TEXT NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  targetDate TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','achieved','paused','discontinued')),
  progress INTEGER DEFAULT 0,
  interventions TEXT DEFAULT '[]',
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Safety plans (one active per patient per doctor)
CREATE TABLE IF NOT EXISTS safety_plans (
  id TEXT PRIMARY KEY,
  doctorId TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  warningSigns TEXT DEFAULT '[]',
  copingStrategies TEXT DEFAULT '[]',
  supportContacts TEXT DEFAULT '[]',
  professionalContacts TEXT DEFAULT '[]',
  environmentSafety TEXT,
  reasonsForLiving TEXT DEFAULT '[]',
  isActive INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Clinical formulations (5P model)
CREATE TABLE IF NOT EXISTS clinical_formulations (
  id TEXT PRIMARY KEY,
  doctorId TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  presentingProblems TEXT DEFAULT '[]',
  predisposingFactors TEXT DEFAULT '[]',
  precipitatingFactors TEXT DEFAULT '[]',
  perpetuatingFactors TEXT DEFAULT '[]',
  protectiveFactors TEXT DEFAULT '[]',
  formulationSummary TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(userId);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(userId, type);
CREATE INDEX IF NOT EXISTS idx_moods_user ON moods(userId);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_doctor ON doctor_notes(doctorId);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_patient ON doctor_notes(patientId);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patientId);
CREATE INDEX IF NOT EXISTS idx_medications_doctor ON medications(doctorId);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_links_doctor ON doctor_patient_links(doctorId);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_links_patient ON doctor_patient_links(patientId);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(userId);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(userId);
CREATE INDEX IF NOT EXISTS idx_doctors_username ON doctors(username);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patientId);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctorId);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(dateTime);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, userRole);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(userId, userRole, isRead);
CREATE INDEX IF NOT EXISTS idx_medication_logs_med ON medication_logs(medicationId);
CREATE INDEX IF NOT EXISTS idx_medication_logs_patient ON medication_logs(patientId);
CREATE INDEX IF NOT EXISTS idx_checkins_appointment ON appointment_checkins(appointmentId);
CREATE INDEX IF NOT EXISTS idx_checkins_patient ON appointment_checkins(patientId);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patientId);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_doctor ON treatment_plans(doctorId);
CREATE INDEX IF NOT EXISTS idx_treatment_goals_plan ON treatment_goals(planId);
CREATE INDEX IF NOT EXISTS idx_safety_plans_patient ON safety_plans(patientId);
CREATE INDEX IF NOT EXISTS idx_safety_plans_doctor ON safety_plans(doctorId);
CREATE INDEX IF NOT EXISTS idx_clinical_formulations_patient ON clinical_formulations(patientId);
CREATE INDEX IF NOT EXISTS idx_clinical_formulations_doctor ON clinical_formulations(doctorId);
