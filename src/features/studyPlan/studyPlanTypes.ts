import { CEFRLevel } from '../../types';
import { ExamMode } from '../../types/exam';

export type StudyPlanTaskType =
  | 'placement'
  | 'review'
  | 'lesson'
  | 'quick-test';

export type StudyPlanTaskStatus =
  | 'pending'
  | 'completed'
  | 'skipped';

export type AllowedDailyMinutes = 5 | 10 | 15 | 20 | 30;

export const ALLOWED_DAILY_MINUTES: AllowedDailyMinutes[] = [5, 10, 15, 20, 30];
export const DEFAULT_DAILY_MINUTES: AllowedDailyMinutes = 15;

export interface StudyPlanTaskEvidence {
  // Review Evidence
  reviewedTodayBaseline?: number;
  reviewTargetCount?: number;

  // Lesson Evidence
  lessonId?: string;
  wasCompletedAtPlanCreation?: boolean;

  // Placement Evidence
  latestPlacementResultIdAtCreation?: string | null;

  // Quick Test Evidence
  examHistoryLatestIdAtCreation?: string | null;
  examLevel?: CEFRLevel;
  examMode?: ExamMode;
}

export interface StudyPlanTask {
  id: string;
  type: StudyPlanTaskType;
  title: string;
  description: string;
  reason: string;
  estimatedMinutes: number;
  status: StudyPlanTaskStatus;

  lessonId?: string;
  level?: CEFRLevel;
  reviewItemTarget?: number;

  createdAt: number;
  completedAt?: number;
  evidence?: StudyPlanTaskEvidence;
}

export interface TodayStudyPlan {
  schemaVersion: 1;
  id: string;
  localDate: string; // YYYY-MM-DD in local time
  dailyMinutes: AllowedDailyMinutes;
  planSeed: number;
  createdAt: number;
  updatedAt: number;
  tasks: StudyPlanTask[];
}

export interface StudyPlanSettings {
  schemaVersion: 1;
  dailyMinutes: AllowedDailyMinutes;
  createdAt: number;
  updatedAt: number;
}

export interface CompactStudyPlanHistoryItem {
  date: string; // YYYY-MM-DD
  plannedMinutes: number;
  taskCount: number;
  completedCount: number;
  skippedCount: number;
  completedAt: number;
}

export interface StudyPlanGoalUpdateResult {
  plan: TodayStudyPlan;
  appliedToToday: boolean;
  message?: string;
}

export interface StudyPlanContext {
  placement?: {
    estimatedLevel: CEFRLevel;
    recommendedLessonIds: string[];
    latestResultId?: string | null;
  };
  review: {
    dueCount: number;
    reviewedTodayCount: number;
  };
  lessons: {
    completedLessonIds: Set<string>;
    recentLessonIds: string[];
  };
  latestExam?: {
    level: CEFRLevel;
    mode?: ExamMode;
    latestId?: string | null;
  };
}
