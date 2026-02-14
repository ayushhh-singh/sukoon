# Sukoon — AI Psychologist

A real-time voice conversation application that connects patients with an AI psychologist (Dr. Aria) powered by OpenAI's Realtime API.

## Architecture

```
client/ (React + TypeScript + Vite)
  └─ WebSocket ──► server/ (Node.js + Express + WS)
                      └─ WebSocket ──► OpenAI Realtime API
```

**Audio flows bidirectionally**: User speaks → audio streamed to server → relayed to OpenAI → AI audio response streamed back to user.

## Features

- **Real-time voice conversation** with server-side VAD (voice activity detection)
- **Language selection** — speak with Dr. Aria in English, Hindi, Spanish, French, German, Portuguese, Arabic, or Japanese
- **Tone & pause awareness** — Dr. Aria adapts her responses based on how you speak
- **Session goal setting** — set an intention before each session
- **Ambient sound** — optional background audio (rain, ocean, forest, piano) generated via Web Audio API
- **Animated voice orb** — changes color and pulses with speaking activity
- **Live transcript** — real-time display of both user and AI speech
- **Session history** — view past sessions with expandable summaries, search across transcripts
- **Coping strategy bookmarks** — save strategies to a personal Toolkit
- **Crisis detection** — monitors for distress keywords, shows emergency resources
- **Self-guided exercises** — breathing, grounding, PMR, thought records, affirmations, body scan, visualization, gratitude journal, self-compassion
- **Mood tracking** — pre/post session mood with history chart
- **PDF/text export** — download session summaries
- **Responsive design** — works on desktop and mobile
- **Privacy-first** — no audio stored on servers, all data saved locally in browser

## Prerequisites

- Node.js 18+
- An OpenAI API key with access to the Realtime API (`gpt-4o-realtime-preview`)

## Quick Start

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

Open **two terminals**:

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── ConsentScreen.tsx        # Privacy consent & disclaimer
│   │   ├── VoiceOrb.tsx             # Animated speaking indicator
│   │   ├── StatusBar.tsx            # Connection status
│   │   ├── SessionControls.tsx      # Start/end session buttons
│   │   ├── Transcript.tsx           # Live conversation transcript
│   │   ├── CrisisModal.tsx          # Emergency resources modal
│   │   ├── ThemeToggle.tsx          # Dark/light mode toggle
│   │   ├── ErrorToast.tsx           # Error notifications
│   │   ├── assessments/             # PHQ-9, GAD-7, PSS assessments
│   │   ├── exercises/               # Self-guided exercises (9 types)
│   │   ├── history/                 # Session history viewer
│   │   ├── mood/                    # Mood picker
│   │   ├── onboarding/              # 6-step onboarding flow
│   │   └── session/                 # Session timer, summary, ambient sound
│   ├── hooks/
│   │   ├── useSession.ts            # Main session orchestrator
│   │   ├── useWebSocket.ts          # WebSocket connection management
│   │   ├── useAudioCapture.ts       # Microphone capture + PCM encoding
│   │   └── useAudioPlayback.ts      # Audio playback from PCM chunks
│   ├── services/
│   │   └── storage.ts               # localStorage persistence layer
│   ├── types/                       # Shared TypeScript types
│   ├── utils/                       # PDF/text export, audio utils
│   ├── App.tsx                      # Main app with phase routing
│   ├── App.css                      # Component styles
│   └── index.css                    # CSS variables & base styles
│
server/
├── src/
│   ├── index.ts                     # Express + HTTP server
│   ├── websocket.ts                 # WebSocket relay + OpenAI integration
│   └── systemPrompt.ts             # AI persona + crisis keywords
└── .env                             # API key & config
```

## AI Persona — Dr. Aria

The AI is configured as a psychologist specializing in:
- Cognitive Behavioral Therapy (CBT)
- Mindfulness-Based Stress Reduction (MBSR)
- Person-centered therapy

It reads tone and pauses in speech, adapts pacing, validates emotions, suggests coping strategies, and provides crisis resources when needed. It clearly identifies itself as AI and recommends professional care.

## Safety Features

- **Crisis keyword detection** — monitors user speech for distress signals
- **Emergency resources modal** — shows crisis helplines
- **AI safety guardrails** — system prompt prohibits diagnosis/prescription
- **Clear disclaimers** — consent screen explains AI limitations
- **Professional referrals** — end screen links to therapist directories

## Important Disclaimer

This application is for **educational and demonstration purposes**. It is NOT a substitute for professional mental health care. If you or someone you know is in crisis, please contact:

- **Emergency**: 112
- **Vandrevala Foundation**: 1860-2662-345
- **iCALL (TISS)**: 9152987821
- **AASRA**: 9820466726
