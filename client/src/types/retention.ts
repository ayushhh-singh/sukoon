export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string; // ISO date string (date only, e.g. "2026-02-20")
}

export type MilestoneId =
  | 'first-session'
  | 'streak-3'
  | 'streak-7'
  | 'streak-14'
  | 'streak-30'
  | 'sessions-5'
  | 'sessions-10'
  | 'sessions-25'
  | 'first-assessment'
  | 'mood-improved'
  | 'reflection-written';

export interface MilestoneDefinition {
  id: MilestoneId;
  title: string;
  description: string;
  icon: string;
}

export interface ScheduleEntry {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  time: string; // "HH:MM" in 24h format
  enabled: boolean;
}

export interface RetentionData {
  profileId: string;
  streak: StreakData;
  milestones: Record<string, string | null>; // milestoneId -> unlocked ISO timestamp or null
  schedule: ScheduleEntry[];
  lastReminderShown: string | null;
}
