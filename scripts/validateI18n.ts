import { enCatalog } from '../src/features/i18n/locales/en';
import { viCatalog } from '../src/features/i18n/locales/vi';
import { getTranslation, hasTranslationKey } from '../src/features/i18n/i18nCatalog';
import {
  formatNumberWithLocale,
  formatDateWithLocale,
  formatPercentWithLocale,
} from '../src/features/i18n/formatting';
import { validateOnboardingState } from '../src/features/onboarding/onboardingStorage';

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

  console.log('\n--- 2. Validating Catalog Values Quality & Zero Empty Strings ---');
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

  console.log('\n--- 3. Validating Translation Catalog Interpolation & Fallbacks ---');
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

  // Test fallback for nonexistent key
  const fallbackVal = getTranslation('vi', 'nonexistent.key.test');
  if (fallbackVal !== 'nonexistent.key.test') {
    console.error(`❌ Fallback failed for nonexistent key: "${fallbackVal}"`);
    process.exit(1);
  }

  console.log('✅ Translation interpolation and key fallbacks function properly.');

  console.log('\n--- 4. Validating Number, Date, and Percent Formatters ---');
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

  console.log('\n--- 5. Validating Onboarding State Schema Validation ---');
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

  console.log('\n🎉 ALL I18N AND MULTILINGUAL CHECKS PASSED WITH ZERO ERRORS.');
}

runValidation();
