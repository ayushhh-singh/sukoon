# Sukoon — The Operating System for Therapist-AI Collaborative Care

Sukoon is a real-time voice & chat AI therapy platform that pairs patients with **Dr. Aria**, an AI psychologist powered by OpenAI's Realtime API, while giving real therapists a full clinical dashboard to oversee, guide, and extend their care. It's not AI replacing therapists — it's AI giving each therapist the ability to care for 10x more patients.

> India has 0.3 psychiatrists per 100,000 people. Sukoon bridges that gap with 24/7 AI-powered therapy between appointments, while keeping the human therapist in the loop for clinical decisions.

## Why Sukoon

The AI therapy market is crowded with patient-only chatbots (Wysa, Woebot, Ash). Sukoon is different:

- **AI + Human Collaboration** — The only platform where a real therapist reviews AI-generated clinical summaries, prescribes medications, creates treatment plans, and monitors patients between sessions
- **Voice-First Therapy** — Real-time streaming voice conversations, not just text chatbots
- **India-First** — Cultural calibration for Indian family dynamics, societal stigma, local crisis resources, and 8-language support including Hindi
- **Clinical Depth** — SOAP notes, 5P formulations, DSM-5 aligned summaries, safety plans — features you'd expect from an EHR, not a wellness app

## Architecture

```
client/         (React 19 + TypeScript + Vite)
  └─ WebSocket ──► server/    (Node.js + Express 5 + better-sqlite3)
                     ├─ REST API (19 endpoints)
                     ├─ WebSocket ──► OpenAI Realtime API
                     └─ Cron Jobs (medication reminders, adherence reports)

mobile/         (React Native — planned)
```

Audio flows bidirectionally: User speaks → audio streamed to server → relayed to OpenAI → AI audio response streamed back in real time.

## Core Features

### For Patients

| Feature | Description |
|---|---|
| **Real-time voice therapy** | Stream audio conversations with Dr. Aria via OpenAI Realtime API with ambient sounds (rain, ocean, forest, piano) |
| **Chat mode** | Text-based therapy fallback using GPT-4o Chat Completions |
| **8-language support** | English, Hindi, Spanish, French, German, Portuguese, Arabic, Japanese |
| **Clinical assessments** | PHQ-9 (depression), GAD-7 (anxiety), PSS (stress) with longitudinal score tracking |
| **15+ guided exercises** | Box breathing, 5-4-3-2-1 grounding, PMR, body scan, CBT thought records, emotion wheel, gratitude journal, positive affirmations, mindful visualization, worry time, sleep hygiene, values card sort, self-compassion break, mindful walking |
| **Session continuity** | Dr. Aria remembers prior sessions, checks on homework, tracks recurring themes |
| **Mood tracking** | Pre/post-session mood with history visualization |
| **Journal** | Freeform journaling with mood tags and templates |
| **Medication adherence** | Log doses (taken/skipped/missed), adherence percentage, push notification reminders |
| **Coping strategy bookmarks** | Save strategies from sessions to a personal toolkit |
| **Progress dashboard** | Assessment trends, session frequency, mood trends, engagement streaks, milestones |
| **Crisis detection** | Real-time keyword + sentiment monitoring with emergency resource modal |
| **PDF/text export** | Download session summaries for personal records |

### For Therapists

| Feature | Description |
|---|---|
| **Patient management** | Search, filter, and manage linked patients |
| **AI session review** | Review 20+ field clinical summaries auto-generated from AI sessions (DSM-5 aligned, root cause analysis, trigger mapping) |
| **SOAP notes** | Subjective, Objective, Assessment, Plan clinical documentation |
| **Treatment plans** | Create plans with diagnosis, measurable goals, progress tracking, and target dates |
| **5P clinical formulation** | Predisposing, precipitating, perpetuating, presenting, protective factor documentation |
| **Safety plans** | Warning signs, coping strategies, emergency contacts, environment safety, reasons for living |
| **Medication management** | Prescribe medications, track patient adherence, receive low-adherence alerts (<70%) |
| **Clinical timeline** | Chronological view of sessions, notes, medications, appointments, and treatment updates |
| **Appointment scheduling** | Schedule, confirm, cancel appointments with pre-appointment patient check-ins |
| **Automated alerts** | Weekly adherence reports, medication expiry notifications (14-day advance), crisis alerts |

## Dr. Aria — AI Psychologist

Dr. Aria is not a generic chatbot. The system prompt is a 467-line, dynamically constructed clinical framework with six layers:

1. **Base Persona** — Specializes in CBT, MBSR, and person-centered therapy. Follows Carl Rogers' core conditions: unconditional positive regard, empathic understanding, congruence
2. **Context Gathering** — Explores 5 areas before any intervention: presenting issue, impact, triggers, history, coping. Minimum 4-5 exchanges of depth
3. **Deep Clinical Analysis** — Root cause exploration (childhood, formative experiences), trigger identification, family history, frequency/pattern recognition
4. **Therapeutic Interventions** — Voice-guided exercises, condition-specific protocols (anxiety, depression, grief, sleep, relationships), homework as invitations with SMART criteria
5. **Crisis Protocol** — Direct gentle assessment of suicidal ideation, immediate Indian helpline provision (112, Vandrevala, iCALL, AASRA), emphasis on professional reach-out
6. **Dynamic Context Injection** — Session-by-session, Dr. Aria's approach adapts based on:
   - Assessment scores (high PHQ-9 triggers safety-first focus)
   - Prior session summaries (picks up where you left off)
   - Prescribed medications and adherence rates
   - User preferences (age, profession, therapy experience, language)

### How Dr. Aria Differs from ChatGPT

| | ChatGPT | Dr. Aria |
|---|---|---|
| Clinical framework | None — user must prompt | CBT/MBSR/person-centered baked in |
| Assessment awareness | None | PHQ-9/GAD-7/PSS scores dynamically alter approach |
| Session continuity | Basic memory | Structured clinical summaries, homework tracking, pattern recognition |
| Post-session output | None | 20+ field clinical summary (DSM-5 aligned) |
| Crisis detection | Broad content policy | Keyword + sentiment analysis with helpline modal |
| Medication context | None | Aware of prescriptions and adherence, discusses without prescribing |
| Cultural calibration | Generic | Indian family dynamics, stigma, collectivist values |
| Therapeutic guardrails | None | Alliance before education, validation before reframing, minimum depth before interventions |

## Safety

- **Real-time crisis detection** — keyword + negative sentiment scoring with risk levels (none → low → moderate → high → critical)
- **Emergency resources modal** — triggered at high/critical level with Indian helplines
- **AI guardrails** — system prompt enforces minimum conversational depth before interventions, prohibits diagnosis/prescription changes
- **Consent screen** — clear disclaimers that this is AI, not a substitute for professional care
- **Role-based access** — doctors can only access their own linked patients
- **No audio storage** — audio streams directly to OpenAI, never persisted on server

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Lucide Icons |
| Backend | Node.js, Express 5, TypeScript |
| Database | SQLite (better-sqlite3, WAL mode) — 22 tables, 20 indexes |
| AI | OpenAI GPT-4o Realtime API (voice), GPT-4o Chat Completions (text) |
| Audio | PCM16 streaming, Web Audio API (ambient sounds) |
| Auth | JWT (24h expiry), bcryptjs password hashing |
| Notifications | Service Worker push notifications, in-app notification system |
| Mobile (planned) | React Native |

## Database Schema

22 tables covering the full clinical workflow:

```
users, doctors, doctor_patient_links, sessions, assessments, moods,
doctor_notes, medications, medication_logs, bookmarks, journal_entries,
retention, appointments, appointment_checkins, notifications,
treatment_plans, treatment_goals, safety_plans, clinical_formulations
```

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key with Realtime API access (`gpt-4o-realtime-preview`)

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

Create `server/.env`:

```
OPENAI_API_KEY=sk-your-key-here
PORT=8081
CLIENT_URL=http://localhost:5173
```

### 3. Start the app

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

A default admin account is seeded on first start — change credentials immediately in production.

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── patient/          # Patient dashboard (sessions, history, progress, journal, settings)
│   │   ├── therapist/        # Therapist portal (dashboard, patients, notes, meds, plans)
│   │   ├── exercises/        # 15+ guided therapeutic exercises
│   │   ├── assessments/      # PHQ-9, GAD-7, PSS assessment screens
│   │   ├── auth/             # Login, registration (patient + doctor)
│   │   ├── chat/             # Chat mode interface
│   │   ├── history/          # Session history viewer with search
│   │   ├── mood/             # Mood picker & history
│   │   ├── onboarding/       # 6-step patient onboarding
│   │   └── session/          # Session controls, timer, ambient sound, voice orb
│   ├── hooks/                # useSession, useWebSocket, useAudioCapture, useAudioPlayback
│   ├── contexts/             # Auth, Theme, Language providers
│   ├── services/             # API client layer
│   └── utils/                # Export (PDF/text), audio, assessment scoring

server/
├── src/
│   ├── index.ts              # Express server + cron jobs (med reminders, adherence reports)
│   ├── websocket.ts          # WebSocket relay + OpenAI integration + session management
│   ├── systemPrompt.ts       # Dr. Aria persona builder (467 lines, 6-layer architecture)
│   ├── chatCompletions.ts    # Chat mode via GPT-4o completions
│   ├── crisisDetection.ts    # Keyword + sentiment crisis monitoring
│   ├── auth/                 # JWT + password authentication
│   ├── middleware/            # Auth guards, role-based access
│   ├── db/
│   │   ├── schema.sql        # 22 tables, 20 indexes
│   │   └── repositories/     # Data access layer per entity
│   └── routes/               # 19 REST API endpoints
└── data/                     # SQLite database file
```

## Roadmap

### Phase 1 — Mobile App (Next)
- [ ] React Native app with voice + chat therapy
- [ ] Push notifications for medication reminders and appointments
- [ ] Offline exercise access
- [ ] Background audio and lock-screen session controls

### Phase 2 — Cost Optimization & Scale
- [ ] Whisper (STT) + GPT-4o-mini + open-source TTS pipeline to reduce per-session cost
- [ ] Tiered session limits (free = chat only, paid = voice)
- [ ] Cloud database migration for cross-device sync
- [ ] Session time optimization (20-25 min structured sessions)

### Phase 3 — Clinical Validation & Compliance
- [ ] Pilot study: 50-100 users, 4-8 week PHQ-9/GAD-7 pre/post tracking
- [ ] DPDPA (India data protection) compliance
- [ ] E2E encryption for session data
- [ ] Data residency controls

### Phase 4 — Growth
- [ ] B2B corporate wellness program (anonymized aggregate analytics for HR)
- [ ] Therapist acquisition partnerships (clinics in Bangalore, Delhi, Mumbai)
- [ ] Warm handoff — direct connection to human therapist during crisis
- [ ] Fine-tuned open-source model for reduced API dependency and IP defensibility
- [ ] Insurance integration (as regulatory framework matures)
- [ ] Additional Indian languages (Tamil, Bengali, Marathi, Telugu, Kannada)

## Disclaimer

This application is **not a substitute for professional mental health care**. It is designed to supplement — not replace — the work of licensed therapists and psychiatrists. If you or someone you know is in crisis, please contact:

- **Emergency**: 112
- **Vandrevala Foundation**: 1860-2662-345
- **iCALL (TISS)**: 9152987821
- **AASRA**: 9820466726

## License

Proprietary. All rights reserved.
