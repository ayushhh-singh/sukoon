import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SessionConcernPicker } from '../SessionConcernPicker';
import { MoodPicker } from '../mood/MoodPicker';
import { AssessmentScreen } from '../assessments/AssessmentScreen';
import { AssessmentResults } from '../assessments/AssessmentResults';
import { ModeSelectScreen } from '../ModeSelectScreen';
import { VoiceOrb } from '../VoiceOrb';
import { StatusBar } from '../StatusBar';
import { SessionTimer } from '../session/SessionTimer';
import { Transcript } from '../Transcript';
import { SessionControls } from '../SessionControls';
import { ChatSession } from '../chat/ChatSession';
import { SessionSummaryScreen } from '../session/SessionSummaryScreen';
import { AmbientSoundPlayer } from '../session/AmbientSoundPlayer';
import { CrisisModal } from '../CrisisModal';
import { ErrorToast } from '../ErrorToast';
import { ExercisesPanel } from '../exercises/ExercisesPanel';
import { BreathingExercise } from '../exercises/BreathingExercise';
import { GroundingExercise } from '../exercises/GroundingExercise';
import { ProgressiveMuscleRelaxation } from '../exercises/ProgressiveMuscleRelaxation';
import { ThoughtRecord } from '../exercises/ThoughtRecord';
import { PositiveAffirmations } from '../exercises/PositiveAffirmations';
import { BodyScanMeditation } from '../exercises/BodyScanMeditation';
import { MindfulVisualization } from '../exercises/MindfulVisualization';
import { GratitudeJournal } from '../exercises/GratitudeJournal';
import { SelfCompassionBreak } from '../exercises/SelfCompassionBreak';
import { EmotionWheel } from '../exercises/EmotionWheel';
import { SleepHygiene } from '../exercises/SleepHygiene';
import { WorryTime } from '../exercises/WorryTime';
import { ValuesCardSort } from '../exercises/ValuesCardSort';
import { MindfulWalking } from '../exercises/MindfulWalking';
import { FlowProgress } from '../FlowProgress';
import { DailyCheckIn } from '../DailyCheckIn';
import { PriorSessionPicker } from '../PriorSessionPicker';
import { DoctorContextPicker } from './DoctorContextPicker';
import { Volume2 } from 'lucide-react';
import type { AmbientSound } from '../../types/session';

// Exercise components keyed by ID
const EXERCISE_COMPONENTS: Record<string, React.ComponentType<{ onClose: () => void }>> = {
  breathing: BreathingExercise,
  grounding: GroundingExercise,
  pmr: ProgressiveMuscleRelaxation,
  thoughtRecord: ThoughtRecord,
  affirmations: PositiveAffirmations,
  bodyScan: BodyScanMeditation,
  visualization: MindfulVisualization,
  gratitude: GratitudeJournal,
  selfCompassion: SelfCompassionBreak,
  emotionWheel: EmotionWheel,
  sleepHygiene: SleepHygiene,
  worryTime: WorryTime,
  valuesSort: ValuesCardSort,
  mindfulWalking: MindfulWalking,
};

interface PatientSessionsProps {
  session: ReturnType<typeof import('../../hooks/useSession').useSession>;
  onSessionActive: () => void;
  onSessionInactive: () => void;
}

export function PatientSessions({ session, onSessionActive, onSessionInactive }: PatientSessionsProps) {
  const { user } = useAuth();
  const patientName = (user?.displayName as string) || 'there';
  const prevPhaseRef = useRef(session.phase);

  // Notify parent when session becomes active/inactive
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = session.phase;

    if (session.phase === 'active' && prev !== 'active') {
      onSessionActive();
    } else if (prev === 'active' && session.phase !== 'active') {
      onSessionInactive();
    }
  }, [session.phase, onSessionActive, onSessionInactive]);

  // When an exercise closes, re-open the exercises panel
  function handleExerciseClose(id: string) {
    session.toggleExercise(id);
    if (!session.showExercisesPanel) {
      session.toggleExercisesPanel();
    }
  }

  // Determine effective phase — skip auth-handled phases
  const effectivePhase = (() => {
    if (['role-select', 'consent', 'profile-select', 'onboarding'].includes(session.phase)) {
      return 'concern-select';
    }
    return session.phase;
  })();

  return (
    <>
      {/* Flow progress indicator for pre-session steps */}
      {['concern-select', 'doctor-context', 'pre-mood', 'pre-assessment', 'mode-select'].includes(effectivePhase) && (
        <FlowProgress currentPhase={effectivePhase} />
      )}

      {/* Phase: Concern Select */}
      {effectivePhase === 'concern-select' && (
        <SessionConcernPicker
          name={patientName}
          onComplete={session.completeSessionConcerns}
          onSkip={session.skipSessionConcerns}
        />
      )}

      {/* Phase: Doctor Context Picker */}
      {effectivePhase === 'doctor-context' && (
        <DoctorContextPicker
          onSelect={session.selectDoctorContext}
          onSkip={session.skipDoctorContext}
          onBack={session.goBack}
        />
      )}

      {/* Phase: Prior Session Picker */}
      {effectivePhase === 'prior-session' && (
        <PriorSessionPicker
          sessions={session.priorSessions}
          selectedConcerns={session.sessionConcerns}
          onSelect={session.selectPriorSession}
          onSkip={session.skipPriorSession}
          onBack={session.goBack}
        />
      )}

      {/* Phase: Pre-Session Mood */}
      {effectivePhase === 'pre-mood' && (
        <MoodPicker context="pre-session" onSelect={session.selectPreMood} onBack={session.goBack} />
      )}

      {/* Phase: Pre-Session Assessment */}
      {effectivePhase === 'pre-assessment' && !session.viewingResults && (
        <AssessmentScreen
          config={session.selectedAssessment}
          timing="pre-session"
          onComplete={session.completePreAssessment}
          onSkip={session.skipPreAssessment}
          onBack={session.goBack}
        />
      )}

      {/* Pre-Assessment Results */}
      {effectivePhase === 'pre-assessment' && session.viewingResults && session.preAssessmentResult && (
        <AssessmentResults
          result={session.preAssessmentResult}
          config={session.selectedAssessment}
          previousResult={session.previousAssessmentResult}
          onContinue={session.confirmPreAssessmentResults}
        />
      )}

      {/* Phase: Mode Select */}
      {effectivePhase === 'mode-select' && (
        <ModeSelectScreen onSelect={session.selectMode} onBack={session.goBack} />
      )}

      {/* Phase: Ready */}
      {effectivePhase === 'ready' && (
        <div className="session-screen">
          <div className="session-header">
            <h1>Sukoon</h1>
            <p>
              {patientName !== 'there'
                ? `Welcome, ${patientName}. Ready when you are.`
                : 'Your safe space for supportive conversations'}
            </p>
            <button className="session-mode-badge session-mode-switch" onClick={session.goBack} title="Change session type">
              {session.sessionMode === 'chat' ? 'Chat Session' : 'Voice Session'}
              <span className="session-mode-switch-hint">Change</span>
            </button>
          </div>
          <DailyCheckIn />
          {session.sessionMode === 'voice' && (
            <VoiceOrb speakingState="idle" micVolume={0} aiVolume={0} />
          )}
          {session.sessionMode === 'chat' && (
            <div className="chat-preview-icon">
              <div className="chat-preview-bubble">
                <span>Ready to chat with Dr. Aria</span>
              </div>
            </div>
          )}

          <div className="session-goal-row">
            <input
              className="session-goal-input"
              type="text"
              placeholder="What do you want to focus on today? (optional)"
              value={session.sessionGoal}
              onChange={e => session.setSessionGoal(e.target.value)}
              maxLength={120}
            />
          </div>

          {session.sessionMode === 'voice' && (
            <div className="ambient-row">
              <Volume2 size={14} className="ambient-icon" />
              {(['none', 'rain', 'ocean', 'forest', 'piano'] as AmbientSound[]).map(s => (
                <button
                  key={s}
                  className={`ambient-chip ${session.ambientSound === s ? 'selected' : ''}`}
                  onClick={() => session.setAmbientSound(s)}
                >
                  {s === 'none' ? 'Off' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}

          <SessionControls
            isActive={false}
            connectionStatus={session.connectionStatus}
            onStart={session.startSession}
            onEnd={session.endSession}
          />
        </div>
      )}

      {/* Phase: Active Session -- Voice */}
      {effectivePhase === 'active' && session.sessionMode === 'voice' && (
        <div className="session-screen active">
          <div className="active-status-row">
            <StatusBar status={session.connectionStatus} />
            <SessionTimer
              isActive={session.phase === 'active'}
              onDurationUpdate={session.onDurationUpdate}
              onReminder={session.onTimerReminder}
            />
          </div>
          <VoiceOrb
            speakingState={session.speakingState}
            micVolume={session.micVolume}
            aiVolume={session.aiVolume}
          />
          <Transcript entries={session.transcripts} currentAiText={session.currentAiText} />
          <SessionControls
            isActive={true}
            connectionStatus={session.connectionStatus}
            isMuted={session.isMuted}
            onToggleMute={session.toggleMute}
            onStart={session.startSession}
            onEnd={session.endSession}
          />
        </div>
      )}

      {/* Phase: Active Session -- Chat */}
      {effectivePhase === 'active' && session.sessionMode === 'chat' && (
        <div className="session-screen active chat-active">
          <div className="active-status-row">
            <SessionTimer
              isActive={session.phase === 'active'}
              onDurationUpdate={session.onDurationUpdate}
              onReminder={session.onTimerReminder}
            />
          </div>
          <ChatSession
            messages={session.chatMessages}
            onSendMessage={session.sendChatMessage}
            onEnd={session.endSession}
            isConnected={session.connectionStatus === 'connected'}
          />
        </div>
      )}

      {/* Phase: Post-Session Mood */}
      {effectivePhase === 'post-mood' && (
        <MoodPicker
          context="post-session"
          title="How are you feeling after your session?"
          onSelect={session.selectPostMood}
        />
      )}

      {/* Phase: Summary */}
      {effectivePhase === 'summary' && session.sessionSummary && (
        <SessionSummaryScreen
          summary={session.sessionSummary}
          onSaveReflection={session.saveReflection}
          bookmarks={session.bookmarks}
          onToggleBookmark={session.toggleBookmark}
          onNewSession={session.newSession}
        />
      )}

      {/* Phase: Ended */}
      {effectivePhase === 'ended' && (
        <div className="session-screen">
          <div className="session-header">
            <h1>Session Complete</h1>
            <p>Thank you for taking this time for yourself.</p>
          </div>
          <button className="btn-primary" onClick={session.newSession}>New Session</button>
        </div>
      )}

      {/* Ambient sound during active voice session */}
      {effectivePhase === 'active' && session.sessionMode === 'voice' && session.ambientSound !== 'none' && (
        <AmbientSoundPlayer
          sound={session.ambientSound}
          isAiSpeaking={session.speakingState === 'ai-speaking'}
        />
      )}

      {/* Overlays */}
      {session.crisisResources && (
        <CrisisModal resources={session.crisisResources} onDismiss={session.dismissCrisis} />
      )}
      {session.showExercisesPanel && (
        <ExercisesPanel
          onClose={session.toggleExercisesPanel}
          onSelectExercise={session.toggleExercise}
        />
      )}

      {/* Exercise overlays */}
      {Object.entries(EXERCISE_COMPONENTS).map(([id, ExComponent]) =>
        session.activeExercises[id] ? (
          <ExComponent key={id} onClose={() => handleExerciseClose(id)} />
        ) : null
      )}

      {session.errorMessage && <ErrorToast message={session.errorMessage} onDismiss={session.dismissError} />}
    </>
  );
}
