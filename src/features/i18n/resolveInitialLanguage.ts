import { UiLanguageMode, StoredLanguagePreference } from './i18nTypes';
import { detectRecommendedLanguage } from './localeDetection';

export interface ResolveInitialLanguageParams {
  storedPreference?: StoredLanguagePreference | null;
  hasExistingLearnerData?: boolean;
  browserLanguages?: readonly string[] | string[] | null;
  browserLanguage?: string | null;
}

/**
 * Pure helper for initial language resolution.
 * Priority:
 * 1. Explicit User Choice (flipenglish_ui_language_v1 with explicit: true) -> stored.mode
 * 2. Existing Learner Backwards Compatibility (has meaningful study data & no explicit choice) -> 'en'
 * 3. New Learner Recommendation (browser languages tag analysis) -> 'vi' or 'en'
 */
export function resolveInitialUiLanguage({
  storedPreference,
  hasExistingLearnerData = false,
  browserLanguages,
  browserLanguage,
}: ResolveInitialLanguageParams): UiLanguageMode {
  // 1. Explicit user choice always wins
  if (storedPreference && storedPreference.explicit && storedPreference.mode) {
    return storedPreference.mode;
  }

  // 2. Existing learner backwards compatibility: Before i18n, FlipEnglish was English
  if (hasExistingLearnerData) {
    return 'en';
  }

  // 3. Brand-new learner recommendation based on browser
  return detectRecommendedLanguage(browserLanguages, browserLanguage);
}
