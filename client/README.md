# Sukoon — Web Client

React 19 + TypeScript + Vite frontend for the Sukoon therapy platform.

## Setup

```bash
npm install
npm run dev
```

Opens at **http://localhost:5173**. Requires the server running on port 8081.

## Structure

```
src/
├── components/
│   ├── patient/         # Patient dashboard panels (sessions, history, progress, journal, settings)
│   ├── therapist/       # Therapist portal (dashboard, patients, notes, meds, treatment plans)
│   ├── exercises/       # 15+ guided therapeutic exercises
│   ├── assessments/     # PHQ-9, GAD-7, PSS assessment screens
│   ├── auth/            # Login, registration (patient + doctor flows)
│   ├── chat/            # Chat mode interface
│   ├── history/         # Session history viewer with search & export
│   ├── mood/            # Mood picker & history visualization
│   ├── onboarding/      # 6-step patient onboarding
│   └── session/         # Voice session controls, timer, ambient sound, voice orb
├── hooks/               # useSession, useWebSocket, useAudioCapture, useAudioPlayback
├── contexts/            # AuthContext, ThemeContext, LanguageContext
├── services/            # API client layer
├── types/               # Shared TypeScript types
├── utils/               # PDF/text export, audio utilities, assessment scoring
├── App.tsx              # Main app with routing
├── App.css              # Component styles
└── index.css            # CSS variables & base styles
```

## Key Hooks

- **useSession** — Main session orchestrator (phase management, assessment flow, context building)
- **useWebSocket** — WebSocket connection to server with reconnection handling
- **useAudioCapture** — Microphone capture + PCM16 encoding for voice streaming
- **useAudioPlayback** — PCM audio playback from OpenAI responses

## Scripts

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build
npm run lint      # ESLint check
npm run preview   # Preview production build
```
