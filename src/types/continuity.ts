import { AppView, CEFRLevel } from './index';

export type NextActionPriority =
  | 'active-exam'
  | 'active-placement'
  | 'active-learn'
  | 'active-review'
  | 'due-review'
  | 'study-plan-task'
  | 'next-curriculum-lesson';

export interface NextActionRecommendation {
  priority: NextActionPriority;
  targetView: AppView;
  titleKey: string;
  subtitleKey: string;
  badgeKey: string;
  actionTextKey: string;
  actionPayload?: {
    lessonId?: string;
    level?: CEFRLevel;
    examMode?: string;
    stepIndex?: number;
    totalSteps?: number;
    dueCount?: number;
  };
  progressPercentage?: number;
  estimatedMinutes: number;
}

export interface ActiveSessionSummary {
  hasActiveExam: boolean;
  hasActivePlacement: boolean;
  hasActiveLearn: boolean;
  hasActiveReview: boolean;
  dueReviewCount: number;
}
