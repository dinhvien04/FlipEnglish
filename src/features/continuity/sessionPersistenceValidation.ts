import { z } from 'zod';
import { LearnResumeContext, ReviewResumeContext } from '../../types/sessionResume';
import { CEFRLevel, PartOfSpeech } from '../../types';
import { ReviewRating, ReviewStatus } from '../../types/review';

/**
 * Maximum session age before it is considered stale and discarded (24 hours).
 */
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const VALID_CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const VALID_REVIEW_RATINGS = ['again', 'hard', 'good', 'easy'] as const;
export const VALID_REVIEW_STATUSES = ['learning', 'review', 'mastered'] as const;

/**
 * Zod schema for VocabWord sub-structure in Review items.
 */
export const VocabWordSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    type: z.string().max(50).optional(),
    word: z.string().trim().min(1).max(100),
    expression: z.string().max(200).optional(),
    pronunciation: z.string().max(100).optional(),
    meaning: z.string().trim().min(1).max(500),
    partOfSpeech: z.custom<PartOfSpeech>().optional(),
    level: z.enum(VALID_CEFR_LEVELS).optional(),
    example: z.string().max(1000).optional().default(''),
    exampleTranslation: z.string().max(1000).optional(),
    context: z.string().max(500).optional(),
    imageUrl: z.string().max(1000).optional(),
    imageAlt: z.string().max(200).optional(),
    visualQuizEligible: z.boolean().optional(),
    emoji: z.string().max(10).optional(),
    definition: z.string().max(1000).optional(),
    collocations: z.array(z.string().max(200)).max(20).optional(),
    synonyms: z.array(z.string().max(100)).max(20).optional(),
    antonyms: z.array(z.string().max(100)).max(20).optional(),
    wordFamily: z.array(z.string().max(100)).max(20).optional(),
    register: z.enum(['informal', 'neutral', 'formal']).optional(),
    usageNote: z.string().max(1000).optional(),
    nuanceNote: z.string().max(1000).optional(),
    nuance: z.string().max(1000).optional(),
    items: z.array(z.string().max(100)).max(20).optional(),
    pattern: z.string().max(200).optional(),
    promptWord: z.string().max(100).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  })
  .strict();

/**
 * Zod schema for Lesson sub-structure in Review items.
 */
export const LessonSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(200),
    level: z.enum(VALID_CEFR_LEVELS),
    levelTitle: z.string().max(200).optional().default(''),
    description: z.string().max(1000).optional().default(''),
    category: z.string().max(100).optional(),
    imageUrl: z.string().max(1000).optional(),
    imageAlt: z.string().max(200).optional(),
    icon: z.string().max(100).optional(),
    badgeText: z.string().max(100).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    words: z.array(z.any()).optional().default([]),
  })
  .strict();

/**
 * Zod schema for ReviewItemState in ResolvedReviewItem.
 */
export const ReviewItemStateSchema = z
  .object({
    itemId: z.string().trim().min(1).max(100),
    status: z.enum(VALID_REVIEW_STATUSES),
    firstSeenAt: z.number().finite().positive(),
    lastReviewedAt: z.number().finite().positive().nullable(),
    nextReviewAt: z.number().finite().positive(),
    intervalMinutes: z.number().finite().nonnegative(),
    reviewCount: z.number().int().min(0),
    correctCount: z.number().int().min(0),
    lapseCount: z.number().int().min(0),
    correctStreak: z.number().int().min(0),
    lastRating: z.enum(VALID_REVIEW_RATINGS).nullable(),
  })
  .strict();

/**
 * Zod schema for ResolvedReviewItem.
 */
export const ResolvedReviewItemSchema = z
  .object({
    state: ReviewItemStateSchema,
    word: VocabWordSchema,
    lesson: LessonSchema,
    level: z.enum(VALID_CEFR_LEVELS),
    isOverdue: z.boolean(),
    nextIntervals: z
      .object({
        again: z.number().finite().nonnegative(),
        hard: z.number().finite().nonnegative(),
        good: z.number().finite().nonnegative(),
        easy: z.number().finite().nonnegative(),
      })
      .strict(),
  })
  .strict();

/**
 * Zod schema for ReviewRating breakdown.
 */
export const RatingBreakdownSchema = z
  .object({
    again: z.number().int().min(0),
    hard: z.number().int().min(0),
    good: z.number().int().min(0),
    easy: z.number().int().min(0),
  })
  .strict();

/**
 * Zod schema for LearnResumeContext stored in localStorage.
 */
export const LearnResumeContextSchema = z
  .object({
    schemaVersion: z.literal(1).optional().default(1),
    lessonId: z.string().trim().min(1).max(100),
    flashcardIndex: z.number().int().min(0),
    hasCompletedAll: z.boolean(),
    isReviewMistakesMode: z.boolean(),
    totalWords: z.number().int().positive().optional(),
    timestamp: z.number().finite().positive().optional(),
  })
  .strict();

/**
 * Zod schema for ReviewResumeContext stored in localStorage.
 */
export const ReviewResumeContextSchema = z
  .object({
    schemaVersion: z.literal(1).optional().default(1),
    activeQueue: z.array(ResolvedReviewItemSchema).min(1).max(100),
    currentIndex: z.number().int().min(0),
    ratingBreakdown: RatingBreakdownSchema,
    timestamp: z.number().finite().positive().optional(),
  })
  .strict();

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
  // Stale if created more than maxAgeMs ago or future drifted by > 24 hours
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
  const result = LearnResumeContextSchema.safeParse(data);
  if (!result.success) {
    return null;
  }

  const parsed = result.data;

  // Stale check
  if (parsed.timestamp && isSessionStale(parsed.timestamp, now)) {
    return null;
  }

  // If totalWords is specified, flashcardIndex must be strictly within bounds
  if (
    typeof parsed.totalWords === 'number' &&
    parsed.totalWords > 0 &&
    parsed.flashcardIndex >= parsed.totalWords
  ) {
    return null;
  }

  return parsed as LearnResumeContext;
}

/**
 * Validates untrusted localStorage data as a valid, non-stale ReviewResumeContext.
 */
export function validateReviewResumeContext(
  data: unknown,
  now: number = Date.now()
): ReviewResumeContext | null {
  const result = ReviewResumeContextSchema.safeParse(data);
  if (!result.success) {
    return null;
  }

  const parsed = result.data;

  // Stale check
  if (parsed.timestamp && isSessionStale(parsed.timestamp, now)) {
    return null;
  }

  // currentIndex must be strictly within activeQueue bounds
  if (parsed.currentIndex >= parsed.activeQueue.length) {
    return null;
  }

  return parsed as unknown as ReviewResumeContext;
}
