import type { MilestoneDefinition } from '../types/retention';

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  { id: 'first-session', title: 'First Step', description: 'Completed your first session', icon: 'Sparkles' },
  { id: 'streak-3', title: 'On a Roll', description: '3-day streak', icon: 'Flame' },
  { id: 'streak-7', title: 'One Week Strong', description: '7-day streak', icon: 'Trophy' },
  { id: 'streak-14', title: 'Two Weeks In', description: '14-day streak', icon: 'Star' },
  { id: 'streak-30', title: 'Monthly Master', description: '30-day streak', icon: 'Crown' },
  { id: 'sessions-5', title: 'Getting Started', description: '5 sessions completed', icon: 'Target' },
  { id: 'sessions-10', title: 'Committed', description: '10 sessions completed', icon: 'Award' },
  { id: 'sessions-25', title: 'Dedicated', description: '25 sessions completed', icon: 'Medal' },
  { id: 'first-assessment', title: 'Self-Aware', description: 'Completed first assessment', icon: 'ClipboardCheck' },
  { id: 'mood-improved', title: 'Brighter Day', description: 'Mood improved after a session', icon: 'Sun' },
  { id: 'reflection-written', title: 'Reflective', description: 'Wrote your first reflection', icon: 'PenLine' },
];
