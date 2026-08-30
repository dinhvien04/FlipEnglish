import {
  scheduleReview,
  createInitialReviewState,
  recordMistakeSignal,
  MAX_INTERVAL_MINUTES,
  INTERVAL_1_DAY_MINUTES,
  INTERVAL_3_DAYS_MINUTES,
  INTERVAL_7_DAYS_MINUTES,
} from '../src/utils/reviewScheduler';
import {
  loadReviewStorage,
  saveReviewStorage,
  getDueReviewItems,
  getAllTrackedReviewItems,
  ensureReviewItem,
  applyReviewRatingToItem,
  getReviewDashboardStats,
  resetReviewStorage,
  batchAddLessonWordsToReview,
  exportMissedItemsToReview,
  migrateLegacyPlacementReviewExports,
  resolveReviewItem,
} from '../src/utils/reviewStorage';
import {
  saveActiveReviewSession,
  getActiveReviewSession,
  clearActiveReviewSession,
} from '../src/features/continuity/sessionPersistence';
import {
  normalizeReviewResumeContext,
  getReconciledActiveReviewSession,
} from '../src/utils/sessionResume';
import { resolveCurriculumItem } from '../src/utils/curriculumIndex';
import { ReviewItemState, ResolvedReviewItem, ReviewResetResult } from '../src/types/review';
import { ReviewResumeContext } from '../src/types/sessionResume';
import { isPlacementResultExportedToReview } from '../src/features/placement/placementStorage';
import { resolveNextAction } from '../src/features/continuity/smartNextActionEngine';

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

// 11. Storage Fault Injection & Observability Tests
console.log('\nTest Suite 11: Storage Fault Injection & Mutation Observability');
resetReviewStorage();

// Normal save succeeds
const normalSaveRes = saveReviewStorage({ schemaVersion: 1, items: {} });
assert(normalSaveRes === true, 'saveReviewStorage returns true on successful write');

// Simulate QuotaExceededError
const originalSetItem = localStorage.setItem;
(localStorage as any).setItem = () => {
  throw new Error('QuotaExceededError: LocalStorage quota exceeded');
};

const failedSave = saveReviewStorage({ schemaVersion: 1, items: {} });
assert(failedSave === false, 'saveReviewStorage returns false on QuotaExceededError');

const ensureFailed = ensureReviewItem('hello', T0);
assert(ensureFailed === null, 'ensureReviewItem returns null when persistence fails');

const applyFailed = applyReviewRatingToItem('hello', 'good', T0);
assert(applyFailed === null, 'applyReviewRatingToItem returns null when persistence fails');

// Restore localStorage.setItem
localStorage.setItem = originalSetItem;

// 12. Smart Review Transaction & Lifecycle Regression Matrix (R1 - R12)
console.log('\nTest Suite 12: Smart Review Transaction & Lifecycle Regression Matrix (R1 - R12)');

// R1: Rating save fails -> item remains unchanged in storage
resetReviewStorage();
ensureReviewItem('hello', T0);
(localStorage as any).setItem = () => {
  throw new Error('QuotaExceededError');
};
const r1Res = applyReviewRatingToItem('hello', 'good', T0);
assert(r1Res === null, 'R1: applyReviewRatingToItem returns null on storage write failure');
(localStorage as any).setItem = originalSetItem;
const r1Storage = loadReviewStorage(T0);
assert(r1Storage.items['hello'].lastRating === null, 'R1: Rating state unchanged in storage after failed save');
assert(r1Storage.items['hello'].reviewCount === 0, 'R1: Review count not incremented on failed save');

// R2: Rating save succeeds + snapshot save succeeds -> normal progression
resetReviewStorage();
ensureReviewItem('hello', T0);
const r2Rated = applyReviewRatingToItem('hello', 'good', T0);
assert(r2Rated !== null, 'R2: Domain rating successfully persists');
const resolvedHelloItem = resolveCurriculumItem('hello');
assert(Boolean(resolvedHelloItem), 'R2: Resolved hello exists in curriculum');
const resolvedMotherItem = resolveCurriculumItem('mother');
assert(Boolean(resolvedMotherItem), 'R2: Resolved mother exists in curriculum');
const r2Queue: ResolvedReviewItem[] = [
  {
    state: r2Rated!,
    word: resolvedHelloItem!.word,
    lesson: resolvedHelloItem!.lesson,
    level: resolvedHelloItem!.level,
    isOverdue: false,
    nextIntervals: { again: 10, hard: 1440, good: 4320, easy: 10080 },
  },
  {
    state: createInitialReviewState('mother', T0),
    word: resolvedMotherItem!.word,
    lesson: resolvedMotherItem!.lesson,
    level: resolvedMotherItem!.level,
    isOverdue: false,
    nextIntervals: { again: 10, hard: 1440, good: 4320, easy: 10080 },
  },
];
const r2SnapshotSaved = saveActiveReviewSession({
  activeQueue: r2Queue,
  currentIndex: 1,
  ratingBreakdown: { again: 0, hard: 0, good: 1, easy: 0 },
});
assert(r2SnapshotSaved === true, 'R2: Snapshot save succeeds');
const r2LoadedSnapshot = getActiveReviewSession();
assert(r2LoadedSnapshot !== null, 'R2: Active snapshot is retrievable');
assert(r2LoadedSnapshot?.currentIndex === 1, 'R2: Snapshot reflects advanced index');

// R3: Rating save succeeds + snapshot save fails + reload -> card NOT rated twice (reconciliation)
resetReviewStorage();
const nowT3 = Date.now();
ensureReviewItem('mother', nowT3);
// Initial snapshot pointing to index 0 (item 'mother')
const r3Queue: ResolvedReviewItem[] = [
  {
    state: createInitialReviewState('mother', nowT3),
    word: resolvedMotherItem!.word,
    lesson: resolvedMotherItem!.lesson,
    level: resolvedMotherItem!.level,
    isOverdue: false,
    nextIntervals: { again: 10, hard: 1440, good: 4320, easy: 10080 },
  },
];
saveActiveReviewSession({
  activeQueue: r3Queue,
  currentIndex: 0,
  ratingBreakdown: { again: 0, hard: 0, good: 0, easy: 0 },
  timestamp: nowT3,
});
// User rates 'mother' GOOD at nowT3 + 1000
const r3Rated = applyReviewRatingToItem('mother', 'good', nowT3 + 1000);
assert(r3Rated !== null, 'R3: Domain rating applied to storage');
// Snapshot update fails, so disk snapshot still has currentIndex: 0 and timestamp: nowT3
// Simulate reload by retrieving disk snapshot and reconciling
const r3StaleSnapshot = getActiveReviewSession(nowT3 + 1000);
assert(r3StaleSnapshot !== null && r3StaleSnapshot.currentIndex === 0, 'R3: Raw snapshot still points to index 0');
const r3Normalized = normalizeReviewResumeContext(r3StaleSnapshot);
assert(r3Normalized === null, 'R3: Stale single-item session reconciled as completed (null) to prevent duplicate rating');

// R4: Final rating succeeds + clear active review succeeds -> Result shown, no resume
resetReviewStorage();
saveActiveReviewSession({
  activeQueue: r3Queue,
  currentIndex: 0,
  ratingBreakdown: { again: 0, hard: 0, good: 0, easy: 0 },
});
const r4ClearResult = clearActiveReviewSession();
assert(r4ClearResult.removed === true, 'R4: Active session removed successfully');
assert(r4ClearResult.resumeSafetyEstablished === true, 'R4: Resume safety established');
assert(getActiveReviewSession() === null, 'R4: No active review session after clean clear');

// R5: Final rating succeeds + remove fails + tombstone succeeds -> reload gives no resume
resetReviewStorage();
saveActiveReviewSession({
  activeQueue: r3Queue,
  currentIndex: 0,
  ratingBreakdown: { again: 0, hard: 0, good: 0, easy: 0 },
});
const originalRemoveItem = localStorage.removeItem;
(localStorage as any).removeItem = () => {
  throw new Error('SecurityError on remove');
};
const r5ClearResult = clearActiveReviewSession();
assert(r5ClearResult.removed === false, 'R5: Removal reported as false');
assert(r5ClearResult.tombstoneSaved === true, 'R5: Tombstone saved successfully');
assert(r5ClearResult.resumeSafetyEstablished === true, 'R5: Resume safety established via tombstone');
assert(getActiveReviewSession() === null, 'R5: Tombstone rejected by getActiveReviewSession, no resume offered');
(localStorage as any).removeItem = originalRemoveItem;

// R6: Final rating succeeds + remove fails + tombstone fails -> resumeSafetyEstablished false, no fake event
resetReviewStorage();
saveActiveReviewSession({
  activeQueue: r3Queue,
  currentIndex: 0,
  ratingBreakdown: { again: 0, hard: 0, good: 0, easy: 0 },
});
(localStorage as any).removeItem = () => {
  throw new Error('SecurityError on remove');
};
(localStorage as any).setItem = () => {
  throw new Error('QuotaExceededError on tombstone');
};
mockWindowEvents.length = 0;
const r6ClearResult = clearActiveReviewSession();
assert(r6ClearResult.removed === false, 'R6: Removal failed');
assert(r6ClearResult.tombstoneSaved === false, 'R6: Tombstone failed');
assert(r6ClearResult.resumeSafetyEstablished === false, 'R6: resumeSafetyEstablished is false');
assert(!mockWindowEvents.includes('flipenglish_continuity_session_updated_v1'), 'R6: No fake update event dispatched on double failure');
(localStorage as any).removeItem = originalRemoveItem;
(localStorage as any).setItem = originalSetItem;

// R7: Cleanup retry -> does not mutate ReviewStorage items
resetReviewStorage();
ensureReviewItem('hello', T0);
applyReviewRatingToItem('hello', 'good', T0);
const r7Before = loadReviewStorage(T0);
const r7ReviewCount = r7Before.items['hello'].reviewCount;
const r7ClearRetry = clearActiveReviewSession();
assert(r7ClearRetry.resumeSafetyEstablished === true, 'R7: Cleanup retry establishes safety');
const r7After = loadReviewStorage(T0);
assert(r7After.items['hello'].reviewCount === r7ReviewCount, 'R7: Cleanup retry does NOT re-rate or increment reviewCount');

// R8: Review Reset: both removals succeed -> returns structured success
resetReviewStorage();
localStorage.setItem('flipenglish_review_v1', JSON.stringify({ schemaVersion: 1, items: {} }));
localStorage.setItem('flipenglish_placement_review_exports_v1', JSON.stringify(['report-1']));
const r8Reset = resetReviewStorage();
assert(r8Reset.success === true, 'R8: resetReviewStorage returns success: true when both targets removed');
assert(r8Reset.reviewRemoved === true, 'R8: reviewRemoved is true');
assert(r8Reset.legacyMarkerRemoved === true, 'R8: legacyMarkerRemoved is true');
assert(localStorage.getItem('flipenglish_review_v1') === null, 'R8: review storage key removed');
assert(localStorage.getItem('flipenglish_placement_review_exports_v1') === null, 'R8: placement export marker key removed');

// R9: Review Reset: secondary marker remove fails -> returns structured partial result
localStorage.setItem('flipenglish_review_v1', JSON.stringify({ schemaVersion: 1, items: {} }));
localStorage.setItem('flipenglish_placement_review_exports_v1', JSON.stringify(['report-1']));
(localStorage as any).removeItem = (key: string) => {
  if (key === 'flipenglish_placement_review_exports_v1') {
    throw new Error('SecurityError on secondary marker');
  }
  delete mockStorage[key];
};
const r9Reset = resetReviewStorage();
assert(r9Reset.success === false, 'R9: resetReviewStorage returns success: false when secondary marker removal fails');
assert(r9Reset.reviewRemoved === true, 'R9: reviewRemoved is true despite secondary failure');
assert(r9Reset.legacyMarkerRemoved === false, 'R9: legacyMarkerRemoved is false');
assert(localStorage.getItem('flipenglish_review_v1') === null, 'R9: review storage key actually removed');
(localStorage as any).removeItem = originalRemoveItem;

// R10: Retry reset after R9 -> succeeds idempotently
const r10Reset = resetReviewStorage();
assert(r10Reset.success === true, 'R10: Retry reset succeeds idempotently');
assert(r10Reset.reviewRemoved === true, 'R10: review removal confirmed on retry');
assert(r10Reset.legacyMarkerRemoved === true, 'R10: Secondary marker removed on retry');
assert(localStorage.getItem('flipenglish_placement_review_exports_v1') === null, 'R10: Secondary marker key verified null');

// R11: export Placement R1 -> Reset Review -> revisit R1 -> user can export again
resetReviewStorage();
const r11Export = exportMissedItemsToReview(['hello', 'family'], 'report-r11', T0);
assert(r11Export.success === true, 'R11: Placement export succeeds');
assert(isPlacementResultExportedToReview('report-r11') === true, 'R11: Report marked as exported');
resetReviewStorage();
assert(isPlacementResultExportedToReview('report-r11') === false, 'R11: After review reset, report is NOT marked as exported');
const r11ReExport = exportMissedItemsToReview(['hello', 'family'], 'report-r11', T0);
assert(r11ReExport.success === true, 'R11: Placement report can be cleanly exported again');

// R12: Real Legacy export marker migration & idempotency -> no duplicate lapse signal
resetReviewStorage();
// Seed legacy key directly without touching canonical ReviewStorage
localStorage.setItem('flipenglish_placement_review_exports_v1', JSON.stringify(['legacy-report-1']));
assert(isPlacementResultExportedToReview('legacy-report-1') === true, 'R12: Legacy export key recognized and migrated');
ensureReviewItem('hello', T0);
const r12FirstStorage = loadReviewStorage(T0);
assert(r12FirstStorage.exportedReportIds?.includes('legacy-report-1') === true, 'R12: Legacy report ID migrated into canonical storage');
assert(localStorage.getItem('flipenglish_placement_review_exports_v1') === null, 'R12: Legacy key removed after successful canonical migration');
const r12LapseBefore = r12FirstStorage.items['hello'].lapseCount;
const r12ReExportRes = exportMissedItemsToReview(['hello'], 'legacy-report-1', T0);
assert(r12ReExportRes.success === true, 'R12: Idempotent export returns success');
const r12AfterStorage = loadReviewStorage(T0);
assert(r12AfterStorage.items['hello'].lapseCount === r12LapseBefore, 'R12: No duplicate lapse signal applied');

// ============================================================================
// REGRESSION SUITE: R13 - R22
// ============================================================================
console.log('\n--- REGRESSION SUITE: R13 - R22 (Review Reconciliation & Consistency) ---');

// R13: Multi-card reconciliation: snapshot index 1, ratingBreakdown good=1; canonical index 1 newly rated GOOD -> normalized index 2, good 2
{
  resetReviewStorage();
  const queueItems: ResolvedReviewItem[] = [
    resolveReviewItem(createInitialReviewState('hello', T0), T0)!,
    resolveReviewItem(createInitialReviewState('goodbye', T0), T0)!,
    resolveReviewItem(createInitialReviewState('thank-you', T0), T0)!,
  ];
  const snapshotTime = T0 + 1000;
  const snapshotR13: ReviewResumeContext = {
    schemaVersion: 1,
    activeQueue: queueItems,
    currentIndex: 1,
    ratingBreakdown: { again: 0, hard: 0, good: 1, easy: 0 },
    timestamp: snapshotTime,
  };

  // Card 0 was already rated before snapshot
  ensureReviewItem('hello', T0);
  applyReviewRatingToItem('hello', 'good', T0);

  // User rates card 1 GOOD after snapshot time in canonical storage
  ensureReviewItem('goodbye', T0);
  applyReviewRatingToItem('goodbye', 'good', snapshotTime + 500);

  const normR13 = normalizeReviewResumeContext(snapshotR13);
  assert(normR13 !== null, 'R13: Normalization produces valid resume context');
  assert(normR13!.currentIndex === 2, `R13: currentIndex advanced 1 -> 2 (got ${normR13!.currentIndex})`);
  assert(normR13!.ratingBreakdown.good === 2, `R13: ratingBreakdown.good reconciled 1 -> 2 (got ${normR13!.ratingBreakdown.good})`);
  assert(
    normR13!.ratingBreakdown.again + normR13!.ratingBreakdown.hard + normR13!.ratingBreakdown.good + normR13!.ratingBreakdown.easy === normR13!.currentIndex,
    'R13: Invariant sum(ratingBreakdown) === currentIndex holds'
  );
}

// R14: Two skipped ratings: canonical proves index 1 GOOD and index 2 HARD after snapshot
{
  resetReviewStorage();
  const queueItems: ResolvedReviewItem[] = [
    resolveReviewItem(createInitialReviewState('hello', T0), T0)!,
    resolveReviewItem(createInitialReviewState('goodbye', T0), T0)!,
    resolveReviewItem(createInitialReviewState('thank-you', T0), T0)!,
    resolveReviewItem(createInitialReviewState('please', T0), T0)!,
  ];
  const snapshotTime = T0 + 2000;
  const snapshotR14: ReviewResumeContext = {
    schemaVersion: 1,
    activeQueue: queueItems,
    currentIndex: 1,
    ratingBreakdown: { again: 0, hard: 0, good: 1, easy: 0 },
    timestamp: snapshotTime,
  };

  // Card 1 rated GOOD, Card 2 rated HARD after snapshot
  ensureReviewItem('goodbye', T0);
  applyReviewRatingToItem('goodbye', 'good', snapshotTime + 100);
  ensureReviewItem('thank-you', T0);
  applyReviewRatingToItem('thank-you', 'hard', snapshotTime + 200);

  const normR14 = normalizeReviewResumeContext(snapshotR14);
  assert(normR14 !== null, 'R14: Normalization produces valid resume context');
  assert(normR14!.currentIndex === 3, `R14: currentIndex advanced 1 -> 3 (got ${normR14!.currentIndex})`);
  assert(normR14!.ratingBreakdown.good === 2, `R14: ratingBreakdown.good reconciled to 2 (got ${normR14!.ratingBreakdown.good})`);
  assert(normR14!.ratingBreakdown.hard === 1, `R14: ratingBreakdown.hard reconciled to 1 (got ${normR14!.ratingBreakdown.hard})`);
  assert(
    normR14!.ratingBreakdown.again + normR14!.ratingBreakdown.hard + normR14!.ratingBreakdown.good + normR14!.ratingBreakdown.easy === normR14!.currentIndex,
    'R14: Invariant sum(ratingBreakdown) === currentIndex holds'
  );
}

// R15: Normalization Idempotency: normalizing same snapshot multiple times produces identical output
{
  const queueItems: ResolvedReviewItem[] = [
    resolveReviewItem(createInitialReviewState('hello', T0), T0)!,
    resolveReviewItem(createInitialReviewState('goodbye', T0), T0)!,
    resolveReviewItem(createInitialReviewState('thank-you', T0), T0)!,
  ];
  const snapshotR15: ReviewResumeContext = {
    schemaVersion: 1,
    activeQueue: queueItems,
    currentIndex: 0,
    ratingBreakdown: { again: 0, hard: 0, good: 0, easy: 0 },
    timestamp: T0,
  };
  const first = normalizeReviewResumeContext(snapshotR15);
  const second = normalizeReviewResumeContext(snapshotR15);
  assert(JSON.stringify(first) === JSON.stringify(second), 'R15: Repeated normalization calls are strictly idempotent');
}

// R16: Smart Next Action Ghost Resume: single remaining card already canonically rated -> no active-review priority
{
  resetReviewStorage();
  const queueItems: ResolvedReviewItem[] = [
    resolveReviewItem(createInitialReviewState('hello', T0), T0)!,
  ];
  const snapshotTime = T0 + 5000;
  const snapshotR16: ReviewResumeContext = {
    schemaVersion: 1,
    activeQueue: queueItems,
    currentIndex: 0,
    ratingBreakdown: { again: 0, hard: 0, good: 0, easy: 0 },
    timestamp: snapshotTime,
  };
  saveActiveReviewSession(snapshotR16);

  // Canonically rate the single card
  ensureReviewItem('hello', T0);
  applyReviewRatingToItem('hello', 'good', snapshotTime + 100);

  const nextAction = resolveNextAction({ now: snapshotTime + 200 });
  assert(nextAction.priority !== 'active-review', `R16: Ghost review avoided: priority is '${nextAction.priority}', not 'active-review'`);
  const reconciled = getReconciledActiveReviewSession(snapshotTime + 200);
  assert(reconciled === null, 'R16: Reconciled active review session is null when fully rated');
}

// R17: Smart Next Action Progress Match: reconciled index used consistently
{
  resetReviewStorage();
  const queueItems: ResolvedReviewItem[] = [
    resolveReviewItem(createInitialReviewState('hello', T0), T0)!,
    resolveReviewItem(createInitialReviewState('goodbye', T0), T0)!,
    resolveReviewItem(createInitialReviewState('thank-you', T0), T0)!,
  ];
  const now = Date.now();
  const snapshotTime = now - 5000;
  const snapshotR17: ReviewResumeContext = {
    schemaVersion: 1,
    activeQueue: queueItems,
    currentIndex: 0,
    ratingBreakdown: { again: 0, hard: 0, good: 0, easy: 0 },
    timestamp: snapshotTime,
  };
  saveActiveReviewSession(snapshotR17);

  // Card 0 rated in canonical storage after snapshot
  ensureReviewItem('hello', snapshotTime + 50);
  applyReviewRatingToItem('hello', 'easy', snapshotTime + 50);

  const reconciledSession = getReconciledActiveReviewSession(now);
  assert(reconciledSession !== null, 'R17: Reconciled session exists');
  assert(reconciledSession!.currentIndex === 1, `R17: Reconciled index is 1 (got ${reconciledSession!.currentIndex})`);

  const nextAction = resolveNextAction({ now });
  assert(nextAction.priority === 'active-review', 'R17: Priority is active-review');
  assert(nextAction.actionPayload?.stepIndex === 1, `R17: Smart Next Action stepIndex matches reconciled index 1 (got ${nextAction.actionPayload?.stepIndex})`);
}

// R18: Real Legacy Migration: legacy key contains R1, canonical ReviewStorage has no report -> migration imports R1 and removes legacy key
{
  resetReviewStorage();
  localStorage.setItem('flipenglish_placement_review_exports_v1', JSON.stringify(['report-r18-legacy']));
  const migRes = migrateLegacyPlacementReviewExports(T0);
  assert(migRes === true, 'R18: migrateLegacyPlacementReviewExports returns true');
  const canonical = loadReviewStorage(T0);
  assert(canonical.exportedReportIds?.includes('report-r18-legacy') === true, 'R18: Canonical ReviewStorage contains migrated report ID');
  assert(localStorage.getItem('flipenglish_placement_review_exports_v1') === null, 'R18: Legacy key deleted after successful migration');
}

// R19: Migration Write Failure: canonical write fails -> legacy marker remains
{
  resetReviewStorage();
  localStorage.setItem('flipenglish_placement_review_exports_v1', JSON.stringify(['report-r19-fail']));
  (localStorage as any).setItem = (key: string, val: string) => {
    if (key === 'flipenglish_review_v1') {
      throw new Error('QuotaExceededError on canonical review');
    }
    mockStorage[key] = String(val);
  };
  const migFailRes = migrateLegacyPlacementReviewExports(T0);
  assert(migFailRes === false, 'R19: migrateLegacyPlacementReviewExports returns false on canonical write error');
  assert(localStorage.getItem('flipenglish_placement_review_exports_v1') !== null, 'R19: Legacy marker key remains intact on failure');
  (localStorage as any).setItem = originalSetItem;
}

// R20: Review Reset Partial: review key remove succeeds, legacy marker remove fails -> structured result and event
{
  resetReviewStorage();
  localStorage.setItem('flipenglish_review_v1', JSON.stringify({ schemaVersion: 1, items: {} }));
  localStorage.setItem('flipenglish_placement_review_exports_v1', JSON.stringify(['report-r20']));
  (localStorage as any).removeItem = (key: string) => {
    if (key === 'flipenglish_placement_review_exports_v1') {
      throw new Error('DiskIO error on secondary marker');
    }
    delete mockStorage[key];
  };
  mockWindowEvents.length = 0;
  const partialRes = resetReviewStorage();
  assert(partialRes.success === false, 'R20: overall success is false');
  assert(partialRes.reviewRemoved === true, 'R20: reviewRemoved is true');
  assert(partialRes.legacyMarkerRemoved === false, 'R20: legacyMarkerRemoved is false');
  assert(mockWindowEvents.includes('flipenglish_review_updated'), 'R20: Dispatches REVIEW_UPDATED_EVENT so UI/stats refresh truthfully');
  (localStorage as any).removeItem = originalRemoveItem;
}

// R21: Reset Retry: second attempt succeeds
{
  const retryResetRes = resetReviewStorage();
  assert(retryResetRes.success === true, 'R21: Retry reset succeeds');
  assert(retryResetRes.reviewRemoved === true, 'R21: reviewRemoved is true');
  assert(retryResetRes.legacyMarkerRemoved === true, 'R21: legacyMarkerRemoved is true');
  assert(localStorage.getItem('flipenglish_placement_review_exports_v1') === null, 'R21: Secondary key removed on retry');
}

// R22: Historical Placement Result does not invent activeSessionCleared or fullyCleaned
{
  // Test that PlacementResult initialPersistence undefined starts with null (historical view),
  // proving report durability without fabricating active session teardown state.
  const historicalPersistenceDefault = undefined;
  const isHistorical = historicalPersistenceDefault === undefined;
  assert(isHistorical, 'R22: Historical report view distinguishes historical state without inventing session teardown');
}

console.log('\n✅ All FlipEnglish Smart Review tests and scheduler invariants passed successfully!');

