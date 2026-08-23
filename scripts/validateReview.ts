import {
  scheduleReview,
  createInitialReviewState,
  recordMistakeSignal,
  calculateNextInterval,
  determineStatus,
  clampInterval,
  MIN_INTERVAL_MINUTES,
  MAX_INTERVAL_MINUTES,
  INTERVAL_1_DAY_MINUTES,
  INTERVAL_3_DAYS_MINUTES,
  INTERVAL_7_DAYS_MINUTES,
  INTERVAL_30_DAYS_MINUTES,
} from '../src/utils/reviewScheduler';
import {
  loadReviewStorage,
  saveReviewStorage,
  getDueReviewItems,
  getAllTrackedReviewItems,
  ensureReviewItem,
  applyReviewRatingToItem,
  recordQuizMistake,
  getReviewDashboardStats,
  resetReviewStorage,
  batchAddLessonWordsToReview,
  batchAddItemsToReview,
} from '../src/utils/reviewStorage';
import { resolveCurriculumItem } from '../src/utils/curriculumIndex';
import { ReviewItemState } from '../src/types/review';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

console.log('=== Running FlipEnglish Smart Review Integrity & Scheduler Tests ===\n');

// Mock localStorage for Node.js test environment
const mockStorage: Record<string, string> = {};
const mockWindowEvents: string[] = [];

if (typeof global.localStorage === 'undefined') {
  (global as any).localStorage = {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = String(v);
    },
    removeItem: (k: string) => {
      delete mockStorage[k];
    },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
  };
}

if (typeof (global as any).window === 'undefined') {
  (global as any).window = {
    dispatchEvent: (e: any) => {
      mockWindowEvents.push(e?.type || 'event');
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (global as any).Event = class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
}

const T0 = 1700000000000; // Base timestamp for deterministic tests

// 1. Initial Review Intervals Test
console.log('Test Suite 1: Initial Review Intervals (First Recall)');
const item1 = createInitialReviewState('hello', T0);

const sAgain = scheduleReview(item1, 'again', T0);
assert(sAgain.intervalMinutes === 10, 'NEW + Again schedules 10 minutes');
assert(sAgain.nextReviewAt === T0 + 10 * 60 * 1000, 'NEW + Again nextReviewAt is T0 + 10min');
assert(sAgain.status === 'learning', 'NEW + Again status is learning');
assert(sAgain.correctStreak === 0, 'NEW + Again correctStreak is 0');
assert(sAgain.lapseCount === 1, 'NEW + Again lapseCount is 1');

const sHard = scheduleReview(item1, 'hard', T0);
assert(sHard.intervalMinutes === INTERVAL_1_DAY_MINUTES, 'NEW + Hard schedules 1 day (1440 min)');
assert(sHard.status === 'learning', 'NEW + Hard status is learning');
assert(sHard.correctStreak === 1, 'NEW + Hard correctStreak is 1');

const sGood = scheduleReview(item1, 'good', T0);
assert(sGood.intervalMinutes === INTERVAL_3_DAYS_MINUTES, 'NEW + Good schedules 3 days (4320 min)');
assert(sGood.status === 'review', 'NEW + Good status is review');
assert(sGood.correctStreak === 1, 'NEW + Good correctStreak is 1');

const sEasy = scheduleReview(item1, 'easy', T0);
assert(sEasy.intervalMinutes === INTERVAL_7_DAYS_MINUTES, 'NEW + Easy schedules 7 days (10080 min)');
assert(sEasy.status === 'review', 'NEW + Easy status is review');
assert(sEasy.correctStreak === 1, 'NEW + Easy correctStreak is 1');

// 2. Subsequent Review Intervals (Interval Growth)
console.log('\nTest Suite 2: Subsequent Review Intervals (Growth & Multipliers)');
let progressiveState: ReviewItemState = sGood; // 3 days (4320 min), streak 1
const T1 = T0 + INTERVAL_3_DAYS_MINUTES * 60 * 1000;

// Review 2: Good -> max(4320, round(4320 * 2.2)) = 9504 min (~6.6 days)
progressiveState = scheduleReview(progressiveState, 'good', T1);
assert(progressiveState.intervalMinutes === 9504, 'Subsequent Good multiplies by ~2.2');
assert(progressiveState.correctStreak === 2, 'Streak increments to 2');
assert(progressiveState.status === 'review', 'Status remains review');

// Review 3: Easy -> max(10080, round(9504 * 3.2)) = 30413 min (~21 days)
const T2 = T1 + 9504 * 60 * 1000;
progressiveState = scheduleReview(progressiveState, 'easy', T2);
assert(progressiveState.intervalMinutes === 30413, 'Subsequent Easy multiplies by ~3.2');
assert(progressiveState.correctStreak === 3, 'Streak increments to 3');

// Review 4: Easy -> max(10080, round(30413 * 3.2)) = 97322 min (~67.5 days)
const T3 = T2 + 30413 * 60 * 1000;
progressiveState = scheduleReview(progressiveState, 'easy', T3);
assert(progressiveState.intervalMinutes === 97322, 'Interval reaches > 30 days');
assert(progressiveState.correctStreak === 4, 'Streak reaches 4');
assert(progressiveState.status === 'mastered', 'Item becomes Mastered when streak >= 4 and interval >= 30 days');

// 3. Memory Lapse on Mastered Item
console.log('\nTest Suite 3: Memory Lapse on Mastered Item');
const T4 = T3 + 97322 * 60 * 1000;
const lapsedMastered = scheduleReview(progressiveState, 'again', T4);
assert(lapsedMastered.intervalMinutes === 10, 'Mastered + Again drops interval to 10 min');
assert(lapsedMastered.status === 'learning', 'Mastered + Again transitions back to learning');
assert(lapsedMastered.correctStreak === 0, 'Mastered + Again resets correctStreak to 0');
assert(lapsedMastered.lapseCount === 1, 'LapseCount is incremented');

// 4. Maximum Interval Cap
console.log('\nTest Suite 4: Maximum Interval Cap');
const hugeIntervalItem: ReviewItemState = {
  ...progressiveState,
  intervalMinutes: 500000,
};
const cappedItem = scheduleReview(hugeIntervalItem, 'easy', T4);
assert(cappedItem.intervalMinutes === MAX_INTERVAL_MINUTES, 'Interval is safely capped at 365 days (525600 min)');

// 5. Quiz Mistake Signal
console.log('\nTest Suite 5: Quiz Mistake Signal');
const activeItem: ReviewItemState = {
  itemId: 'apple',
  status: 'review',
  firstSeenAt: T0,
  lastReviewedAt: T1,
  nextReviewAt: T1 + 10000000,
  intervalMinutes: 4320,
  reviewCount: 3,
  correctCount: 3,
  lapseCount: 0,
  correctStreak: 3,
  lastRating: 'good',
};
const afterMistake = recordMistakeSignal(activeItem, T2);
assert(afterMistake.intervalMinutes === 10, 'Mistake signal sets interval to 10 min');
assert(afterMistake.status === 'learning', 'Mistake signal sets status to learning');
assert(afterMistake.correctStreak === 0, 'Mistake signal resets streak');
assert(afterMistake.lapseCount === 1, 'Mistake signal increments lapseCount');
assert(afterMistake.nextReviewAt === T2 + 10 * 60 * 1000, 'Mistake makes item due in 10 minutes');

// 6. Curriculum Item Resolution & Orphan Protection
console.log('\nTest Suite 6: Canonical Curriculum Lookup & Orphan Rejection');
const resolvedHello = resolveCurriculumItem('hello');
assert(Boolean(resolvedHello), 'Canonical item "hello" is resolved in curriculum');
assert(resolvedHello?.word.word === 'Hello', 'Item word matches "Hello"');
assert(resolvedHello?.level === 'A1', 'Item level is A1');

const orphanItem = resolveCurriculumItem('non-existent-fake-id-999');
assert(orphanItem === undefined, 'Orphan ID safely resolves to undefined');

// 7. Storage Persistence & Untrusted Input Sanitization
console.log('\nTest Suite 7: Untrusted localStorage Sanitization & Graceful Recovery');
resetReviewStorage();

// Add valid item
ensureReviewItem('hello', T0);
applyReviewRatingToItem('hello', 'good', T0);

const stats1 = getReviewDashboardStats(T0);
assert(stats1.totalTracked === 1, 'Total tracked is 1');
assert(stats1.reviewCount === 1, 'Review count is 1');

// Inject malicious / corrupted JSON into localStorage
localStorage.setItem(
  'flipenglish_review_v1',
  JSON.stringify({
    schemaVersion: 1,
    items: {
      hello: {
        itemId: 'hello',
        status: 'mastered',
        firstSeenAt: T0,
        lastReviewedAt: T0,
        nextReviewAt: 9999999999999999, // Too far in future
        intervalMinutes: -500, // Negative interval
        reviewCount: 'malformed_string',
        correctCount: -10,
        lapseCount: 0,
        correctStreak: 5,
        lastRating: 'invalid_rating',
      },
      fake_orphan_id: {
        itemId: 'fake_orphan_id',
        status: 'learning',
        firstSeenAt: T0,
        nextReviewAt: T0,
        intervalMinutes: 10,
      },
    },
  })
);

const loaded = loadReviewStorage();
assert(Boolean(loaded.items['hello']), 'Hello item recovered safely');
assert(loaded.items['hello'].intervalMinutes === 10, 'Negative interval clamped to safe minimum (10 min)');
assert(loaded.items['hello'].correctCount === 0, 'Negative counter sanitized to 0');
assert(loaded.items['hello'].lastRating === null, 'Invalid rating enum sanitized to null');
assert(!loaded.items['fake_orphan_id'], 'Orphan item absent from curriculum pruned automatically');

// 8. Queue Prioritization & Session Limit
console.log('\nTest Suite 8: Due Queue Generation & Prioritization');
resetReviewStorage();

// Create 3 items with different due dates and lapse states
// Item A: due in 5 days (future, not due at T0)
const sA = createInitialReviewState('mother', T0);
sA.nextReviewAt = T0 + 5 * 24 * 60 * 60 * 1000;

// Item B: overdue by 2 hours, status review
const sB = createInitialReviewState('father', T0);
sB.nextReviewAt = T0 - 2 * 60 * 60 * 1000;
sB.status = 'review';

// Item C: overdue by 1 hour, status learning (lapsed)
const sC = createInitialReviewState('brother', T0);
sC.nextReviewAt = T0 - 1 * 60 * 60 * 1000;
sC.status = 'learning';
sC.lapseCount = 2;

saveReviewStorage({
  schemaVersion: 1,
  items: { mother: sA, father: sB, brother: sC },
});

const dueItems = getDueReviewItems(20, T0);
assert(dueItems.length === 2, 'Only due items selected (2 of 3)');
assert(dueItems[0].word.id === 'brother', 'Lapsed learning item prioritized first in queue');
assert(dueItems[1].word.id === 'father', 'Overdue review item included second');

// 9. Recent Accuracy & Calendar Days Boundaries
console.log('\nTest Suite 9: Recent Accuracy (Hard/Good/Easy vs Again) & Calendar Day Boundaries');
resetReviewStorage();

// Add items and apply ratings
ensureReviewItem('hello', T0);
applyReviewRatingToItem('hello', 'hard', T0); // hard = successful

ensureReviewItem('family', T0);
applyReviewRatingToItem('family', 'again', T0); // again = failed

ensureReviewItem('friend', T0);
applyReviewRatingToItem('friend', 'good', T0); // good = successful

ensureReviewItem('water', T0);
applyReviewRatingToItem('water', 'easy', T0); // easy = successful

const statsAfter4 = getReviewDashboardStats(T0);
// 3 successful out of 4 = 75%
assert(statsAfter4.recentAccuracy === 75, `Recent accuracy correctly counts hard/good/easy as success (expected 75%, got ${statsAfter4.recentAccuracy}%)`);

// Test calendar day tomorrow count
const tStart = new Date(T0);
tStart.setHours(0, 0, 0, 0);
const tomStartMs = tStart.getTime() + 24 * 60 * 60 * 1000;
const tomMidMs = tomStartMs + 12 * 60 * 60 * 1000;

const loadedStorage = loadReviewStorage(T0);
loadedStorage.items['hello'].nextReviewAt = tomMidMs;
saveReviewStorage(loadedStorage);

const statsTom = getReviewDashboardStats(T0);
assert(statsTom.dueTomorrowCount === 1, 'Item scheduled in tomorrow calendar window correctly counted in dueTomorrowCount');

// 10. Bounded Session Limit & Batch Add Items
console.log('\nTest Suite 10: Bounded Session Limit & Batch Add Items');
resetReviewStorage();
batchAddLessonWordsToReview('greetings', T0);
const allTracked = getAllTrackedReviewItems(20, T0);
assert(allTracked.length <= 20, 'getAllTrackedReviewItems is bounded by maxCount');

console.log('\n✅ All FlipEnglish Smart Review tests and scheduler invariants passed successfully!');
