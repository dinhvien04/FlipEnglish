import { STORAGE_KEYS, CONTINUITY_EVENTS } from '../../constants/storageKeys';
import { LearnerStreak } from '../../types/streak';
import { isValidLocalDateKey } from '../studyPlan/studyPlanEngine';
import {
  safeGetLocalStorage,
  safeSetLocalStorage,
} from '../../utils/storageHealth';

export const INITIAL_LEARNER_STREAK: LearnerStreak = {
  schemaVersion: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDateKey: null,
  totalMeaningfulDays: 0,
  updatedAt: Date.now(),
};

function emitStreakUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CONTINUITY_EVENTS.STREAK_UPDATED));
  }
}

/**
 * Validates untrusted LearnerStreak from localStorage with strict runtime bounds.
 */
export function validateLearnerStreak(data: unknown): data is LearnerStreak {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  const candidate = data as Record<string, unknown>;

  if (candidate.schemaVersion !== 1) return false;

  if (
    typeof candidate.currentStreak !== 'number' ||
    !Number.isInteger(candidate.currentStreak) ||
    candidate.currentStreak < 0 ||
    candidate.currentStreak > 100000
  ) {
    return false;
  }

  if (
    typeof candidate.longestStreak !== 'number' ||
    !Number.isInteger(candidate.longestStreak) ||
    candidate.longestStreak < 0 ||
    candidate.longestStreak > 100000 ||
    candidate.longestStreak < candidate.currentStreak
  ) {
    return false;
  }

  if (candidate.lastActiveDateKey !== null) {
    if (
      typeof candidate.lastActiveDateKey !== 'string' ||
      !isValidLocalDateKey(candidate.lastActiveDateKey)
    ) {
      return false;
    }
  }

  if (
    typeof candidate.totalMeaningfulDays !== 'number' ||
    !Number.isInteger(candidate.totalMeaningfulDays) ||
    candidate.totalMeaningfulDays < 0 ||
    candidate.totalMeaningfulDays > 100000
  ) {
    return false;
  }

  if (
    typeof candidate.updatedAt !== 'number' ||
    !Number.isFinite(candidate.updatedAt) ||
    candidate.updatedAt <= 0 ||
    candidate.updatedAt > Date.now() + 86400000
  ) {
    return false;
  }

  return true;
}

/**
 * Loads the current LearnerStreak from localStorage with schema validation and fallback resilience.
 */
export function getStoredLearnerStreak(): LearnerStreak {
  if (typeof window === 'undefined') {
    return { ...INITIAL_LEARNER_STREAK, updatedAt: Date.now() };
  }

  try {
    const raw = safeGetLocalStorage(STORAGE_KEYS.STREAK);
    if (!raw) {
      return { ...INITIAL_LEARNER_STREAK, updatedAt: Date.now() };
    }

    const parsed = JSON.parse(raw);
    if (validateLearnerStreak(parsed)) {
      return parsed;
    }

    console.warn('[StreakStorage] Invalid streak data in localStorage, falling back to initial state');
    return { ...INITIAL_LEARNER_STREAK, updatedAt: Date.now() };
  } catch (err) {
    console.warn('[StreakStorage] Failed to parse streak from localStorage:', err);
    return { ...INITIAL_LEARNER_STREAK, updatedAt: Date.now() };
  }
}

/**
 * Saves LearnerStreak to localStorage and dispatches CONTINUITY_EVENTS.STREAK_UPDATED.
 */
export function saveLearnerStreak(streak: LearnerStreak): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (!validateLearnerStreak(streak)) {
      console.warn('[StreakStorage] Attempted to save invalid LearnerStreak payload:', streak);
      return false;
    }

    safeSetLocalStorage(STORAGE_KEYS.STREAK, JSON.stringify(streak));
    emitStreakUpdate();
    return true;
  } catch (err) {
    console.warn('[StreakStorage] Failed to save streak to localStorage:', err);
    return false;
  }
}
