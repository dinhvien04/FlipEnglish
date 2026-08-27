import { AllowedDailyMinutes } from '../features/studyPlan/studyPlanTypes';

export interface ActiveTimeRecord {
  schemaVersion: 1;
  localDate: string; // YYYY-MM-DD local time
  activeSeconds: number;
  lastHeartbeatAt: number;
  updatedAt: number;
}

export interface ProgressSnapshotData {
  estimatedLevel: string;
  currentStreak: number;
  longestStreak: number;
  activeMinutesToday: number;
  dailyGoalMinutes: AllowedDailyMinutes;
  dueReviewCount: number;
  totalMasteredWords: number;
  totalWordsLearned: number;
}
