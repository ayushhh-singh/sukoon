import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAudioCapture } from './useAudioCapture';
import { useAudioPlayback } from './useAudioPlayback';
import { StorageService } from '../services/storage';
import { scoreAssessment } from '../utils/assessmentScoring';
import { selectAssessmentForConcerns } from '../utils/assessmentMapping';
import { PHQ9_CONFIG } from '../data/assessmentQuestions';
import type {
  SessionPhase,
  SpeakingState,
  TranscriptEntry,
  CrisisResources,
  ServerMessage,
} from '../types';
import type { AssessmentResult, AssessmentConfig, AssessmentResponse } from '../types/assessments';
import type { MoodEntry } from '../types/mood';
import type { OnboardingData, SessionSummary, BookmarkedStrategy, AmbientSound, UserProfile } from '../types/session';

export function useSession() {
  // Determine initial phase
  const [phase, setPhase] = useState<SessionPhase>(
    StorageService.hasConsented() ? 'profile-select' : 'consent'
  );
  const [speakingState, setSpeakingState] = useState<SpeakingState>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [crisisResources, setCrisisResources] = useState<CrisisResources | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentAiText, setCurrentAiText] = useState('');
  const [sessionDuration, setSessionDuration] = useState(0);

  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(
    StorageService.getOnboarding()
  );
  const [preMood, setPreMood] = useState<MoodEntry | null>(null);
  const [postMood, setPostMood] = useState<MoodEntry | null>(null);
  const [preAssessmentResult, setPreAssessmentResult] = useState<AssessmentResult | null>(null);
  const [previousAssessmentResult, setPreviousAssessmentResult] = useState<AssessmentResult | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentConfig>(PHQ9_CONFIG);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [viewingResults, setViewingResults] = useState(false);

  // Session goal (reset each session)
  const [sessionGoal, setSessionGoal] = useState('');

  // Concerns selected for this specific session (may differ from onboarding)
  const [sessionConcerns, setSessionConcerns] = useState<string[]>([]);

  // Ambient sound preference (persisted)
  const [ambientSound, setAmbientSoundState] = useState<AmbientSound>(StorageService.getAmbientSound());

  // Bookmarks (persisted)
  const [bookmarks, setBookmarks] = useState<BookmarkedStrategy[]>(StorageService.getBookmarks());

  // History overlay
  const [showHistory, setShowHistory] = useState(false);

  // Exercises panel + individual exercise overlay state
  const [showExercisesPanel, setShowExercisesPanel] = useState(false);
  const [activeExercises, setActiveExercises] = useState<Record<string, boolean>>({});

  // Prior session linker
  const [linkedPriorSession, setLinkedPriorSession] = useState<SessionSummary | null>(null);
  const [priorSessions, setPriorSessions] = useState<SessionSummary[]>([]);

  const aiTranscriptBuffer = useRef('');
  const transcriptIdCounter = useRef(0);
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const summaryDataRef = useRef<ServerMessage['summary']>(undefined);

  const { status, connect, disconnect, send, onMessage } = useWebSocket();
  const { isCapturing, isMuted, volume: micVolume, startCapture, stopCapture, toggleMute } = useAudioCapture();
  const { isPlaying, playChunk, stop: stopPlayback, volume: aiVolume } = useAudioPlayback();

  useEffect(() => {
    if (isPlaying) setSpeakingState('ai-speaking');
    else if (isCapturing && micVolume > 0.01) setSpeakingState('user-speaking');
    else setSpeakingState('idle');
  }, [isPlaying, isCapturing, micVolume]);

  useEffect(() => {
    onMessage((message: ServerMessage) => {
      switch (message.type) {
        case 'audio.delta':
          if (message.delta) playChunk(message.delta);
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
        case 'speech.started':
          stopPlayback();
          break;
        case 'response.started':
          aiTranscriptBuffer.current = '';
          setCurrentAiText('');
          break;
        case 'crisis.detected':
          if (message.resources) setCrisisResources(message.resources);
          break;
        case 'session.summary':
          if (message.summary) {
            summaryDataRef.current = message.summary;
            // If the user already navigated past post-mood (summary is built),
            // patch the existing summary state with the AI data that just arrived.
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
  }, [onMessage, playChunk, stopPlayback]);

  // --- Phase transitions ---

  const acceptConsent = useCallback(() => {
    StorageService.setConsented();
    setPhase('profile-select');
  }, []);

  const selectProfile = useCallback((profile: UserProfile) => {
    StorageService.setActiveProfileId(profile.id);
    setOnboardingData(profile.onboarding);
    setSessionConcerns([]);
    setPhase('concern-select');
  }, []);

  const completeSessionConcerns = useCallback((concerns: string[]) => {
    setSessionConcerns(concerns);
    setSelectedAssessment(selectAssessmentForConcerns(concerns));
    const activeId = StorageService.getActiveProfileId();
    if (activeId) StorageService.saveLastConcerns(activeId, concerns);
    const past = activeId ? StorageService.getSessionsForUser(activeId) : [];
    if (past.length > 0) {
      setPriorSessions(past);
      setPhase('prior-session');
    } else {
      setPhase('pre-mood');
    }
  }, []);

  const skipSessionConcerns = useCallback(() => {
    const activeId = StorageService.getActiveProfileId();
    const last = activeId ? StorageService.getLastConcerns(activeId) : [];
    if (last.length > 0) {
      setSessionConcerns(last);
      setSelectedAssessment(selectAssessmentForConcerns(last));
    } else {
      setSessionConcerns([]);
    }
    const past = activeId ? StorageService.getSessionsForUser(activeId) : [];
    if (past.length > 0) {
      setPriorSessions(past);
      setPhase('prior-session');
    } else {
      setPhase('pre-mood');
    }
  }, []);

  const selectPriorSession = useCallback((session: SessionSummary) => {
    setLinkedPriorSession(session);
    setPhase('pre-mood');
  }, []);

  const skipPriorSession = useCallback(() => {
    setLinkedPriorSession(null);
    setPhase('pre-mood');
  }, []);

  const startNewUserFlow = useCallback(() => {
    setPhase('onboarding');
  }, []);

  const switchUser = useCallback(() => {
    setPhase('profile-select');
  }, []);

  const completeOnboarding = useCallback((data: OnboardingData) => {
    const profile: UserProfile = {
      id: `profile-${Date.now()}`,
      displayName: data.preferredName !== 'there' ? data.preferredName : 'User',
      createdAt: new Date().toISOString(),
      onboarding: data,
    };
    StorageService.saveProfile(profile);
    StorageService.setActiveProfileId(profile.id);
    setOnboardingData(data);
    setSelectedAssessment(selectAssessmentForConcerns(data.primaryConcerns));
    setPhase('pre-mood');
  }, []);

  const skipOnboarding = useCallback(() => {
    const d: OnboardingData = { preferredName: 'there', primaryConcerns: [], therapyExperience: 'none' };
    const profile: UserProfile = {
      id: `profile-${Date.now()}`,
      displayName: 'User',
      createdAt: new Date().toISOString(),
      onboarding: d,
    };
    StorageService.saveProfile(profile);
    StorageService.setActiveProfileId(profile.id);
    setOnboardingData(d);
    setPhase('pre-mood');
  }, []);

  const selectPreMood = useCallback((mood: MoodEntry) => {
    mood.sessionId = sessionIdRef.current;
    setPreMood(mood);
    StorageService.saveMood(mood);
    setPhase('pre-assessment');
  }, []);

  const completePreAssessment = useCallback((responses: AssessmentResponse[]) => {
    // Capture previous assessment BEFORE saving current one
    const prev = StorageService.getLatestAssessment(selectedAssessment.type);
    setPreviousAssessmentResult(prev);

    const scoring = scoreAssessment(selectedAssessment, responses);
    const result: AssessmentResult = {
      id: `assess-${Date.now()}`, type: selectedAssessment.type, responses,
      totalScore: scoring.totalScore, severity: scoring.severity, color: scoring.color,
      completedAt: new Date().toISOString(), sessionId: sessionIdRef.current, timing: 'pre-session',
    };
    setPreAssessmentResult(result);
    StorageService.saveAssessment(result);
    setViewingResults(true);
  }, [selectedAssessment]);

  const skipPreAssessment = useCallback(() => setPhase('ready'), []);

  const confirmPreAssessmentResults = useCallback(() => {
    setViewingResults(false);
    setPhase('ready');
  }, []);

  const startSession = useCallback(async () => {
    try {
      connect();
      setPhase('active');
      await startCapture((base64: string) => {
        send({ type: 'audio.append', audio: base64 });
      });

      const assessCtx: Record<string, unknown> = {};
      if (preAssessmentResult) {
        const key = preAssessmentResult.type.toLowerCase();
        assessCtx[`${key}Score`] = preAssessmentResult.totalScore;
        assessCtx[`${key}Severity`] = preAssessmentResult.severity;
        const prev = StorageService.getAssessments()
          .filter(a => a.type === preAssessmentResult.type && a.id !== preAssessmentResult.id)
          .slice(-5)
          .map(a => ({ type: a.type, score: a.totalScore, date: a.completedAt.split('T')[0] }));
        if (prev.length > 0) assessCtx.previousScores = prev;
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

      setTimeout(() => {
        send({
          type: 'session.start',
          assessmentContext: Object.keys(assessCtx).length > 0 ? assessCtx : undefined,
          userPreferences: onboardingData
            ? {
                ...onboardingData,
                primaryConcerns: sessionConcerns.length > 0 ? sessionConcerns : onboardingData.primaryConcerns,
                goalForToday: sessionGoal.trim() || undefined,
              }
            : undefined,
          priorSessionContext: priorCtx,
        });
      }, 500);
    } catch {
      setErrorMessage('Could not access your microphone. Please allow microphone access and try again.');
      setPhase('ready');
    }
  }, [connect, startCapture, send, preAssessmentResult, onboardingData, sessionConcerns, sessionGoal, linkedPriorSession]);

  const endSession = useCallback(() => {
    stopCapture();
    stopPlayback();
    send({ type: 'session.end' });
    // Move to post-mood immediately so the user isn't blocked waiting
    setPhase('post-mood');
    setSpeakingState('idle');
    // Keep WebSocket open for up to 25s so the server can deliver the
    // AI-generated summary before we close the connection.
    setTimeout(() => {
      disconnect();
    }, 25000);
  }, [stopCapture, stopPlayback, send, disconnect]);

  // Post-mood now goes directly to summary (rating phase removed)
  const selectPostMood = useCallback((mood: MoodEntry) => {
    mood.sessionId = sessionIdRef.current;
    setPostMood(mood);
    StorageService.saveMood(mood);
    // Build and save summary directly — no rating step
    buildAndSaveSummary(mood);
    setPhase('summary');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionDuration, preMood, preAssessmentResult, transcripts]);

  function buildAndSaveSummary(postMoodEntry?: MoodEntry) {
    const sd = summaryDataRef.current;
    const summary: SessionSummary = {
      id: `summary-${Date.now()}`, sessionId: sessionIdRef.current,
      userId: StorageService.getActiveProfileId() ?? undefined,
      date: new Date().toISOString(), duration: sessionDuration,
      keyTakeaways: sd?.keyTakeaways || [],
      copingStrategies: sd?.copingStrategies || [],
      homeworkAssignments: sd?.homeworkAssignments || [],
      topicsDiscussed: sd?.topicsDiscussed || [],
      emotionalThemes: sd?.emotionalThemes || [],
      issuesIdentified: sd?.issuesIdentified || [],
      conversationAssessment: sd?.conversationAssessment || '',
      emotionalJourney: sd?.emotionalJourney || '',
      riskLevel: sd?.riskLevel || 'low',
      suggestedFocusAreas: sd?.suggestedFocusAreas || [],
      techniquesUsed: sd?.techniquesUsed || [],
      clinicalImpression: sd?.clinicalImpression,
      preliminaryDiagnosis: sd?.preliminaryDiagnosis,
      recommendedActions: sd?.recommendedActions || [],
      wayForward: sd?.wayForward,
      preMood, postMood: postMoodEntry || postMood,
      preAssessment: preAssessmentResult,
      transcriptEntries: transcripts,
    };
    setSessionSummary(summary);
    StorageService.saveSession(summary);
  }

  const saveReflection = useCallback((text: string) => {
    setSessionSummary(prev => {
      if (!prev) return prev;
      const updated = { ...prev, userReflection: text };
      const sessions = StorageService.getSessions();
      const idx = sessions.findIndex(s => s.id === updated.id);
      if (idx >= 0) {
        sessions[idx] = updated;
        try { localStorage.setItem('sukoon_sessions', JSON.stringify(sessions)); } catch { /* */ }
      }
      return updated;
    });
  }, []);

  // New session goes back to profile picker — no reload needed
  const newSession = useCallback(() => {
    setPhase('profile-select');
    setPreMood(null);
    setPostMood(null);
    setPreAssessmentResult(null);
    setPreviousAssessmentResult(null);
    setSessionSummary(null);
    setViewingResults(false);
    setSessionGoal('');
    setSessionConcerns([]);
    setTranscripts([]);
    setLinkedPriorSession(null);
    setPriorSessions([]);
    summaryDataRef.current = undefined;
    sessionIdRef.current = `session-${Date.now()}`;
  }, []);

  const dismissError = useCallback(() => setErrorMessage(null), []);
  const dismissCrisis = useCallback(() => setCrisisResources(null), []);

  // Ambient sound
  const setAmbientSound = useCallback((sound: AmbientSound) => {
    setAmbientSoundState(sound);
    StorageService.saveAmbientSound(sound);
  }, []);

  // Bookmarks
  const toggleBookmark = useCallback((strategy: BookmarkedStrategy) => {
    if (StorageService.isBookmarked(strategy.text)) {
      StorageService.removeBookmark(strategy.text);
    } else {
      StorageService.addBookmark(strategy);
    }
    setBookmarks(StorageService.getBookmarks());
  }, []);

  // History overlay
  const openHistory = useCallback(() => setShowHistory(true), []);
  const closeHistory = useCallback(() => setShowHistory(false), []);

  const toggleExercisesPanel = useCallback(() => setShowExercisesPanel(p => !p), []);
  const toggleExercise = useCallback((id: string) => {
    setActiveExercises(p => ({ ...p, [id]: !p[id] }));
  }, []);
  const onTimerReminder = useCallback((msg: string) => setErrorMessage(msg), []);
  const onDurationUpdate = useCallback((s: number) => setSessionDuration(s), []);

  return {
    phase, connectionStatus: status, speakingState, transcripts,
    crisisResources, errorMessage, micVolume, aiVolume, currentAiText,
    isMuted, toggleMute,
    sessionDuration, onboardingData, preAssessmentResult, previousAssessmentResult,
    preMood, postMood, sessionSummary, selectedAssessment,
    viewingResults, showExercisesPanel, activeExercises,
    sessionConcerns, sessionGoal, setSessionGoal,
    ambientSound, setAmbientSound,
    bookmarks, toggleBookmark,
    showHistory, openHistory, closeHistory,

    priorSessions, selectPriorSession, skipPriorSession,

    acceptConsent, selectProfile, startNewUserFlow, switchUser, completeOnboarding, skipOnboarding,
    completeSessionConcerns, skipSessionConcerns,
    selectPreMood, completePreAssessment, skipPreAssessment, confirmPreAssessmentResults,
    startSession, endSession,
    selectPostMood,
    saveReflection, newSession, dismissError, dismissCrisis,
    toggleExercisesPanel, toggleExercise,
    onTimerReminder, onDurationUpdate,
  };
}
