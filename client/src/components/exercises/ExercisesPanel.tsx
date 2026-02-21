import { X, Wind, Eye, Dumbbell, BookOpen, Heart, Scan, Palette, Sparkles, HeartHandshake, CircleDot, Moon, Clock, LayoutGrid, Footprints } from 'lucide-react';

interface ExercisesPanelProps {
  onClose: () => void;
  onSelectExercise: (exercise: string) => void;
}

interface ExerciseItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number }>;
  category: 'mindfulness' | 'cognitive' | 'discovery';
}

const CATEGORY_LABELS: Record<string, string> = {
  mindfulness: 'Mindfulness & Relaxation',
  cognitive: 'Cognitive & Reflective',
  discovery: 'Self-Discovery',
};

const EXERCISES: ExerciseItem[] = [
  // Mindfulness & Relaxation
  { id: 'breathing', title: 'Breathing Exercise', desc: 'Box breathing technique to calm your nervous system', icon: Wind, category: 'mindfulness' },
  { id: 'grounding', title: '5-4-3-2-1 Grounding', desc: 'Sensory awareness to bring you back to the present', icon: Eye, category: 'mindfulness' },
  { id: 'pmr', title: 'Muscle Relaxation', desc: 'Progressive relaxation through major muscle groups', icon: Dumbbell, category: 'mindfulness' },
  { id: 'bodyScan', title: 'Body Scan', desc: 'Guided meditation through each region of your body', icon: Scan, category: 'mindfulness' },
  { id: 'visualization', title: 'Mindful Visualization', desc: 'Guided imagery through calming natural scenes', icon: Palette, category: 'mindfulness' },
  { id: 'selfCompassion', title: 'Self-Compassion Break', desc: "Kristin Neff's 3-step method for self-kindness", icon: HeartHandshake, category: 'mindfulness' },
  { id: 'mindfulWalking', title: 'Mindful Walking', desc: 'Guided walking meditation for grounding', icon: Footprints, category: 'mindfulness' },
  { id: 'sleepHygiene', title: 'Sleep Hygiene', desc: 'Evening wind-down routine checklist', icon: Moon, category: 'mindfulness' },

  // Cognitive & Reflective
  { id: 'thoughtRecord', title: 'Thought Journal', desc: 'Reflective journaling to challenge negative thinking patterns', icon: BookOpen, category: 'cognitive' },
  { id: 'affirmations', title: 'Positive Affirmations', desc: 'Curated affirmations for self-worth and growth', icon: Heart, category: 'cognitive' },
  { id: 'gratitude', title: 'Gratitude Journal', desc: 'Daily practice to rewire your brain towards positivity', icon: Sparkles, category: 'cognitive' },
  { id: 'worryTime', title: 'Worry Time', desc: 'Process worries in a structured, time-limited way', icon: Clock, category: 'cognitive' },

  // Self-Discovery
  { id: 'emotionWheel', title: 'Emotion Wheel', desc: 'Identify and name your emotions precisely', icon: CircleDot, category: 'discovery' },
  { id: 'valuesSort', title: 'Values Card Sort', desc: 'Discover your core values through sorting', icon: LayoutGrid, category: 'discovery' },
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

        <div className="exercises-panel-body">
          {(['mindfulness', 'cognitive', 'discovery'] as const).map(cat => {
            const items = EXERCISES.filter(e => e.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="exercises-category">
                <h3 className="exercises-category-title">{CATEGORY_LABELS[cat]}</h3>
                <div className="exercises-grid">
                  {items.map(ex => (
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
