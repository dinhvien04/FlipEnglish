import { AppView } from './index';
import { ResolvedReviewItem, ReviewRating } from './review';

export interface LearnResumeContext {
  lessonId: string;
  flashcardIndex: number;
  hasCompletedAll: boolean;
  isReviewMistakesMode: boolean;
}

export interface ReviewResumeContext {
  activeQueue: ResolvedReviewItem[];
  currentIndex: number;
  ratingBreakdown: Record<ReviewRating, number>;
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
