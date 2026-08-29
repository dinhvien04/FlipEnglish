import { STORAGE_KEYS, CONTINUITY_EVENTS } from '../../constants/storageKeys';
import { LearnResumeContext, ReviewResumeContext } from '../../types/sessionResume';
import {
  validateLearnResumeContext,
  validateReviewResumeContext,
} from './sessionPersistenceValidation';
import {
  safeGetLocalStorage,
  safeSetLocalStorage,
  safeRemoveLocalStorage,
} from '../../utils/storageHealth';

/**
 * Dispatches a custom event indicating active session state was updated/cleared.
 */
function emitSessionUpdate(): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event(CONTINUITY_EVENTS.SESSION_UPDATED));
    } catch {
      // Ignore event dispatch errors in restricted environments
    }
  }
}

/**
 * Saves active Learn (Flashcards) session context to localStorage with schema version and timestamp.
 * Dispatches CONTINUITY_EVENTS.SESSION_UPDATED on window.
 */
export function saveActiveLearnSession(context: LearnResumeContext): void {
  try {
    const payload: LearnResumeContext = {
      ...context,
      schemaVersion: 1,
      timestamp: context.timestamp && Number.isFinite(context.timestamp) ? context.timestamp : Date.now(),
    };

    const validated = validateLearnResumeContext(payload);
    if (!validated) {
      return;
    }

    const writeSuccess = safeSetLocalStorage(STORAGE_KEYS.LEARN_SESSION_ACTIVE, JSON.stringify(validated));
    if (writeSuccess) {
      emitSessionUpdate();
    }
  } catch (err) {
    console.error('Failed to save active learn session to localStorage:', err);
  }
}

/**
 * Retrieves the active Learn session from localStorage.
 * Validates integrity and staleness (>24h). Automatically cleans up corrupt or stale data.
 */
export function getActiveLearnSession(now: number = Date.now()): LearnResumeContext | null {
  try {
    const raw = safeGetLocalStorage(STORAGE_KEYS.LEARN_SESSION_ACTIVE);
    if (!raw) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const removed = safeRemoveLocalStorage(STORAGE_KEYS.LEARN_SESSION_ACTIVE);
      if (removed) {
        emitSessionUpdate();
      }
      return null;
    }

    const validated = validateLearnResumeContext(parsed, now);
    if (!validated) {
      const removed = safeRemoveLocalStorage(STORAGE_KEYS.LEARN_SESSION_ACTIVE);
      if (removed) {
        emitSessionUpdate();
      }
      return null;
    }

    return validated;
  } catch (err) {
    console.error('Failed to get active learn session from localStorage:', err);
    return null;
  }
}

/**
 * Clears active Learn session from localStorage and emits update event if removal succeeded.
 */
export function clearActiveLearnSession(): boolean {
  try {
    const removed = safeRemoveLocalStorage(STORAGE_KEYS.LEARN_SESSION_ACTIVE);
    if (removed) {
      emitSessionUpdate();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to clear active learn session from localStorage:', err);
    return false;
  }
}

/**
 * Saves active Smart Review session context to localStorage with schema version and timestamp.
 * Dispatches CONTINUITY_EVENTS.SESSION_UPDATED on window.
 */
export function saveActiveReviewSession(context: ReviewResumeContext): void {
  try {
    const payload: ReviewResumeContext = {
      ...context,
      schemaVersion: 1,
      timestamp: context.timestamp && Number.isFinite(context.timestamp) ? context.timestamp : Date.now(),
    };

    const validated = validateReviewResumeContext(payload);
    if (!validated) {
      return;
    }

    const writeSuccess = safeSetLocalStorage(STORAGE_KEYS.REVIEW_SESSION_ACTIVE, JSON.stringify(validated));
    if (writeSuccess) {
      emitSessionUpdate();
    }
  } catch (err) {
    console.error('Failed to save active review session to localStorage:', err);
  }
}

/**
 * Retrieves the active Smart Review session from localStorage.
 * Validates integrity and staleness (>24h). Automatically cleans up corrupt or stale data.
 */
export function getActiveReviewSession(now: number = Date.now()): ReviewResumeContext | null {
  try {
    const raw = safeGetLocalStorage(STORAGE_KEYS.REVIEW_SESSION_ACTIVE);
    if (!raw) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const removed = safeRemoveLocalStorage(STORAGE_KEYS.REVIEW_SESSION_ACTIVE);
      if (removed) {
        emitSessionUpdate();
      }
      return null;
    }

    const validated = validateReviewResumeContext(parsed, now);
    if (!validated) {
      const removed = safeRemoveLocalStorage(STORAGE_KEYS.REVIEW_SESSION_ACTIVE);
      if (removed) {
        emitSessionUpdate();
      }
      return null;
    }

    return validated;
  } catch (err) {
    console.error('Failed to get active review session from localStorage:', err);
    return null;
  }
}

/**
 * Clears active Smart Review session from localStorage and emits update event if removal succeeded.
 */
export function clearActiveReviewSession(): boolean {
  try {
    const removed = safeRemoveLocalStorage(STORAGE_KEYS.REVIEW_SESSION_ACTIVE);
    if (removed) {
      emitSessionUpdate();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to clear active review session from localStorage:', err);
    return false;
  }
}
