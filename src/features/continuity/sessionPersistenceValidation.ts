import { LearnResumeContext, ReviewResumeContext } from '../../types/sessionResume';
import { CEFRLevel, PartOfSpeech } from '../../types';
import { ReviewRating, ReviewStatus } from '../../types/review';

/**
 * Maximum session age before it is considered stale and discarded (24 hours).
 */
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const VALID_CEFR_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export const VALID_REVIEW_RATINGS = new Set(['again', 'hard', 'good', 'easy']);
export const VALID_REVIEW_STATUSES = new Set(['learning', 'review', 'mastered']);

/**
 * Validates a VocabWord structure in Review items.
 */
function isValidVocabWord(raw: any): boolean {
  if (!raw || typeof raw !== 'object') return false;
  if (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 100) return false;
  if (typeof raw.word !== 'string' || !raw.word.trim() || raw.word.length > 100) return false;
  if (typeof raw.meaning !== 'string' || !raw.meaning.trim() || raw.meaning.length > 500) return false;
  if (raw.level && !VALID_CEFR_LEVELS.has(raw.level)) return false;
  return true;
}

/**
 * Validates a Lesson structure in Review items.
 */
function isValidLesson(raw: any): boolean {
  if (!raw || typeof raw !== 'object') return false;
  if (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 100) return false;
  if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 200) return false;
  if (!VALID_CEFR_LEVELS.has(raw.level)) return false;
  return true;
}

/**
 * Validates a ReviewItemState in ResolvedReviewItem.
 */
function isValidReviewItemState(raw: any): boolean {
  if (!raw || typeof raw !== 'object') return false;
  if (typeof raw.itemId !== 'string' || !raw.itemId.trim() || raw.itemId.length > 100) return false;
  if (!VALID_REVIEW_STATUSES.has(raw.status)) return false;
  if (typeof raw.firstSeenAt !== 'number' || !Number.isFinite(raw.firstSeenAt) || raw.firstSeenAt <= 0) return false;
  if (raw.lastReviewedAt !== null && (typeof raw.lastReviewedAt !== 'number' || !Number.isFinite(raw.lastReviewedAt) || raw.lastReviewedAt <= 0)) return false;
  if (typeof raw.nextReviewAt !== 'number' || !Number.isFinite(raw.nextReviewAt) || raw.nextReviewAt <= 0) return false;
  if (typeof raw.intervalMinutes !== 'number' || !Number.isFinite(raw.intervalMinutes) || raw.intervalMinutes < 0) return false;
  if (typeof raw.reviewCount !== 'number' || !Number.isInteger(raw.reviewCount) || raw.reviewCount < 0) return false;
  if (typeof raw.correctCount !== 'number' || !Number.isInteger(raw.correctCount) || raw.correctCount < 0) return false;
  if (typeof raw.lapseCount !== 'number' || !Number.isInteger(raw.lapseCount) || raw.lapseCount < 0) return false;
  if (typeof raw.correctStreak !== 'number' || !Number.isInteger(raw.correctStreak) || raw.correctStreak < 0) return false;
  if (raw.lastRating !== null && !VALID_REVIEW_RATINGS.has(raw.lastRating)) return false;
  return true;
}

/**
 * Validates ResolvedReviewItem.
 */
function isValidResolvedReviewItem(raw: any): boolean {
  if (!raw || typeof raw !== 'object') return false;
  if (!isValidReviewItemState(raw.state)) return false;
  if (!isValidVocabWord(raw.word)) return false;
  if (!isValidLesson(raw.lesson)) return false;
  if (!VALID_CEFR_LEVELS.has(raw.level)) return false;
  if (typeof raw.isOverdue !== 'boolean') return false;
  if (!raw.nextIntervals || typeof raw.nextIntervals !== 'object') return false;
  const { again, hard, good, easy } = raw.nextIntervals;
  if (typeof again !== 'number' || !Number.isFinite(again) || again < 0) return false;
  if (typeof hard !== 'number' || !Number.isFinite(hard) || hard < 0) return false;
  if (typeof good !== 'number' || !Number.isFinite(good) || good < 0) return false;
  if (typeof easy !== 'number' || !Number.isFinite(easy) || easy < 0) return false;
  return true;
}

/**
 * Validates rating breakdown.
 */
function isValidRatingBreakdown(raw: any): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const keys: (keyof Record<ReviewRating, number>)[] = ['again', 'hard', 'good', 'easy'];
  for (const k of keys) {
    if (typeof raw[k] !== 'number' || !Number.isInteger(raw[k]) || raw[k] < 0) return false;
  }
  return true;
}

/**
 * Checks whether a timestamp is stale (older than maxAgeMs or in the far future > 24h).
 */
export function isSessionStale(
  timestamp: number | undefined | null,
  now: number = Date.now(),
  maxAgeMs: number = SESSION_MAX_AGE_MS
): boolean {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) {
    return false; // If unversioned/missing timestamp, do not eagerly discard unless explicitly validated
  }
  if (now - timestamp > maxAgeMs) {
    return true;
  }
  if (timestamp - now > maxAgeMs) {
    return true;
  }
  return false;
}

/**
 * Validates untrusted localStorage data as a valid, non-stale LearnResumeContext.
 */
export function validateLearnResumeContext(
  data: unknown,
  now: number = Date.now()
): LearnResumeContext | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, any>;

  if (typeof raw.lessonId !== 'string' || !raw.lessonId.trim() || raw.lessonId.length > 100) {
    return null;
  }

  if (typeof raw.flashcardIndex !== 'number' || !Number.isInteger(raw.flashcardIndex) || raw.flashcardIndex < 0) {
    return null;
  }

  if (typeof raw.hasCompletedAll !== 'boolean' || typeof raw.isReviewMistakesMode !== 'boolean') {
    return null;
  }

  if (raw.timestamp !== undefined) {
    if (typeof raw.timestamp !== 'number' || !Number.isFinite(raw.timestamp) || raw.timestamp <= 0) {
      return null;
    }
    if (isSessionStale(raw.timestamp, now)) {
      return null;
    }
  }

  if (raw.totalWords !== undefined) {
    if (typeof raw.totalWords !== 'number' || !Number.isInteger(raw.totalWords) || raw.totalWords <= 0) {
      return null;
    }
    if (raw.flashcardIndex >= raw.totalWords) {
      return null;
    }
  }

  return {
    schemaVersion: 1,
    lessonId: raw.lessonId.trim(),
    flashcardIndex: raw.flashcardIndex,
    hasCompletedAll: raw.hasCompletedAll,
    isReviewMistakesMode: raw.isReviewMistakesMode,
    totalWords: raw.totalWords,
    timestamp: raw.timestamp,
  };
}

/**
 * Validates untrusted localStorage data as a valid, non-stale ReviewResumeContext.
 */
export function validateReviewResumeContext(
  data: unknown,
  now: number = Date.now()
): ReviewResumeContext | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, any>;

  if (!Array.isArray(raw.activeQueue) || raw.activeQueue.length === 0 || raw.activeQueue.length > 100) {
    return null;
  }

  for (const item of raw.activeQueue) {
    if (!isValidResolvedReviewItem(item)) {
      return null;
    }
  }

  if (typeof raw.currentIndex !== 'number' || !Number.isInteger(raw.currentIndex) || raw.currentIndex < 0) {
    return null;
  }

  if (raw.currentIndex >= raw.activeQueue.length) {
    return null;
  }

  if (!isValidRatingBreakdown(raw.ratingBreakdown)) {
    return null;
  }

  if (raw.timestamp !== undefined) {
    if (typeof raw.timestamp !== 'number' || !Number.isFinite(raw.timestamp) || raw.timestamp <= 0) {
      return null;
    }
    if (isSessionStale(raw.timestamp, now)) {
      return null;
    }
  }

  return {
    schemaVersion: 1,
    activeQueue: raw.activeQueue,
    currentIndex: raw.currentIndex,
    ratingBreakdown: raw.ratingBreakdown,
    timestamp: raw.timestamp,
  };
}
