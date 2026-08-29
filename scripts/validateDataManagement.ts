import {
  FLIPENGLISH_LEARNING_STORAGE_KEYS,
  FLIPENGLISH_VOCABULARY_STORAGE_KEYS,
  FLIPENGLISH_PREFERENCE_STORAGE_KEYS,
  ALL_FLIPENGLISH_STORAGE_KEYS,
  resetLearningProgress,
  clearSavedVocabulary,
  eraseAllFlipEnglishData,
} from '../src/features/settings/dataManagement';
import { STORAGE_KEYS } from '../src/constants/storageKeys';

function mockLocalStorageEnvironment(): {
  store: Map<string, string>;
  install: () => void;
} {
  const store = new Map<string, string>();

  const storageMock: Storage = {
    length: 0,
    clear: () => {
      throw new Error('localStorage.clear() MUST NOT be called!');
    },
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, String(val));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };

  (global as any).window = {
    localStorage: storageMock,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (global as any).localStorage = storageMock;

  return {
    store,
    install: () => {
      store.clear();
    },
  };
}

async function runDataManagementValidation() {
  console.log('--- 1. Validating Storage Key Categorization Invariants ---');

  // Verify learning keys contain all expected learning domains
  const expectedLearningKeys = [
    STORAGE_KEYS.PROGRESS,
    STORAGE_KEYS.REVIEW,
    STORAGE_KEYS.REVIEW_STATS,
    STORAGE_KEYS.EXAM_HISTORY,
    STORAGE_KEYS.EXAM_ACTIVE,
    STORAGE_KEYS.PLACEMENT_HISTORY,
    STORAGE_KEYS.PLACEMENT_ACTIVE,
    STORAGE_KEYS.STUDY_PLAN_TODAY,
    STORAGE_KEYS.STUDY_PLAN_HISTORY,
    STORAGE_KEYS.STREAK,
    STORAGE_KEYS.ACTIVE_TIME,
    STORAGE_KEYS.CONVERSATION_HISTORY,
  ];

  for (const k of expectedLearningKeys) {
    if (!FLIPENGLISH_LEARNING_STORAGE_KEYS.includes(k)) {
      console.error(`❌ Expected learning key missing from FLIPENGLISH_LEARNING_STORAGE_KEYS: ${k}`);
      process.exit(1);
    }
  }
  console.log('✅ Learning storage keys verified.');

  // Verify vocabulary keys
  const expectedVocabKeys = [
    STORAGE_KEYS.DICTIONARY_RECENT,
    STORAGE_KEYS.DICTIONARY_SAVED,
    STORAGE_KEYS.DICTIONARY_HISTORY,
  ];

  for (const k of expectedVocabKeys) {
    if (!FLIPENGLISH_VOCABULARY_STORAGE_KEYS.includes(k)) {
      console.error(`❌ Expected vocabulary key missing from FLIPENGLISH_VOCABULARY_STORAGE_KEYS: ${k}`);
      process.exit(1);
    }
  }
  console.log('✅ Vocabulary storage keys verified.');

  // Verify preference keys
  const expectedPrefKeys = [
    STORAGE_KEYS.LOCALE,
    STORAGE_KEYS.REMINDERS,
    STORAGE_KEYS.STUDY_PLAN_SETTINGS,
    STORAGE_KEYS.ONBOARDING,
    STORAGE_KEYS.PWA_INSTALL_DISMISSED,
  ];

  for (const k of expectedPrefKeys) {
    if (!FLIPENGLISH_PREFERENCE_STORAGE_KEYS.includes(k)) {
      console.error(`❌ Expected preference key missing from FLIPENGLISH_PREFERENCE_STORAGE_KEYS: ${k}`);
      process.exit(1);
    }
  }
  console.log('✅ Preference storage keys verified.');

  // Verify ALL_FLIPENGLISH_STORAGE_KEYS contains all three groups without omissions
  const combinedExpected = [
    ...FLIPENGLISH_LEARNING_STORAGE_KEYS,
    ...FLIPENGLISH_VOCABULARY_STORAGE_KEYS,
    ...FLIPENGLISH_PREFERENCE_STORAGE_KEYS,
  ];

  if (ALL_FLIPENGLISH_STORAGE_KEYS.length !== combinedExpected.length) {
    console.error('❌ ALL_FLIPENGLISH_STORAGE_KEYS count mismatch with combined sub-arrays');
    process.exit(1);
  }
  console.log('✅ ALL_FLIPENGLISH_STORAGE_KEYS contains exact union.');

  console.log('\n--- 2. Validating Scoped Reset Operations & Unrelated Storage Isolation ---');

  const { store } = mockLocalStorageEnvironment();

  // Populate mock storage with FlipEnglish keys and unrelated third-party keys
  const UNRELATED_APP_KEY_1 = 'unrelated_app_user_token';
  const UNRELATED_APP_KEY_2 = 'unrelated_analytics_session_id';

  function populateStorage() {
    store.clear();
    // Fill all FlipEnglish keys
    for (const key of ALL_FLIPENGLISH_STORAGE_KEYS) {
      store.set(key, JSON.stringify({ sample: 'data', timestamp: Date.now() }));
    }
    // Fill unrelated keys
    store.set(UNRELATED_APP_KEY_1, 'secret_token_12345');
    store.set(UNRELATED_APP_KEY_2, 'analytics_session_9999');
  }

  // Test 1: Reset Learning Progress
  console.log('Testing: resetLearningProgress()...');
  populateStorage();
  const resetLearningRes = resetLearningProgress();

  if (!resetLearningRes.success) {
    console.error('❌ resetLearningProgress() failed');
    process.exit(1);
  }

  // Verify learning keys are gone
  for (const key of FLIPENGLISH_LEARNING_STORAGE_KEYS) {
    if (store.has(key)) {
      console.error(`❌ Learning key "${key}" was NOT removed by resetLearningProgress()`);
      process.exit(1);
    }
  }

  // Verify vocabulary keys are preserved
  for (const key of FLIPENGLISH_VOCABULARY_STORAGE_KEYS) {
    if (!store.has(key)) {
      console.error(`❌ Vocabulary key "${key}" was unexpectedly deleted by resetLearningProgress()`);
      process.exit(1);
    }
  }

  // Verify preferences are preserved
  for (const key of FLIPENGLISH_PREFERENCE_STORAGE_KEYS) {
    if (!store.has(key)) {
      console.error(`❌ Preference key "${key}" was unexpectedly deleted by resetLearningProgress()`);
      process.exit(1);
    }
  }

  // Verify unrelated keys are preserved
  if (!store.has(UNRELATED_APP_KEY_1) || !store.has(UNRELATED_APP_KEY_2)) {
    console.error('❌ Unrelated third-party keys were deleted by resetLearningProgress()');
    process.exit(1);
  }
  console.log('✅ resetLearningProgress() operates strictly on learning keys and preserves preferences & third-party storage.');

  // Test 2: Clear Saved Vocabulary
  console.log('Testing: clearSavedVocabulary()...');
  populateStorage();
  const clearVocabRes = await clearSavedVocabulary();

  if (!clearVocabRes.success) {
    console.error('❌ clearSavedVocabulary() failed');
    process.exit(1);
  }

  // Verify vocabulary keys are gone
  for (const key of FLIPENGLISH_VOCABULARY_STORAGE_KEYS) {
    if (store.has(key)) {
      console.error(`❌ Vocabulary key "${key}" was NOT removed by clearSavedVocabulary()`);
      process.exit(1);
    }
  }

  // Verify learning progress is preserved
  for (const key of FLIPENGLISH_LEARNING_STORAGE_KEYS) {
    if (!store.has(key)) {
      console.error(`❌ Learning key "${key}" was unexpectedly deleted by clearSavedVocabulary()`);
      process.exit(1);
    }
  }

  // Verify unrelated keys are preserved
  if (!store.has(UNRELATED_APP_KEY_1) || !store.has(UNRELATED_APP_KEY_2)) {
    console.error('❌ Unrelated third-party keys were deleted by clearSavedVocabulary()');
    process.exit(1);
  }
  console.log('✅ clearSavedVocabulary() operates strictly on vocabulary keys.');

  // Test 3: Erase All FlipEnglish Data
  console.log('Testing: eraseAllFlipEnglishData()...');
  populateStorage();
  const eraseAllRes = await eraseAllFlipEnglishData();

  if (!eraseAllRes.success) {
    console.error('❌ eraseAllFlipEnglishData() failed');
    process.exit(1);
  }

  // Verify all FlipEnglish keys are purged
  for (const key of ALL_FLIPENGLISH_STORAGE_KEYS) {
    if (store.has(key)) {
      console.error(`❌ FlipEnglish key "${key}" was NOT removed by eraseAllFlipEnglishData()`);
      process.exit(1);
    }
  }

  // Verify unrelated keys are STILL preserved (never calls localStorage.clear())
  if (!store.has(UNRELATED_APP_KEY_1) || !store.has(UNRELATED_APP_KEY_2)) {
    console.error('❌ Unrelated third-party keys were wiped by eraseAllFlipEnglishData() (check for unauthorized localStorage.clear())');
    process.exit(1);
  }
  console.log('✅ eraseAllFlipEnglishData() purges all FlipEnglish keys while leaving unrelated origin storage intact.');

  console.log('\n========================================');
  console.log('✅ ALL DATA MANAGEMENT VALIDATION CHECKS PASSED');
  console.log('========================================');
}

runDataManagementValidation().catch((err) => {
  console.error('❌ Uncaught exception in validateDataManagement:', err);
  process.exit(1);
});
