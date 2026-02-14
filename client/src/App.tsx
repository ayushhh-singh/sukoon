import { useSession } from './hooks/useSession';
import { ConsentScreen } from './components/ConsentScreen';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { MoodPicker } from './components/mood/MoodPicker';
import { AssessmentScreen } from './components/assessments/AssessmentScreen';
import { AssessmentResults } from './components/assessments/AssessmentResults';
import { VoiceOrb } from './components/VoiceOrb';
import { StatusBar } from './components/StatusBar';
import { SessionTimer } from './components/session/SessionTimer';
import { Transcript } from './components/Transcript';
import { SessionControls } from './components/SessionControls';
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
import { HistoryScreen } from './components/history/HistoryScreen';
import { Layers, History, Volume2 } from 'lucide-react';
import type { AmbientSound } from './types/session';
import './App.css';

function App() {
  const session = useSession();

  function handleSelectExercise(id: string) {
    const toggleMap: Record<string, () => void> = {
      breathing: session.toggleBreathing,
      grounding: session.toggleGrounding,
      pmr: session.togglePMR,
      thoughtRecord: session.toggleThoughtRecord,
      affirmations: session.toggleAffirmations,
      bodyScan: session.toggleBodyScan,
      visualization: session.toggleVisualization,
      gratitude: session.toggleGratitude,
      selfCompassion: session.toggleSelfCompassion,
    };
    toggleMap[id]?.();
  }

  // When an exercise closes (via X or the "Continue" done button), re-open
  // the exercises menu so the user isn't left staring at a blank screen.
  function makeExerciseCloseHandler(toggleFn: () => void) {
    return () => {
      toggleFn();
      if (!session.showExercisesPanel) {
        session.toggleExercisesPanel();
      }
    };
  }

  return (
    <div className="app">
      <ThemeToggle />

      {/* Phase: Consent */}
      {session.phase === 'consent' && (
        <ConsentScreen onAccept={session.acceptConsent} />
      )}

      {/* Phase: Onboarding */}
      {session.phase === 'onboarding' && (
        <OnboardingFlow
          onComplete={session.completeOnboarding}
          onSkip={session.skipOnboarding}
        />
      )}

      {/* Phase: Pre-Session Mood */}
      {session.phase === 'pre-mood' && (
        <MoodPicker context="pre-session" onSelect={session.selectPreMood} />
      )}

      {/* Phase: Pre-Session Assessment */}
      {session.phase === 'pre-assessment' && !session.viewingResults && (
        <AssessmentScreen
          config={session.selectedAssessment}
          timing="pre-session"
          onComplete={session.completePreAssessment}
          onSkip={session.skipPreAssessment}
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
          </div>
          <VoiceOrb speakingState="idle" micVolume={0} aiVolume={0} />

          {/* Session goal input */}
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

          {/* Ambient sound selector */}
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

          <SessionControls
            isActive={false}
            connectionStatus={session.connectionStatus}
            onStart={session.startSession}
            onEnd={session.endSession}
          />
          <div className="ready-bottom-row">
            <button className="exercises-toggle" onClick={session.toggleExercisesPanel}>
              <Layers size={16} /> Self-Guided Exercises
            </button>
            <button className="history-toggle" onClick={session.openHistory}>
              <History size={16} /> Past Sessions
            </button>
          </div>
        </div>
      )}

      {/* Phase: Active Session */}
      {session.phase === 'active' && (
        <div className="session-screen active">
          <div className="active-status-row">
            <StatusBar status={session.connectionStatus} sessionId={null} />
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
            onStart={session.startSession}
            onEnd={session.endSession}
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

      {/* Ambient sound during active session */}
      {session.phase === 'active' && session.ambientSound !== 'none' && (
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
      {crisisResources()}
      {session.showExercisesPanel && (
        <ExercisesPanel
          onClose={session.toggleExercisesPanel}
          onSelectExercise={handleSelectExercise}
        />
      )}
      {session.showBreathing && <BreathingExercise onClose={makeExerciseCloseHandler(session.toggleBreathing)} />}
      {session.showGrounding && <GroundingExercise onClose={makeExerciseCloseHandler(session.toggleGrounding)} />}
      {session.showPMR && <ProgressiveMuscleRelaxation onClose={makeExerciseCloseHandler(session.togglePMR)} />}
      {session.showThoughtRecord && <ThoughtRecord onClose={makeExerciseCloseHandler(session.toggleThoughtRecord)} />}
      {session.showAffirmations && <PositiveAffirmations onClose={makeExerciseCloseHandler(session.toggleAffirmations)} />}
      {session.showBodyScan && <BodyScanMeditation onClose={makeExerciseCloseHandler(session.toggleBodyScan)} />}
      {session.showVisualization && <MindfulVisualization onClose={makeExerciseCloseHandler(session.toggleVisualization)} />}
      {session.showGratitude && <GratitudeJournal onClose={makeExerciseCloseHandler(session.toggleGratitude)} />}
      {session.showSelfCompassion && <SelfCompassionBreak onClose={makeExerciseCloseHandler(session.toggleSelfCompassion)} />}
      {session.errorMessage && <ErrorToast message={session.errorMessage} onDismiss={session.dismissError} />}
    </div>
  );

  function crisisResources() {
    if (!session.crisisResources) return null;
    return <CrisisModal resources={session.crisisResources} onDismiss={session.dismissCrisis} />;
  }
}

export default App;
