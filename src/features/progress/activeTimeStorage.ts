import { STORAGE_KEYS, CONTINUITY_EVENTS } from '../../constants/storageKeys';
import { ActiveTimeRecord } from '../../types/progress';
import { getLocalDateKey, isValidLocalDateKey } from '../studyPlan/studyPlanEngine';
import {
  safeGetLocalStorage,
  safeSetLocalStorage,
} from '../../utils/storageHealth';

/**
 * Creates a fresh ActiveTimeRecord for a given local date key.
 */
export function createInitialActiveTimeRecord(
  dateKey: string = getLocalDateKey(),
  now: number = Date.now()
): ActiveTimeRecord {
  return {
    schemaVersion: 1,
    localDate: dateKey,
    activeSeconds: 0,
    lastHeartbeatAt: now,
    updatedAt: now,
  };
}

function emitActiveTimeUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CONTINUITY_EVENTS.ACTIVE_TIME_UPDATED));
  }
}

/**
 * Validates untrusted ActiveTimeRecord from localStorage.
 */
export function validateActiveTimeRecord(data: unknown): data is ActiveTimeRecord {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  const candidate = data as Record<string, unknown>;

  if (candidate.schemaVersion !== 1) return false;

  if (
    typeof candidate.localDate !== 'string' ||
    !isValidLocalDateKey(candidate.localDate)
  ) {
    return false;
  }

  if (
    typeof candidate.activeSeconds !== 'number' ||
    !Number.isInteger(candidate.activeSeconds) ||
    candidate.activeSeconds < 0 ||
    candidate.activeSeconds > 86400 * 7 // Max 1 week cap
  ) {
    return false;
  }

  if (
    typeof candidate.lastHeartbeatAt !== 'number' ||
    !Number.isFinite(candidate.lastHeartbeatAt) ||
    candidate.lastHeartbeatAt <= 0 ||
    candidate.lastHeartbeatAt > Date.now() + 86400000
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
 * Loads ActiveTimeRecord from localStorage.
 * Automatically performs daily rollover if the stored record belongs to a previous calendar day.
 *
 * @param referenceDate Optional date reference (defaults to now).
 */
export function getStoredActiveTime(referenceDate: Date = new Date()): ActiveTimeRecord {
  const todayKey = getLocalDateKey(referenceDate);
  const now = Date.now();

  if (typeof window === 'undefined') {
    return createInitialActiveTimeRecord(todayKey, now);
  }

  try {
    const raw = safeGetLocalStorage(STORAGE_KEYS.ACTIVE_TIME);
    if (!raw) {
      return createInitialActiveTimeRecord(todayKey, now);
    }

    const parsed = JSON.parse(raw);
    if (!validateActiveTimeRecord(parsed)) {
      console.warn('[ActiveTimeStorage] Invalid active time data in localStorage, resetting');
      const fresh = createInitialActiveTimeRecord(todayKey, now);
      saveActiveTime(fresh);
      return fresh;
    }

    // Daily rollover check: if stored record date is not today, reset seconds for today
    if (parsed.localDate !== todayKey) {
      const rolledOver: ActiveTimeRecord = {
        schemaVersion: 1,
        localDate: todayKey,
        activeSeconds: 0,
        lastHeartbeatAt: now,
        updatedAt: now,
      };
      saveActiveTime(rolledOver);
      return rolledOver;
    }

    return parsed;
  } catch (err) {
    console.warn('[ActiveTimeStorage] Failed to read active time from localStorage:', err);
    return createInitialActiveTimeRecord(todayKey, now);
  }
}

/**
 * Saves ActiveTimeRecord to localStorage and dispatches CONTINUITY_EVENTS.ACTIVE_TIME_UPDATED.
 */
export function saveActiveTime(record: ActiveTimeRecord): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (!validateActiveTimeRecord(record)) {
      console.warn('[ActiveTimeStorage] Attempted to save invalid ActiveTimeRecord payload:', record);
      return false;
    }

    const writeSuccess = safeSetLocalStorage(STORAGE_KEYS.ACTIVE_TIME, JSON.stringify(record));
    if (writeSuccess) {
      emitActiveTimeUpdate();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[ActiveTimeStorage] Failed to write active time to localStorage:', err);
    return false;
  }
}
