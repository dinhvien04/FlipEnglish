export interface LearnerStreak {
  schemaVersion: 1;
  currentStreak: number;
  longestStreak: number;
  lastActiveDateKey: string | null; // YYYY-MM-DD local time
  totalMeaningfulDays: number;
  updatedAt: number;
}

export type MeaningfulLearningEventType =
  | 'quiz_completed'
  | 'review_batch_completed'
  | 'placement_stage_completed'
  | 'exam_submitted'
  | 'lesson_flashcards_completed';

export interface MeaningfulLearningEvent {
  type: MeaningfulLearningEventType;
  timestamp: number;
  metadata?: {
    lessonId?: string;
    score?: number;
    itemsCount?: number;
    level?: string;
  };
}

export interface StreakEvaluationResult {
  streak: LearnerStreak;
  isNewActiveDay: boolean;
  streakIncremented: boolean;
}
