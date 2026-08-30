/**
 * Unit and Integration Validation Suite for Learning Streak and Active Time Accounting Engines.
 */

import {
  getStoredLearnerStreak,
  saveLearnerStreak,
  validateLearnerStreak,
  INITIAL_LEARNER_STREAK,
} from '../src/features/streak/streakStorage';
import {
  recordMeaningfulLearningEvent,
  getStreakStatus,
  getCalendarDayDifference,
} from '../src/features/streak/streakEngine';
import {
  getStoredActiveTime,
  saveActiveTime,
  validateActiveTimeRecord,
  createInitialActiveTimeRecord,
} from '../src/features/progress/activeTimeStorage';
import {
  recordActiveStudySeconds,
  getActiveMinutesToday,
  recordUserActivity,
  isUserActive,
} from '../src/features/progress/activeTimeEngine';
import { MeaningfulLearningEvent } from '../src/types/streak';
import { CONTINUITY_EVENTS } from '../src/constants/storageKeys';

// Mock localStorage and window events for node environment
const memoryStore: Record<string, string> = {};
const dispatchedEvents: string[] = [];

(globalThis as any).localStorage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, value: string) => {
    memoryStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
  clear: () => {
    for (const key of Object.keys(memoryStore)) {
      delete memoryStore[key];
    }
  },
};

(globalThis as any).window = {
  dispatchEvent: (event: { type: string }) => {
    dispatchedEvents.push(event.type);
    return true;
  },
};

(globalThis as any).Event = class {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
};

(globalThis as any).document = {
  visibilityState: 'visible',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

console.log('\n--- Test Suite 1: Calendar Day Calculations ---');
assert(getCalendarDayDifference('2026-08-27', '2026-08-27') === 0, 'Same day diff is 0');
assert(getCalendarDayDifference('2026-08-27', '2026-08-28') === 1, 'Consecutive day diff is 1');
assert(getCalendarDayDifference('2026-08-28', '2026-08-27') === -1, 'Past day diff is -1');
assert(getCalendarDayDifference('2026-08-25', '2026-08-28') === 3, 'Multiple days diff is 3');
assert(getCalendarDayDifference('2026-02-28', '2026-03-01') === 1, 'Month boundary leap/non-leap diff is 1');
assert(getCalendarDayDifference('2025-12-31', '2026-01-01') === 1, 'Year boundary diff is 1');
assert(Number.isNaN(getCalendarDayDifference('invalid', '2026-08-28')), 'Invalid date returns NaN');

console.log('\n--- Test Suite 2: Streak Storage & Validation ---');
localStorage.clear();
dispatchedEvents.length = 0;

const initialStreak = getStoredLearnerStreak();
assert(initialStreak.currentStreak === 0, 'Initial streak currentStreak is 0');
assert(initialStreak.longestStreak === 0, 'Initial streak longestStreak is 0');
assert(initialStreak.lastActiveDateKey === null, 'Initial streak lastActiveDateKey is null');
assert(initialStreak.totalMeaningfulDays === 0, 'Initial streak totalMeaningfulDays is 0');

assert(validateLearnerStreak(INITIAL_LEARNER_STREAK) === true, 'Initial streak is valid');
assert(
  validateLearnerStreak({
    schemaVersion: 1,
    currentStreak: 5,
    longestStreak: 10,
    lastActiveDateKey: '2026-08-28',
    totalMeaningfulDays: 12,
    updatedAt: Date.now(),
  }) === true,
  'Valid populated streak passes'
);
assert(
  validateLearnerStreak({
    schemaVersion: 2, // invalid version
    currentStreak: 5,
    longestStreak: 10,
    lastActiveDateKey: '2026-08-28',
    totalMeaningfulDays: 12,
    updatedAt: Date.now(),
  }) === false,
  'Invalid schemaVersion rejected'
);
assert(
  validateLearnerStreak({
    schemaVersion: 1,
    currentStreak: 15,
    longestStreak: 10, // longest < current is invalid
    lastActiveDateKey: '2026-08-28',
    totalMeaningfulDays: 12,
    updatedAt: Date.now(),
  }) === false,
  'Longest streak smaller than current streak is rejected'
);
assert(
  validateLearnerStreak({
    schemaVersion: 1,
    currentStreak: 5,
    longestStreak: 10,
    lastActiveDateKey: '2026-02-31', // invalid calendar date
    totalMeaningfulDays: 12,
    updatedAt: Date.now(),
  }) === false,
  'Invalid calendar date format rejected'
);

console.log('\n--- Test Suite 3: Streak Engine Progression Rules ---');
localStorage.clear();
dispatchedEvents.length = 0;

const quizEvent: MeaningfulLearningEvent = {
  type: 'quiz_completed',
  timestamp: new Date('2026-08-25T10:00:00').getTime(),
  metadata: { lessonId: 'a1-1', score: 100 },
};

// Day 1: First activity
const resDay1 = recordMeaningfulLearningEvent(quizEvent, new Date('2026-08-25T10:00:00'));
assert(resDay1.isNewActiveDay === true, 'Day 1 is new active day');
assert(resDay1.streakIncremented === true, 'Day 1 streak incremented');
assert(resDay1.streak.currentStreak === 1, 'Day 1 currentStreak is 1');
assert(resDay1.streak.longestStreak === 1, 'Day 1 longestStreak is 1');
assert(resDay1.streak.totalMeaningfulDays === 1, 'Day 1 totalMeaningfulDays is 1');
assert(resDay1.streak.lastActiveDateKey === '2026-08-25', 'Day 1 lastActiveDateKey is 2026-08-25');
assert(dispatchedEvents.includes(CONTINUITY_EVENTS.STREAK_UPDATED), 'Streak updated event dispatched');

// Day 1: Second activity on the SAME day
dispatchedEvents.length = 0;
const reviewEvent: MeaningfulLearningEvent = {
  type: 'review_batch_completed',
  timestamp: new Date('2026-08-25T18:00:00').getTime(),
  metadata: { itemsCount: 10 },
};
const resDay1Repeat = recordMeaningfulLearningEvent(reviewEvent, new Date('2026-08-25T18:00:00'));
assert(resDay1Repeat.isNewActiveDay === false, 'Same day is NOT new active day');
assert(resDay1Repeat.streakIncremented === false, 'Same day streak is NOT incremented');
assert(resDay1Repeat.streak.currentStreak === 1, 'Same day currentStreak stays 1');
assert(resDay1Repeat.streak.longestStreak === 1, 'Same day longestStreak stays 1');
assert(resDay1Repeat.streak.totalMeaningfulDays === 1, 'Same day totalMeaningfulDays stays 1');

// Day 2: Consecutive day activity (2026-08-26)
const resDay2 = recordMeaningfulLearningEvent(quizEvent, new Date('2026-08-26T09:00:00'));
assert(resDay2.isNewActiveDay === true, 'Day 2 consecutive is new active day');
assert(resDay2.streakIncremented === true, 'Day 2 streak incremented');
assert(resDay2.streak.currentStreak === 2, 'Day 2 currentStreak is 2');
assert(resDay2.streak.longestStreak === 2, 'Day 2 longestStreak is 2');
assert(resDay2.streak.totalMeaningfulDays === 2, 'Day 2 totalMeaningfulDays is 2');
assert(resDay2.streak.lastActiveDateKey === '2026-08-26', 'Day 2 date is 2026-08-26');

// Day 3: Consecutive day activity (2026-08-27)
const resDay3 = recordMeaningfulLearningEvent(quizEvent, new Date('2026-08-27T09:00:00'));
assert(resDay3.streak.currentStreak === 3, 'Day 3 currentStreak is 3');
assert(resDay3.streak.longestStreak === 3, 'Day 3 longestStreak is 3');
assert(resDay3.streak.totalMeaningfulDays === 3, 'Day 3 totalMeaningfulDays is 3');

// Missed day: Skip 2026-08-28 and study on 2026-08-29
const resMissed = recordMeaningfulLearningEvent(quizEvent, new Date('2026-08-29T14:00:00'));
assert(resMissed.isNewActiveDay === true, 'Missed day study is new active day');
assert(resMissed.streakIncremented === true, 'Streak set to 1');
assert(resMissed.streak.currentStreak === 1, 'Current streak resets to 1 after gap');
assert(resMissed.streak.longestStreak === 3, 'Longest streak remains monotonically 3');
assert(resMissed.streak.totalMeaningfulDays === 4, 'Total meaningful days increments to 4');
assert(resMissed.streak.lastActiveDateKey === '2026-08-29', 'Active date key updated to 2026-08-29');

// Clock-rollback / timezone westward travel (DayDiff < 0)
const resRollback = recordMeaningfulLearningEvent(quizEvent, new Date('2026-08-28T12:00:00'));
assert(resRollback.isNewActiveDay === false, 'Clock rollback event is NOT a new active day');
assert(resRollback.streakIncremented === false, 'Clock rollback does not increment streak');
assert(resRollback.streak.lastActiveDateKey === '2026-08-29', 'Watermark date key is NOT rewound');
assert(resRollback.streak.totalMeaningfulDays === 4, 'Total meaningful days is NOT double-counted on rollback');

// Status getter helper
const currentStatus = getStreakStatus();
assert(currentStatus.currentStreak === 1, 'getStreakStatus matches storage');
assert(currentStatus.longestStreak === 3, 'getStreakStatus longestStreak matches');

console.log('\n--- Test Suite 4: Active Time Storage & Validation ---');
localStorage.clear();
dispatchedEvents.length = 0;

const initialActiveTime = getStoredActiveTime(new Date('2026-08-28T10:00:00'));
assert(initialActiveTime.activeSeconds === 0, 'Initial active seconds is 0');
assert(initialActiveTime.localDate === '2026-08-28', 'Initial active date is 2026-08-28');

assert(validateActiveTimeRecord(createInitialActiveTimeRecord('2026-08-28')) === true, 'Valid initial active record passes');
assert(
  validateActiveTimeRecord({
    schemaVersion: 1,
    localDate: '2026-08-28',
    activeSeconds: 650,
    lastHeartbeatAt: Date.now(),
    updatedAt: Date.now(),
  }) === true,
  'Valid active time passes'
);
assert(
  validateActiveTimeRecord({
    schemaVersion: 1,
    localDate: '2026-08-28',
    activeSeconds: -5,
    lastHeartbeatAt: Date.now(),
    updatedAt: Date.now(),
  }) === false,
  'Negative active seconds rejected'
);

console.log('\n--- Test Suite 5: Active Time Engine & Daily Rollover ---');
localStorage.clear();
dispatchedEvents.length = 0;

const day1Date = new Date('2026-08-27T10:00:00');
recordActiveStudySeconds(45, day1Date, true);
recordActiveStudySeconds(75, day1Date, true);

assert(getStoredActiveTime(day1Date).activeSeconds === 120, '120 active seconds accumulated on Day 1');
assert(getActiveMinutesToday(day1Date) === 2, '2 active minutes calculated for Day 1');
assert(dispatchedEvents.includes(CONTINUITY_EVENTS.ACTIVE_TIME_UPDATED), 'Active time event dispatched');

// Rollover to Next Day (2026-08-28)
dispatchedEvents.length = 0;
const day2Date = new Date('2026-08-28T08:00:00');
const day2Time = getStoredActiveTime(day2Date);
assert(day2Time.localDate === '2026-08-28', 'Rollover updates localDate to today');
assert(day2Time.activeSeconds === 0, 'Rollover resets activeSeconds to 0');
assert(getActiveMinutesToday(day2Date) === 0, '0 active minutes on new day before study');

// Accumulate on Day 2
recordActiveStudySeconds(150, day2Date, true);
assert(getStoredActiveTime(day2Date).activeSeconds === 150, '150 active seconds accumulated on Day 2');
assert(getActiveMinutesToday(day2Date) === 2, '2 active minutes calculated for 150s (Math.floor(150/60))');

// Visibility gating test
(globalThis as any).document.visibilityState = 'hidden';
recordActiveStudySeconds(300, day2Date, true);
assert(getStoredActiveTime(day2Date).activeSeconds === 150, 'Active seconds NOT accumulated when page is hidden');

(globalThis as any).document.visibilityState = 'visible';
recordActiveStudySeconds(30, day2Date, true);
assert(getStoredActiveTime(day2Date).activeSeconds === 180, 'Active seconds accumulated when page is visible');
assert(getActiveMinutesToday(day2Date) === 3, '3 active minutes after 180s');

console.log('\n--- Test Suite 6: Active Time Real Timeline & Idle Gate Invariants ---');
{
  localStorage.clear();
  dispatchedEvents.length = 0;
  (globalThis as any).document.visibilityState = 'visible';

  const baseTimelineDate = new Date('2026-08-29T10:00:00.000Z');
  const t0 = baseTimelineDate.getTime();

  // Step 1: T+0 user interaction recorded via recordUserActivity()
  recordUserActivity(t0);
  assert(isUserActive(60000, t0) === true, 'User is active at T+0');

  // Step 2: T+5s active time accumulated (without bypassActivityGate)
  const t5 = t0 + 5000;
  recordActiveStudySeconds(5, new Date(t5), false, t5);
  assert(getStoredActiveTime(new Date(t5)).activeSeconds === 5, 'T+5s accumulated 5 active seconds');

  // Step 3: T+59s still within 60s active window -> heartbeat accumulates
  const t59 = t0 + 59000;
  assert(isUserActive(60000, t59) === true, 'User still active at T+59s (< 60s)');
  recordActiveStudySeconds(5, new Date(t59), false, t59);
  assert(getStoredActiveTime(new Date(t59)).activeSeconds === 10, 'T+59s accumulated next heartbeat (10 total seconds)');

  // Step 4: T+61s user considered idle (> 60s since T+0) -> no accumulation
  const t61 = t0 + 61000;
  assert(isUserActive(60000, t61) === false, 'User considered idle at T+61s (> 60s)');
  recordActiveStudySeconds(5, new Date(t61), false, t61);
  assert(getStoredActiveTime(new Date(t61)).activeSeconds === 10, 'T+61s idle: active seconds remain 10');

  // Step 5: T+120s no hidden idle accumulation
  const t120 = t0 + 120000;
  assert(isUserActive(60000, t120) === false, 'User remains idle at T+120s');
  recordActiveStudySeconds(5, new Date(t120), false, t120);
  assert(getStoredActiveTime(new Date(t120)).activeSeconds === 10, 'T+120s: zero accumulation while idle');

  // Step 6: User interacts again at T+130s -> next heartbeat accumulates
  const t130 = t0 + 130000;
  recordUserActivity(t130);
  assert(isUserActive(60000, t130) === true, 'User active again at T+130s');
  const t135 = t0 + 135000;
  recordActiveStudySeconds(5, new Date(t135), false, t135);
  assert(getStoredActiveTime(new Date(t135)).activeSeconds === 15, 'T+135s: accumulation resumes (15 total seconds)');

  // Step 7: Hidden tab (document.visibilityState = "hidden") -> no accumulation even if active
  (globalThis as any).document.visibilityState = 'hidden';
  recordUserActivity(t135);
  const t140 = t0 + 140000;
  recordActiveStudySeconds(5, new Date(t140), false, t140);
  assert(getStoredActiveTime(new Date(t140)).activeSeconds === 15, 'Hidden tab: no accumulation despite user interaction');

  // Step 8: Visible tab -> accumulation resumes
  (globalThis as any).document.visibilityState = 'visible';
  const t145 = t0 + 145000;
  recordUserActivity(t145);
  recordActiveStudySeconds(5, new Date(t145), false, t145);
  assert(getStoredActiveTime(new Date(t145)).activeSeconds === 20, 'Visible tab: accumulation resumes (20 total seconds)');

  // Step 9: Day rollover -> resets daily active seconds cleanly
  const rolloverDate = new Date('2026-08-30T01:00:00.000Z');
  const tNextDay = rolloverDate.getTime();
  recordUserActivity(tNextDay);
  const nextDayRecord = getStoredActiveTime(rolloverDate);
  assert(nextDayRecord.localDate === '2026-08-30', 'Rollover date matches 2026-08-30');
  assert(nextDayRecord.activeSeconds === 0, 'Rollover resets daily active seconds to 0');
  recordActiveStudySeconds(10, rolloverDate, false, tNextDay + 5000);
  assert(getStoredActiveTime(rolloverDate).activeSeconds === 10, 'New day accumulates from 0 (10 seconds on Day 2)');
}

console.log('\n--- Test Suite 7: Storage Failure & Health Defense Paths ---');
// Test storage write failure handling in saveActiveTime and saveLearnerStreak
const originalSetItem = localStorage.setItem;
(localStorage as any).setItem = () => {
  throw new Error('Simulated QuotaExceededError (quota exceeded)');
};

dispatchedEvents.length = 0;
const saveFailed = saveActiveTime(createInitialActiveTimeRecord('2026-08-28'));
assert(saveFailed === false, 'saveActiveTime returns false on storage quota failure');
assert(!dispatchedEvents.includes(CONTINUITY_EVENTS.ACTIVE_TIME_UPDATED), 'Active time update event is NOT dispatched on write failure');

const streakFailed = saveLearnerStreak(INITIAL_LEARNER_STREAK);
assert(streakFailed === false, 'saveLearnerStreak returns false on storage quota failure');
assert(!dispatchedEvents.includes(CONTINUITY_EVENTS.STREAK_UPDATED), 'Streak update event is NOT dispatched on write failure');

localStorage.setItem = originalSetItem;

console.log(`\n========================================`);
console.log(`Validation Results: ${passedTests}/${totalTests} tests passed (${failedTests} failures)`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
