import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAuth } from '../contexts/AuthContext';
import { moods as moodsApi, assessments as assessmentsApi, sessions as sessionsApi } from '../services/api';
import { scoreAssessment } from '../utils/assessmentScoring';
import { selectAssessmentForConcerns } from '../utils/assessmentMapping';
import { PHQ9_CONFIG } from '../data/assessmentQuestions';
import type { SessionPhase, SpeakingState, TranscriptEntry, CrisisResources, ServerMessage } from '../types';
import type { AssessmentResult, AssessmentConfig, AssessmentResponse } from '../types/assessments';
import type { MoodEntry } from '../types/mood';
import type { SessionSummary, BookmarkedStrategy, AmbientSound } from '../types/session';
import type { SessionMode, ChatMessage } from '../types/chat';

export function useSession() {
  const { user } = useAuth();

  const [phase, setPhase] = useState<SessionPhase>('concern-select');
  const [speakingState, setSpeakingState] = useState<SpeakingState>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [crisisResources, setCrisisResources] = useState<CrisisResources | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentAiText, setCurrentAiText] = useState('');
  const [sessionDuration, setSessionDuration] = useState(0);

  const [preMood, setPreMood] = useState<MoodEntry | null>(null);
  const [postMood, setPostMood] = useState<MoodEntry | null>(null);
  const [preAssessmentResult, setPreAssessmentResult] = useState<AssessmentResult | null>(null);
  const [previousAssessmentResult, setPreviousAssessmentResult] = useState<AssessmentResult | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentConfig>(PHQ9_CONFIG);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [viewingResults, setViewingResults] = useState(false);

  const [sessionGoal, setSessionGoal] = useState('');
  const [sessionConcerns, setSessionConcerns] = useState<string[]>([]);
  const [ambientSound, setAmbientSoundState] = useState<AmbientSound>('none');
  const [bookmarks, setBookmarks] = useState<BookmarkedStrategy[]>([]);

  const [sessionMode, setSessionMode] = useState<SessionMode>('voice');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatMessageIdCounter = useRef(0);

  const [linkedPriorSession, setLinkedPriorSession] = useState<SessionSummary | null>(null);
  const [priorSessions, setPriorSessions] = useState<SessionSummary[]>([]);

  const aiTranscriptBuffer = useRef('');
  const transcriptIdCounter = useRef(0);
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const summaryDataRef = useRef<ServerMessage['summary']>(undefined);

  const { status, connect, disconnect, send, onMessage } = useWebSocket();

  // Simplified speaking state (no audio hooks in mobile yet — placeholder)
  const micVolume = 0;
  const aiVolume = 0;

  useEffect(() => {
    onMessage((message: ServerMessage) => {
      switch (message.type) {
        case 'audio.delta':
          // Audio playback will be handled by expo-av in future
          break;
        case 'transcript.ai.delta':
          if (message.delta) {
            aiTranscriptBuffer.current += message.delta;
            setCurrentAiText(aiTranscriptBuffer.current);
          }
          break;
        case 'transcript.ai.done':
          if (message.transcript) {
            setTranscripts(prev => [...prev, {
              id: `t-${++transcriptIdCounter.current}`, role: 'ai',
              text: message.transcript!, timestamp: new Date(),
            }]);
          }
          aiTranscriptBuffer.current = '';
          setCurrentAiText('');
          break;
        case 'transcript.user.done':
          if (message.transcript) {
            setTranscripts(prev => [...prev, {
              id: `t-${++transcriptIdCounter.current}`, role: 'user',
              text: message.transcript!, timestamp: new Date(),
            }]);
          }
          break;
        case 'response.started':
          aiTranscriptBuffer.current = '';
          setCurrentAiText('');
          break;
        case 'chat.response.delta':
          if (message.delta) {
            setChatMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'ai' && last.isStreaming) {
                return [...prev.slice(0, -1), { ...last, text: last.text + message.delta }];
              }
              return [...prev, {
                id: `cm-${++chatMessageIdCounter.current}`,
                role: 'ai', text: message.delta!, timestamp: new Date(), isStreaming: true,
              }];
            });
          }
          break;
        case 'chat.response.done':
          setChatMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'ai' && last.isStreaming) {
              return [...prev.slice(0, -1), { ...last, text: message.text || last.text, isStreaming: false }];
            }
            return prev;
          });
          if (message.text) {
            setTranscripts(prev => [...prev, {
              id: `t-${++transcriptIdCounter.current}`, role: 'ai',
              text: message.text!, timestamp: new Date(),
            }]);
          }
          break;
        case 'crisis.detected':
          if (message.resources) setCrisisResources(message.resources);
          break;
        case 'session.summary':
          if (message.summary) {
            summaryDataRef.current = message.summary;
            setSessionSummary(prev => {
              if (!prev) return prev;
              const sd = message.summary!;
              return {
                ...prev,
                keyTakeaways: sd.keyTakeaways || prev.keyTakeaways,
                copingStrategies: sd.copingStrategies || prev.copingStrategies,
                homeworkAssignments: sd.homeworkAssignments || prev.homeworkAssignments,
                topicsDiscussed: sd.topicsDiscussed || prev.topicsDiscussed,
                emotionalThemes: sd.emotionalThemes || prev.emotionalThemes,
                issuesIdentified: sd.issuesIdentified || prev.issuesIdentified,
                conversationAssessment: sd.conversationAssessment || prev.conversationAssessment,
                emotionalJourney: sd.emotionalJourney || prev.emotionalJourney,
                riskLevel: sd.riskLevel || prev.riskLevel,
                suggestedFocusAreas: sd.suggestedFocusAreas || prev.suggestedFocusAreas,
                techniquesUsed: sd.techniquesUsed || prev.techniquesUsed,
                clinicalImpression: sd.clinicalImpression || prev.clinicalImpression,
                preliminaryDiagnosis: sd.preliminaryDiagnosis || prev.preliminaryDiagnosis,
                recommendedActions: sd.recommendedActions || prev.recommendedActions,
                wayForward: sd.wayForward || prev.wayForward,
              };
            });
          }
          break;
        case 'session.timeout':
          setErrorMessage(message.message || 'Session timeout.');
          break;
        case 'error':
          setErrorMessage(message.message || 'An unexpected error occurred.');
          break;
      }
    });
  }, [onMessage]);

  const completeSessionConcerns = useCallback(async (concerns: string[]) => {
    setSessionConcerns(concerns);
    setSelectedAssessment(selectAssessmentForConcerns(concerns));
    try {
      const pastRaw = await sessionsApi.list();
      if (pastRaw.length > 0) {
        const past = pastRaw.map(normalizeSummary);
        setPriorSessions(past);
        setPhase('prior-session');
        return;
      }
    } catch {}
    setPhase('pre-mood');
  }, []);

  const skipSessionConcerns = useCallback(async () => {
    const userConcerns = (user?.primaryConcerns as string[]) || [];
    if (userConcerns.length > 0) {
      setSessionConcerns(userConcerns);
      setSelectedAssessment(selectAssessmentForConcerns(userConcerns));
    }
    try {
      const pastRaw = await sessionsApi.list();
      if (pastRaw.length > 0) {
        setPriorSessions(pastRaw.map(normalizeSummary));
        setPhase('prior-session');
        return;
      }
    } catch {}
    setPhase('pre-mood');
  }, [user]);

  const selectPriorSession = useCallback((session: SessionSummary) => {
    setLinkedPriorSession(session);
    setPhase('pre-mood');
  }, []);

  const skipPriorSession = useCallback(() => {
    setLinkedPriorSession(null);
    setPhase('pre-mood');
  }, []);

  const selectPreMood = useCallback(async (mood: MoodEntry) => {
    mood.sessionId = sessionIdRef.current;
    setPreMood(mood);
    try {
      await moodsApi.create({
        value: mood.value, label: mood.label, emoji: mood.emoji,
        context: mood.context, sessionId: mood.sessionId,
      });
    } catch {}
    setPhase('pre-assessment');
  }, []);

  const completePreAssessment = useCallback(async (responses: AssessmentResponse[]) => {
    try {
      const prev = await assessmentsApi.getLatest(selectedAssessment.type);
      if (prev) setPreviousAssessmentResult(prev as unknown as AssessmentResult);
    } catch {}

    const scoring = scoreAssessment(selectedAssessment, responses);
    const result: AssessmentResult = {
      id: `assess-${Date.now()}`, type: selectedAssessment.type, responses,
      totalScore: scoring.totalScore, severity: scoring.severity, color: scoring.color,
      completedAt: new Date().toISOString(), sessionId: sessionIdRef.current, timing: 'pre-session',
    };
    setPreAssessmentResult(result);

    try {
      await assessmentsApi.create({
        type: result.type, responses: result.responses,
        totalScore: result.totalScore, severity: result.severity,
        color: result.color, sessionId: result.sessionId, timing: result.timing,
      });
    } catch {}
    setViewingResults(true);
  }, [selectedAssessment]);

  const skipPreAssessment = useCallback(() => setPhase('mode-select'), []);
  const confirmPreAssessmentResults = useCallback(() => {
    setViewingResults(false);
    setPhase('mode-select');
  }, []);

  const selectMode = useCallback((mode: SessionMode) => {
    setSessionMode(mode);
    setPhase('ready');
  }, []);

  const buildSessionContext = useCallback(() => {
    const assessCtx: Record<string, unknown> = {};
    if (preAssessmentResult) {
      const key = preAssessmentResult.type.toLowerCase();
      assessCtx[`${key}Score`] = preAssessmentResult.totalScore;
      assessCtx[`${key}Severity`] = preAssessmentResult.severity;
    }

    const priorCtx = linkedPriorSession ? {
      date: linkedPriorSession.date,
      issuesIdentified: linkedPriorSession.issuesIdentified,
      suggestedFocusAreas: linkedPriorSession.suggestedFocusAreas,
      copingStrategies: linkedPriorSession.copingStrategies,
      homeworkAssignments: linkedPriorSession.homeworkAssignments,
      wayForward: linkedPriorSession.wayForward,
      clinicalImpression: linkedPriorSession.clinicalImpression,
      preliminaryDiagnosis: linkedPriorSession.preliminaryDiagnosis,
    } : undefined;

    const userPrefs: Record<string, unknown> = {};
    if (user) {
      userPrefs.preferredName = (user.displayName as string) || 'there';
      userPrefs.primaryConcerns = sessionConcerns.length > 0 ? sessionConcerns : ((user.primaryConcerns as string[]) || []);
      userPrefs.therapyExperience = (user.therapyExperience as string) || 'none';
      userPrefs.language = (user.language as string) || 'English';
      userPrefs.voicePreference = (user.voicePreference as string) || 'female';
      if (sessionGoal.trim()) userPrefs.goalForToday = sessionGoal.trim();
      if (user.age) userPrefs.age = user.age;
      if (user.profession) userPrefs.profession = user.profession;
      const disorders = user.knownDisorders as string[] | undefined;
      const meds = user.currentMedications as string[] | undefined;
      if (disorders && disorders.length > 0) userPrefs.knownDisorders = disorders;
      if (meds && meds.length > 0) userPrefs.currentMedications = meds;
    }

    return {
      assessmentContext: Object.keys(assessCtx).length > 0 ? assessCtx : undefined,
      userPreferences: Object.keys(userPrefs).length > 0 ? userPrefs : undefined,
      priorSessionContext: priorCtx,
    };
  }, [preAssessmentResult, user, sessionConcerns, sessionGoal, linkedPriorSession]);

  const startSession = useCallback(async () => {
    // For mobile, we start with chat mode only (voice requires expo-av integration)
    try {
      await connect();
      setPhase('active');
      if (sessionMode === 'chat') {
        setChatMessages([]);
        send({ type: 'chat.start', ...buildSessionContext() });
      } else {
        // Voice mode: connect WS and send session.start
        // Audio capture via expo-av will be integrated later
        send({ type: 'session.start', ...buildSessionContext() });
      }
    } catch {
      setErrorMessage('Could not connect to the server. Please check your connection and try again.');
      setPhase('ready');
    }
  }, [sessionMode, connect, send, buildSessionContext]);

  const sendChatMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setChatMessages(prev => [...prev, {
      id: `cm-${++chatMessageIdCounter.current}`,
      role: 'user', text: trimmed, timestamp: new Date(),
    }]);
    send({ type: 'chat.message', text: trimmed });
  }, [send]);

  const endSession = useCallback(() => {
    send({ type: 'session.end' });
    setPhase('post-mood');
    setSpeakingState('idle');
    setTimeout(() => disconnect(), 25000);
  }, [send, disconnect]);

  const selectPostMood = useCallback(async (mood: MoodEntry) => {
    mood.sessionId = sessionIdRef.current;
    setPostMood(mood);
    try {
      await moodsApi.create({
        value: mood.value, label: mood.label, emoji: mood.emoji,
        context: mood.context, sessionId: mood.sessionId,
      });
    } catch {}
    buildAndSaveSummary(mood);
    setPhase('summary');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionDuration, preMood, preAssessmentResult, transcripts]);

  function buildAndSaveSummary(postMoodEntry?: MoodEntry) {
    const sd = summaryDataRef.current;
    const summary: SessionSummary = {
      id: `summary-${Date.now()}`, sessionId: sessionIdRef.current,
      userId: user?.id, date: new Date().toISOString(), duration: sessionDuration, mode: sessionMode,
      keyTakeaways: sd?.keyTakeaways || [], copingStrategies: sd?.copingStrategies || [],
      homeworkAssignments: sd?.homeworkAssignments || [], topicsDiscussed: sd?.topicsDiscussed || [],
      emotionalThemes: sd?.emotionalThemes || [], issuesIdentified: sd?.issuesIdentified || [],
      conversationAssessment: sd?.conversationAssessment || '', emotionalJourney: sd?.emotionalJourney || '',
      riskLevel: sd?.riskLevel || 'low', suggestedFocusAreas: sd?.suggestedFocusAreas || [],
      techniquesUsed: sd?.techniquesUsed || [], clinicalImpression: sd?.clinicalImpression,
      preliminaryDiagnosis: sd?.preliminaryDiagnosis, recommendedActions: sd?.recommendedActions || [],
      wayForward: sd?.wayForward, preMood, postMood: postMoodEntry || postMood,
      preAssessment: preAssessmentResult, transcriptEntries: transcripts,
    };
    setSessionSummary(summary);
  }

  const saveReflection = useCallback(async (text: string) => {
    setSessionSummary(prev => prev ? { ...prev, userReflection: text } : prev);
    try { await sessionsApi.updateReflection(sessionIdRef.current, text); } catch {}
  }, []);

  const newSession = useCallback(() => {
    setPreMood(null); setPostMood(null);
    setPreAssessmentResult(null); setPreviousAssessmentResult(null);
    setSessionSummary(null); setViewingResults(false);
    setSessionGoal(''); setSessionConcerns([]);
    setTranscripts([]); setChatMessages([]);
    setSessionMode('voice'); setLinkedPriorSession(null); setPriorSessions([]);
    summaryDataRef.current = undefined;
    sessionIdRef.current = `session-${Date.now()}`;
    setPhase('concern-select');
  }, []);

  const goBack = useCallback(() => {
    switch (phase) {
      case 'prior-session': setPhase('concern-select'); break;
      case 'pre-mood':
        setPhase(priorSessions.length > 0 ? 'prior-session' : 'concern-select'); break;
      case 'pre-assessment': setViewingResults(false); setPhase('pre-mood'); break;
      case 'mode-select': setPhase('pre-assessment'); break;
      case 'ready': setPhase('mode-select'); break;
    }
  }, [phase, priorSessions]);

  const dismissError = useCallback(() => setErrorMessage(null), []);
  const dismissCrisis = useCallback(() => setCrisisResources(null), []);
  const setAmbientSound = useCallback((sound: AmbientSound) => setAmbientSoundState(sound), []);
  const onDurationUpdate = useCallback((s: number) => setSessionDuration(s), []);

  return {
    phase, connectionStatus: status, speakingState, transcripts,
    crisisResources, errorMessage, micVolume, aiVolume, currentAiText,
    sessionDuration, preAssessmentResult, previousAssessmentResult,
    preMood, postMood, sessionSummary, selectedAssessment,
    viewingResults, sessionConcerns, sessionGoal, setSessionGoal,
    ambientSound, setAmbientSound, bookmarks,
    sessionMode, selectMode, chatMessages, sendChatMessage,
    goBack, priorSessions, selectPriorSession, skipPriorSession,
    completeSessionConcerns, skipSessionConcerns,
    selectPreMood, completePreAssessment, skipPreAssessment, confirmPreAssessmentResults,
    startSession, endSession, selectPostMood,
    saveReflection, newSession, dismissError, dismissCrisis, onDurationUpdate,
  };
}

function normalizeSummary(raw: Record<string, unknown>): SessionSummary {
  return {
    id: raw.id as string,
    sessionId: (raw.session_id || raw.sessionId) as string,
    userId: (raw.user_id || raw.userId) as string,
    date: (raw.date || raw.created_at) as string,
    duration: (raw.duration || 0) as number,
    mode: (raw.mode || 'voice') as 'voice' | 'chat',
    keyTakeaways: (raw.key_takeaways || raw.keyTakeaways || []) as string[],
    copingStrategies: (raw.coping_strategies || raw.copingStrategies || []) as string[],
    homeworkAssignments: (raw.homework_assignments || raw.homeworkAssignments || []) as string[],
    topicsDiscussed: (raw.topics_discussed || raw.topicsDiscussed || []) as string[],
    emotionalThemes: (raw.emotional_themes || raw.emotionalThemes || []) as string[],
    issuesIdentified: (raw.issues_identified || raw.issuesIdentified || []) as string[],
    conversationAssessment: (raw.conversation_assessment || raw.conversationAssessment || '') as string,
    emotionalJourney: (raw.emotional_journey || raw.emotionalJourney || '') as string,
    riskLevel: (raw.risk_level || raw.riskLevel || 'low') as 'low' | 'moderate' | 'elevated',
    suggestedFocusAreas: (raw.suggested_focus_areas || raw.suggestedFocusAreas || []) as string[],
    techniquesUsed: (raw.techniques_used || raw.techniquesUsed || []) as string[],
    clinicalImpression: (raw.clinical_impression || raw.clinicalImpression) as string | undefined,
    preliminaryDiagnosis: (raw.preliminary_diagnosis || raw.preliminaryDiagnosis) as string | undefined,
    recommendedActions: (raw.recommended_actions || raw.recommendedActions || []) as string[],
    wayForward: (raw.way_forward || raw.wayForward) as string | undefined,
    preMood: null, postMood: null, preAssessment: null, transcriptEntries: [],
  };
}
