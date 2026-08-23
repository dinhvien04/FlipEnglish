import { ReviewItemState, ReviewRating, ReviewStatus } from '../types/review';

// ==========================================
// Spaced Repetition Scheduler Constants
// ==========================================
export const MIN_INTERVAL_MINUTES = 10; // 10 minutes
export const MAX_INTERVAL_MINUTES = 365 * 24 * 60; // 525,600 minutes (365 days)

export const INTERVAL_10_MIN_MINUTES = 10;
export const INTERVAL_1_DAY_MINUTES = 1440; // 24 * 60
export const INTERVAL_3_DAYS_MINUTES = 4320; // 3 * 1440
export const INTERVAL_7_DAYS_MINUTES = 10080; // 7 * 1440
export const INTERVAL_30_DAYS_MINUTES = 43200; // 30 * 1440 (Mastered threshold)

export const MASTERED_MIN_STREAK = 4;
export const MASTERED_MIN_INTERVAL_MINUTES = INTERVAL_30_DAYS_MINUTES;

/**
 * Bounds an interval in minutes between 10 minutes and 365 days.
 */
export function clampInterval(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < MIN_INTERVAL_MINUTES) {
    return MIN_INTERVAL_MINUTES;
  }
  if (minutes > MAX_INTERVAL_MINUTES) {
    return MAX_INTERVAL_MINUTES;
  }
  return Math.round(minutes);
}

/**
 * Determines the ReviewStatus based on streak, interval, and lapse state.
 */
export function determineStatus(intervalMinutes: number, correctStreak: number): ReviewStatus {
  if (correctStreak >= MASTERED_MIN_STREAK && intervalMinutes >= MASTERED_MIN_INTERVAL_MINUTES) {
    return 'mastered';
  }
  if (intervalMinutes >= INTERVAL_3_DAYS_MINUTES && correctStreak >= 1) {
    return 'review';
  }
  return 'learning';
}

/**
 * Calculates the next interval in minutes for a given rating without mutating state.
 */
export function calculateNextInterval(state: ReviewItemState, rating: ReviewRating): number {
  const isFirstReview = state.reviewCount === 0 || state.lastReviewedAt === null;

  if (isFirstReview) {
    switch (rating) {
      case 'again':
        return INTERVAL_10_MIN_MINUTES;
      case 'hard':
        return INTERVAL_1_DAY_MINUTES;
      case 'good':
        return INTERVAL_3_DAYS_MINUTES;
      case 'easy':
        return INTERVAL_7_DAYS_MINUTES;
    }
  }

  // Subsequent reviews
  const currentInterval = clampInterval(state.intervalMinutes || INTERVAL_10_MIN_MINUTES);

  switch (rating) {
    case 'again':
      return INTERVAL_10_MIN_MINUTES;
    case 'hard':
      return clampInterval(Math.max(INTERVAL_1_DAY_MINUTES, Math.round(currentInterval * 1.3)));
    case 'good':
      return clampInterval(Math.max(INTERVAL_3_DAYS_MINUTES, Math.round(currentInterval * 2.2)));
    case 'easy':
      return clampInterval(Math.max(INTERVAL_7_DAYS_MINUTES, Math.round(currentInterval * 3.2)));
  }
}

/**
 * Pure function: Schedules a review rating and returns the next immutable state.
 */
export function scheduleReview(
  currentState: ReviewItemState,
  rating: ReviewRating,
  now: number = Date.now()
): ReviewItemState {
  const isCorrect = rating !== 'again';
  const newInterval = calculateNextInterval(currentState, rating);
  const newStreak = isCorrect ? currentState.correctStreak + 1 : 0;
  const newLapseCount = isCorrect ? currentState.lapseCount : currentState.lapseCount + 1;
  const newStatus = isCorrect ? determineStatus(newInterval, newStreak) : 'learning';

  const nextReviewAt = now + newInterval * 60 * 1000;

  return {
    itemId: currentState.itemId,
    status: newStatus,
    firstSeenAt: currentState.firstSeenAt || now,
    lastReviewedAt: now,
    nextReviewAt,
    intervalMinutes: newInterval,
    reviewCount: currentState.reviewCount + 1,
    correctCount: isCorrect ? currentState.correctCount + 1 : currentState.correctCount,
    lapseCount: newLapseCount,
    correctStreak: newStreak,
    lastRating: rating,
  };
}

/**
 * Pure function: Records a mistake signal from a quiz or exam without counting as a full rating session.
 */
export function recordMistakeSignal(
  currentState: ReviewItemState,
  now: number = Date.now()
): ReviewItemState {
  const newInterval = INTERVAL_10_MIN_MINUTES;
  const nextReviewAt = now + newInterval * 60 * 1000;

  return {
    ...currentState,
    status: 'learning',
    nextReviewAt,
    intervalMinutes: newInterval,
    lapseCount: currentState.lapseCount + 1,
    correctStreak: 0,
  };
}

/**
 * Pure factory function: Creates a new review item state.
 */
export function createInitialReviewState(
  itemId: string,
  now: number = Date.now(),
  initialDueOffsetMinutes: number = 0
): ReviewItemState {
  return {
    itemId,
    status: 'learning',
    firstSeenAt: now,
    lastReviewedAt: null,
    nextReviewAt: now + initialDueOffsetMinutes * 60 * 1000,
    intervalMinutes: INTERVAL_10_MIN_MINUTES,
    reviewCount: 0,
    correctCount: 0,
    lapseCount: 0,
    correctStreak: 0,
    lastRating: null,
  };
}

/**
 * Formats interval minutes into clean, concise human-readable text.
 * e.g. "10 min", "1 day", "3 days", "7 days", "14 days", "1 mo", "2 mos", "1 yr"
 */
export function formatIntervalHuman(minutes: number): string {
  const safeMin = clampInterval(minutes);

  if (safeMin < 60) {
    return `${safeMin} min`;
  }
  if (safeMin < 1440) {
    const hours = Math.round(safeMin / 60);
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  if (safeMin < 43200) {
    const days = Math.round(safeMin / 1440);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (safeMin < 525600) {
    const months = Math.round(safeMin / 43200);
    return `${months} mo${months > 1 ? 's' : ''}`;
  }
  return '1 yr';
}

/**
 * Formats future relative time distance from now.
 */
export function formatRelativeDueDate(targetTimestamp: number, now: number = Date.now()): string {
  const diffMs = targetTimestamp - now;
  if (diffMs <= 0) return 'Due now';

  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (diffMinutes < 60) return `in ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `in ${diffHours} hr${diffHours > 1 ? 's' : ''}`;

  const diffDays = Math.round(diffMinutes / 1440);
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 30) return `in ${diffDays} days`;

  const diffMonths = Math.round(diffDays / 30);
  return `in ${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
}
