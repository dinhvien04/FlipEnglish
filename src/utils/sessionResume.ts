import { LearnResumeContext, ReviewResumeContext } from '../types/sessionResume';
import { ResolvedReviewItem, ReviewRating } from '../types/review';

export interface NormalizedLearnResume {
  currentIndex: number;
  hasCompletedAll: boolean;
}

export interface NormalizedReviewResume {
  activeQueue: ResolvedReviewItem[];
  currentIndex: number;
  ratingBreakdown: Record<ReviewRating, number>;
}

/**
 * Validates and normalizes Learn resume context against the active lesson and word count.
 * Rejects invalid lesson matches, NaN, Infinity, -Infinity, non-integers, and out-of-bounds indices.
 */
export function normalizeLearnResumeContext(
  resume: LearnResumeContext | null | undefined,
  targetLessonId: string,
  totalWords: number
): NormalizedLearnResume | null {
  if (!resume || typeof resume !== 'object') {
    return null;
  }

  if (typeof resume.lessonId !== 'string' || resume.lessonId !== targetLessonId) {
    return null;
  }

  if (typeof totalWords !== 'number' || !Number.isInteger(totalWords) || totalWords <= 0) {
    return null;
  }

  const { flashcardIndex, hasCompletedAll } = resume;

  if (
    typeof flashcardIndex !== 'number' ||
    !Number.isFinite(flashcardIndex) ||
    !Number.isInteger(flashcardIndex) ||
    flashcardIndex < 0 ||
    flashcardIndex >= totalWords
  ) {
    return null;
  }

  return {
    currentIndex: flashcardIndex,
    hasCompletedAll: typeof hasCompletedAll === 'boolean' ? hasCompletedAll : false,
  };
}

/**
 * Validates an active review item structure minimally to ensure it has valid word identifiers.
 */
function isValidResolvedReviewItem(item: any): item is ResolvedReviewItem {
  return (
    item &&
    typeof item === 'object' &&
    item.word &&
    typeof item.word === 'object' &&
    typeof item.word.id === 'string' &&
    item.word.id.trim().length > 0 &&
    typeof item.word.word === 'string' &&
    item.word.word.trim().length > 0
  );
}

/**
 * Validates a single rating count strictly: must be finite, integer, >= 0.
 * Rejects NaN, Infinity, -Infinity, negative numbers, non-integers.
 */
function isValidRatingCount(val: any): val is number {
  return typeof val === 'number' && Number.isFinite(val) && Number.isInteger(val) && val >= 0;
}

/**
 * Normalizes rating breakdown strictly.
 * If any rating count is invalid (NaN, Infinity, float, negative), resets to safe default { again: 0, hard: 0, good: 0, easy: 0 }.
 */
export function normalizeRatingBreakdown(
  breakdown: any
): Record<ReviewRating, number> {
  const safeDefault: Record<ReviewRating, number> = {
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };

  if (!breakdown || typeof breakdown !== 'object') {
    return safeDefault;
  }

  if (
    !isValidRatingCount(breakdown.again) ||
    !isValidRatingCount(breakdown.hard) ||
    !isValidRatingCount(breakdown.good) ||
    !isValidRatingCount(breakdown.easy)
  ) {
    return safeDefault;
  }

  return {
    again: breakdown.again,
    hard: breakdown.hard,
    good: breakdown.good,
    easy: breakdown.easy,
  };
}

/**
 * Validates and normalizes Review resume context.
 * Rejects invalid or empty queue, non-array queue, corrupt review items,
 * NaN/Infinity/float/out-of-bounds currentIndex.
 */
export function normalizeReviewResumeContext(
  resume: ReviewResumeContext | null | undefined
): NormalizedReviewResume | null {
  if (!resume || typeof resume !== 'object') {
    return null;
  }

  const { activeQueue, currentIndex, ratingBreakdown } = resume;

  if (!Array.isArray(activeQueue) || activeQueue.length === 0) {
    return null;
  }

  const allItemsValid = activeQueue.every(isValidResolvedReviewItem);
  if (!allItemsValid) {
    return null;
  }

  const total = activeQueue.length;

  if (
    typeof currentIndex !== 'number' ||
    !Number.isFinite(currentIndex) ||
    !Number.isInteger(currentIndex) ||
    currentIndex < 0 ||
    currentIndex >= total
  ) {
    return null;
  }

  const normalizedBreakdown = normalizeRatingBreakdown(ratingBreakdown);

  return {
    activeQueue,
    currentIndex,
    ratingBreakdown: normalizedBreakdown,
  };
}
