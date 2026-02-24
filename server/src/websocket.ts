import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import url from 'url';
import { v4 as uuidv4 } from 'uuid';
import { buildSystemPrompt, buildGreetingInstruction } from './systemPrompt';
import type { SessionContext } from './systemPrompt';
import { assessCrisisLevel } from './crisisDetection';
import { streamChatCompletion } from './chatCompletions';
import { verifyToken } from './auth/auth';
import * as sessionRepo from './db/repositories/sessionRepo';

// ---- Timestamped Logger ----
function ts(): string {
  return new Date().toISOString();
}

function log(sessionId: string, userLabel: string, msg: string): void {
  console.log(`[${ts()}] [Session ${sessionId}] [${userLabel}] ${msg}`);
}

function logWarn(sessionId: string, userLabel: string, msg: string): void {
  console.warn(`[${ts()}] [Session ${sessionId}] [${userLabel}] ${msg}`);
}

function logError(sessionId: string, userLabel: string, msg: string, err?: unknown): void {
  console.error(`[${ts()}] [Session ${sessionId}] [${userLabel}] ${msg}`, err || '');
}

function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes max
const MAX_CONCURRENT_SESSIONS = 10;

interface Session {
  id: string;
  userId: string | null; // authenticated user ID from JWT
  userLabel: string;     // human-readable label for logs (email or "anonymous")
  clientWs: WebSocket;
  openaiWs: WebSocket | null;
  createdAt: Date;
  isCrisisModalShown: boolean;
  context: SessionContext | undefined;
  transcriptBuffer: { role: 'user' | 'ai'; text: string }[];
  timeoutHandle: ReturnType<typeof setTimeout> | null;
  isSummaryRequested: boolean;
  isResponseActive: boolean; // true while OpenAI is generating a response
  isPendingEnd: boolean;     // true if session.end arrived during an active response
  mode: 'voice' | 'chat';
  chatHistory: { role: 'system' | 'user' | 'assistant'; content: string }[];
}

const activeSessions = new Map<string, Session>();

export function setupWebSocket(server: http.Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (clientWs: WebSocket, req: http.IncomingMessage) => {
    // Rate limiting: max concurrent sessions
    if (activeSessions.size >= MAX_CONCURRENT_SESSIONS) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'Server is at capacity. Please try again later.',
      }));
      clientWs.close();
      return;
    }

    // Extract JWT from query parameter for auth
    const parsedUrl = url.parse(req.url || '', true);
    const token = parsedUrl.query.token as string | undefined;
    let userId: string | null = null;
    let userLabel = 'anonymous';
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.id;
        userLabel = `${payload.email} (${payload.role})`;
      }
    }

    const sessionId = uuidv4();
    log(sessionId, userLabel, `Client connected | active sessions: ${activeSessions.size + 1}`);

    const session: Session = {
      id: sessionId,
      userId,
      userLabel,
      clientWs,
      openaiWs: null,
      createdAt: new Date(),
      isCrisisModalShown: false,
      context: undefined,
      transcriptBuffer: [],
      timeoutHandle: null,
      isSummaryRequested: false,
      isResponseActive: false,
      isPendingEnd: false,
      mode: 'voice',
      chatHistory: [],
    };

    activeSessions.set(sessionId, session);

    sendToClient(clientWs, {
      type: 'session.created',
      sessionId,
    });

    clientWs.on('message', (data: Buffer | string) => {
      handleClientMessage(session, data);
    });

    clientWs.on('close', () => {
      log(sessionId, userLabel, 'Client disconnected');
      cleanupSession(session);
    });

    clientWs.on('error', (error: Error) => {
      logError(sessionId, userLabel, `Client WebSocket error: ${error.message}`);
      cleanupSession(session);
    });
  });

  console.log(`[${ts()}] [Sukoon] WebSocket server initialized on /ws`);
}

function handleClientMessage(session: Session, data: Buffer | string): void {
  try {
    const message = JSON.parse(data.toString());
    const u = session.userLabel;

    switch (message.type) {
      case 'session.start':
        log(session.id, u, `>> session.start (voice) | preferences: ${JSON.stringify(message.userPreferences?.preferredName || 'none')}`);
        session.context = {
          assessmentContext: message.assessmentContext,
          userPreferences: message.userPreferences,
          priorSessionContext: message.priorSessionContext,
          prescribedMedications: message.prescribedMedications,
        };
        connectToOpenAI(session);
        break;

      case 'audio.append':
        if (session.openaiWs?.readyState === WebSocket.OPEN) {
          session.openaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: message.audio,
          }));
        }
        break;

      case 'audio.commit':
        if (session.openaiWs?.readyState === WebSocket.OPEN) {
          session.openaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.commit',
          }));
          session.openaiWs.send(JSON.stringify({
            type: 'response.create',
          }));
        }
        break;

      case 'conversation.interrupt':
        if (session.openaiWs?.readyState === WebSocket.OPEN) {
          session.openaiWs.send(JSON.stringify({
            type: 'response.cancel',
          }));
        }
        break;

      case 'session.end':
        log(session.id, u, `>> session.end | mode: ${session.mode} | responseActive: ${session.isResponseActive} | transcripts: ${session.transcriptBuffer.length}`);
        if (session.mode === 'chat') {
          requestChatSummaryAndCleanup(session);
        } else if (session.isResponseActive) {
          session.isPendingEnd = true;
          if (session.openaiWs?.readyState === WebSocket.OPEN) {
            session.openaiWs.send(JSON.stringify({ type: 'response.cancel' }));
          }
          log(session.id, u, 'Session end deferred — waiting for active response to finish');
        } else {
          requestSummaryAndCleanup(session);
        }
        break;

      case 'chat.start':
        log(session.id, u, `>> chat.start | preferences: ${JSON.stringify(message.userPreferences?.preferredName || 'none')}`);
        session.mode = 'chat';
        session.context = {
          assessmentContext: message.assessmentContext,
          userPreferences: message.userPreferences,
          priorSessionContext: message.priorSessionContext,
          prescribedMedications: message.prescribedMedications,
        };
        startChatSession(session);
        break;

      case 'chat.message':
        if (session.mode === 'chat' && message.text) {
          log(session.id, u, `>> chat.message | length: ${message.text.length} chars`);
          handleChatMessage(session, message.text);
        }
        break;

      default:
        logWarn(session.id, u, `Unknown message type: ${message.type}`);
    }
  } catch (error) {
    logError(session.id, session.userLabel, 'Error parsing client message', error);
  }
}

function connectToOpenAI(session: Session): void {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    sendToClient(session.clientWs, {
      type: 'error',
      message: 'OpenAI API key not configured on the server.',
    });
    return;
  }

  log(session.id, session.userLabel, 'Connecting to OpenAI Realtime API...');

  sendToClient(session.clientWs, {
    type: 'session.status',
    status: 'connecting',
  });

  const openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  session.openaiWs = openaiWs;

  // Session timeout
  session.timeoutHandle = setTimeout(() => {
    log(session.id, session.userLabel, `Session timeout (${SESSION_TIMEOUT_MS / 60000} min)`);
    sendToClient(session.clientWs, {
      type: 'session.timeout',
      message: 'Your session has reached the maximum duration. The session will now end.',
    });
    requestSummaryAndCleanup(session);
  }, SESSION_TIMEOUT_MS);

  openaiWs.on('open', () => {
    log(session.id, session.userLabel, 'Connected to OpenAI Realtime API');

    // Build dynamic system prompt with context
    const systemPrompt = buildSystemPrompt(session.context);

    openaiWs.send(JSON.stringify({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: systemPrompt,
        voice: session.context?.userPreferences?.voicePreference === 'male' ? 'ash' : 'shimmer',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
        },
        input_audio_noise_reduction: { type: 'near_field' },
        temperature: 0.85,
        max_response_output_tokens: 1536,
      },
    }));

    sendToClient(session.clientWs, {
      type: 'session.status',
      status: 'connected',
    });
  });

  openaiWs.on('message', (data: Buffer | string) => {
    handleOpenAIMessage(session, data);
  });

  openaiWs.on('close', (code: number, reason: Buffer) => {
    log(session.id, session.userLabel, `OpenAI connection closed: ${code} ${reason.toString()}`);
    sendToClient(session.clientWs, {
      type: 'session.status',
      status: 'disconnected',
    });
  });

  openaiWs.on('error', (error: Error) => {
    logError(session.id, session.userLabel, `OpenAI WebSocket error: ${error.message}`);
    sendToClient(session.clientWs, {
      type: 'error',
      message: 'Connection to AI service failed. Please try again.',
    });
  });
}

function handleOpenAIMessage(session: Session, data: Buffer | string): void {
  try {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'session.created':
        log(session.id, session.userLabel, 'OpenAI session established');
        break;

      case 'session.updated':
        log(session.id, session.userLabel, 'OpenAI session configured — sending greeting');
        // Trigger contextual greeting
        session.openaiWs?.send(JSON.stringify({
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            instructions: buildGreetingInstruction(session.context),
          },
        }));
        break;

      case 'response.audio.delta':
        sendToClient(session.clientWs, {
          type: 'audio.delta',
          delta: message.delta,
        });
        break;

      case 'response.audio.done':
        sendToClient(session.clientWs, {
          type: 'audio.done',
        });
        break;

      case 'response.audio_transcript.delta':
        sendToClient(session.clientWs, {
          type: 'transcript.ai.delta',
          delta: message.delta,
        });
        break;

      case 'response.audio_transcript.done': {
        const aiTranscript = message.transcript || '';
        sendToClient(session.clientWs, {
          type: 'transcript.ai.done',
          transcript: aiTranscript,
        });
        if (aiTranscript) {
          session.transcriptBuffer.push({ role: 'ai', text: aiTranscript });
        }
        break;
      }

      case 'response.text.done': {
        // Handle text-only responses (e.g., summary generation)
        if (session.isSummaryRequested && message.text) {
          handleSummaryResponse(session, message.text);
        }
        break;
      }

      case 'conversation.item.input_audio_transcription.completed': {
        const userTranscript = message.transcript || '';
        sendToClient(session.clientWs, {
          type: 'transcript.user.done',
          transcript: userTranscript,
        });
        if (userTranscript) {
          session.transcriptBuffer.push({ role: 'user', text: userTranscript });
          performCrisisCheck(session, userTranscript);
        }
        break;
      }

      case 'input_audio_buffer.speech_started':
        sendToClient(session.clientWs, {
          type: 'speech.started',
        });
        break;

      case 'input_audio_buffer.speech_stopped':
        sendToClient(session.clientWs, {
          type: 'speech.stopped',
        });
        break;

      case 'response.created':
        session.isResponseActive = true;
        sendToClient(session.clientWs, {
          type: 'response.started',
        });
        break;

      case 'response.done':
        session.isResponseActive = false;
        sendToClient(session.clientWs, {
          type: 'response.done',
        });
        if (session.isSummaryRequested) {
          // Summary response just finished — clean up
          cleanupSession(session);
        } else if (session.isPendingEnd) {
          // session.end arrived while a response was active; now safe to summarize
          session.isPendingEnd = false;
          requestSummaryAndCleanup(session);
        }
        break;

      case 'error':
        logError(session.id, session.userLabel, `OpenAI error: ${JSON.stringify(message.error)}`);
        sendToClient(session.clientWs, {
          type: 'error',
          message: 'An error occurred during the conversation. Please try again.',
          detail: message.error?.message,
        });
        break;

      default:
        // Log non-frequent OpenAI events (skip noisy audio deltas)
        if (!['response.audio.delta', 'response.audio_transcript.delta'].includes(message.type)) {
          log(session.id, session.userLabel, `<< OpenAI: ${message.type}`);
        }
    }
  } catch (error) {
    logError(session.id, session.userLabel, 'Error parsing OpenAI message', error);
  }
}

function performCrisisCheck(session: Session, transcript: string): void {
  const assessment = assessCrisisLevel(transcript);

  if (assessment.level !== 'none') {
    logWarn(session.id, session.userLabel, `Crisis assessment: ${assessment.level} — triggers: ${assessment.triggers.join(', ')}`);
  }

  // Show modal only for high/critical, and only once
  if (assessment.shouldShowModal && !session.isCrisisModalShown) {
    session.isCrisisModalShown = true;
    sendToClient(session.clientWs, {
      type: 'crisis.detected',
      crisisLevel: assessment.level,
      resources: {
        emergency: '112',
        suicidePrevention: '1860-2662-345 / 1800-2333-330 (24/7)',
        crisisText: '9152987821 (Mon–Sat, 9am–9pm)',
        international: '9820466726 (24/7)',
      },
    });
  }
}

function buildSummaryPrompt(): string {
  return `Generate a comprehensive JSON clinical summary of this therapy session. Respond ONLY with valid JSON, no markdown, no explanation. Format:
{
  "keyTakeaways": ["insight 1", "insight 2"],
  "copingStrategies": ["strategy 1"],
  "homeworkAssignments": ["homework 1"],
  "topicsDiscussed": ["topic 1"],
  "emotionalThemes": ["theme 1"],
  "issuesIdentified": ["issue 1"],
  "conversationAssessment": "A 2-3 sentence clinical paragraph summarizing the session.",
  "emotionalJourney": "A brief narrative of emotional shifts during the session.",
  "riskLevel": "low",
  "suggestedFocusAreas": ["area 1"],
  "techniquesUsed": ["technique 1"],
  "clinicalImpression": "A clinical observation paragraph.",
  "preliminaryDiagnosis": "DSM-5 aligned diagnostic impression.",
  "recommendedActions": ["action 1"],
  "wayForward": "Therapeutic path narrative.",
  "rootCauseAnalysis": "Narrative analysis of underlying root causes identified during the session.",
  "triggerPoints": ["trigger 1", "trigger 2"],
  "familyHistory": "Relevant family mental health history and dynamics disclosed during the session.",
  "patientMedicalContext": "Known conditions, medications, and medical context relevant to treatment.",
  "frequencyPatterns": "Analysis of symptom frequency, intensity patterns, onset timing, and progression."
}
Field guidelines:
- issuesIdentified: Key psychological concerns or life challenges the user raised (max 4)
- conversationAssessment: Clinical-style paragraph assessing the session quality, user engagement, and therapeutic progress. Write in third person.
- emotionalJourney: Narrative of emotional shifts observed (e.g. "Started anxious and guarded, gradually opened up about work stress, ended with cautious optimism")
- riskLevel: "low" if no safety concerns, "moderate" if mild distress or passive ideation mentioned, "elevated" if active crisis indicators detected
- suggestedFocusAreas: Recommended topics for future sessions (max 3)
- techniquesUsed: Therapeutic techniques applied during the session (e.g. "active listening", "cognitive reframing", "grounding", "validation") (max 5)
- clinicalImpression: A paragraph providing clinical observations about the patient's presentation, affect, thought patterns, and functioning. Write as a clinician would in session notes. Include observations about congruence between reported symptoms and presentation.
- preliminaryDiagnosis: Based on DSM-5/ICD-11 criteria, provide a preliminary diagnostic impression. Use qualifying language: "Presentation is consistent with..." or "Symptoms suggest possible...". If insufficient information, state "Further evaluation needed." Always note this is a preliminary impression, not a formal diagnosis.
- recommendedActions: Specific, actionable steps the patient should take (max 5). Include both immediate actions and longer-term recommendations.
- wayForward: A narrative paragraph describing the recommended therapeutic path — what to focus on next, what progress looks like, and what the patient can expect.
- rootCauseAnalysis: Identify the underlying root causes of the patient's presenting issues. Connect childhood/formative experiences, relationship patterns, core beliefs, and life events to current symptoms. This should read like a case formulation. If root causes were not explored, note "Root cause exploration was not conducted in this session — recommended for future sessions."
- triggerPoints: Specific triggers identified during the session — situations, people, thoughts, or sensations that activate symptoms (max 5)
- familyHistory: Any family mental health history, intergenerational patterns, or family dynamics that were discussed. If not discussed, state "Family history was not explored in this session."
- patientMedicalContext: Known disorders, current medications, and relevant medical information disclosed. If none discussed, state "No medical context discussed."
- frequencyPatterns: How often symptoms occur, when they started, whether they are worsening or improving, cyclical patterns. If not assessed, state "Frequency patterns were not assessed in this session."
- Maximum 4 items per array field (except recommendedActions: max 5, triggerPoints: max 5). Base this ONLY on what was actually discussed. Be specific and actionable.

CRITICAL: You MUST populate ALL fields — do NOT leave any empty. The clinical fields (clinicalImpression, preliminaryDiagnosis, recommendedActions, wayForward, rootCauseAnalysis) are the MOST IMPORTANT. This report will be shared with the patient's treating doctor to aid clinical decision-making, so it must be thorough and clinically useful.`;
}

function requestSummaryAndCleanup(session: Session): void {
  // If there's a conversation to summarize and the OpenAI connection is still open
  if (session.openaiWs?.readyState === WebSocket.OPEN && session.transcriptBuffer.length >= 2 && !session.isSummaryRequested) {
    session.isSummaryRequested = true;
    log(session.id, session.userLabel, `Requesting session summary... (${session.transcriptBuffer.length} transcript entries)`);

    session.openaiWs.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['text'],
        instructions: buildSummaryPrompt(),
      },
    }));

    // Fallback: cleanup after 20 seconds even if summary fails
    setTimeout(() => {
      if (activeSessions.has(session.id)) {
        logWarn(session.id, session.userLabel, 'Summary timeout (20s) — cleaning up');
        cleanupSession(session);
      }
    }, 20000);
  } else {
    log(session.id, session.userLabel, `No conversation to summarize (transcripts: ${session.transcriptBuffer.length}, openaiWs: ${session.openaiWs?.readyState}, summaryRequested: ${session.isSummaryRequested}) — cleaning up`);
    cleanupSession(session);
  }
}

function handleSummaryResponse(session: Session, text: string): void {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const summary = JSON.parse(jsonMatch[0]);
      const validRiskLevels = ['low', 'moderate', 'elevated'];
      const riskLevel = validRiskLevels.includes(summary.riskLevel) ? summary.riskLevel : 'low';

      const summaryData = {
        keyTakeaways: summary.keyTakeaways || [],
        copingStrategies: summary.copingStrategies || [],
        homeworkAssignments: summary.homeworkAssignments || [],
        topicsDiscussed: summary.topicsDiscussed || [],
        emotionalThemes: summary.emotionalThemes || [],
        issuesIdentified: summary.issuesIdentified || [],
        conversationAssessment: summary.conversationAssessment || '',
        emotionalJourney: summary.emotionalJourney || '',
        riskLevel,
        suggestedFocusAreas: summary.suggestedFocusAreas || [],
        techniquesUsed: summary.techniquesUsed || [],
        clinicalImpression: summary.clinicalImpression || '',
        preliminaryDiagnosis: summary.preliminaryDiagnosis || '',
        recommendedActions: summary.recommendedActions || [],
        wayForward: summary.wayForward || '',
        rootCauseAnalysis: summary.rootCauseAnalysis || '',
        triggerPoints: summary.triggerPoints || [],
        familyHistory: summary.familyHistory || '',
        patientMedicalContext: summary.patientMedicalContext || '',
        frequencyPatterns: summary.frequencyPatterns || '',
      };

      sendToClient(session.clientWs, {
        type: 'session.summary',
        summary: summaryData,
      });

      // Save session to database if user is authenticated
      if (session.userId) {
        try {
          sessionRepo.create({
            sessionId: session.id,
            userId: session.userId,
            date: session.createdAt.toISOString(),
            duration: Math.round((Date.now() - session.createdAt.getTime()) / 1000),
            mode: session.mode,
            keyTakeaways: summaryData.keyTakeaways,
            copingStrategies: summaryData.copingStrategies,
            homeworkAssignments: summaryData.homeworkAssignments,
            topicsDiscussed: summaryData.topicsDiscussed,
            emotionalThemes: summaryData.emotionalThemes,
            issuesIdentified: summaryData.issuesIdentified,
            conversationAssessment: summaryData.conversationAssessment,
            emotionalJourney: summaryData.emotionalJourney,
            riskLevel: riskLevel,
            suggestedFocusAreas: summaryData.suggestedFocusAreas,
            techniquesUsed: summaryData.techniquesUsed,
            clinicalImpression: summaryData.clinicalImpression,
            preliminaryDiagnosis: summaryData.preliminaryDiagnosis,
            recommendedActions: summaryData.recommendedActions,
            wayForward: summaryData.wayForward,
            rootCauseAnalysis: summaryData.rootCauseAnalysis,
            triggerPoints: summaryData.triggerPoints,
            familyHistory: summaryData.familyHistory,
            patientMedicalContext: summaryData.patientMedicalContext,
            frequencyPatterns: summaryData.frequencyPatterns,
            transcript: session.transcriptBuffer.map(t => ({ role: t.role, text: t.text })),
          });
          log(session.id, session.userLabel, 'Summary saved to database');
        } catch (dbError) {
          logError(session.id, session.userLabel, 'Failed to save summary to DB', dbError);
        }
      }

      log(session.id, session.userLabel, `Summary generated | risk: ${riskLevel} | topics: ${(summary.topicsDiscussed || []).length} | issues: ${(summary.issuesIdentified || []).length}`);
    }
  } catch (error) {
    logError(session.id, session.userLabel, 'Failed to parse summary', error);
  }
}

// ---- Chat Mode Functions ----

function startChatSession(session: Session): void {
  log(session.id, session.userLabel, 'Starting chat session...');

  sendToClient(session.clientWs, { type: 'session.status', status: 'connecting' });

  const systemPrompt = buildSystemPrompt(session.context, 'chat');
  session.chatHistory = [{ role: 'system', content: systemPrompt }];

  // Session timeout
  session.timeoutHandle = setTimeout(() => {
    log(session.id, session.userLabel, 'Chat session timeout');
    sendToClient(session.clientWs, {
      type: 'session.timeout',
      message: 'Your session has reached the maximum duration. The session will now end.',
    });
    requestChatSummaryAndCleanup(session);
  }, SESSION_TIMEOUT_MS);

  sendToClient(session.clientWs, { type: 'session.status', status: 'connected' });

  // Send greeting
  const greetingInstruction = buildGreetingInstruction(session.context);
  session.chatHistory.push({ role: 'user', content: `[SYSTEM: ${greetingInstruction}]` });

  session.isResponseActive = true;
  sendToClient(session.clientWs, { type: 'response.started' });

  streamChatCompletion(
    session.chatHistory,
    (delta) => {
      sendToClient(session.clientWs, { type: 'chat.response.delta', delta });
    },
    (fullText) => {
      session.chatHistory.push({ role: 'assistant', content: fullText });
      session.transcriptBuffer.push({ role: 'ai', text: fullText });
      session.isResponseActive = false;
      sendToClient(session.clientWs, { type: 'chat.response.done', text: fullText });
      sendToClient(session.clientWs, { type: 'response.done' });
    },
    (error) => {
      session.isResponseActive = false;
      logError(session.id, session.userLabel, `Chat greeting error: ${error}`);
      sendToClient(session.clientWs, { type: 'error', message: `Failed to start chat session: ${error}` });
      sendToClient(session.clientWs, { type: 'session.status', status: 'error' });
    },
  );
}

function handleChatMessage(session: Session, userText: string): void {
  log(session.id, session.userLabel, `Chat message received (${userText.length} chars)`);

  // Add to chat history and transcript
  session.chatHistory.push({ role: 'user', content: userText });
  session.transcriptBuffer.push({ role: 'user', text: userText });

  // Send user transcript back to client for display
  sendToClient(session.clientWs, { type: 'transcript.user.done', transcript: userText });

  // Crisis check
  performCrisisCheck(session, userText);

  // Stream AI response
  session.isResponseActive = true;
  sendToClient(session.clientWs, { type: 'response.started' });

  streamChatCompletion(
    session.chatHistory,
    (delta) => {
      sendToClient(session.clientWs, { type: 'chat.response.delta', delta });
    },
    (fullText) => {
      session.chatHistory.push({ role: 'assistant', content: fullText });
      session.transcriptBuffer.push({ role: 'ai', text: fullText });
      session.isResponseActive = false;
      sendToClient(session.clientWs, { type: 'chat.response.done', text: fullText });
      sendToClient(session.clientWs, { type: 'response.done' });
    },
    (error) => {
      session.isResponseActive = false;
      logError(session.id, session.userLabel, `Chat response error: ${error}`);
      sendToClient(session.clientWs, { type: 'error', message: `Failed to generate response: ${error}` });
    },
  );
}

function requestChatSummaryAndCleanup(session: Session): void {
  if (session.transcriptBuffer.length < 2 || session.isSummaryRequested) {
    cleanupSession(session);
    return;
  }

  session.isSummaryRequested = true;
  log(session.id, session.userLabel, `Requesting chat session summary... (${session.transcriptBuffer.length} entries)`);

  const summaryMessages = [
    { role: 'system' as const, content: session.chatHistory[0].content },
    ...session.chatHistory.slice(1),
    {
      role: 'user' as const,
      content: `[SYSTEM INSTRUCTION — NOT FROM PATIENT] ${buildSummaryPrompt()}`,
    },
  ];

  streamChatCompletion(
    summaryMessages,
    () => { /* ignore deltas for summary */ },
    (fullText) => {
      handleSummaryResponse(session, fullText);
      cleanupSession(session);
    },
    (error) => {
      logError(session.id, session.userLabel, `Chat summary error: ${error}`);
      cleanupSession(session);
    },
  );

  // Fallback timeout
  setTimeout(() => {
    if (activeSessions.has(session.id)) {
      logWarn(session.id, session.userLabel, 'Chat summary timeout (20s) — cleaning up');
      cleanupSession(session);
    }
  }, 20000);
}

function sendToClient(ws: WebSocket, data: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function cleanupSession(session: Session): void {
  const elapsed = Math.round((Date.now() - session.createdAt.getTime()) / 1000);
  log(session.id, session.userLabel, `Cleaning up session | duration: ${elapsed}s | mode: ${session.mode} | remaining active: ${activeSessions.size - 1}`);

  if (session.timeoutHandle) {
    clearTimeout(session.timeoutHandle);
    session.timeoutHandle = null;
  }

  if (session.openaiWs) {
    if (session.openaiWs.readyState === WebSocket.OPEN) {
      session.openaiWs.close();
    }
    session.openaiWs = null;
  }

  activeSessions.delete(session.id);
}
