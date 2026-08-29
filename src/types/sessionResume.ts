import { AppView } from './index';
import { ResolvedReviewItem, ReviewRating } from './review';

export interface LearnResumeContext {
  schemaVersion?: 1;
  lessonId: string;
  flashcardIndex: number;
  hasCompletedAll: boolean;
  isReviewMistakesMode: boolean;
  totalWords?: number;
  timestamp?: number;
}

export interface ReviewResumeContext {
  schemaVersion?: 1;
  activeQueue: ResolvedReviewItem[];
  currentIndex: number;
  ratingBreakdown: Record<ReviewRating, number>;
  hasCompleted?: boolean;
  timestamp?: number;
}

export type DictionaryReturnContext =
  | {
      source: 'learn';
      view: 'learn';
      learnContext: LearnResumeContext;
    }
  | {
      source: 'review';
      view: 'review';
      reviewContext: ReviewResumeContext;
    }
  | {
      source: 'view';
      view: AppView;
    };
