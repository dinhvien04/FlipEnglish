import { LearnResumeContext, ReviewResumeContext } from '../../types/sessionResume';
import { CEFRLevel } from '../../types';
import { ReviewRating, ReviewStatus, ResolvedReviewItem, ReviewItemState } from '../../types/review';
import { VocabWord } from '../../types';
import { Lesson } from '../../types';

/**
 * Maximum session age before it is considered stale and discarded (24 hours).
 */
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const VALID_CEFR_LEVELS = new Set<string>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export const VALID_REVIEW_RATINGS = new Set<string>(['again', 'hard', 'good', 'easy']);
export const VALID_REVIEW_STATUSES = new Set<string>(['learning', 'review', 'mastered']);

const ALLOWED_LEARN_KEYS = new Set<string>([
  'schemaVersion',
  'lessonId',
  'flashcardIndex',
  'hasCompletedAll',
  'isReviewMistakesMode',
  'totalWords',
  'timestamp',
]);

const ALLOWED_REVIEW_KEYS = new Set<string>([
  'schemaVersion',
  'activeQueue',
  'currentIndex',
  'ratingBreakdown',
  'timestamp',
]);

const ALLOWED_RESOLVED_ITEM_KEYS = new Set<string>([
  'state',
  'word',
  'lesson',
  'level',
  'isOverdue',
  'nextIntervals',
]);

const ALLOWED_ITEM_STATE_KEYS = new Set<string>([
  'itemId',
  'status',
  'firstSeenAt',
  'lastReviewedAt',
  'nextReviewAt',
  'intervalMinutes',
  'reviewCount',
  'correctCount',
  'lapseCount',
  'correctStreak',
  'lastRating',
]);

const ALLOWED_VOCAB_WORD_KEYS = new Set<string>([
  'id',
  'type',
  'word',
  'expression',
  'pronunciation',
  'partOfSpeech',
  'meaning',
  'level',
  'example',
  'exampleTranslation',
  'context',
  'imageUrl',
  'imageAlt',
  'visualQuizEligible',
  'emoji',
  'definition',
  'collocations',
  'synonyms',
  'antonyms',
  'wordFamily',
  'register',
  'usageNote',
  'nuanceNote',
  'nuance',
  'items',
  'pattern',
  'promptWord',
  'tags',
]);

const ALLOWED_LESSON_KEYS = new Set<string>([
  'id',
  'title',
  'level',
  'levelTitle',
  'description',
  'category',
  'imageUrl',
  'imageAlt',
  'icon',
  'badgeText',
  'tags',
  'words',
]);

const ALLOWED_RATING_KEYS = new Set<string>(['again', 'hard', 'good', 'easy']);

function hasOnlyAllowedKeys(obj: Record<string, any>, allowed: Set<string>): boolean {
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) return false;
  }
  return true;
}

/**
 * Validates and sanitizes a VocabWord structure in Review items.
 */
function sanitizeVocabWord(raw: any): VocabWord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!hasOnlyAllowedKeys(raw, ALLOWED_VOCAB_WORD_KEYS)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 100) return null;
  if (typeof raw.word !== 'string' || !raw.word.trim() || raw.word.length > 100) return null;
  if (typeof raw.meaning !== 'string' || !raw.meaning.trim() || raw.meaning.length > 500) return null;
  if (raw.level && !VALID_CEFR_LEVELS.has(raw.level)) return null;
  if (raw.pronunciation !== undefined && (typeof raw.pronunciation !== 'string' || raw.pronunciation.length > 100)) return null;
  if (raw.partOfSpeech !== undefined && (typeof raw.partOfSpeech !== 'string' || raw.partOfSpeech.length > 50)) return null;
  if (raw.example !== undefined && (typeof raw.example !== 'string' || raw.example.length > 500)) return null;
  if (raw.exampleTranslation !== undefined && (typeof raw.exampleTranslation !== 'string' || raw.exampleTranslation.length > 500)) return null;
  if (raw.imageUrl !== undefined && (typeof raw.imageUrl !== 'string' || raw.imageUrl.length > 500)) return null;
  if (raw.collocations !== undefined && !Array.isArray(raw.collocations)) return null;

  return {
    id: raw.id.trim(),
    word: raw.word.trim(),
    pronunciation: typeof raw.pronunciation === 'string' ? raw.pronunciation.trim() : undefined,
    partOfSpeech: raw.partOfSpeech,
    meaning: raw.meaning.trim(),
    example: typeof raw.example === 'string' ? raw.example.trim() : '',
    exampleTranslation: typeof raw.exampleTranslation === 'string' ? raw.exampleTranslation.trim() : undefined,
    level: raw.level as CEFRLevel,
    imageUrl: raw.imageUrl,
    collocations: Array.isArray(raw.collocations) ? raw.collocations.map(String) : undefined,
  };
}

/**
 * Validates and sanitizes a Lesson structure in Review items.
 */
function sanitizeLesson(raw: any): Lesson | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!hasOnlyAllowedKeys(raw, ALLOWED_LESSON_KEYS)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 100) return null;
  if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 200) return null;
  if (!VALID_CEFR_LEVELS.has(raw.level)) return null;
  if (raw.levelTitle !== undefined && (typeof raw.levelTitle !== 'string' || raw.levelTitle.length > 200)) return null;
  if (raw.description !== undefined && (typeof raw.description !== 'string' || raw.description.length > 1000)) return null;
  if (raw.category !== undefined && (typeof raw.category !== 'string' || raw.category.length > 100)) return null;
  if (raw.imageUrl !== undefined && (typeof raw.imageUrl !== 'string' || raw.imageUrl.length > 500)) return null;

  return {
    id: raw.id.trim(),
    title: raw.title.trim(),
    levelTitle: typeof raw.levelTitle === 'string' ? raw.levelTitle.trim() : '',
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    level: raw.level as CEFRLevel,
    category: typeof raw.category === 'string' ? raw.category.trim() : 'General',
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : '',
    words: [],
  };
}

/**
 * Validates and sanitizes a ReviewItemState in ResolvedReviewItem.
 */
function sanitizeReviewItemState(raw: any): ReviewItemState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!hasOnlyAllowedKeys(raw, ALLOWED_ITEM_STATE_KEYS)) return null;
  if (typeof raw.itemId !== 'string' || !raw.itemId.trim() || raw.itemId.length > 100) return null;
  if (!VALID_REVIEW_STATUSES.has(raw.status)) return null;
  if (typeof raw.firstSeenAt !== 'number' || !Number.isFinite(raw.firstSeenAt) || raw.firstSeenAt <= 0) return null;
  if (raw.lastReviewedAt !== null && (typeof raw.lastReviewedAt !== 'number' || !Number.isFinite(raw.lastReviewedAt) || raw.lastReviewedAt <= 0)) return null;
  if (typeof raw.nextReviewAt !== 'number' || !Number.isFinite(raw.nextReviewAt) || raw.nextReviewAt <= 0) return null;
  if (typeof raw.intervalMinutes !== 'number' || !Number.isFinite(raw.intervalMinutes) || raw.intervalMinutes < 0) return null;
  if (typeof raw.reviewCount !== 'number' || !Number.isInteger(raw.reviewCount) || raw.reviewCount < 0) return null;
  if (typeof raw.correctCount !== 'number' || !Number.isInteger(raw.correctCount) || raw.correctCount < 0) return null;
  if (typeof raw.lapseCount !== 'number' || !Number.isInteger(raw.lapseCount) || raw.lapseCount < 0) return null;
  if (typeof raw.correctStreak !== 'number' || !Number.isInteger(raw.correctStreak) || raw.correctStreak < 0) return null;
  if (raw.lastRating !== null && !VALID_REVIEW_RATINGS.has(raw.lastRating)) return null;

  return {
    itemId: raw.itemId.trim(),
    status: raw.status as ReviewStatus,
    firstSeenAt: raw.firstSeenAt,
    lastReviewedAt: raw.lastReviewedAt,
    nextReviewAt: raw.nextReviewAt,
    intervalMinutes: raw.intervalMinutes,
    reviewCount: raw.reviewCount,
    correctCount: raw.correctCount,
    lapseCount: raw.lapseCount,
    correctStreak: raw.correctStreak,
    lastRating: raw.lastRating as ReviewRating | null,
  };
}

/**
 * Validates and sanitizes ResolvedReviewItem.
 */
function sanitizeResolvedReviewItem(raw: any): ResolvedReviewItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!hasOnlyAllowedKeys(raw, ALLOWED_RESOLVED_ITEM_KEYS)) return null;

  const state = sanitizeReviewItemState(raw.state);
  if (!state) return null;

  const word = sanitizeVocabWord(raw.word);
  if (!word) return null;

  const lesson = sanitizeLesson(raw.lesson);
  if (!lesson) return null;

  if (!VALID_CEFR_LEVELS.has(raw.level)) return null;
  if (typeof raw.isOverdue !== 'boolean') return null;
  if (!raw.nextIntervals || typeof raw.nextIntervals !== 'object' || Array.isArray(raw.nextIntervals)) return null;
  if (!hasOnlyAllowedKeys(raw.nextIntervals, ALLOWED_RATING_KEYS)) return null;

  const { again, hard, good, easy } = raw.nextIntervals;
  if (typeof again !== 'number' || !Number.isFinite(again) || again < 0) return null;
  if (typeof hard !== 'number' || !Number.isFinite(hard) || hard < 0) return null;
  if (typeof good !== 'number' || !Number.isFinite(good) || good < 0) return null;
  if (typeof easy !== 'number' || !Number.isFinite(easy) || easy < 0) return null;

  return {
    state,
    word,
    lesson,
    level: raw.level as CEFRLevel,
    isOverdue: raw.isOverdue,
    nextIntervals: { again, hard, good, easy },
  };
}

/**
 * Validates and sanitizes rating breakdown.
 */
function sanitizeRatingBreakdown(raw: any): Record<ReviewRating, number> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!hasOnlyAllowedKeys(raw, ALLOWED_RATING_KEYS)) return null;

  const again = raw.again;
  const hard = raw.hard;
  const good = raw.good;
  const easy = raw.easy;

  if (typeof again !== 'number' || !Number.isInteger(again) || again < 0) return null;
  if (typeof hard !== 'number' || !Number.isInteger(hard) || hard < 0) return null;
  if (typeof good !== 'number' || !Number.isInteger(good) || good < 0) return null;
  if (typeof easy !== 'number' || !Number.isInteger(easy) || easy < 0) return null;

  return { again, hard, good, easy };
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
 * Rejects unknown schema versions and constructs a clean sanitized object.
 */
export function validateLearnResumeContext(
  data: unknown,
  now: number = Date.now()
): LearnResumeContext | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const raw = data as Record<string, any>;

  if (!hasOnlyAllowedKeys(raw, ALLOWED_LEARN_KEYS)) return null;
  if (raw.schemaVersion !== undefined && raw.schemaVersion !== 1) return null;

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
 * Rejects unknown schema versions and deeply sanitizes activeQueue items and rating breakdown.
 */
export function validateReviewResumeContext(
  data: unknown,
  now: number = Date.now()
): ReviewResumeContext | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const raw = data as Record<string, any>;

  if (!hasOnlyAllowedKeys(raw, ALLOWED_REVIEW_KEYS)) return null;
  if (raw.schemaVersion !== undefined && raw.schemaVersion !== 1) return null;

  if (!Array.isArray(raw.activeQueue) || raw.activeQueue.length === 0 || raw.activeQueue.length > 100) {
    return null;
  }

  const sanitizedQueue: ResolvedReviewItem[] = [];
  for (const item of raw.activeQueue) {
    const sanitized = sanitizeResolvedReviewItem(item);
    if (!sanitized) {
      return null;
    }
    sanitizedQueue.push(sanitized);
  }

  if (typeof raw.currentIndex !== 'number' || !Number.isInteger(raw.currentIndex) || raw.currentIndex < 0) {
    return null;
  }

  if (raw.currentIndex >= sanitizedQueue.length) {
    return null;
  }

  const sanitizedRatings = sanitizeRatingBreakdown(raw.ratingBreakdown);
  if (!sanitizedRatings) {
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
    activeQueue: sanitizedQueue,
    currentIndex: raw.currentIndex,
    ratingBreakdown: sanitizedRatings,
    timestamp: raw.timestamp,
  };
}
