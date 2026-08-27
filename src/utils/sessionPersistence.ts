import { LearnResumeContext, ReviewResumeContext } from '../types/sessionResume';
import { STORAGE_KEYS, CONTINUITY_EVENTS } from '../constants/storageKeys';
import { getLessonById } from '../data/lessons';
import { normalizeLearnResumeContext, normalizeReviewResumeContext } from './sessionResume';

/**
 * Validates and retrieves the active Learn session from localStorage.
 * If invalid or expired/corrupted, cleans up storage and returns null.
 */
export function getActiveLearnSession(): LearnResumeContext | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LEARN_SESSION_ACTIVE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      localStorage.removeItem(STORAGE_KEYS.LEARN_SESSION_ACTIVE);
      return null;
    }
    if (typeof parsed.lessonId !== 'string' || !parsed.lessonId.trim()) {
      localStorage.removeItem(STORAGE_KEYS.LEARN_SESSION_ACTIVE);
      return null;
    }
    const lesson = getLessonById(parsed.lessonId);
    if (!lesson) {
      localStorage.removeItem(STORAGE_KEYS.LEARN_SESSION_ACTIVE);
      return null;
    }
    const totalWords = lesson.words.length;
    const normalized = normalizeLearnResumeContext(parsed, parsed.lessonId, totalWords);
    if (!normalized) {
      localStorage.removeItem(STORAGE_KEYS.LEARN_SESSION_ACTIVE);
      return null;
    }
    return {
      schemaVersion: 1,
      lessonId: parsed.lessonId,
      flashcardIndex: normalized.currentIndex,
      hasCompletedAll: normalized.hasCompletedAll,
      isReviewMistakesMode: Boolean(parsed.isReviewMistakesMode),
      totalWords,
      timestamp: typeof parsed.timestamp === 'number' && Number.isFinite(parsed.timestamp) ? parsed.timestamp : Date.now(),
    };
  } catch (err) {
    try {
      localStorage.removeItem(STORAGE_KEYS.LEARN_SESSION_ACTIVE);
    } catch {}
    return null;
  }
}

/**
 * Saves the active Learn session to localStorage.
 */
export function saveActiveLearnSession(context: LearnResumeContext): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    const lesson = getLessonById(context.lessonId);
    if (!lesson) return;
    const normalized = normalizeLearnResumeContext(context, context.lessonId, lesson.words.length);
    if (!normalized) return;

    const payload: LearnResumeContext = {
      schemaVersion: 1,
      lessonId: context.lessonId,
      flashcardIndex: normalized.currentIndex,
      hasCompletedAll: normalized.hasCompletedAll,
      isReviewMistakesMode: Boolean(context.isReviewMistakesMode),
      totalWords: lesson.words.length,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.LEARN_SESSION_ACTIVE, JSON.stringify(payload));
    window.dispatchEvent(new Event(CONTINUITY_EVENTS.SESSION_UPDATED));
  } catch (err) {
    // Storage full or quota exceeded
  }
}

/**
 * Clears the active Learn session from localStorage.
 */
export function clearActiveLearnSession(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEYS.LEARN_SESSION_ACTIVE);
    window.dispatchEvent(new Event(CONTINUITY_EVENTS.SESSION_UPDATED));
  } catch (err) {}
}

/**
 * Validates and retrieves the active Review session from localStorage.
 * If invalid or corrupted, cleans up storage and returns null.
 */
export function getActiveReviewSession(): ReviewResumeContext | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REVIEW_SESSION_ACTIVE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      localStorage.removeItem(STORAGE_KEYS.REVIEW_SESSION_ACTIVE);
      return null;
    }
    const normalized = normalizeReviewResumeContext(parsed);
    if (!normalized) {
      localStorage.removeItem(STORAGE_KEYS.REVIEW_SESSION_ACTIVE);
      return null;
    }
    return {
      schemaVersion: 1,
      activeQueue: normalized.activeQueue,
      currentIndex: normalized.currentIndex,
      ratingBreakdown: normalized.ratingBreakdown,
      timestamp: typeof parsed.timestamp === 'number' && Number.isFinite(parsed.timestamp) ? parsed.timestamp : Date.now(),
    };
  } catch (err) {
    try {
      localStorage.removeItem(STORAGE_KEYS.REVIEW_SESSION_ACTIVE);
    } catch {}
    return null;
  }
}

/**
 * Saves the active Review session to localStorage.
 */
export function saveActiveReviewSession(context: ReviewResumeContext): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    const normalized = normalizeReviewResumeContext(context);
    if (!normalized) return;

    const payload: ReviewResumeContext = {
      schemaVersion: 1,
      activeQueue: normalized.activeQueue,
      currentIndex: normalized.currentIndex,
      ratingBreakdown: normalized.ratingBreakdown,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.REVIEW_SESSION_ACTIVE, JSON.stringify(payload));
    window.dispatchEvent(new Event(CONTINUITY_EVENTS.SESSION_UPDATED));
  } catch (err) {
    // Storage full or quota exceeded
  }
}

/**
 * Clears the active Review session from localStorage.
 */
export function clearActiveReviewSession(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEYS.REVIEW_SESSION_ACTIVE);
    window.dispatchEvent(new Event(CONTINUITY_EVENTS.SESSION_UPDATED));
  } catch (err) {}
}
