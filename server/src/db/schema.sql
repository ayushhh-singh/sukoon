-- Users (patients)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  age INTEGER,
  profession TEXT,
  primary_concerns TEXT DEFAULT '[]',
  therapy_experience TEXT DEFAULT 'none' CHECK(therapy_experience IN ('none','some','regular')),
  language TEXT DEFAULT 'English',
  voice_preference TEXT DEFAULT 'female',
  ambient_sound TEXT DEFAULT 'none',
  consent_given INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Doctors (therapists)
CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  experience_years INTEGER,
  specializations TEXT DEFAULT '[]',
  qualifications TEXT,
  bio TEXT,
  clinic_name TEXT,
  clinic_address TEXT,
  phone TEXT,
  accepting_patients INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Doctor-Patient links (many-to-many)
CREATE TABLE IF NOT EXISTS doctor_patient_links (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(doctor_id, patient_id)
);

-- Sessions (AI therapy sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  mode TEXT CHECK(mode IN ('voice','chat')),

  -- AI-generated summary fields
  key_takeaways TEXT DEFAULT '[]',
  coping_strategies TEXT DEFAULT '[]',
  homework_assignments TEXT DEFAULT '[]',
  topics_discussed TEXT DEFAULT '[]',
  emotional_themes TEXT DEFAULT '[]',
  issues_identified TEXT DEFAULT '[]',
  conversation_assessment TEXT DEFAULT '',
  emotional_journey TEXT DEFAULT '',
  risk_level TEXT DEFAULT 'low' CHECK(risk_level IN ('low','moderate','elevated')),
  suggested_focus_areas TEXT DEFAULT '[]',
  techniques_used TEXT DEFAULT '[]',
  clinical_impression TEXT,
  preliminary_diagnosis TEXT,
  recommended_actions TEXT DEFAULT '[]',
  way_forward TEXT,

  -- Mood snapshots
  pre_mood_value INTEGER,
  pre_mood_label TEXT,
  pre_mood_emoji TEXT,
  post_mood_value INTEGER,
  post_mood_label TEXT,
  post_mood_emoji TEXT,

  -- Assessment snapshot
  pre_assessment_type TEXT,
  pre_assessment_score INTEGER,
  pre_assessment_severity TEXT,

  user_reflection TEXT,
  transcript TEXT DEFAULT '[]',

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Assessments (PHQ-9, GAD-7, PSS)
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('PHQ9','GAD7','PSS')),
  responses TEXT NOT NULL DEFAULT '[]',
  total_score INTEGER NOT NULL,
  severity TEXT NOT NULL,
  color TEXT,
  timing TEXT CHECK(timing IN ('pre-session','post-session','standalone')),
  completed_at TEXT NOT NULL
);

-- Moods
CREATE TABLE IF NOT EXISTS moods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  value INTEGER NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT,
  context TEXT CHECK(context IN ('pre-session','post-session','standalone')),
  timestamp TEXT NOT NULL
);

-- Doctor notes (therapist's private notes per patient)
CREATE TABLE IF NOT EXISTS doctor_notes (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  note_type TEXT DEFAULT 'general' CHECK(note_type IN ('general','session','intake','discharge')),
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Medications (prescribed by doctor per patient)
CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','discontinued','completed')),
  patient_start_time TEXT,
  dose_times TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  concern TEXT,
  session_id TEXT,
  session_date TEXT,
  saved_at TEXT NOT NULL
);

-- Journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  mood_tag TEXT,
  mood_label TEXT,
  tags TEXT DEFAULT '[]',
  template_used TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Retention data
CREATE TABLE IF NOT EXISTS retention (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_session_date TEXT,
  milestones TEXT DEFAULT '{}',
  schedule TEXT DEFAULT '[]',
  last_reminder_shown TEXT
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  date_time TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled','completed')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Medication dose logs (patient adherence tracking)
CREATE TABLE IF NOT EXISTS medication_logs (
  id TEXT PRIMARY KEY,
  medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('taken','skipped','missed')),
  taken_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK(user_role IN ('patient','doctor')),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id TEXT,
  reference_type TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(user_id, type);
CREATE INDEX IF NOT EXISTS idx_moods_user ON moods(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_doctor ON doctor_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_notes_patient ON doctor_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_doctor ON medications(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_links_doctor ON doctor_patient_links(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_links_patient ON doctor_patient_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_username ON doctors(username);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(date_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_role);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, user_role, is_read);
CREATE INDEX IF NOT EXISTS idx_medication_logs_med ON medication_logs(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_patient ON medication_logs(patient_id);
