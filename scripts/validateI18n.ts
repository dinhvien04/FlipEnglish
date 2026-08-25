import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { enCatalog } from '../src/features/i18n/locales/en';
import { viCatalog } from '../src/features/i18n/locales/vi';
import { getTranslation, hasTranslationKey } from '../src/features/i18n/i18nCatalog';
import {
  formatNumberWithLocale,
  formatDateWithLocale,
  formatPercentWithLocale,
} from '../src/features/i18n/formatting';
import { resolveInitialUiLanguage } from '../src/features/i18n/resolveInitialLanguage';
import {
  normalizeStoredLanguagePreference,
  parseStoredLanguagePreference,
} from '../src/features/i18n/localeStorage';
import { validateOnboardingState } from '../src/features/onboarding/onboardingStorage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{[a-zA-Z0-9_-]+\}/g);
  if (!matches) return [];
  return Array.from(new Set(matches)).sort();
}

function runValidation() {
  console.log('--- 1. Validating Translation Catalogs Parity ---');
  const enKeys = Object.keys(enCatalog).sort();
  const viKeys = Object.keys(viCatalog).sort();

  console.log(`English catalog keys count: ${enKeys.length}`);
  console.log(`Vietnamese catalog keys count: ${viKeys.length}`);

  const missingInVi = enKeys.filter((k) => !(k in viCatalog));
  const missingInEn = viKeys.filter((k) => !(k in enCatalog));

  if (missingInVi.length > 0) {
    console.error('❌ Keys present in EN but missing in VI:', missingInVi);
    process.exit(1);
  }

  if (missingInEn.length > 0) {
    console.error('❌ Keys present in VI but missing in EN:', missingInEn);
    process.exit(1);
  }

  console.log('✅ Catalogs have 100% key parity.');

  console.log('\n--- 2. Validating Placeholder Tokens Parity Across Locales ---');
  for (const key of enKeys) {
    const enVal = (enCatalog as Record<string, string>)[key];
    const viVal = (viCatalog as Record<string, string>)[key];

    const enPlaceholders = extractPlaceholders(enVal);
    const viPlaceholders = extractPlaceholders(viVal);

    if (enPlaceholders.join(',') !== viPlaceholders.join(',')) {
      console.error(
        `❌ Placeholder mismatch for key "${key}": EN=[${enPlaceholders.join(', ')}] vs VI=[${viPlaceholders.join(', ')}]`
      );
      process.exit(1);
    }
  }
  console.log('✅ All placeholder tokens match exactly across EN and VI catalogs.');

  console.log('\n--- 3. Validating Catalog Values Quality & Zero Empty Strings ---');
  for (const [key, val] of Object.entries(enCatalog)) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
      console.error(`❌ Empty or invalid translation in EN catalog for key: "${key}"`);
      process.exit(1);
    }
  }

  for (const [key, val] of Object.entries(viCatalog)) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
      console.error(`❌ Empty or invalid translation in VI catalog for key: "${key}"`);
      process.exit(1);
    }
  }

  console.log('✅ All translation catalog strings are non-empty and valid.');

  console.log('\n--- 4. Validating Translation Catalog Interpolation ---');
  // Test interpolation
  const interpolatedEn = getTranslation('en', 'home.search.noResults', { query: 'technology' });
  if (interpolatedEn !== 'No lessons found matching "technology".') {
    console.error(`❌ Translation interpolation failed for EN: "${interpolatedEn}"`);
    process.exit(1);
  }

  const interpolatedVi = getTranslation('vi', 'home.search.noResults', { query: 'technology' });
  if (interpolatedVi !== 'Không tìm thấy bài học nào phù hợp với "technology".') {
    console.error(`❌ Translation interpolation failed for VI: "${interpolatedVi}"`);
    process.exit(1);
  }

  // Test hasTranslationKey
  if (!hasTranslationKey('ui.nav.today') || hasTranslationKey('random.fake.key')) {
    console.error('❌ hasTranslationKey check failed');
    process.exit(1);
  }

  console.log('✅ Translation interpolation and compile-time key contract function properly.');

  console.log('\n--- 5. Validating Number, Date, and Percent Formatters ---');
  const formattedNumVi = formatNumberWithLocale(12500, 'vi');
  const formattedNumEn = formatNumberWithLocale(12500, 'en');
  if (!formattedNumVi || !formattedNumEn) {
    console.error('❌ formatNumberWithLocale returned empty string');
    process.exit(1);
  }

  const testDate = new Date('2026-08-25T10:00:00Z');
  const formattedDateVi = formatDateWithLocale(testDate, 'vi');
  const formattedDateEn = formatDateWithLocale(testDate, 'en');
  if (!formattedDateVi || !formattedDateEn) {
    console.error('❌ formatDateWithLocale returned empty string');
    process.exit(1);
  }

  const formattedPctVi = formatPercentWithLocale(87.6, 'vi');
  const formattedPctEn = formatPercentWithLocale(87.6, 'en');
  if (!formattedPctVi.includes('88') && !formattedPctVi.includes('87')) {
    console.error(`❌ formatPercentWithLocale output unexpected for VI: "${formattedPctVi}"`);
    process.exit(1);
  }

  console.log(`- Formatted number (VI): ${formattedNumVi} | (EN): ${formattedNumEn}`);
  console.log(`- Formatted date (VI): ${formattedDateVi} | (EN): ${formattedDateEn}`);
  console.log(`- Formatted percent (VI): ${formattedPctVi} | (EN): ${formattedPctEn}`);
  console.log('✅ Formatting helpers function correctly.');

  console.log('\n--- 6. Validating Three-Tier Initial Language Resolution Engine ---');
  // Tier 1: Explicit preference always wins
  const explicitVi = resolveInitialUiLanguage({
    storedPreference: { mode: 'vi', explicit: true, savedAt: 1000 },
    hasExistingLearnerData: true,
    browserLanguages: ['en-US'],
  });
  if (explicitVi !== 'vi') {
    console.error(`❌ Expected explicit 'vi' but got: "${explicitVi}"`);
    process.exit(1);
  }

  const explicitBilingual = resolveInitialUiLanguage({
    storedPreference: { mode: 'bilingual', explicit: true, savedAt: 1000 },
    hasExistingLearnerData: false,
    browserLanguages: ['en-US'],
  });
  if (explicitBilingual !== 'bilingual') {
    console.error(`❌ Expected explicit 'bilingual' but got: "${explicitBilingual}"`);
    process.exit(1);
  }

  // Tier 2: Existing learner backwards compatibility (has progress, no explicit choice -> EN)
  const existingLearnerEn = resolveInitialUiLanguage({
    storedPreference: null,
    hasExistingLearnerData: true,
    browserLanguages: ['vi-VN'],
  });
  if (existingLearnerEn !== 'en') {
    console.error(`❌ Expected existing learner default 'en' but got: "${existingLearnerEn}"`);
    process.exit(1);
  }

  // Tier 3: New learner recommendation based on browser languages
  const newLearnerVi = resolveInitialUiLanguage({
    storedPreference: null,
    hasExistingLearnerData: false,
    browserLanguages: ['vi-VN', 'en-US'],
  });
  if (newLearnerVi !== 'vi') {
    console.error(`❌ Expected new learner VI recommendation but got: "${newLearnerVi}"`);
    process.exit(1);
  }

  const newLearnerEn = resolveInitialUiLanguage({
    storedPreference: null,
    hasExistingLearnerData: false,
    browserLanguages: ['en-GB', 'fr-FR'],
  });
  if (newLearnerEn !== 'en') {
    console.error(`❌ Expected new learner EN recommendation but got: "${newLearnerEn}"`);
    process.exit(1);
  }

  console.log('✅ Three-tier initial language resolution engine behaves according to specification.');

  console.log('\n--- 7. Validating Onboarding State Schema Validation ---');
  const validState1 = {
    status: 'completed',
    selectedLanguage: 'vi',
    selectedRoute: 'know',
    selectedLevel: 'B1',
    completedAt: Date.now(),
  };
  const validState2 = {
    status: 'skipped',
    selectedLanguage: 'bilingual',
    completedAt: Date.now(),
  };
  const invalidState1 = {
    status: 'invalid_status',
    selectedLanguage: 'vi',
  };
  const invalidState2 = {
    status: 'completed',
    selectedLanguage: 'fr', // invalid language mode
  };
  const invalidState3 = {
    status: 'completed',
    selectedLanguage: 'en',
    selectedLevel: 'Z9', // invalid level
  };

  if (!validateOnboardingState(validState1) || !validateOnboardingState(validState2)) {
    console.error('❌ Valid onboarding states failed schema validation');
    process.exit(1);
  }

  if (
    validateOnboardingState(invalidState1) ||
    validateOnboardingState(invalidState2) ||
    validateOnboardingState(invalidState3)
  ) {
    console.error('❌ Invalid onboarding state passed validation unexpectedly');
    process.exit(1);
  }

  console.log('✅ Onboarding schema validation correctly enforces boundaries.');

  console.log('\n--- 8. Validating Stored Language Preference Normalizer & Parser ---');
  // 1. Valid full record
  const normValid = normalizeStoredLanguagePreference({
    mode: 'vi',
    explicit: true,
    savedAt: 1724580000000,
  });
  if (!normValid || normValid.mode !== 'vi' || normValid.explicit !== true || normValid.savedAt !== 1724580000000) {
    console.error('❌ Failed to normalize valid language preference record:', normValid);
    process.exit(1);
  }

  // 2. Legacy record without explicit/savedAt
  const normLegacy = normalizeStoredLanguagePreference({ mode: 'en' });
  if (!normLegacy || normLegacy.mode !== 'en' || normLegacy.explicit !== false || normLegacy.savedAt !== undefined) {
    console.error('❌ Legacy record normalization failed (expected explicit=false, savedAt=undefined):', normLegacy);
    process.exit(1);
  }

  // 3. Critical regression: explicit as string 'false' must NOT become true
  const normStringFalse = normalizeStoredLanguagePreference({
    mode: 'vi',
    explicit: 'false',
  });
  if (!normStringFalse || normStringFalse.explicit !== false) {
    console.error('❌ Regression: explicit "false" string was converted to true:', normStringFalse);
    process.exit(1);
  }

  // 4. Invalid language mode
  if (normalizeStoredLanguagePreference({ mode: 'fr', explicit: true }) !== null) {
    console.error('❌ Invalid language mode "fr" was not rejected');
    process.exit(1);
  }

  // 5. Invalid root shapes (array, string, null, number)
  if (
    normalizeStoredLanguagePreference([]) !== null ||
    normalizeStoredLanguagePreference('vi') !== null ||
    normalizeStoredLanguagePreference(null) !== null ||
    normalizeStoredLanguagePreference(123) !== null
  ) {
    console.error('❌ Non-object root values were not rejected');
    process.exit(1);
  }

  // 6. Invalid savedAt values (NaN, Infinity, string numbers)
  const normInvalidSavedAt1 = normalizeStoredLanguagePreference({ mode: 'vi', explicit: true, savedAt: NaN });
  const normInvalidSavedAt2 = normalizeStoredLanguagePreference({ mode: 'vi', explicit: true, savedAt: Infinity });
  const normInvalidSavedAt3 = normalizeStoredLanguagePreference({ mode: 'vi', explicit: true, savedAt: '1724580000000' });
  if (
    normInvalidSavedAt1?.savedAt !== undefined ||
    normInvalidSavedAt2?.savedAt !== undefined ||
    normInvalidSavedAt3?.savedAt !== undefined
  ) {
    console.error('❌ Non-finite or non-numeric savedAt was not normalized to undefined');
    process.exit(1);
  }

  // 7. parseStoredLanguagePreference with raw JSON strings
  const parsedJson = parseStoredLanguagePreference('{"mode":"bilingual","explicit":true,"savedAt":100}');
  if (!parsedJson || parsedJson.mode !== 'bilingual' || parsedJson.explicit !== true) {
    console.error('❌ parseStoredLanguagePreference failed on valid JSON:', parsedJson);
    process.exit(1);
  }

  const parsedCorrupt = parseStoredLanguagePreference('{corrupt json');
  if (parsedCorrupt !== null) {
    console.error('❌ parseStoredLanguagePreference failed to return null on corrupt JSON');
    process.exit(1);
  }

  console.log('✅ Canonical language preference normalizer and parser correctly validate all edge cases.');

  console.log('\n--- 9. Static Source Integration Audit for Multilingual UX & Accessibility ---');
  const projectRoot = path.resolve(__dirname, '..');

  // Check 1: Ensure LanguageChoiceGroup.tsx uses native radio inputs and zero decorative symbols
  const languageChoiceGroupPath = path.join(
    projectRoot,
    'src',
    'features',
    'i18n',
    'LanguageChoiceGroup.tsx'
  );
  const languageChoiceGroupContent = fs.readFileSync(languageChoiceGroupPath, 'utf8');

  if (!languageChoiceGroupContent.includes('type="radio"') || !languageChoiceGroupContent.includes('checked={isChecked}')) {
    console.error('❌ LanguageChoiceGroup.tsx must use native radio inputs (type="radio" and checked={isChecked}).');
    process.exit(1);
  }

  if (
    languageChoiceGroupContent.includes('role="menu"') ||
    languageChoiceGroupContent.includes('role="menuitemradio"')
  ) {
    console.error('❌ LanguageChoiceGroup.tsx must not use application menu roles (role="menu" / role="menuitemradio").');
    process.exit(1);
  }

  if (languageChoiceGroupContent.includes('✓')) {
    console.error('❌ LanguageChoiceGroup.tsx must not contain decorative checkmark (✓).');
    process.exit(1);
  }
  console.log('✅ LanguageChoiceGroup.tsx uses native radio group semantics with zero decorative glyphs.');

  // Check 2: Ensure Header.tsx connects language panel with aria-expanded and aria-controls
  const headerPath = path.join(projectRoot, 'src', 'components', 'Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');

  if (!headerContent.includes('aria-controls="header-language-panel"') || !headerContent.includes('id="header-language-panel"')) {
    console.error('❌ Header.tsx must link language toggle button to panel via aria-controls="header-language-panel".');
    process.exit(1);
  }

  if (headerContent.includes('role="menuitemradio"') || headerContent.includes('role="menu"')) {
    console.error('❌ Header.tsx must not claim incomplete application menu roles.');
    process.exit(1);
  }
  console.log('✅ Header.tsx properly links language panel with accessible disclosure semantics.');

  // Check 3: Ensure PWA components use localized strings
  const pwaInstallCardPath = path.join(projectRoot, 'src', 'features', 'pwa', 'PWAInstallCard.tsx');
  const pwaInstallCardContent = fs.readFileSync(pwaInstallCardPath, 'utf8');
  if (pwaInstallCardContent.includes('App Experience') || pwaInstallCardContent.includes('How to install on your device:')) {
    console.error('❌ PWAInstallCard.tsx contains hardcoded English strings instead of t() translation keys.');
    process.exit(1);
  }
  console.log('✅ PWAInstallCard.tsx fully utilizes localized translation tokens.');

  // Check 4: Ensure ReviewDashboard.tsx uses localized batch and days count
  const reviewDashboardPath = path.join(projectRoot, 'src', 'features', 'review', 'ReviewDashboard.tsx');
  const reviewDashboardContent = fs.readFileSync(reviewDashboardPath, 'utf8');
  if (reviewDashboardContent.includes('in batch') || reviewDashboardContent.includes('(7 days)')) {
    console.error('❌ ReviewDashboard.tsx contains hardcoded "in batch" or "(7 days)" strings.');
    process.exit(1);
  }
  console.log('✅ ReviewDashboard.tsx fully utilizes localized time/batch translation tokens.');

  console.log('\n🎉 ALL I18N AND MULTILINGUAL CHECKS PASSED WITH ZERO ERRORS.');
}

runValidation();
