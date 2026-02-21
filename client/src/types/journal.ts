export interface JournalEntry {
  id: string;
  profileId: string;
  date: string;
  title: string;
  content: string;
  moodTag?: string;
  moodLabel?: string;
  tags: string[];
  templateUsed?: string;
}

export interface JournalTemplate {
  id: string;
  name: string;
  prompts: string[];
}

export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    id: 'free',
    name: 'Free Write',
    prompts: [],
  },
  {
    id: 'daily-checkin',
    name: 'Daily Check-in',
    prompts: [
      'How am I feeling right now?',
      'What was the highlight of my day?',
      'What challenged me today?',
      'What am I looking forward to?',
    ],
  },
  {
    id: 'emotional',
    name: 'Emotional Processing',
    prompts: [
      'What emotion am I experiencing most strongly?',
      'What triggered this feeling?',
      'Where do I feel it in my body?',
      'What would I say to a friend feeling this way?',
    ],
  },
  {
    id: 'growth',
    name: 'Gratitude & Growth',
    prompts: [
      'Three things I am grateful for today...',
      'Something I learned about myself recently...',
      'A small step I took toward my goals...',
      'Something kind I did for myself or others...',
    ],
  },
];
