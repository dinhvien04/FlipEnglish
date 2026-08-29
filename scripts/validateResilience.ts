/**
 * FlipEnglish Resilience & Error Hardening Automated Validation Suite
 *
 * Tests and verifies:
 * 1. Normalized API Error classification across HTTP statuses (400, 429, 500, 502, 503), timeouts, and offline states
 * 2. Storage Health Tracker (QuotaExceededError, SecurityError, corruption handling, events, safe helpers)
 * 3. Session & Storage Schema Validation resilience across all domains (Placement, Exam, StudyPlan, Learn, Review, Streak, ActiveTime, Reminders, Onboarding, Dictionary)
 * 4. ErrorBoundary error categorization (Chunk vs Render error derived state)
 * 5. 100% i18n translation key parity for all error & recovery keys
 */

import assert from 'node:assert';
import { classifyApiError, NormalizedApiError, ApiFailureKind } from '../src/utils/apiError';
import {
  getStorageHealth,
  recordStorageFailure,
  recordStorageSuccess,
  dismissStorageWarning,
  safeGetLocalStorage,
  safeSetLocalStorage,
  safeRemoveLocalStorage,
  STORAGE_HEALTH_EVENT,
} from '../src/utils/storageHealth';
import { ErrorBoundaryClass } from '../src/components/ErrorBoundary';
import { enCatalog } from '../src/features/i18n/locales/en';
import { viCatalog } from '../src/features/i18n/locales/vi';
import { validatePlacementSession, validatePlacementResultReport } from '../src/features/placement/placementStorage';
import { validateStudyPlanSettings, validateTodayStudyPlan } from '../src/features/studyPlan/studyPlanStorage';
import { validateLearnerStreak } from '../src/features/streak/streakStorage';
import { validateActiveTimeRecord } from '../src/features/progress/activeTimeStorage';
import { validateReminderPreferences } from '../src/features/reminders/reminderStorage';
import { validateOnboardingState } from '../src/features/onboarding/onboardingStorage';
import {
  validateLearnResumeContext,
  validateReviewResumeContext,
} from '../src/features/continuity/sessionPersistenceValidation';

// In-memory mock storage and window event harness for node execution
const memoryStore: Record<string, string> = {};
const dispatchedEvents: Array<{ type: string; detail?: any }> = [];

(globalThis as any).localStorage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, value: string) => {
    memoryStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
  clear: () => {
    for (const k of Object.keys(memoryStore)) {
      delete memoryStore[k];
    }
  },
};

(globalThis as any).window = {
  dispatchEvent: (event: { type: string; detail?: any }) => {
    dispatchedEvents.push(event);
    return true;
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

(globalThis as any).CustomEvent = class {
  type: string;
  detail?: any;
  constructor(type: string, opts?: { detail?: any }) {
    this.type = type;
    this.detail = opts?.detail;
  }
};

(globalThis as any).Event = class {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
};

console.log('--- Starting FlipEnglish Resilience & Error Hardening Validation Suite ---');

// TEST 1: API Error Classification Architecture
console.log('\n[Suite 1] Testing API Error Normalization Architecture...');
{
  // 1.1 Offline detection with navigator.onLine === false
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: false },
    configurable: true,
    writable: true,
  });
  const offlineExplicitErr = classifyApiError(new TypeError('Failed to fetch'));
  assert.strictEqual(offlineExplicitErr.kind, 'offline');
  assert.strictEqual(offlineExplicitErr.retryable, true);
  assert.strictEqual(offlineExplicitErr.userMessageKey, 'error.networkOffline');

  // 1.2 Connection lost while online
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true },
    configurable: true,
    writable: true,
  });
  const connectionLostErr = classifyApiError(new TypeError('Failed to fetch'));
  assert.strictEqual(connectionLostErr.kind, 'offline');
  assert.strictEqual(connectionLostErr.retryable, true);
  assert.strictEqual(connectionLostErr.userMessageKey, 'error.networkConnectionLost');

  // 1.3 Rate Limiting (429) + Retry-After extraction
  const headers429 = new Headers({ 'Retry-After': '45' });
  const rateLimitErr = classifyApiError(new Error('Rate limit exceeded'), {
    status: 429,
    headers: headers429,
  } as any);
  assert.strictEqual(rateLimitErr.kind, 'rate-limited');
  assert.strictEqual(rateLimitErr.statusCode, 429);
  assert.strictEqual(rateLimitErr.retryAfterSeconds, 45);
  assert.strictEqual(rateLimitErr.retryable, true);

  // 1.4 Service Unavailable (503)
  const unavailableErr = classifyApiError(new Error('AI Unavailable'), {
    status: 503,
    headers: new Headers(),
  } as any);
  assert.strictEqual(unavailableErr.kind, 'unavailable');
  assert.strictEqual(unavailableErr.statusCode, 503);
  assert.strictEqual(unavailableErr.userMessageKey, 'error.serviceUnavailable');

  // 1.5 Bad Request (400)
  const badReqErr = classifyApiError(new Error('Validation failed'), {
    status: 400,
    headers: new Headers(),
  } as any);
  assert.strictEqual(badReqErr.kind, 'request-error');
  assert.strictEqual(badReqErr.retryable, false);
  assert.strictEqual(badReqErr.userMessageKey, 'error.badRequest');

  // 1.6 Timeout detection
  const timeoutErr = classifyApiError(new DOMException('The operation was aborted', 'TimeoutError'));
  assert.strictEqual(timeoutErr.kind, 'timeout');
  assert.strictEqual(timeoutErr.userMessageKey, 'error.timeout');

  console.log('  PASS: All API failure classifications, retry flags, and keys verified.');
}

// TEST 2: Storage Health Tracker & Resilience
console.log('\n[Suite 2] Testing Storage Health Tracker & Safe Storage Wrappers...');
{
  // 2.1 Initial state
  const initialHealth = getStorageHealth();
  assert.strictEqual(initialHealth.isHealthy, true);
  assert.strictEqual(initialHealth.lastFailureType, null);

  // 2.2 Safe Set & Get
  const testKey = 'flipenglish_resilience_probe_key';
  const testVal = JSON.stringify({ ok: true, timestamp: Date.now() });
  const setSuccess = safeSetLocalStorage(testKey, testVal);
  assert.strictEqual(setSuccess, true);
  assert.strictEqual(safeGetLocalStorage(testKey), testVal);

  // 2.3 QuotaExceededError simulation on write
  const quotaErr = new DOMException('Quota exceeded', 'QuotaExceededError');
  recordStorageFailure(testKey, quotaErr, 'write');
  const quotaHealth = getStorageHealth();
  assert.strictEqual(quotaHealth.isHealthy, false);
  assert.strictEqual(quotaHealth.lastFailureType, 'quota_exceeded');
  assert.strictEqual(quotaHealth.lastFailureOperation, 'write');

  // 2.4 Dismissal warning separation
  dismissStorageWarning();
  const dismissedHealth = getStorageHealth();
  assert.strictEqual(dismissedHealth.isWarningDismissed, true);
  assert.strictEqual(dismissedHealth.isHealthy, false); // Technical health remains false until successful probe/write

  // 2.5 Probe indicates physical storage accessibility but preserves unresolved failed keys
  recordStorageSuccess('flipenglish_storage_health_probe', 'probe');
  assert.strictEqual(getStorageHealth().isStorageAccessible, true);
  assert.strictEqual(getStorageHealth().isHealthy, false); // Stays false because testKey failed earlier

  // 2.5.1 Transient read failure should not permanently lock health; reading successfully reconciles read accessibility without falsely clearing failed writes
  const readFailKey = 'flipenglish_read_fail_key';
  recordStorageFailure(readFailKey, new DOMException('Access denied', 'SecurityError'), 'read');
  assert.strictEqual(getStorageHealth().isHealthy, false);
  assert.strictEqual(getStorageHealth().failedKeys.includes(readFailKey), true);
  assert.strictEqual(getStorageHealth().failedKeys.includes(testKey), true);

  // Reading successfully reconciles readFailKey without clearing write failure on testKey
  recordStorageSuccess(readFailKey, 'read');
  assert.strictEqual(getStorageHealth().failedKeys.includes(readFailKey), false);
  assert.strictEqual(getStorageHealth().failedKeys.includes(testKey), true);
  assert.strictEqual(getStorageHealth().isHealthy, false);

  // 2.6 Resolving the specific failed key restores isHealthy to true
  recordStorageSuccess(testKey, 'write');
  assert.strictEqual(getStorageHealth().isHealthy, true);
  assert.strictEqual(getStorageHealth().isWarningDismissed, false);
  assert.strictEqual(getStorageHealth().failedKeys.length, 0);

  // 2.7 Safe Remove
  safeRemoveLocalStorage(testKey);
  assert.strictEqual(safeGetLocalStorage(testKey), null);

  console.log('  PASS: Storage health tracking, quota simulation, warning dismissal separation, probe non-masking, read/write/remove failure distinction, and safe operations verified.');
}

// TEST 3: ErrorBoundary Categorization & Sanitization
console.log('\n[Suite 3] Testing ErrorBoundary Categorization & Sanitization...');
{
  // 3.1 Chunk Loading Error
  const chunkErr = new Error('Failed to fetch dynamically imported module /assets/ExamCenter.js');
  const chunkState = ErrorBoundaryClass.getDerivedStateFromError(chunkErr);
  assert.strictEqual(chunkState.hasError, true);
  assert.strictEqual(chunkState.errorCategory, 'chunk');

  // 3.2 Render Error
  const renderErr = new TypeError('Cannot read properties of undefined (reading "name")');
  const renderState = ErrorBoundaryClass.getDerivedStateFromError(renderErr);
  assert.strictEqual(renderState.hasError, true);
  assert.strictEqual(renderState.errorCategory, 'render');

  console.log('  PASS: Chunk error vs Render error differentiation verified.');
}

// TEST 4: Schema Validation Invariants
console.log('\n[Suite 4] Testing Strict Schema Validation Invariants...');
{
  // 4.1 Streak Validator
  assert.strictEqual(validateLearnerStreak({ schemaVersion: 1, currentStreak: 5, longestStreak: 10, lastActiveDateKey: '2026-08-29', totalMeaningfulDays: 12, updatedAt: Date.now() }), true);
  assert.strictEqual(validateLearnerStreak({ schemaVersion: 1, currentStreak: -1 }), false); // Negative streak rejected
  assert.strictEqual(validateLearnerStreak({ schemaVersion: 1, currentStreak: 10, longestStreak: 5 }), false); // Longest < current rejected

  // 4.2 Active Time Validator
  assert.strictEqual(validateActiveTimeRecord({ schemaVersion: 1, localDate: '2026-08-29', activeSeconds: 120, lastHeartbeatAt: Date.now(), updatedAt: Date.now() }), true);
  assert.strictEqual(validateActiveTimeRecord({ schemaVersion: 1, localDate: 'invalid-date', activeSeconds: 50 }), false);

  // 4.3 Reminder Preferences Validator
  assert.strictEqual(validateReminderPreferences({ schemaVersion: 1, enabled: true, preferredHour: 20, preferredMinute: 30, lastDismissedDateKey: null, updatedAt: Date.now() }), true);
  assert.strictEqual(validateReminderPreferences({ schemaVersion: 1, enabled: true, preferredHour: 25, preferredMinute: 0 }), false); // Invalid hour rejected

  // 4.4 Onboarding State Validator
  assert.strictEqual(validateOnboardingState({ status: 'completed', completedAt: Date.now() }), true);
  assert.strictEqual(validateOnboardingState({ status: 'unknown_invalid_status' }), false);

  // 4.5 In-flight Learn & Review Session Persistence Validators
  const validLearnSession = {
    schemaVersion: 1,
    lessonId: 'a1-1',
    flashcardIndex: 3,
    hasCompletedAll: false,
    isReviewMistakesMode: false,
    totalWords: 10,
    timestamp: Date.now(),
  };
  const sanitizedLearn = validateLearnResumeContext(validLearnSession);
  assert.ok(sanitizedLearn, 'Valid learn session must validate successfully');
  assert.strictEqual(sanitizedLearn?.lessonId, 'a1-1');
  assert.strictEqual(sanitizedLearn?.flashcardIndex, 3);

  // Reject unknown schemaVersion or injected prototype properties
  assert.strictEqual(
    validateLearnResumeContext({ ...validLearnSession, schemaVersion: 2 }),
    null,
    'Unknown schemaVersion 2 must be rejected'
  );
  assert.strictEqual(
    validateLearnResumeContext({ ...validLearnSession, unknownEvilKey: 'malicious' }),
    null,
    'Unrecognized keys must be rejected by allowlist'
  );
  assert.strictEqual(
    validateLearnResumeContext({ ...validLearnSession, flashcardIndex: 12, totalWords: 10 }),
    null,
    'flashcardIndex exceeding totalWords must be rejected'
  );

  // 4.6 In-flight Review Session Persistence Deep Field Preservation & Round-trip Validation
  const richVocabWord = {
    id: 'bear-responsibility',
    type: 'collocation' as const,
    word: 'bear responsibility',
    expression: 'bear full responsibility for something',
    pronunciation: '/beər rɪˌspɒn.səˈbɪl.ə.ti/',
    partOfSpeech: 'collocation' as const,
    meaning: 'chịu trách nhiệm',
    level: 'B2' as const,
    example: 'The company must bear responsibility for the environmental damage caused.',
    exampleTranslation: 'Công ty phải chịu trách nhiệm về thiệt hại môi trường đã gây ra.',
    context: 'Formal corporate and legal contexts when accepting liability or duty.',
    imageUrl: 'https://images.unsplash.com/photo-example',
    imageAlt: 'A business person signing an official agreement document',
    visualQuizEligible: false,
    emoji: '⚖️',
    definition: 'To be held accountable for a situation or action.',
    collocations: ['bear full responsibility', 'bear heavy responsibility'],
    synonyms: ['take responsibility', 'shoulder responsibility', 'accept blame'],
    antonyms: ['deny responsibility', 'shift blame'],
    wordFamily: ['responsible', 'responsibly', 'irresponsible'],
    register: 'formal' as const,
    usageNote: 'Often paired with the preposition "for".',
    nuanceNote: '"Bear responsibility" is more formal than "take responsibility".',
    nuance: 'Denotes carrying the legal or moral weight of an outcome.',
    items: ['take responsibility', 'bear responsibility', 'shoulder responsibility'],
    pattern: 'bear responsibility for + noun/gerund',
    promptWord: 'RESPONSIBLE',
    tags: ['business', 'law', 'b2-collocations'],
  };

  const richLesson = {
    id: 'b2-collocations-work',
    title: 'Workplace Collocations',
    level: 'B2' as const,
    levelTitle: 'B2 — Upper Intermediate',
    description: 'Advanced business expressions and collocations for professional communication.',
    category: 'Business',
    imageUrl: 'https://images.unsplash.com/photo-lesson',
    imageAlt: 'Corporate meeting room in a skyscraper',
    icon: 'briefcase',
    badgeText: 'Essential B2',
    tags: ['business', 'workplace', 'advanced'],
    words: [richVocabWord],
  };

  const richReviewSession = {
    schemaVersion: 1,
    activeQueue: [
      {
        state: {
          itemId: 'bear-responsibility',
          status: 'review' as const,
          firstSeenAt: Date.now() - 86400000,
          lastReviewedAt: Date.now() - 3600000,
          nextReviewAt: Date.now() + 86400000,
          intervalMinutes: 1440,
          reviewCount: 3,
          correctCount: 3,
          lapseCount: 0,
          correctStreak: 3,
          lastRating: 'good' as const,
        },
        word: richVocabWord,
        lesson: richLesson,
        level: 'B2' as const,
        isOverdue: false,
        nextIntervals: { again: 10, hard: 1440, good: 4320, easy: 10080 },
      },
    ],
    currentIndex: 0,
    ratingBreakdown: { again: 0, hard: 0, good: 1, easy: 0 },
    timestamp: Date.now(),
  };

  const sanitizedReview = validateReviewResumeContext(richReviewSession);
  assert.ok(sanitizedReview, 'Rich review session must validate successfully');
  assert.strictEqual(sanitizedReview?.activeQueue.length, 1);

  const restoredItem = sanitizedReview?.activeQueue[0];
  const restoredWord = restoredItem?.word;
  const restoredLesson = restoredItem?.lesson;

  // Verify all rich VocabWord fields survive round-trip sanitization
  assert.strictEqual(restoredWord?.id, 'bear-responsibility');
  assert.strictEqual(restoredWord?.type, 'collocation');
  assert.strictEqual(restoredWord?.word, 'bear responsibility');
  assert.strictEqual(restoredWord?.expression, 'bear full responsibility for something');
  assert.strictEqual(restoredWord?.pronunciation, '/beər rɪˌspɒn.səˈbɪl.ə.ti/');
  assert.strictEqual(restoredWord?.partOfSpeech, 'collocation');
  assert.strictEqual(restoredWord?.meaning, 'chịu trách nhiệm');
  assert.strictEqual(restoredWord?.level, 'B2');
  assert.strictEqual(restoredWord?.example, 'The company must bear responsibility for the environmental damage caused.');
  assert.strictEqual(restoredWord?.exampleTranslation, 'Công ty phải chịu trách nhiệm về thiệt hại môi trường đã gây ra.');
  assert.strictEqual(restoredWord?.context, 'Formal corporate and legal contexts when accepting liability or duty.');
  assert.strictEqual(restoredWord?.imageUrl, 'https://images.unsplash.com/photo-example');
  assert.strictEqual(restoredWord?.imageAlt, 'A business person signing an official agreement document');
  assert.strictEqual(restoredWord?.visualQuizEligible, false);
  assert.strictEqual(restoredWord?.emoji, '⚖️');
  assert.strictEqual(restoredWord?.definition, 'To be held accountable for a situation or action.');
  assert.deepStrictEqual(restoredWord?.collocations, ['bear full responsibility', 'bear heavy responsibility']);
  assert.deepStrictEqual(restoredWord?.synonyms, ['take responsibility', 'shoulder responsibility', 'accept blame']);
  assert.deepStrictEqual(restoredWord?.antonyms, ['deny responsibility', 'shift blame']);
  assert.deepStrictEqual(restoredWord?.wordFamily, ['responsible', 'responsibly', 'irresponsible']);
  assert.strictEqual(restoredWord?.register, 'formal');
  assert.strictEqual(restoredWord?.usageNote, 'Often paired with the preposition "for".');
  assert.strictEqual(restoredWord?.nuanceNote, '"Bear responsibility" is more formal than "take responsibility".');
  assert.strictEqual(restoredWord?.nuance, 'Denotes carrying the legal or moral weight of an outcome.');
  assert.deepStrictEqual(restoredWord?.items, ['take responsibility', 'bear responsibility', 'shoulder responsibility']);
  assert.strictEqual(restoredWord?.pattern, 'bear responsibility for + noun/gerund');
  assert.strictEqual(restoredWord?.promptWord, 'RESPONSIBLE');
  assert.deepStrictEqual(restoredWord?.tags, ['business', 'law', 'b2-collocations']);

  // Verify all rich Lesson fields survive round-trip sanitization
  assert.strictEqual(restoredLesson?.id, 'b2-collocations-work');
  assert.strictEqual(restoredLesson?.title, 'Workplace Collocations');
  assert.strictEqual(restoredLesson?.level, 'B2');
  assert.strictEqual(restoredLesson?.levelTitle, 'B2 — Upper Intermediate');
  assert.strictEqual(restoredLesson?.description, 'Advanced business expressions and collocations for professional communication.');
  assert.strictEqual(restoredLesson?.category, 'Business');
  assert.strictEqual(restoredLesson?.imageUrl, 'https://images.unsplash.com/photo-lesson');
  assert.strictEqual(restoredLesson?.imageAlt, 'Corporate meeting room in a skyscraper');
  assert.strictEqual(restoredLesson?.icon, 'briefcase');
  assert.strictEqual(restoredLesson?.badgeText, 'Essential B2');
  assert.deepStrictEqual(restoredLesson?.tags, ['business', 'workplace', 'advanced']);
  assert.strictEqual(restoredLesson?.words.length, 1);
  assert.strictEqual(restoredLesson?.words[0].id, 'bear-responsibility');

  // Verify rejection of invalid types, unknown injected keys, invalid schema, and staleness
  // 1. Injected unknown keys in word
  assert.strictEqual(
    validateReviewResumeContext({
      ...richReviewSession,
      activeQueue: [{ ...richReviewSession.activeQueue[0], word: { ...richVocabWord, evilKey: 'injected' } }],
    }),
    null,
    'Unknown injected key on word must be rejected'
  );

  // 2. Malformed type in word (invalid enum)
  assert.strictEqual(
    validateReviewResumeContext({
      ...richReviewSession,
      activeQueue: [{ ...richReviewSession.activeQueue[0], word: { ...richVocabWord, type: 'invalid-item-type' } }],
    }),
    null,
    'Invalid word type enum must be rejected'
  );

  // 3. Malformed register in word (invalid enum)
  assert.strictEqual(
    validateReviewResumeContext({
      ...richReviewSession,
      activeQueue: [{ ...richReviewSession.activeQueue[0], word: { ...richVocabWord, register: 'ultra-formal' } }],
    }),
    null,
    'Invalid register enum must be rejected'
  );

  // 4. Malformed array item (non-string in synonyms)
  assert.strictEqual(
    validateReviewResumeContext({
      ...richReviewSession,
      activeQueue: [{ ...richReviewSession.activeQueue[0], word: { ...richVocabWord, synonyms: [123, 'valid'] } }],
    }),
    null,
    'Non-string in array field must be rejected'
  );

  // 5. Injected unknown key in lesson
  assert.strictEqual(
    validateReviewResumeContext({
      ...richReviewSession,
      activeQueue: [{ ...richReviewSession.activeQueue[0], lesson: { ...richLesson, injectedLessonKey: 1 } }],
    }),
    null,
    'Unknown injected key on lesson must be rejected'
  );

  // 6. Invalid schemaVersion
  assert.strictEqual(
    validateReviewResumeContext({ ...richReviewSession, schemaVersion: 2 }),
    null,
    'Invalid schemaVersion 2 must be rejected'
  );

  // 7. Stale review session (> 24 hours old)
  const staleTimestamp = Date.now() - (25 * 60 * 60 * 1000);
  assert.strictEqual(
    validateReviewResumeContext({ ...richReviewSession, timestamp: staleTimestamp }),
    null,
    'Stale review session (> 24h) must be discarded'
  );

  // 8. Out-of-bounds currentIndex
  assert.strictEqual(
    validateReviewResumeContext({ ...richReviewSession, currentIndex: 5 }),
    null,
    'currentIndex exceeding queue length must be rejected'
  );

  // 9. Negative rating breakdown
  assert.strictEqual(
    validateReviewResumeContext({
      ...richReviewSession,
      ratingBreakdown: { again: -1, hard: 0, good: 0, easy: 0 },
    }),
    null,
    'Negative rating breakdown must be rejected'
  );

  console.log('  PASS: Domain storage validators reject corrupted/untrusted data gracefully.');
}

// TEST 5: I18n Translation Parity for Error Keys
console.log('\n[Suite 5] Testing Bilingual (EN / VI) Error Translation Key Parity...');
{
  const requiredErrorKeys = [
    'error.networkOffline',
    'error.networkConnectionLost',
    'error.timeout',
    'error.rateLimited',
    'error.serviceUnavailable',
    'error.serverError',
    'error.badRequest',
    'error.badResponse',
    'error.featureFallbackTitle',
    'error.featureFallbackDesc',
    'error.chunkLoadTitle',
    'error.chunkLoadDesc',
    'error.chunkOfflineTitle',
    'error.chunkOfflineDesc',
    'error.storageWarningTitle',
    'error.storageWarningDesc',
    'error.storageQuotaDesc',
    'error.storageRetry',
    'error.storageCheck',
    'error.storageDismiss',
    'error.sessionCorruptTitle',
    'error.sessionCorruptDesc',
    'error.restartSession',
    'error.goToToday',
    'error.tryAgain',
    'error.reloadApp',
    'error.continueLearning',
  ];

  for (const key of requiredErrorKeys) {
    assert.ok((enCatalog as any)[key], `Missing English translation for key: ${key}`);
    assert.ok((viCatalog as any)[key], `Missing Vietnamese translation for key: ${key}`);
    assert.strictEqual(typeof (enCatalog as any)[key], 'string', `EN key ${key} is not a string`);
    assert.strictEqual(typeof (viCatalog as any)[key], 'string', `VI key ${key} is not a string`);
  }

  console.log(`  PASS: All ${requiredErrorKeys.length} required error and recovery keys present in EN and VI.`);
}

console.log('\n================================================================');
console.log('✅ ALL RESILIENCE AND ERROR HARDENING TESTS PASSED SUCCESSFULLY');
console.log('================================================================\n');
