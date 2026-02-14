import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Heart, ChevronLeft, ChevronRight, Wind, Mic } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface Affirmation {
  text: string;
  category: string;
}

const STORAGE_KEY = 'sukoon_favorite_affirmations';
const STREAK_KEY = 'sukoon_affirmation_streak';

const AFFIRMATIONS: Affirmation[] = [
  // Self-Worth
  { text: 'I am enough, exactly as I am right now.', category: 'Self-Worth' },
  { text: 'I deserve love, kindness, and respect.', category: 'Self-Worth' },
  { text: 'My feelings are valid and worthy of attention.', category: 'Self-Worth' },
  { text: 'I am not defined by my mistakes.', category: 'Self-Worth' },
  { text: 'I bring unique value to the world around me.', category: 'Self-Worth' },
  { text: 'I am worthy of taking up space and being heard.', category: 'Self-Worth' },
  { text: 'I accept myself fully, flaws and all.', category: 'Self-Worth' },
  // Anxiety Relief
  { text: 'This feeling is temporary. It will pass.', category: 'Anxiety Relief' },
  { text: 'I can handle uncertainty, one moment at a time.', category: 'Anxiety Relief' },
  { text: 'I choose to release what I cannot control.', category: 'Anxiety Relief' },
  { text: 'I am safe in this present moment.', category: 'Anxiety Relief' },
  { text: 'My anxiety does not define my reality.', category: 'Anxiety Relief' },
  { text: 'I give myself permission to slow down and breathe.', category: 'Anxiety Relief' },
  { text: 'I trust myself to handle whatever comes my way.', category: 'Anxiety Relief' },
  // Strength
  { text: 'I have survived difficult days before and I will again.', category: 'Strength' },
  { text: 'I am stronger than the challenges I face.', category: 'Strength' },
  { text: 'Every step forward, no matter how small, is progress.', category: 'Strength' },
  { text: 'I have the courage to ask for help when I need it.', category: 'Strength' },
  { text: 'I choose to face my fears with compassion for myself.', category: 'Strength' },
  { text: 'My struggles are shaping me into a wiser person.', category: 'Strength' },
  { text: 'I am resilient, and I bounce back from setbacks.', category: 'Strength' },
  // Growth
  { text: 'I am growing, even when it doesn\'t feel like it.', category: 'Growth' },
  { text: 'Healing is not linear, and that\'s okay.', category: 'Growth' },
  { text: 'I give myself permission to learn at my own pace.', category: 'Growth' },
  { text: 'Today I choose progress over perfection.', category: 'Growth' },
  { text: 'I am becoming the person I want to be, one day at a time.', category: 'Growth' },
  { text: 'Every experience teaches me something valuable.', category: 'Growth' },
  { text: 'I celebrate my small wins — they matter.', category: 'Growth' },
];

const CATEGORIES = ['All', 'Self-Worth', 'Anxiety Relief', 'Strength', 'Growth', 'Favorites'];

const CATEGORY_GRADIENTS: Record<string, string> = {
  'Self-Worth': 'linear-gradient(135deg, rgba(155, 109, 255, 0.12), rgba(77, 217, 192, 0.08))',
  'Anxiety Relief': 'linear-gradient(135deg, rgba(77, 217, 192, 0.12), rgba(94, 224, 138, 0.08))',
  'Strength': 'linear-gradient(135deg, rgba(255, 179, 71, 0.12), rgba(255, 107, 138, 0.08))',
  'Growth': 'linear-gradient(135deg, rgba(94, 224, 138, 0.12), rgba(155, 109, 255, 0.08))',
};

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(favorites: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
}

function getStreak(): { count: number; lastDate: string } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lastDate: '' };
  } catch {
    return { count: 0, lastDate: '' };
  }
}

function updateStreak() {
  const today = new Date().toISOString().split('T')[0];
  const streak = getStreak();
  if (streak.lastDate === today) return streak.count;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
  localStorage.setItem(STREAK_KEY, JSON.stringify({ count: newCount, lastDate: today }));
  return newCount;
}

export function PositiveAffirmations({ onClose }: Props) {
  const [category, setCategory] = useState('All');
  const [index, setIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [streak, setStreak] = useState(getStreak().count);

  // Swipe state
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  // Breathe & Reflect mode
  const [breatheMode, setBreatheMode] = useState(false);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breatheCountdown, setBreatheCountdown] = useState(0);
  const breatheRef = useRef<number | null>(null);

  // Speak Aloud mode
  const [speakTimer, setSpeakTimer] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakRef = useRef<number | null>(null);

  const filtered = category === 'Favorites'
    ? AFFIRMATIONS.filter(a => favorites.has(a.text))
    : category === 'All'
      ? AFFIRMATIONS
      : AFFIRMATIONS.filter(a => a.category === category);

  useEffect(() => {
    setIndex(0);
  }, [category]);

  // Update streak on mount
  useEffect(() => {
    setStreak(updateStreak());
  }, []);

  const current = filtered[index];

  function toggleFavorite(text: string) {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(text)) {
        next.delete(text);
      } else {
        next.add(text);
      }
      saveFavorites(next);
      return next;
    });
  }

  const navigateNext = useCallback(() => {
    if (filtered.length === 0) return;
    if (breatheMode) {
      startBreathe(() => setIndex(prev => (prev + 1) % filtered.length));
    } else {
      setIndex(prev => (prev + 1) % filtered.length);
    }
  }, [filtered.length, breatheMode]);

  const navigatePrev = useCallback(() => {
    if (filtered.length === 0) return;
    setIndex(prev => (prev - 1 + filtered.length) % filtered.length);
  }, [filtered.length]);

  // Breathe pause
  function startBreathe(onComplete: () => void) {
    setIsBreathing(true);
    setBreatheCountdown(5);
    if (breatheRef.current) clearInterval(breatheRef.current);
    breatheRef.current = window.setInterval(() => {
      setBreatheCountdown(prev => {
        if (prev <= 1) {
          if (breatheRef.current) clearInterval(breatheRef.current);
          setIsBreathing(false);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Speak aloud
  function startSpeakAloud() {
    setIsSpeaking(true);
    setSpeakTimer(10);
    if (speakRef.current) clearInterval(speakRef.current);
    speakRef.current = window.setInterval(() => {
      setSpeakTimer(prev => {
        if (prev <= 1) {
          if (speakRef.current) clearInterval(speakRef.current);
          setIsSpeaking(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (breatheRef.current) clearInterval(breatheRef.current);
      if (speakRef.current) clearInterval(speakRef.current);
    };
  }, []);

  // Swipe handlers
  function handlePointerDown(e: React.PointerEvent) {
    setIsDragging(true);
    startXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    setDragX(e.clientX - startXRef.current);
  }

  function handlePointerUp() {
    if (Math.abs(dragX) > 80) {
      if (dragX > 0) navigatePrev();
      else navigateNext();
    }
    setDragX(0);
    setIsDragging(false);
  }

  const cardGradient = current ? (CATEGORY_GRADIENTS[current.category] || undefined) : undefined;

  // Speak aloud progress
  const speakProgress = isSpeaking ? ((10 - speakTimer) / 10) * 100 : 0;
  const speakCircumference = 2 * Math.PI * 20;
  const speakDashOffset = speakCircumference * (1 - speakProgress / 100);

  return (
    <div className="exercise-overlay">
      <div className="exercise-container">
        <button className="exercise-close" onClick={onClose}><X size={20} /></button>

        <h2>Positive Affirmations</h2>

        {/* Streak badge */}
        {streak > 0 && (
          <div className="affirmation-streak-badge">
            {streak} day{streak > 1 ? 's' : ''} streak
          </div>
        )}

        <p className="exercise-subtitle">Swipe or tap arrows to browse. Reflect on each one.</p>

        {/* Mode toggles */}
        <div className="affirmation-modes">
          <button
            className={`affirmation-mode-btn ${breatheMode ? 'active' : ''}`}
            onClick={() => setBreatheMode(p => !p)}
          >
            <Wind size={14} /> Breathe & Reflect
          </button>
        </div>

        {/* Category tabs */}
        <div className="affirmation-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`affirmation-tab ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}{cat === 'Favorites' ? ` (${favorites.size})` : ''}
            </button>
          ))}
        </div>

        {/* Breathing pause overlay */}
        {isBreathing && (
          <div className="affirmation-breathing-pause">
            <div className="breathing-pause-circle" />
            <p className="breathing-pause-text">Take a deep breath...</p>
            <span className="breathing-pause-countdown">{breatheCountdown}</span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="affirmation-empty">
            <p>No favorites yet. Tap the heart icon to save affirmations you connect with.</p>
          </div>
        ) : current && !isBreathing && (
          <>
            {/* Card */}
            <div
              className="affirmation-card-display"
              key={`${category}-${index}`}
              style={{
                background: cardGradient,
                transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease',
                touchAction: 'pan-y',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <span className="affirmation-category-tag">{current.category}</span>
              <p className="affirmation-text">{current.text}</p>
              <div className="affirmation-card-actions">
                <button
                  className={`affirmation-heart ${favorites.has(current.text) ? 'favorited' : ''}`}
                  onClick={() => toggleFavorite(current.text)}
                >
                  <Heart size={22} fill={favorites.has(current.text) ? 'var(--rose)' : 'none'} />
                </button>
                {!isSpeaking && (
                  <button className="affirmation-speak-btn" onClick={startSpeakAloud}>
                    <Mic size={18} /> Say it aloud
                  </button>
                )}
              </div>
            </div>

            {/* Speak aloud timer */}
            {isSpeaking && (
              <div className="affirmation-speak-prompt">
                <svg className="speak-ring" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="var(--surface)" strokeWidth="3" />
                  <circle
                    cx="24" cy="24" r="20" fill="none" stroke="var(--accent-primary)" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={speakCircumference}
                    strokeDashoffset={speakDashOffset}
                    style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                  />
                </svg>
                <Mic size={16} className="speak-mic-icon" />
                <span className="speak-timer-text">{speakTimer}s — Repeat it out loud</span>
              </div>
            )}

            {/* Navigation */}
            <div className="affirmation-nav">
              <button className="btn-secondary" onClick={navigatePrev}><ChevronLeft size={18} /></button>
              <span className="affirmation-counter">{index + 1} / {filtered.length}</span>
              <button className="btn-secondary" onClick={navigateNext}><ChevronRight size={18} /></button>
            </div>
          </>
        )}

        <button className="btn-primary affirmation-done-btn" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
