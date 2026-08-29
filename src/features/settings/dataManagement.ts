import { STORAGE_KEYS, CONTINUITY_EVENTS, DATA_MANAGEMENT_EVENTS } from '../../constants/storageKeys';
import { safeRemoveLocalStorage, safeGetLocalStorage } from '../../utils/storageHealth';
import { clearAllSavedWordsFromDb, clearAllCachedEntriesFromDb, clearAllMetadataFromDb } from '../dictionary/dictionaryCache';
import { LANGUAGE_UPDATED_EVENT } from '../i18n/localeStorage';

export type DataResetScope = 'learning' | 'vocabulary' | 'all';

export interface DataManagementResult {
  success: boolean;
  scope: DataResetScope;
  removedKeys: string[];
  failedKeys: string[];
}

/**
 * Categorized FlipEnglish Storage Key Inventory
 */
export const FLIPENGLISH_LEARNING_STORAGE_KEYS: readonly string[] = [
  STORAGE_KEYS.PROGRESS,
  STORAGE_KEYS.REVIEW,
  STORAGE_KEYS.REVIEW_STATS,
  STORAGE_KEYS.EXAM_HISTORY,
  STORAGE_KEYS.EXAM_HISTORY_LEGACY,
  STORAGE_KEYS.EXAM_ACTIVE,
  STORAGE_KEYS.PLACEMENT_HISTORY,
  STORAGE_KEYS.PLACEMENT_ACTIVE,
  STORAGE_KEYS.PLACEMENT_LATEST_REPORT,
  STORAGE_KEYS.PLACEMENT_REVIEW_EXPORTS,
  STORAGE_KEYS.STUDY_PLAN_TODAY,
  STORAGE_KEYS.STUDY_PLAN_HISTORY,
  STORAGE_KEYS.LEARN_SESSION_ACTIVE,
  STORAGE_KEYS.REVIEW_SESSION_ACTIVE,
  STORAGE_KEYS.STREAK,
  STORAGE_KEYS.ACTIVE_TIME,
  STORAGE_KEYS.CONVERSATION_HISTORY,
];

export const FLIPENGLISH_VOCABULARY_STORAGE_KEYS: readonly string[] = [
  STORAGE_KEYS.DICTIONARY_RECENT,
  STORAGE_KEYS.DICTIONARY_SAVED,
  STORAGE_KEYS.DICTIONARY_HISTORY,
];

export const FLIPENGLISH_PREFERENCE_STORAGE_KEYS: readonly string[] = [
  STORAGE_KEYS.STUDY_PLAN_SETTINGS,
  STORAGE_KEYS.REMINDERS,
  STORAGE_KEYS.LOCALE,
  STORAGE_KEYS.LOCALE_LEGACY,
  STORAGE_KEYS.ONBOARDING,
  STORAGE_KEYS.AI_FEATURES_ENABLED,
  STORAGE_KEYS.PWA_INSTALL_DISMISSED,
];

/**
 * Union of ALL known FlipEnglish keys (current + legacy)
 */
export const ALL_FLIPENGLISH_STORAGE_KEYS: readonly string[] = [
  ...FLIPENGLISH_LEARNING_STORAGE_KEYS,
  ...FLIPENGLISH_VOCABULARY_STORAGE_KEYS,
  ...FLIPENGLISH_PREFERENCE_STORAGE_KEYS,
];

/**
 * Removes an array of keys safely from localStorage without touching unrelated keys.
 * Reports aggregated success and lists removed vs failed keys.
 */
function removeKeysSafely(keys: readonly string[]): { removedKeys: string[]; failedKeys: string[] } {
  const removedKeys: string[] = [];
  const failedKeys: string[] = [];

  for (const key of keys) {
    const exists = safeGetLocalStorage(key) !== null;
    if (exists) {
      const removed = safeRemoveLocalStorage(key);
      if (removed && safeGetLocalStorage(key) === null) {
        removedKeys.push(key);
      } else {
        failedKeys.push(key);
      }
    } else {
      // Key is already absent, consider it cleaned
      removedKeys.push(key);
    }
  }

  return { removedKeys, failedKeys };
}

/**
 * Dispatches domain and centralized reset events to update runtime React state immediately.
 */
function emitResetEvents(scope: DataResetScope): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Centralized reset event with typed scope detail
    window.dispatchEvent(
      new CustomEvent(DATA_MANAGEMENT_EVENTS.USER_DATA_RESET, {
        detail: { scope },
      })
    );

    // 2. Domain-specific update events
    if (scope === 'learning' || scope === 'all') {
      window.dispatchEvent(new Event('flipenglish_progress_updated'));
      window.dispatchEvent(new Event('flipenglish_review_updated'));
      window.dispatchEvent(new Event('flipenglish_placement_updated'));
      window.dispatchEvent(new Event('flipenglish_exam_history_updated'));
      window.dispatchEvent(new Event('flipenglish_study_plan_updated'));
      window.dispatchEvent(new Event('flipenglish_conversation_updated'));
      window.dispatchEvent(new Event(CONTINUITY_EVENTS.STREAK_UPDATED));
      window.dispatchEvent(new Event(CONTINUITY_EVENTS.ACTIVE_TIME_UPDATED));
      window.dispatchEvent(new Event(CONTINUITY_EVENTS.SESSION_UPDATED));
    }

    if (scope === 'vocabulary' || scope === 'all') {
      window.dispatchEvent(new Event('flipenglish_dictionary_updated'));
    }

    if (scope === 'all') {
      window.dispatchEvent(new Event(CONTINUITY_EVENTS.REMINDERS_UPDATED));
      window.dispatchEvent(new Event('flipenglish_onboarding_updated'));
      window.dispatchEvent(new Event(LANGUAGE_UPDATED_EVENT));
    }
  } catch (err) {
    console.warn('[DataManagement] Error dispatching reset events:', err);
  }
}

/**
 * 1. Reset Learning Progress
 * Removes: Lessons, SRS review items, Exams, Placement, Streak, Active Time, Daily Study Plan history, In-flight sessions.
 * Preserves: Language preference, saved dictionary/Wordbook words, reminder preferences, PWA install state, daily study goal settings.
 */
export function resetLearningProgress(): DataManagementResult {
  const { removedKeys, failedKeys } = removeKeysSafely(FLIPENGLISH_LEARNING_STORAGE_KEYS);
  const success = failedKeys.length === 0;

  // Always emit events for successfully removed keys to prevent in-memory state drift
  if (removedKeys.length > 0) {
    emitResetEvents('learning');
  }

  return {
    success,
    scope: 'learning',
    removedKeys,
    failedKeys,
  };
}

/**
 * 2. Clear Saved Vocabulary
 * Removes: Saved Wordbook items from IndexedDB and recent search history from localStorage.
 * Preserves: All learning progress, streaks, exams, placement, reminders, and user preferences.
 */
export async function clearSavedVocabulary(): Promise<DataManagementResult> {
  const { removedKeys, failedKeys } = removeKeysSafely(FLIPENGLISH_VOCABULARY_STORAGE_KEYS);

  let idbSuccess = true;
  try {
    idbSuccess = await clearAllSavedWordsFromDb();
    if (!idbSuccess) {
      failedKeys.push('indexeddb_savedWords');
    } else {
      removedKeys.push('indexeddb_savedWords');
    }
  } catch (err) {
    idbSuccess = false;
    failedKeys.push('indexeddb_savedWords');
  }

  const success = failedKeys.length === 0 && idbSuccess;

  // Always emit events for successfully removed domains
  if (removedKeys.length > 0) {
    emitResetEvents('vocabulary');
  }

  return {
    success,
    scope: 'vocabulary',
    removedKeys,
    failedKeys,
  };
}

/**
 * 3. Erase All FlipEnglish Data (Factory Reset)
 * Removes: Every FlipEnglish-owned key in localStorage and all IndexedDB stores (savedWords, entries, metadata).
 * Never calls localStorage.clear() to avoid wiping unrelated origin storage.
 */
export async function eraseAllFlipEnglishData(): Promise<DataManagementResult> {
  const { removedKeys, failedKeys } = removeKeysSafely(ALL_FLIPENGLISH_STORAGE_KEYS);

  let idbSavedSuccess = true;
  let idbEntriesSuccess = true;
  let idbMetaSuccess = true;

  try {
    idbSavedSuccess = await clearAllSavedWordsFromDb();
    if (!idbSavedSuccess) {
      failedKeys.push('indexeddb_savedWords');
    } else {
      removedKeys.push('indexeddb_savedWords');
    }
  } catch {
    idbSavedSuccess = false;
    failedKeys.push('indexeddb_savedWords');
  }

  try {
    idbEntriesSuccess = await clearAllCachedEntriesFromDb();
    if (!idbEntriesSuccess) {
      failedKeys.push('indexeddb_entries');
    } else {
      removedKeys.push('indexeddb_entries');
    }
  } catch {
    idbEntriesSuccess = false;
    failedKeys.push('indexeddb_entries');
  }

  try {
    idbMetaSuccess = await clearAllMetadataFromDb();
    if (!idbMetaSuccess) {
      failedKeys.push('indexeddb_metadata');
    } else {
      removedKeys.push('indexeddb_metadata');
    }
  } catch {
    idbMetaSuccess = false;
    failedKeys.push('indexeddb_metadata');
  }

  const success = failedKeys.length === 0 && idbSavedSuccess && idbEntriesSuccess && idbMetaSuccess;

  // Always emit events for successfully removed domains
  if (removedKeys.length > 0) {
    emitResetEvents('all');
  }

  return {
    success,
    scope: 'all',
    removedKeys,
    failedKeys,
  };
}
