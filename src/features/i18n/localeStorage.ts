import { UiLanguageMode, StoredLanguagePreference } from './i18nTypes';

export const LANGUAGE_STORAGE_KEY = 'flipenglish_ui_language_v1';
export const LANGUAGE_UPDATED_EVENT = 'flipenglish_ui_language_updated';

const VALID_MODES = new Set<string>(['vi', 'bilingual', 'en']);

export function isValidUiLanguageMode(val: unknown): val is UiLanguageMode {
  return typeof val === 'string' && VALID_MODES.has(val);
}

export function loadStoredLanguagePreference(): StoredLanguagePreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      if (isValidUiLanguageMode(obj.mode)) {
        return {
          mode: obj.mode,
          explicit: typeof obj.explicit === 'boolean' ? obj.explicit : Boolean(obj.explicit),
          savedAt: typeof obj.savedAt === 'number' && Number.isFinite(obj.savedAt) ? obj.savedAt : undefined,
        };
      }
    }
    return null;
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
