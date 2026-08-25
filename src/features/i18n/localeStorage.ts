import { UiLanguageMode, StoredLanguagePreference } from './i18nTypes';

export const LANGUAGE_STORAGE_KEY = 'flipenglish_ui_language_v1';
export const LANGUAGE_UPDATED_EVENT = 'flipenglish_ui_language_updated';

const VALID_MODES = new Set<string>(['vi', 'bilingual', 'en']);

export function isValidUiLanguageMode(val: unknown): val is UiLanguageMode {
  return typeof val === 'string' && VALID_MODES.has(val);
}

export function normalizeStoredLanguagePreference(
  value: unknown
): StoredLanguagePreference | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const obj = value as Record<string, unknown>;
  if (!isValidUiLanguageMode(obj.mode)) {
    return null;
  }

  const explicit = typeof obj.explicit === 'boolean' ? obj.explicit : false;
  const savedAt =
    typeof obj.savedAt === 'number' && Number.isFinite(obj.savedAt)
      ? obj.savedAt
      : undefined;

  return {
    mode: obj.mode,
    explicit,
    savedAt,
  };
}

export function parseStoredLanguagePreference(
  raw: string | null
): StoredLanguagePreference | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return normalizeStoredLanguagePreference(parsed);
  } catch {
    return null;
  }
}

export function loadStoredLanguagePreference(): StoredLanguagePreference | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseStoredLanguagePreference(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch (err) {
    return null;
  }
}

export function saveStoredLanguagePreference(mode: UiLanguageMode, explicit: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    if (!isValidUiLanguageMode(mode)) return;
    const record: StoredLanguagePreference = {
      mode,
      explicit,
      savedAt: Date.now(),
    };
    localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(record));
    window.dispatchEvent(new CustomEvent(LANGUAGE_UPDATED_EVENT, { detail: { mode, explicit } }));
  } catch (err) {
    // Storage quota or security error fallback in-memory
  }
}
