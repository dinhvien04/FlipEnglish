import { LearnResumeContext, ReviewResumeContext } from '../../types/sessionResume';
import { CEFRLevel, LearningItemType, PartOfSpeech } from '../../types';
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

export const VALID_LEARNING_ITEM_TYPES = new Set<string>([
  'word',
  'phrase',
  'collocation',
  'phrasalVerb',
  'idiom',
  'wordFamily',
  'synonymSet',
  'nuanceSet',
  'registerPair',
]);

export const VALID_PARTS_OF_SPEECH = new Set<string>([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrase',
  'preposition',
  'conjunction',
  'idiom',
  'collocation',
  'phrasal verb',
]);

export const VALID_REGISTERS = new Set<string>(['informal', 'neutral', 'formal']);

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
 * Validates and deeply sanitizes a VocabWord structure in Review items.
 * Reconstructs all valid metadata fields (context, collocations, synonyms, nuance, register, etc.).
 */
export function sanitizeVocabWord(raw: any): VocabWord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!hasOnlyAllowedKeys(raw, ALLOWED_VOCAB_WORD_KEYS)) return null;

  // Required core identifiers & content
  if (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 100) return null;
  if (typeof raw.word !== 'string' || !raw.word.trim() || raw.word.length > 100) return null;
  if (typeof raw.meaning !== 'string' || !raw.meaning.trim() || raw.meaning.length > 500) return null;

  // Optional string and enum metadata validation
  if (raw.type !== undefined && (typeof raw.type !== 'string' || !VALID_LEARNING_ITEM_TYPES.has(raw.type))) return null;
  if (raw.expression !== undefined && (typeof raw.expression !== 'string' || raw.expression.length > 200)) return null;
  if (raw.pronunciation !== undefined && (typeof raw.pronunciation !== 'string' || raw.pronunciation.length > 100)) return null;
  if (raw.partOfSpeech !== undefined && (typeof raw.partOfSpeech !== 'string' || !VALID_PARTS_OF_SPEECH.has(raw.partOfSpeech))) return null;
  if (raw.level !== undefined && (typeof raw.level !== 'string' || !VALID_CEFR_LEVELS.has(raw.level))) return null;
  if (raw.example !== undefined && (typeof raw.example !== 'string' || raw.example.length > 500)) return null;
  if (raw.exampleTranslation !== undefined && (typeof raw.exampleTranslation !== 'string' || raw.exampleTranslation.length > 500)) return null;
  if (raw.context !== undefined && (typeof raw.context !== 'string' || raw.context.length > 1000)) return null;
  if (raw.imageUrl !== undefined && (typeof raw.imageUrl !== 'string' || raw.imageUrl.length > 500)) return null;
  if (raw.imageAlt !== undefined && (typeof raw.imageAlt !== 'string' || raw.imageAlt.length > 500)) return null;
  if (raw.visualQuizEligible !== undefined && typeof raw.visualQuizEligible !== 'boolean') return null;
  if (raw.emoji !== undefined && (typeof raw.emoji !== 'string' || raw.emoji.length > 20)) return null;
  if (raw.definition !== undefined && (typeof raw.definition !== 'string' || raw.definition.length > 1000)) return null;

  // Array fields validation
  if (raw.collocations !== undefined) {
    if (!Array.isArray(raw.collocations) || raw.collocations.length > 30 || raw.collocations.some((c: any) => typeof c !== 'string' || c.length > 150)) {
      return null;
    }
  }
  if (raw.synonyms !== undefined) {
    if (!Array.isArray(raw.synonyms) || raw.synonyms.length > 30 || raw.synonyms.some((s: any) => typeof s !== 'string' || s.length > 100)) {
      return null;
    }
  }
  if (raw.antonyms !== undefined) {
    if (!Array.isArray(raw.antonyms) || raw.antonyms.length > 30 || raw.antonyms.some((a: any) => typeof a !== 'string' || a.length > 100)) {
      return null;
    }
  }
  if (raw.wordFamily !== undefined) {
    if (!Array.isArray(raw.wordFamily) || raw.wordFamily.length > 30 || raw.wordFamily.some((w: any) => typeof w !== 'string' || w.length > 100)) {
      return null;
    }
  }
  if (raw.register !== undefined && (typeof raw.register !== 'string' || !VALID_REGISTERS.has(raw.register))) return null;
  if (raw.usageNote !== undefined && (typeof raw.usageNote !== 'string' || raw.usageNote.length > 1000)) return null;
  if (raw.nuanceNote !== undefined && (typeof raw.nuanceNote !== 'string' || raw.nuanceNote.length > 1000)) return null;
  if (raw.nuance !== undefined && (typeof raw.nuance !== 'string' || raw.nuance.length > 1000)) return null;
  if (raw.items !== undefined) {
    if (!Array.isArray(raw.items) || raw.items.length > 30 || raw.items.some((it: any) => typeof it !== 'string' || it.length > 150)) {
      return null;
    }
  }
  if (raw.pattern !== undefined && (typeof raw.pattern !== 'string' || raw.pattern.length > 300)) return null;
  if (raw.promptWord !== undefined && (typeof raw.promptWord !== 'string' || raw.promptWord.length > 100)) return null;
  if (raw.tags !== undefined) {
    if (!Array.isArray(raw.tags) || raw.tags.length > 30 || raw.tags.some((t: any) => typeof t !== 'string' || t.length > 50)) {
      return null;
    }
  }

  // Reconstruct cleanly preserving all valid supported fields
  const result: VocabWord = {
    id: raw.id.trim(),
    word: raw.word.trim(),
    meaning: raw.meaning.trim(),
    example: typeof raw.example === 'string' ? raw.example.trim() : '',
  };

  if (raw.type !== undefined) result.type = raw.type as LearningItemType;
  if (raw.expression !== undefined) result.expression = raw.expression.trim();
  if (raw.pronunciation !== undefined) result.pronunciation = raw.pronunciation.trim();
  if (raw.partOfSpeech !== undefined) result.partOfSpeech = raw.partOfSpeech as PartOfSpeech;
  if (raw.level !== undefined) result.level = raw.level as CEFRLevel;
  if (raw.exampleTranslation !== undefined) result.exampleTranslation = raw.exampleTranslation.trim();
  if (raw.context !== undefined) result.context = raw.context.trim();
  if (raw.imageUrl !== undefined) result.imageUrl = raw.imageUrl;
  if (raw.imageAlt !== undefined) result.imageAlt = raw.imageAlt.trim();
  if (raw.visualQuizEligible !== undefined) result.visualQuizEligible = raw.visualQuizEligible;
  if (raw.emoji !== undefined) result.emoji = raw.emoji.trim();
  if (raw.definition !== undefined) result.definition = raw.definition.trim();
  if (raw.collocations !== undefined) result.collocations = raw.collocations.map((s: string) => s.trim());
  if (raw.synonyms !== undefined) result.synonyms = raw.synonyms.map((s: string) => s.trim());
  if (raw.antonyms !== undefined) result.antonyms = raw.antonyms.map((s: string) => s.trim());
  if (raw.wordFamily !== undefined) result.wordFamily = raw.wordFamily.map((s: string) => s.trim());
  if (raw.register !== undefined) result.register = raw.register as 'informal' | 'neutral' | 'formal';
  if (raw.usageNote !== undefined) result.usageNote = raw.usageNote.trim();
  if (raw.nuanceNote !== undefined) result.nuanceNote = raw.nuanceNote.trim();
  if (raw.nuance !== undefined) result.nuance = raw.nuance.trim();
  if (raw.items !== undefined) result.items = raw.items.map((s: string) => s.trim());
  if (raw.pattern !== undefined) result.pattern = raw.pattern.trim();
  if (raw.promptWord !== undefined) result.promptWord = raw.promptWord.trim();
  if (raw.tags !== undefined) result.tags = raw.tags.map((s: string) => s.trim());

  return result;
}

/**
 * Validates and deeply sanitizes a Lesson structure in Review items.
 * Reconstructs all valid metadata fields (imageAlt, icon, badgeText, tags, words).
 */
export function sanitizeLesson(raw: any): Lesson | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!hasOnlyAllowedKeys(raw, ALLOWED_LESSON_KEYS)) return null;

  if (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 100) return null;
  if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 200) return null;
  if (!VALID_CEFR_LEVELS.has(raw.level)) return null;

  if (raw.levelTitle !== undefined && (typeof raw.levelTitle !== 'string' || raw.levelTitle.length > 200)) return null;
  if (raw.description !== undefined && (typeof raw.description !== 'string' || raw.description.length > 1000)) return null;
  if (raw.category !== undefined && (typeof raw.category !== 'string' || raw.category.length > 100)) return null;
  if (raw.imageUrl !== undefined && (typeof raw.imageUrl !== 'string' || raw.imageUrl.length > 500)) return null;
  if (raw.imageAlt !== undefined && (typeof raw.imageAlt !== 'string' || raw.imageAlt.length > 500)) return null;
  if (raw.icon !== undefined && (typeof raw.icon !== 'string' || raw.icon.length > 100)) return null;
  if (raw.badgeText !== undefined && (typeof raw.badgeText !== 'string' || raw.badgeText.length > 100)) return null;

  if (raw.tags !== undefined) {
    if (!Array.isArray(raw.tags) || raw.tags.length > 30 || raw.tags.some((t: any) => typeof t !== 'string' || t.length > 50)) {
      return null;
    }
  }

  const sanitizedWords: VocabWord[] = [];
  if (raw.words !== undefined) {
    if (!Array.isArray(raw.words) || raw.words.length > 100) return null;
    for (const w of raw.words) {
      const sanitizedW = sanitizeVocabWord(w);
      if (!sanitizedW) return null;
      sanitizedWords.push(sanitizedW);
    }
  }

  const result: Lesson = {
    id: raw.id.trim(),
    title: raw.title.trim(),
    level: raw.level as CEFRLevel,
    levelTitle: typeof raw.levelTitle === 'string' ? raw.levelTitle.trim() : '',
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    category: typeof raw.category === 'string' ? raw.category.trim() : 'General',
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : '',
    words: sanitizedWords,
  };

  if (raw.imageAlt !== undefined) result.imageAlt = raw.imageAlt.trim();
  if (raw.icon !== undefined) result.icon = raw.icon.trim();
  if (raw.badgeText !== undefined) result.badgeText = raw.badgeText.trim();
  if (raw.tags !== undefined) result.tags = raw.tags.map((t: string) => t.trim());

  return result;
}

/**
 * Validates and sanitizes a ReviewItemState in ResolvedReviewItem.
 */
export function sanitizeReviewItemState(raw: any): ReviewItemState | null {
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
export function sanitizeResolvedReviewItem(raw: any): ResolvedReviewItem | null {
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
export function sanitizeRatingBreakdown(raw: any): Record<ReviewRating, number> | null {
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
