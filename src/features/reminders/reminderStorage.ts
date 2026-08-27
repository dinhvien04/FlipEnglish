import { STORAGE_KEYS, CONTINUITY_EVENTS } from '../../constants/storageKeys';
import { ReminderPreferences } from '../../types/reminders';
import { isValidLocalDateKey } from '../studyPlan/studyPlanEngine';

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  schemaVersion: 1,
  enabled: false,
  preferredHour: 20,
  preferredMinute: 0,
  lastDismissedDateKey: null,
  updatedAt: Date.now(),
};

/**
 * Validates untrusted ReminderPreferences payload strictly.
 */
export function validateReminderPreferences(data: unknown): data is ReminderPreferences {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const obj = data as Record<string, unknown>;

  if (obj.schemaVersion !== 1) return false;
  if (typeof obj.enabled !== 'boolean') return false;

  if (
    typeof obj.preferredHour !== 'number' ||
    !Number.isInteger(obj.preferredHour) ||
    obj.preferredHour < 0 ||
    obj.preferredHour > 23
  ) {
    return false;
  }

  if (
    typeof obj.preferredMinute !== 'number' ||
    !Number.isInteger(obj.preferredMinute) ||
    obj.preferredMinute < 0 ||
    obj.preferredMinute > 59
  ) {
    return false;
  }

  if (obj.lastDismissedDateKey !== null && obj.lastDismissedDateKey !== undefined) {
    if (typeof obj.lastDismissedDateKey !== 'string' || !isValidLocalDateKey(obj.lastDismissedDateKey)) {
      return false;
    }
  }

  if (
    typeof obj.updatedAt !== 'number' ||
    !Number.isFinite(obj.updatedAt) ||
    obj.updatedAt <= 0 ||
    obj.updatedAt > Date.now() + 86400000
  ) {
    return false;
  }

  return true;
}

/**
 * Dispatches the custom event across window to notify subscribers.
 */
export function emitRemindersUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CONTINUITY_EVENTS.REMINDERS_UPDATED));
  }
}

/**
 * Loads user reminder preferences safely from localStorage with default fallbacks.
 */
export function loadReminderPreferences(): ReminderPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_REMINDER_PREFERENCES, updatedAt: Date.now() };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    if (!raw) {
      return { ...DEFAULT_REMINDER_PREFERENCES, updatedAt: Date.now() };
    }

    const parsed = JSON.parse(raw);
    if (validateReminderPreferences(parsed)) {
      return {
        ...parsed,
        lastDismissedDateKey: parsed.lastDismissedDateKey ?? null,
      };
    }
    return { ...DEFAULT_REMINDER_PREFERENCES, updatedAt: Date.now() };
  } catch {
    return { ...DEFAULT_REMINDER_PREFERENCES, updatedAt: Date.now() };
  }
}

/**
 * Saves validated reminder preferences to localStorage and dispatches CONTINUITY_EVENTS.REMINDERS_UPDATED.
 * Returns true if saved, false otherwise.
 */
export function saveReminderPreferences(preferences: ReminderPreferences): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (!validateReminderPreferences(preferences)) {
      return false;
    }
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(preferences));
    emitRemindersUpdated();
    return true;
  } catch {
    return false;
  }
}

/**
 * Updates partial reminder preferences safely.
 */
export function updateReminderPreferences(
  updates: Partial<Omit<ReminderPreferences, 'schemaVersion'>>
): ReminderPreferences {
  const current = loadReminderPreferences();
  const next: ReminderPreferences = {
    ...current,
    ...updates,
    schemaVersion: 1,
    updatedAt: Date.now(),
  };

  if (saveReminderPreferences(next)) {
    return next;
  }
  return current;
}

/**
 * Dismisses in-app reminder for the specified dateKey (e.g. today's local date).
 */
export function dismissReminderForToday(dateKey: string): void {
  if (!isValidLocalDateKey(dateKey)) {
    return;
  }

  updateReminderPreferences({
    lastDismissedDateKey: dateKey,
  });
}
