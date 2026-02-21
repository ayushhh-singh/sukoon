import React from 'react';
import { useSession } from './hooks/useSession';
import { useReminders } from './hooks/useReminders';
import { ConsentScreen } from './components/ConsentScreen';
import { ProfilePickerScreen } from './components/ProfilePickerScreen';
import { SessionConcernPicker } from './components/SessionConcernPicker';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { MoodPicker } from './components/mood/MoodPicker';
import { AssessmentScreen } from './components/assessments/AssessmentScreen';
import { AssessmentResults } from './components/assessments/AssessmentResults';
import { ModeSelectScreen } from './components/ModeSelectScreen';
import { RoleSelectScreen } from './components/RoleSelectScreen';
import { VoiceOrb } from './components/VoiceOrb';
import { StatusBar } from './components/StatusBar';
import { SessionTimer } from './components/session/SessionTimer';
import { Transcript } from './components/Transcript';
import { SessionControls } from './components/SessionControls';
import { ChatSession } from './components/chat/ChatSession';
import { SessionSummaryScreen } from './components/session/SessionSummaryScreen';
import { AmbientSoundPlayer } from './components/session/AmbientSoundPlayer';
import { CrisisModal } from './components/CrisisModal';
import { ErrorToast } from './components/ErrorToast';
import { ExercisesPanel } from './components/exercises/ExercisesPanel';
import { BreathingExercise } from './components/exercises/BreathingExercise';
import { GroundingExercise } from './components/exercises/GroundingExercise';
import { ProgressiveMuscleRelaxation } from './components/exercises/ProgressiveMuscleRelaxation';
import { ThoughtRecord } from './components/exercises/ThoughtRecord';
import { PositiveAffirmations } from './components/exercises/PositiveAffirmations';
import { BodyScanMeditation } from './components/exercises/BodyScanMeditation';
import { MindfulVisualization } from './components/exercises/MindfulVisualization';
import { GratitudeJournal } from './components/exercises/GratitudeJournal';
import { SelfCompassionBreak } from './components/exercises/SelfCompassionBreak';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageToggle } from './components/LanguageToggle';
import { HistoryScreen } from './components/history/HistoryScreen';
import { PriorSessionPicker } from './components/PriorSessionPicker';
import { ProgressDashboard } from './components/retention/ProgressDashboard';
import { TherapistLogin } from './components/therapist/TherapistLogin';
import { TherapistDashboard } from './components/therapist/TherapistDashboard';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { Layers, History, Volume2, BarChart3, Settings } from 'lucide-react';
import type { AmbientSound } from './types/session';
import './App.css';

// Exercise components keyed by ID — single source of truth
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
};

function App() {
  const session = useSession();
  useReminders();

  // When an exercise closes, re-open the exercises panel
  function handleExerciseClose(id: string) {
    session.toggleExercise(id);
    if (!session.showExercisesPanel) {
      session.toggleExercisesPanel();
    }
  }

  // Doctor flow: role-select with doctor chosen → TherapistLogin → TherapistDashboard
  const isDoctorFlow = session.phase === 'role-select' && session.userRole === 'doctor';
  const isDoctorAuthed = isDoctorFlow && session.authenticatedDoctor !== null;

  // Show top controls only when past role-select and not in active session
  const showTopControls = session.phase !== 'role-select' && session.phase !== 'active';

  return (
    <div className="app">
      {showTopControls && (
        <div className="top-controls">
          <LanguageToggle disabled={false} />
          {session.phase !== 'consent' && session.phase !== 'profile-select' && (
            <button className="switch-user-btn" onClick={session.switchUser} title="Switch user">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Switch</span>
            </button>
          )}
          <button className="settings-gear-btn" onClick={session.openSettings} title="Settings">
            <Settings size={14} />
          </button>
          <ThemeToggle />
        </div>
      )}

      {/* Phase: Role Select */}
      {session.phase === 'role-select' && !session.userRole && (
        <RoleSelectScreen onSelect={session.selectRole} />
      )}

      {/* Doctor flow: Login */}
      {isDoctorFlow && !isDoctorAuthed && (
        <TherapistLogin
          onAuthenticate={session.handleDoctorAuth}
          onBack={session.goBack}
        />
      )}

      {/* Doctor flow: Dashboard (full screen) */}
      {isDoctorAuthed && session.authenticatedDoctor && (
        <TherapistDashboard
          onClose={session.handleDoctorLogout}
          doctorUsername={session.authenticatedDoctor.username}
          doctorDisplayName={session.authenticatedDoctor.displayName}
          onLogout={session.handleDoctorLogout}
        />
      )}

      {/* Phase: Consent */}
      {session.phase === 'consent' && (
        <ConsentScreen onAccept={session.acceptConsent} onBack={session.goBack} />
      )}

      {/* Phase: Profile Select */}
      {session.phase === 'profile-select' && (
        <ProfilePickerScreen
          onSelectProfile={session.selectProfile}
          onNewUser={session.startNewUserFlow}
          onBack={session.goBack}
        />
      )}

      {/* Phase: Concern Select */}
      {session.phase === 'concern-select' && (
        <SessionConcernPicker
          name={session.onboardingData?.preferredName ?? ''}
          onComplete={session.completeSessionConcerns}
          onSkip={session.skipSessionConcerns}
          onBack={session.goBack}
        />
      )}

      {/* Phase: Prior Session Picker */}
      {session.phase === 'prior-session' && (
        <PriorSessionPicker
          sessions={session.priorSessions}
          selectedConcerns={session.sessionConcerns}
          onSelect={session.selectPriorSession}
          onSkip={session.skipPriorSession}
          onBack={session.goBack}
        />
      )}

      {/* Phase: Onboarding */}
      {session.phase === 'onboarding' && (
        <OnboardingFlow
          onComplete={session.completeOnboarding}
          onSkip={session.skipOnboarding}
          onBack={session.goBack}
        />
      )}

      {/* Phase: Pre-Session Mood */}
      {session.phase === 'pre-mood' && (
        <MoodPicker context="pre-session" onSelect={session.selectPreMood} onBack={session.goBack} />
      )}

      {/* Phase: Pre-Session Assessment */}
      {session.phase === 'pre-assessment' && !session.viewingResults && (
        <AssessmentScreen
          config={session.selectedAssessment}
          timing="pre-session"
          onComplete={session.completePreAssessment}
          onSkip={session.skipPreAssessment}
          onBack={session.goBack}
        />
      )}

      {/* Pre-Assessment Results */}
      {session.phase === 'pre-assessment' && session.viewingResults && session.preAssessmentResult && (
        <AssessmentResults
          result={session.preAssessmentResult}
          config={session.selectedAssessment}
          previousResult={session.previousAssessmentResult}
          onContinue={session.confirmPreAssessmentResults}
        />
      )}

      {/* Phase: Mode Select */}
      {session.phase === 'mode-select' && (
        <ModeSelectScreen onSelect={session.selectMode} onBack={session.goBack} />
      )}

      {/* Phase: Ready */}
      {session.phase === 'ready' && (
        <div className="session-screen">
          <div className="session-header">
            <h1>Sukoon</h1>
            <p>
              {session.onboardingData?.preferredName && session.onboardingData.preferredName !== 'there'
                ? `Welcome, ${session.onboardingData.preferredName}. Ready when you are.`
                : 'Your safe space for supportive conversations'}
            </p>
            <span className="session-mode-badge">
              {session.sessionMode === 'chat' ? 'Chat Session' : 'Voice Session'}
            </span>
          </div>
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

          {/* Start + side actions in one row */}
          <div className="ready-actions">
            <button className="ready-side-btn" onClick={session.toggleExercisesPanel} title="Self-Guided Exercises">
              <Layers size={18} />
              <span>Exercises</span>
            </button>
            <SessionControls
              isActive={false}
              connectionStatus={session.connectionStatus}
              onStart={session.startSession}
              onEnd={session.endSession}
            />
            <button className="ready-side-btn" onClick={session.openHistory} title="Past Sessions">
              <History size={18} />
              <span>History</span>
            </button>
          </div>

          <div className="ready-secondary-actions">
            <button className="ready-side-btn" onClick={session.openProgress} title="Your Progress">
              <BarChart3 size={18} />
              <span>Progress</span>
            </button>
          </div>
        </div>
      )}

      {/* Phase: Active Session — Voice */}
      {session.phase === 'active' && session.sessionMode === 'voice' && (
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

      {/* Phase: Active Session — Chat */}
      {session.phase === 'active' && session.sessionMode === 'chat' && (
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
      {session.phase === 'post-mood' && (
        <MoodPicker
          context="post-session"
          title="How are you feeling after your session?"
          onSelect={session.selectPostMood}
        />
      )}

      {/* Phase: Summary */}
      {session.phase === 'summary' && session.sessionSummary && (
        <SessionSummaryScreen
          summary={session.sessionSummary}
          onSaveReflection={session.saveReflection}
          onNewSession={session.newSession}
          bookmarks={session.bookmarks}
          onToggleBookmark={session.toggleBookmark}
          onOpenHistory={session.openHistory}
        />
      )}

      {/* Phase: Ended (fallback if no summary) */}
      {session.phase === 'ended' && (
        <div className="session-screen">
          <div className="session-header">
            <h1>Session Complete</h1>
            <p>Thank you for taking this time for yourself.</p>
          </div>
          <button className="btn-primary" onClick={session.newSession}>New Session</button>
        </div>
      )}

      {/* Ambient sound during active voice session */}
      {session.phase === 'active' && session.sessionMode === 'voice' && session.ambientSound !== 'none' && (
        <AmbientSoundPlayer
          sound={session.ambientSound}
          isAiSpeaking={session.speakingState === 'ai-speaking'}
        />
      )}

      {/* Overlays */}
      {session.showHistory && (
        <HistoryScreen
          onClose={session.closeHistory}
          bookmarks={session.bookmarks}
          onToggleBookmark={session.toggleBookmark}
        />
      )}
      {session.showProgress && (
        <ProgressDashboard onClose={session.closeProgress} />
      )}
      {session.showTherapist && (
        <TherapistDashboard onClose={session.closeTherapist} />
      )}
      {session.showSettings && (
        <SettingsPanel
          onClose={session.closeSettings}
          onProfileUpdated={session.refreshProfile}
        />
      )}
      {session.crisisResources && (
        <CrisisModal resources={session.crisisResources} onDismiss={session.dismissCrisis} />
      )}
      {session.showExercisesPanel && (
        <ExercisesPanel
          onClose={session.toggleExercisesPanel}
          onSelectExercise={session.toggleExercise}
        />
      )}

      {/* Exercise overlays — one loop instead of 9 repeated blocks */}
      {Object.entries(EXERCISE_COMPONENTS).map(([id, ExComponent]) =>
        session.activeExercises[id] ? (
          <ExComponent key={id} onClose={() => handleExerciseClose(id)} />
        ) : null
      )}

      {session.errorMessage && <ErrorToast message={session.errorMessage} onDismiss={session.dismissError} />}
    </div>
  );
}

export default App;
