import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, RotateCcw, ChevronRight } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface Scene {
  name: string;
  gradient: string;
  prompts: string[];
  promptDuration: number;
}

const SCENES: Scene[] = [
  {
    name: 'Peaceful Beach',
    gradient: 'linear-gradient(135deg, #0a3d62, #3c6382, #60a3bc, #f6b93b)',
    prompts: [
      'Close your eyes. Imagine yourself standing on a warm, sandy beach. Feel the soft sand beneath your feet.',
      'Listen to the gentle waves rolling in and out. Each wave washes away a little more tension from your body.',
      'The sun is warm on your skin — not too hot, just perfectly comfortable. A gentle breeze carries the scent of the ocean.',
      'Watch the horizon where the deep blue sea meets the sky. Notice how vast and peaceful it all feels.',
      'Take a deep breath of salty air. As you exhale, let go of anything that no longer serves you. You are at peace.',
    ],
    promptDuration: 15,
  },
  {
    name: 'Forest Walk',
    gradient: 'linear-gradient(135deg, #1e3c2b, #2d6a4f, #52b788, #b7e4c7)',
    prompts: [
      'Picture yourself on a quiet path through an ancient forest. Tall trees surround you, their leaves filtering golden sunlight.',
      'With each step, you hear a soft crunch of leaves underfoot. The air is cool, fresh, and smells of earth and pine.',
      'A small stream runs nearby. You can hear its gentle bubbling. Pause to listen — this is nature\'s lullaby.',
      'Sunbeams break through the canopy, creating dancing patterns of light on the forest floor. You feel safe here.',
      'Take a deep breath of the clean forest air. With each exhale, you release worry. The forest holds space for your peace.',
    ],
    promptDuration: 15,
  },
  {
    name: 'Mountain Meadow',
    gradient: 'linear-gradient(135deg, #4a6741, #87a878, #c9e4ca, #e8f5e9)',
    prompts: [
      'You are sitting in a meadow high in the mountains. Wildflowers of every colour sway gently around you.',
      'The air is crisp and clean. You can see snow-capped peaks in the distance, majestic and timeless.',
      'Butterflies dance among the flowers. A hawk circles high above, gliding effortlessly on warm air currents.',
      'Feel the cool mountain grass beneath you. The earth supports you completely. You have nowhere to be but here.',
      'Breathe in the pure mountain air. You are above the noise of daily life. Up here, everything is simple and clear.',
    ],
    promptDuration: 15,
  },
  {
    name: 'Starry Night',
    gradient: 'linear-gradient(135deg, #0d0d2b, #1a1a4e, #2e2e6e, #5b4a9e)',
    prompts: [
      'Imagine lying on soft grass on a warm summer night. Above you, the sky is filled with thousands of stars.',
      'Each star twinkles gently, like a distant candle. The Milky Way stretches across the sky like a river of light.',
      'The night is quiet and still. You feel small but connected — part of something infinitely beautiful and vast.',
      'A shooting star streaks across the sky. Make a wish for yourself — something kind, something healing.',
      'Breathe in the cool night air. The universe holds you gently. You are exactly where you need to be tonight.',
    ],
    promptDuration: 15,
  },
  {
    name: 'Healing Garden',
    gradient: 'linear-gradient(135deg, #4a2c6e, #7b4f9e, #c084fc, #e9d5ff)',
    prompts: [
      'You discover a hidden garden behind a vine-covered gate. Step inside — this garden was made for you.',
      'Flowers bloom in impossible colours. Their fragrance is sweet and comforting, like a warm embrace.',
      'A stone fountain in the centre pours crystal-clear water. The sound is soothing, rhythmic, healing.',
      'Find a comfortable bench in the garden. Sit down and let the beauty around you fill your heart with warmth.',
      'This garden represents your inner peace. It is always here, waiting for you. Breathe deeply and remember this place.',
    ],
    promptDuration: 15,
  },
];

export function MindfulVisualization({ onClose }: Props) {
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const scene = selectedScene !== null ? SCENES[selectedScene] : null;
  const totalPrompts = scene ? scene.prompts.length : 0;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!scene || done) return;
    clearTimer();
    setCountdown(scene.promptDuration);

    intervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (promptIndex < totalPrompts - 1) {
            setPromptIndex(i => i + 1);
          } else {
            setDone(true);
            clearTimer();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [scene, promptIndex, totalPrompts, done, clearTimer]);

  function selectScene(index: number) {
    setSelectedScene(index);
    setPromptIndex(0);
    setDone(false);
  }

  function handleRestart() {
    setSelectedScene(null);
    setPromptIndex(0);
    setDone(false);
  }

  const progress = scene ? ((promptIndex + 1) / totalPrompts) * 100 : 0;

  return (
    <div className="exercise-overlay">
      <div className="exercise-container visualization-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>

        <h2>Mindful Visualization</h2>

        {/* Scene selection */}
        {selectedScene === null && !done && (
          <div className="viz-scene-select">
            <p className="exercise-subtitle">Choose a calming scene to visualize. Each journey takes about 75 seconds.</p>
            <div className="viz-scene-grid">
              {SCENES.map((s, i) => (
                <button
                  key={i}
                  className="viz-scene-card"
                  style={{ background: s.gradient }}
                  onClick={() => selectScene(i)}
                >
                  <span className="viz-scene-name">{s.name}</span>
                  <ChevronRight size={16} className="viz-scene-arrow" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active visualization */}
        {scene && !done && (
          <div className="viz-active" style={{ background: scene.gradient }}>
            <div className="viz-progress">
              <div className="viz-progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <div className="viz-prompt-area">
              <p className="viz-prompt-text" key={promptIndex}>
                {scene.prompts[promptIndex]}
              </p>
            </div>

            <div className="viz-footer">
              <span className="viz-step-counter">
                {promptIndex + 1} / {totalPrompts}
              </span>
              <span className="viz-countdown">{countdown}s</span>
            </div>
          </div>
        )}

        {/* Done */}
        {done && (
          <div className="exercise-done">
            <h3>Visualization Complete</h3>
            <p>Gently bring your awareness back to your surroundings. Carry this sense of calm with you.</p>
            <div className="exercise-done-actions">
              <button className="btn-secondary" onClick={handleRestart}><RotateCcw size={16} /> Try Another</button>
              <button className="btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
