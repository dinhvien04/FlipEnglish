import { UiLanguageMode } from './i18nTypes';

/**
 * Pure recommendation helper from browser languages.
 * Normalizes BCP-47 language tags (e.g. 'vi', 'vi-VN', 'vi-US' -> 'vi', others -> 'en').
 */
export function detectRecommendedLanguage(
  languages?: readonly string[] | string[] | null,
  singleLanguage?: string | null
): UiLanguageMode {
  const candidateTags: string[] = [];

  if (Array.isArray(languages)) {
    for (const tag of languages) {
      if (typeof tag === 'string' && tag.trim()) {
        candidateTags.push(tag.trim().toLowerCase());
      }
    }
  }

  if (typeof singleLanguage === 'string' && singleLanguage.trim()) {
    candidateTags.push(singleLanguage.trim().toLowerCase());
  }

  if (candidateTags.length === 0 && typeof navigator !== 'undefined') {
    if (Array.isArray(navigator.languages)) {
      candidateTags.push(...navigator.languages.map((l) => l.toLowerCase()));
    }
    if (typeof navigator.language === 'string') {
      candidateTags.push(navigator.language.toLowerCase());
    }
  }

  for (const tag of candidateTags) {
    if (tag === 'vi' || tag.startsWith('vi-') || tag.startsWith('vi_')) {
      return 'vi';
    }
    if (tag.startsWith('en')) {
      return 'en';
    }
  }

  return 'en';
}
