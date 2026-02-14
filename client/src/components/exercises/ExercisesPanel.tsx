import { X, Wind, Eye, Dumbbell, BookOpen, Heart, Scan, Palette, Sparkles, HeartHandshake } from 'lucide-react';

interface ExercisesPanelProps {
  onClose: () => void;
  onSelectExercise: (exercise: string) => void;
}

const EXERCISES = [
  { id: 'breathing', title: 'Breathing Exercise', desc: 'Box breathing technique to calm your nervous system', icon: Wind },
  { id: 'grounding', title: '5-4-3-2-1 Grounding', desc: 'Sensory awareness to bring you back to the present', icon: Eye },
  { id: 'pmr', title: 'Muscle Relaxation', desc: 'Progressive relaxation through major muscle groups', icon: Dumbbell },
  { id: 'thoughtRecord', title: 'Thought Journal', desc: 'Reflective journaling to challenge negative thinking patterns', icon: BookOpen },
  { id: 'affirmations', title: 'Positive Affirmations', desc: 'Curated affirmations for self-worth and growth', icon: Heart },
  { id: 'bodyScan', title: 'Body Scan', desc: 'Guided meditation through each region of your body', icon: Scan },
  { id: 'visualization', title: 'Mindful Visualization', desc: 'Guided imagery through calming natural scenes', icon: Palette },
  { id: 'gratitude', title: 'Gratitude Journal', desc: 'Daily practice to rewire your brain towards positivity', icon: Sparkles },
  { id: 'selfCompassion', title: 'Self-Compassion Break', desc: "Kristin Neff's 3-step method for self-kindness", icon: HeartHandshake },
];

export function ExercisesPanel({ onClose, onSelectExercise }: ExercisesPanelProps) {
  return (
    <div className="exercises-panel-overlay" onClick={onClose}>
      <div className="exercises-panel" onClick={e => e.stopPropagation()}>
        <div className="exercises-panel-header">
          <h2>Self-Guided Exercises</h2>
          <p>Choose an exercise to practice on your own</p>
          <button className="exercise-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="exercises-grid">
          {EXERCISES.map(ex => (
            <button
              key={ex.id}
              className="exercise-card"
              onClick={() => {
                onSelectExercise(ex.id);
                onClose();
              }}
            >
              <div className="exercise-card-icon">
                <ex.icon size={24} />
              </div>
              <strong>{ex.title}</strong>
              <span>{ex.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
