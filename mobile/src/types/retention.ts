export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string;
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
  dayOfWeek: number;
  time: string;
  enabled: boolean;
}

export interface RetentionData {
  profileId: string;
  streak: StreakData;
  milestones: Record<string, string | null>;
  schedule: ScheduleEntry[];
  lastReminderShown: string | null;
}
