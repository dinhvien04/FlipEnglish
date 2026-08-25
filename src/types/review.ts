import { CEFRLevel, VocabWord, Lesson } from './index';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type ReviewStatus = 'learning' | 'review' | 'mastered';

export interface ReviewItemState {
  itemId: string;
  status: ReviewStatus;
  firstSeenAt: number;
  lastReviewedAt: number | null;
  nextReviewAt: number;
  intervalMinutes: number;
  reviewCount: number;
  correctCount: number;
  lapseCount: number;
  correctStreak: number;
  lastRating: ReviewRating | null;
}

export interface ReviewLogEntry {
  itemId: string;
  reviewedAt: number;
  rating: ReviewRating;
}

export interface ReviewStorage {
  schemaVersion: 1;
  items: Record<string, ReviewItemState>;
  recentLogs?: ReviewLogEntry[];
}

export interface ResolvedReviewItem {
  state: ReviewItemState;
  word: VocabWord;
  lesson: Lesson;
  level: CEFRLevel;
  isOverdue: boolean;
  nextIntervals: Record<ReviewRating, number>; // preview interval in minutes for each rating
}

export interface ReviewDashboardStats {
  dueCount: number;
  learningCount: number;
  reviewCount: number;
  masteredCount: number;
  totalTracked: number;
  reviewedTodayCount: number;
  dueTomorrowCount: number;
  dueNext7DaysCount: number;
  recentAccuracy: number | null; // percentage 0-100
}

export interface ReviewSessionSummary {
  totalReviewed: number;
  ratingBreakdown: Record<ReviewRating, number>;
  reviewedItems: ResolvedReviewItem[];
  finishedAt: number;
}
