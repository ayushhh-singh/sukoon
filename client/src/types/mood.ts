export interface MoodEntry {
  id: string;
  timestamp: string;
  value: number;
  label: string;
  emoji: string;
  context: 'pre-session' | 'post-session' | 'standalone';
  sessionId?: string;
}

export const MOOD_OPTIONS: { value: number; label: string; emoji: string; color: string }[] = [
  { value: 1, label: 'Very Low', emoji: '😔', color: '#ef4444' },
  { value: 2, label: 'Low', emoji: '😟', color: '#f97316' },
  { value: 3, label: 'Neutral', emoji: '😐', color: '#eab308' },
  { value: 4, label: 'Good', emoji: '🙂', color: '#22c55e' },
  { value: 5, label: 'Great', emoji: '😊', color: '#10b981' },
];
