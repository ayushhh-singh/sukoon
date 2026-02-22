import React from 'react';
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

interface PatientExercisesProps {
  activeExercises: Record<string, boolean>;
  onToggleExercise: (id: string) => void;
}

export function PatientExercises({ activeExercises, onToggleExercise }: PatientExercisesProps) {
  return (
    <div className="patient-tab-content">
      <ExercisesPanel
        onClose={() => {}}
        onSelectExercise={onToggleExercise}
        isInline={true}
      />

      {/* Exercise overlays */}
      {Object.entries(EXERCISE_COMPONENTS).map(([id, ExComponent]) =>
        activeExercises[id] ? (
          <ExComponent key={id} onClose={() => onToggleExercise(id)} />
        ) : null
      )}
    </div>
  );
}
