/**
 * Comprehensive Validation and Test Suite for FlipEnglish Today / Smart Study Plan.
 * Validates deterministic plan generation, time budgeting, review chunk limits,
 * curriculum selection priorities, storage schemas, tamper-resistance, evidence-based reconciliation,
 * exam mode routing, goal downgrade invariants, and edge cases.
 */

import {
  generateTodayStudyPlan,
  getLocalDateKey,
  isValidLocalDateKey,
  getReviewChunkLimit,
  estimateReviewMinutes,
  allocateReviewBlock,
} from '../src/features/studyPlan/studyPlanEngine';
import {
  validateStudyPlanSettings,
  validateStudyPlanTask,
  validateTodayStudyPlan,
  validateHistoryItem,
  reconcilePlanTaskStatuses,
  updateDailyGoalAndRegeneratePlan,
  saveTodayPlan,
  saveStudyPlanSettings,
  loadStudyPlanSettings,
} from '../src/features/studyPlan/studyPlanStorage';
import {
  StudyPlanContext,
  StudyPlanSettings,
  TodayStudyPlan,
  ALLOWED_DAILY_MINUTES,
} from '../src/features/studyPlan/studyPlanTypes';
import { LESSONS, getLessonById } from '../src/data/lessons';
import { QUICK_TEST_CONFIG } from '../src/data/exams/config';

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

console.log('\nStarting Study Plan Engine & Storage Validation Suite...\n');

// -------------------------------------------------------------
// Test Group 1: Review Chunking and Time Sizing
// -------------------------------------------------------------
console.log('--- Test Group 1: Review Chunk Limits and Minutes ---');

assert(getReviewChunkLimit(5) === 5, '5 min goal caps review items at 5');
assert(getReviewChunkLimit(10) === 8, '10 min goal caps review items at 8');
assert(getReviewChunkLimit(15) === 10, '15 min goal caps review items at 10');
assert(getReviewChunkLimit(20) === 15, '20 min goal caps review items at 15');
assert(getReviewChunkLimit(30) === 20, '30 min goal caps review items at 20');

assert(estimateReviewMinutes(0) === 0, '0 items takes 0 minutes');
assert(estimateReviewMinutes(4) === 2, '4 items takes ~2 minutes');
assert(estimateReviewMinutes(10) === 4, '10 items takes ~4 minutes');
assert(estimateReviewMinutes(20) === 8, '20 items takes ~8 minutes');

const alloc1 = allocateReviewBlock(12, 15, 15);
assert(alloc1.targetCount === 10, 'allocateReviewBlock limits to chunk size (10 for 15m)');
assert(alloc1.estimatedMinutes === 4, 'allocateReviewBlock computes 4 min estimate for 10 items');

const alloc2 = allocateReviewBlock(30, 5, 5);
assert(alloc2.targetCount <= 5, 'allocateReviewBlock limits 5m plan to max 5 items');
assert(alloc2.estimatedMinutes <= 3, 'allocateReviewBlock caps 5m review time to max 3 minutes');

// -------------------------------------------------------------
// Test Group 2: Local Calendar Date Formatting & Validation
// -------------------------------------------------------------
console.log('\n--- Test Group 2: Local Calendar Date Formatter & Validator ---');

const testDate = new Date(2026, 7, 25, 23, 45, 0); // Local Aug 25, 2026 23:45
assert(getLocalDateKey(testDate) === '2026-08-25', 'Local calendar date correctly formatted YYYY-MM-DD');

const testDate2 = new Date(2026, 0, 5, 0, 15, 0); // Local Jan 5, 2026 00:15
assert(getLocalDateKey(testDate2) === '2026-01-05', 'Single digit month and day padded with zeros');

assert(isValidLocalDateKey('2026-08-25'), 'Valid local date string accepted');
assert(isValidLocalDateKey('2024-02-29'), 'Valid leap year date accepted (2024-02-29)');
assert(!isValidLocalDateKey('2026-02-29'), 'Invalid non-leap year date rejected (2026-02-29)');
assert(!isValidLocalDateKey('2026-04-31'), 'Invalid day in 30-day month rejected (2026-04-31)');
assert(!isValidLocalDateKey('2026-13-01'), 'Invalid month 13 rejected');
assert(!isValidLocalDateKey('2026-00-10'), 'Invalid month 00 rejected');
assert(!isValidLocalDateKey('not-a-date'), 'Malformed string rejected');

// -------------------------------------------------------------
// Test Group 3: Deterministic Plan Generation & Time Budgets
// -------------------------------------------------------------
console.log('\n--- Test Group 3: Deterministic Plan Generation ---');

for (const minutes of ALLOWED_DAILY_MINUTES) {
  const context: StudyPlanContext = {
    review: { dueCount: 12, reviewedTodayCount: 0 },
    lessons: {
      completedLessonIds: new Set(['greetings']),
      recentLessonIds: ['food'],
    },
    placement: {
      estimatedLevel: 'B1',
      recommendedLessonIds: ['travel', 'career-workplace'],
      latestResultId: 'placement-test-1',
    },
    latestExam: undefined,
  };

  const settings: StudyPlanSettings = {
    schemaVersion: 1,
    dailyMinutes: minutes,
    createdAt: 1756100000000,
    updatedAt: 1756100000000,
  };

  const fixedTimestamp = 1756108800000;
  const plan1 = generateTodayStudyPlan(context, settings, '2026-08-25', 12345, fixedTimestamp);
  const plan2 = generateTodayStudyPlan(context, settings, '2026-08-25', 12345, fixedTimestamp);

  assert(
    JSON.stringify(plan1) === JSON.stringify(plan2),
    `Plan generation is 100% deterministic for ${minutes} min goal with explicit seed & timestamp`
  );

  assert(plan1.planSeed === 12345, `planSeed is recorded independently (${plan1.planSeed})`);
  assert(plan1.createdAt === fixedTimestamp, `createdAt stores real timestamp (${plan1.createdAt})`);

  assert(
    plan1.tasks.length >= 1 && plan1.tasks.length <= 4,
    `Plan task count is bounded (1 to 4 tasks) for ${minutes} min goal (actual: ${plan1.tasks.length})`
  );

  const totalMinutes = plan1.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  assert(
    totalMinutes <= minutes + 5,
    `Plan total minutes (${totalMinutes}m) fits ${minutes}m daily goal within tolerance`
  );

  // Validate structure
  assert(validateTodayStudyPlan(plan1), `Generated plan passes schema validation for ${minutes}m`);
}

// -------------------------------------------------------------
// Test Group 4: Quick Test Routing & Evidence Mode
// -------------------------------------------------------------
console.log('\n--- Test Group 4: Quick Test Routing & Canonical Config ---');

const quickTestContext: StudyPlanContext = {
  review: { dueCount: 0, reviewedTodayCount: 0 },
  lessons: { completedLessonIds: new Set(['greetings', 'food']), recentLessonIds: [] },
  placement: { estimatedLevel: 'B2', recommendedLessonIds: [], latestResultId: 'p-1' },
};
const quickTestSettings: StudyPlanSettings = {
  schemaVersion: 1,
  dailyMinutes: 20,
  createdAt: 1000,
  updatedAt: 1000,
};
const quickPlan = generateTodayStudyPlan(quickTestContext, quickTestSettings, '2026-08-25');
const quickTask = quickPlan.tasks.find((t) => t.type === 'quick-test');

assert(quickTask !== undefined, '20 min plan includes a Quick Test task');
if (quickTask) {
  assert(
    quickTask.estimatedMinutes === QUICK_TEST_CONFIG.durationMinutes,
    `Quick Test estimated minutes matches canonical QUICK_TEST_CONFIG.durationMinutes (${QUICK_TEST_CONFIG.durationMinutes}m)`
  );
  assert(
    quickTask.description.includes(`${QUICK_TEST_CONFIG.questionCount}-question`),
    `Quick Test description specifies ${QUICK_TEST_CONFIG.questionCount}-question test`
  );
  assert(
    quickTask.evidence?.examMode === 'quick',
    'Quick Test task evidence explicitly records examMode === "quick"'
  );
}

// -------------------------------------------------------------
// Test Group 5: Priority Order Verification & Curriculum-Complete State
// -------------------------------------------------------------
console.log('\n--- Test Group 5: Priority Ordering Logic & Curriculum-Complete State ---');

// Case A: User has not taken Placement -> Placement task is included
const newLearnerContext: StudyPlanContext = {
  review: { dueCount: 0, reviewedTodayCount: 0 },
  lessons: { completedLessonIds: new Set(), recentLessonIds: [] },
  placement: undefined,
};
const newLearnerSettings: StudyPlanSettings = {
  schemaVersion: 1,
  dailyMinutes: 15,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
const newLearnerPlan = generateTodayStudyPlan(newLearnerContext, newLearnerSettings, '2026-08-25');
const hasPlacement = newLearnerPlan.tasks.some((t) => t.type === 'placement');
assert(hasPlacement, 'Learner without placement gets Level Check task recommended');

// Case B: User has due reviews -> Review task is top priority
const dueReviewContext: StudyPlanContext = {
  review: { dueCount: 8, reviewedTodayCount: 0 },
  lessons: { completedLessonIds: new Set(), recentLessonIds: [] },
  placement: { estimatedLevel: 'A2', recommendedLessonIds: ['food'], latestResultId: 'p-1' },
};
const duePlan = generateTodayStudyPlan(dueReviewContext, newLearnerSettings, '2026-08-25');
assert(duePlan.tasks[0]?.type === 'review', 'Due Smart Review is prioritized as first task');
assert(
  duePlan.tasks[0]?.reviewItemTarget === 8,
  'Review item target is set to dueCount capped at limit'
);

// Case C: Lesson Priority (Recent Unfinished -> Placement Recommended -> Level Lesson)
const unfinishedLesson = getLessonById('travel');
if (unfinishedLesson) {
  const unfinishedContext: StudyPlanContext = {
    review: { dueCount: 0, reviewedTodayCount: 0 },
    lessons: {
      completedLessonIds: new Set(['greetings']),
      recentLessonIds: ['travel'], // Recent but not completed
    },
    placement: { estimatedLevel: 'B1', recommendedLessonIds: ['career-workplace'], latestResultId: 'p-1' },
  };
  const unfinishedPlan = generateTodayStudyPlan(unfinishedContext, newLearnerSettings, '2026-08-25');
  const firstLessonTask = unfinishedPlan.tasks.find((t) => t.type === 'lesson');
  assert(
    firstLessonTask?.lessonId === 'travel',
    'Recent unfinished lesson "travel" is prioritized for completion'
  );
}

// Case D: All Curriculum Complete Matrix
const allCompletedContext: StudyPlanContext = {
  review: { dueCount: 0, reviewedTodayCount: 0 },
  lessons: {
    completedLessonIds: new Set(LESSONS.map((l) => l.id)),
    recentLessonIds: [],
  },
  placement: { estimatedLevel: 'C2', recommendedLessonIds: [], latestResultId: 'p-c2' },
};

// D1: 5-minute goal -> curriculum-complete state, 0 tasks, structurally valid
const allDone5m = generateTodayStudyPlan(
  allCompletedContext,
  { schemaVersion: 1, dailyMinutes: 5, createdAt: 1000, updatedAt: 1000 },
  '2026-08-25'
);
assert(allDone5m.state === 'curriculum-complete', 'All curriculum complete + 5m goal sets state = "curriculum-complete"');
assert(allDone5m.tasks.length === 0, 'All curriculum complete + 5m goal has 0 tasks');
assert(validateTodayStudyPlan(allDone5m), 'All curriculum complete + 5m plan passes validateTodayStudyPlan()');

// D2: 15-minute goal -> schedules real Quick Test
const allDone15m = generateTodayStudyPlan(
  allCompletedContext,
  { schemaVersion: 1, dailyMinutes: 15, createdAt: 1000, updatedAt: 1000 },
  '2026-08-25'
);
assert(allDone15m.state === 'scheduled', 'All curriculum complete + 15m goal sets state = "scheduled"');
assert(allDone15m.tasks.length === 1 && allDone15m.tasks[0].type === 'quick-test', 'All curriculum complete + 15m goal schedules real Quick Test');
assert(validateTodayStudyPlan(allDone15m), 'All curriculum complete + 15m plan passes validateTodayStudyPlan()');

// D3: All curriculum complete BUT review is due -> schedules Review
const allDoneWithReviewContext: StudyPlanContext = {
  ...allCompletedContext,
  review: { dueCount: 5, reviewedTodayCount: 0 },
};
const allDoneReview10m = generateTodayStudyPlan(
  allDoneWithReviewContext,
  { schemaVersion: 1, dailyMinutes: 10, createdAt: 1000, updatedAt: 1000 },
  '2026-08-25'
);
assert(allDoneReview10m.state === 'scheduled', 'All curriculum complete + review due sets state = "scheduled"');
assert(allDoneReview10m.tasks[0]?.type === 'review', 'All curriculum complete + review due prioritizes Smart Review');
assert(validateTodayStudyPlan(allDoneReview10m), 'All curriculum complete + review plan passes validation');

// -------------------------------------------------------------
// Test Group 6: Strict Storage Schema Validation & Tamper Rejection
// -------------------------------------------------------------
console.log('\n--- Test Group 6: Strict Storage Schema Validation & Tamper Rejection ---');

// Settings tests
assert(
  validateStudyPlanSettings({ schemaVersion: 1, dailyMinutes: 15, createdAt: 1000, updatedAt: 1000 }),
  'Valid settings accepted'
);
assert(
  !validateStudyPlanSettings({ schemaVersion: 1, dailyMinutes: 45, createdAt: 1000, updatedAt: 1000 }),
  'Settings with invalid dailyMinutes (45m) rejected'
);
assert(
  !validateStudyPlanSettings({ schemaVersion: 2, dailyMinutes: 15, createdAt: 1000, updatedAt: 1000 }),
  'Settings with wrong schemaVersion rejected'
);

// Task tests - Lesson
const validLessonTask = {
  id: 'task-lesson-1',
  type: 'lesson',
  title: 'Test Lesson',
  description: 'Desc',
  reason: 'Reason',
  estimatedMinutes: 8,
  status: 'pending',
  lessonId: LESSONS[0].id,
  level: LESSONS[0].level,
  createdAt: 1000,
  evidence: {
    lessonId: LESSONS[0].id,
    wasCompletedAtPlanCreation: false,
  },
};
assert(validateStudyPlanTask(validLessonTask), 'Valid lesson task accepted');

assert(
  !validateStudyPlanTask({ ...validLessonTask, lessonId: 'fake-nonexistent-lesson-id-999' }),
  'Lesson task with non-existent lessonId rejected'
);
assert(
  !validateStudyPlanTask({ ...validLessonTask, level: 'C2' }),
  'Lesson task with level mismatched from canonical lesson level rejected'
);
assert(
  !validateStudyPlanTask({ ...validLessonTask, reviewItemTarget: 10 }),
  'Lesson task with forbidden reviewItemTarget rejected'
);
assert(
  !validateStudyPlanTask({ ...validLessonTask, evidence: { lessonId: 'different-lesson' } }),
  'Lesson task with mismatched evidence.lessonId rejected'
);

// Task tests - Review
const validReviewTask = {
  id: 'task-review-1',
  type: 'review',
  title: 'Smart Review',
  description: 'Desc',
  reason: 'Reason',
  estimatedMinutes: 4,
  status: 'pending',
  reviewItemTarget: 5,
  createdAt: 1000,
  evidence: {
    reviewedTodayBaseline: 0,
    reviewTargetCount: 5,
  },
};
assert(validateStudyPlanTask(validReviewTask), 'Valid review task accepted');

assert(
  !validateStudyPlanTask({ ...validReviewTask, reviewItemTarget: undefined }),
  'Review task without reviewItemTarget rejected'
);
assert(
  !validateStudyPlanTask({ ...validReviewTask, reviewItemTarget: 3.5 }),
  'Review task with float reviewItemTarget rejected'
);
assert(
  !validateStudyPlanTask({ ...validReviewTask, evidence: undefined }),
  'Review task without evidence rejected'
);
assert(
  !validateStudyPlanTask({ ...validReviewTask, evidence: { reviewedTodayBaseline: 0, reviewTargetCount: 9 } }),
  'Review task with evidence.reviewTargetCount !== reviewItemTarget rejected'
);
assert(
  !validateStudyPlanTask({ ...validReviewTask, evidence: { reviewedTodayBaseline: -1, reviewTargetCount: 5 } }),
  'Review task with negative reviewedTodayBaseline rejected'
);
assert(
  !validateStudyPlanTask({
    ...validReviewTask,
    evidence: { reviewedTodayBaseline: 0, reviewTargetCount: 5, unknownKey: 'attack' },
  }),
  'Review task with unknown evidence property rejected'
);
assert(
  !validateStudyPlanTask({ ...validReviewTask, lessonId: 'greetings' }),
  'Review task with forbidden lessonId rejected'
);

// Task tests - Quick Test
const validQuickTestTask = {
  id: 'task-test-1',
  type: 'quick-test',
  title: 'Quick Test: B1',
  description: 'Desc',
  reason: 'Reason',
  estimatedMinutes: 10,
  status: 'pending',
  level: 'B1',
  createdAt: 1000,
  evidence: {
    examHistoryLatestIdAtCreation: null,
    examLevel: 'B1',
    examMode: 'quick',
  },
};
assert(validateStudyPlanTask(validQuickTestTask), 'Valid Quick Test task accepted');

assert(
  !validateStudyPlanTask({ ...validQuickTestTask, level: undefined }),
  'Quick Test task without level rejected'
);
assert(
  !validateStudyPlanTask({ ...validQuickTestTask, level: 'Z9' }),
  'Quick Test task with invalid level Z9 rejected'
);
assert(
  !validateStudyPlanTask({
    ...validQuickTestTask,
    evidence: { examMode: 'level', examLevel: 'B1' },
  }),
  'Quick Test task with examMode === "level" rejected'
);
assert(
  !validateStudyPlanTask({
    ...validQuickTestTask,
    evidence: { examMode: 'mock', examLevel: 'B1' },
  }),
  'Quick Test task with examMode === "mock" rejected'
);
assert(
  !validateStudyPlanTask({
    ...validQuickTestTask,
    evidence: { examMode: 'quick', examLevel: 'C1' },
  }),
  'Quick Test task with evidence.examLevel !== task.level rejected'
);
assert(
  !validateStudyPlanTask({ ...validQuickTestTask, lessonId: 'greetings' }),
  'Quick Test task with forbidden lessonId rejected'
);
assert(
  !validateStudyPlanTask({ ...validQuickTestTask, reviewItemTarget: 5 }),
  'Quick Test task with forbidden reviewItemTarget rejected'
);

// Task tests - Timestamps
assert(
  !validateStudyPlanTask({ ...validLessonTask, createdAt: -1 }),
  'Task with negative createdAt rejected'
);
assert(
  !validateStudyPlanTask({ ...validLessonTask, createdAt: NaN }),
  'Task with NaN createdAt rejected'
);
assert(
  !validateStudyPlanTask({ ...validLessonTask, createdAt: 2000, completedAt: 1000 }),
  'Task with completedAt < createdAt rejected'
);
assert(
  !validateStudyPlanTask({ ...validLessonTask, createdAt: 1000, completedAt: Date.now() + 100000000 }),
  'Task with absurd future completedAt rejected'
);

// Today Plan tests
const validPlan: TodayStudyPlan = {
  schemaVersion: 1,
  id: 'plan-1',
  localDate: '2026-08-25',
  dailyMinutes: 15,
  planSeed: 12345,
  createdAt: 1000,
  updatedAt: 1000,
  state: 'scheduled',
  tasks: [validLessonTask as any],
};
assert(validateTodayStudyPlan(validPlan), 'Valid TodayStudyPlan accepted');

assert(
  !validateTodayStudyPlan({ ...validPlan, state: 'scheduled', tasks: [] }),
  'Scheduled plan with 0 tasks rejected'
);
assert(
  validateTodayStudyPlan({ ...validPlan, state: 'curriculum-complete', tasks: [] }),
  'Curriculum-complete plan with 0 tasks accepted'
);
assert(
  !validateTodayStudyPlan({ ...validPlan, state: 'invalid-state' as any }),
  'Plan with invalid state rejected'
);
assert(
  !validateTodayStudyPlan({ ...validPlan, localDate: '2026-02-31' }),
  'Plan with non-existent calendar date (2026-02-31) rejected'
);
assert(
  !validateTodayStudyPlan({ ...validPlan, planSeed: 3.14 }),
  'Plan with float planSeed rejected'
);
assert(
  !validateTodayStudyPlan({
    ...validPlan,
    dailyMinutes: 5,
    tasks: [
      { ...validLessonTask, id: 't1', estimatedMinutes: 15 },
      { ...validLessonTask, id: 't2', estimatedMinutes: 15 },
    ],
  }),
  'Plan with sum of task minutes exceeding dailyMinutes budget + tolerance rejected'
);

// History item tests
assert(
  validateHistoryItem({
    date: '2026-08-25',
    plannedMinutes: 15,
    taskCount: 3,
    completedCount: 2,
    skippedCount: 1,
    completedAt: 1000,
  }),
  'Valid history item accepted'
);
assert(
  !validateHistoryItem({
    date: '2026-08-25',
    plannedMinutes: 17 as any, // Not an AllowedDailyMinutes
    taskCount: 3,
    completedCount: 2,
    skippedCount: 1,
    completedAt: 1000,
  }),
  'History item with non-allowed plannedMinutes (17) rejected'
);
assert(
  !validateHistoryItem({
    date: '2026-08-25',
    plannedMinutes: 15,
    taskCount: 3.5 as any,
    completedCount: 2,
    skippedCount: 1,
    completedAt: 1000,
  }),
  'History item with float taskCount rejected'
);
assert(
  !validateHistoryItem({
    date: '2026-08-25',
    plannedMinutes: 15,
    taskCount: 3,
    completedCount: 2,
    skippedCount: 2, // 2 + 2 = 4 > taskCount (3)
    completedAt: 1000,
  }),
  'History item with (completedCount + skippedCount) > taskCount rejected'
);
assert(
  !validateHistoryItem({
    date: '2026-08-25',
    plannedMinutes: 15,
    taskCount: 3,
    completedCount: 2,
    skippedCount: 0,
    completedAt: 0,
  }),
  'History item with completedAt <= 0 rejected'
);

// -------------------------------------------------------------
// Test Group 7: Goal Downgrade & Reallocation Invariants
// -------------------------------------------------------------
console.log('\n--- Test Group 7: Goal Downgrade & Reallocation Invariant Tests ---');

// Mock in-memory localStorage for Node testing
const mockStorage: Record<string, string> = {};
const mockWindow = {
  dispatchEvent: () => true,
  localStorage: {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
  },
};
(global as any).window = mockWindow;
(global as any).localStorage = mockWindow.localStorage;

// Case 1: 30-minute plan, 4 tasks, 1 completed (5 min), 3 pending. Change to 10 min.
const activePlan4Tasks: TodayStudyPlan = {
  schemaVersion: 1,
  id: 'plan-realloc-1',
  localDate: getLocalDateKey(),
  dailyMinutes: 30,
  planSeed: 1111,
  createdAt: 1000,
  updatedAt: 1000,
  state: 'scheduled',
  tasks: [
    {
      id: 'task-rev-5m',
      type: 'review',
      title: 'Smart Review',
      description: 'Desc',
      reason: 'Reason',
      estimatedMinutes: 5,
      status: 'completed',
      reviewItemTarget: 5,
      createdAt: 1000,
      evidence: { reviewedTodayBaseline: 0, reviewTargetCount: 5 },
    },
    {
      id: 'task-les-1',
      type: 'lesson',
      title: 'Lesson 1',
      description: 'Desc',
      reason: 'Reason',
      estimatedMinutes: 8,
      status: 'pending',
      lessonId: LESSONS[0].id,
      level: LESSONS[0].level,
      createdAt: 1000,
    },
    {
      id: 'task-les-2',
      type: 'lesson',
      title: 'Lesson 2',
      description: 'Desc',
      reason: 'Reason',
      estimatedMinutes: 8,
      status: 'pending',
      lessonId: LESSONS[1].id,
      level: LESSONS[1].level,
      createdAt: 1000,
    },
    {
      id: 'task-test-3',
      type: 'quick-test',
      title: 'Quick Test',
      description: 'Desc',
      reason: 'Reason',
      estimatedMinutes: 10,
      status: 'pending',
      level: 'B1',
      createdAt: 1000,
      evidence: { examHistoryLatestIdAtCreation: null, examLevel: 'B1', examMode: 'quick' },
    },
  ],
};
saveTodayPlan(activePlan4Tasks);
saveStudyPlanSettings({
  schemaVersion: 1,
  dailyMinutes: 30,
  createdAt: 1000,
  updatedAt: 1000,
});

const reallocResult10m = updateDailyGoalAndRegeneratePlan(10);
assert(reallocResult10m.appliedToToday === true, 'Goal change 30m -> 10m with 5m completed applies to today');
assert(reallocResult10m.plan.dailyMinutes === 10, 'Reallocated plan dailyMinutes is 10');
assert(
  reallocResult10m.plan.tasks[0].id === 'task-rev-5m' && reallocResult10m.plan.tasks[0].status === 'completed',
  'Resolved 5m review task is strictly preserved'
);
const totalReallocMinutes = reallocResult10m.plan.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
assert(
  totalReallocMinutes <= 10 + 5,
  `Reallocated plan total minutes (${totalReallocMinutes}m) fits 10m budget + tolerance`
);
assert(validateTodayStudyPlan(reallocResult10m.plan), 'Reallocated plan passes strict validation');

// Case 2: 30-minute plan, 14 min resolved, change to 5 min.
const activePlan14m: TodayStudyPlan = {
  schemaVersion: 1,
  id: 'plan-downgrade-14m',
  localDate: getLocalDateKey(),
  dailyMinutes: 30,
  planSeed: 2222,
  createdAt: 1000,
  updatedAt: 1000,
  state: 'scheduled',
  tasks: [
    {
      id: 'task-14m-1',
      type: 'lesson',
      title: 'Lesson 1',
      description: 'Desc',
      reason: 'Reason',
      estimatedMinutes: 8,
      status: 'completed',
      lessonId: LESSONS[0].id,
      level: LESSONS[0].level,
      createdAt: 1000,
    },
    {
      id: 'task-14m-2',
      type: 'lesson',
      title: 'Lesson 2',
      description: 'Desc',
      reason: 'Reason',
      estimatedMinutes: 6,
      status: 'skipped',
      lessonId: LESSONS[1].id,
      level: LESSONS[1].level,
      createdAt: 1000,
    },
  ],
};
saveTodayPlan(activePlan14m);
saveStudyPlanSettings({
  schemaVersion: 1,
  dailyMinutes: 30,
  createdAt: 1000,
  updatedAt: 1000,
});

const downgradeResult5m = updateDailyGoalAndRegeneratePlan(5);
assert(
  downgradeResult5m.appliedToToday === false,
  'Goal change to 5m when 14m resolved sets appliedToToday = false'
);
assert(
  downgradeResult5m.plan.dailyMinutes === 30,
  'Today plan retains active 30m budget'
);
assert(
  loadStudyPlanSettings().dailyMinutes === 5,
  'User settings are updated to 5m for future days'
);
assert(
  downgradeResult5m.message !== undefined && downgradeResult5m.message.includes('tomorrow'),
  'Explanatory feedback message mentions tomorrow'
);

// Case 3: 15-minute plan, 0 resolved tasks, change to 5 min.
const activePlan0Resolved: TodayStudyPlan = {
  schemaVersion: 1,
  id: 'plan-0res',
  localDate: getLocalDateKey(),
  dailyMinutes: 15,
  planSeed: 3333,
  createdAt: 1000,
  updatedAt: 1000,
  state: 'scheduled',
  tasks: [
    {
      id: 'task-p1',
      type: 'lesson',
      title: 'Lesson 1',
      description: 'Desc',
      reason: 'Reason',
      estimatedMinutes: 8,
      status: 'pending',
      lessonId: LESSONS[0].id,
      level: LESSONS[0].level,
      createdAt: 1000,
    },
  ],
};
saveTodayPlan(activePlan0Resolved);
saveStudyPlanSettings({
  schemaVersion: 1,
  dailyMinutes: 15,
  createdAt: 1000,
  updatedAt: 1000,
});

const freshRealloc5m = updateDailyGoalAndRegeneratePlan(5);
assert(freshRealloc5m.appliedToToday === true, 'Goal change with 0 resolved tasks regenerates today');
assert(freshRealloc5m.plan.dailyMinutes === 5, 'Regenerated plan dailyMinutes is 5');
assert(validateTodayStudyPlan(freshRealloc5m.plan), 'Regenerated 5m plan passes validation');

// -------------------------------------------------------------
// Test Group 8: Evidence-Based Task Reconciliation
// -------------------------------------------------------------
console.log('\n--- Test Group 8: Evidence-Based Status Reconciliation ---');

const basePlan: TodayStudyPlan = {
  schemaVersion: 1,
  id: 'plan-rec-1',
  localDate: '2026-08-25',
  dailyMinutes: 15,
  planSeed: 5555,
  createdAt: 1000,
  updatedAt: 1000,
  state: 'scheduled',
  tasks: [
    {
      id: 'task-rev-1',
      type: 'review',
      title: 'Daily Review',
      description: 'Review cards',
      reason: 'Spaced Repetition',
      estimatedMinutes: 4,
      status: 'pending',
      reviewItemTarget: 5,
      evidence: { reviewedTodayBaseline: 0, reviewTargetCount: 5 },
      createdAt: 1000,
    },
    {
      id: 'task-les-1',
      type: 'lesson',
      title: 'Lesson Learn',
      description: 'Learn words',
      reason: 'Curriculum',
      estimatedMinutes: 7,
      status: 'pending',
      lessonId: LESSONS[0].id,
      level: LESSONS[0].level,
      createdAt: 1000,
    },
  ],
};

const recResult = reconcilePlanTaskStatuses(basePlan);
assert(typeof recResult.hasChanged === 'boolean', 'Reconciliation returns pure result');
assert(recResult.plan.tasks.length === 2, 'Reconciliation preserves task count');

// -------------------------------------------------------------
// Test Group 9: Storage Persistence Return Type
// -------------------------------------------------------------
console.log('\n--- Test Group 9: Storage Persistence Return Values ---');

assert(saveTodayPlan(validPlan) === true, 'saveTodayPlan returns true on valid plan');
assert(saveTodayPlan({ ...validPlan, schemaVersion: 99 as any }) === false, 'saveTodayPlan returns false on invalid plan');
assert(
  saveStudyPlanSettings({ schemaVersion: 1, dailyMinutes: 15, createdAt: 1000, updatedAt: 1000 }) === true,
  'saveStudyPlanSettings returns true on valid settings'
);
assert(
  saveStudyPlanSettings({ schemaVersion: 1, dailyMinutes: 45 as any, createdAt: 1000, updatedAt: 1000 }) === false,
  'saveStudyPlanSettings returns false on invalid settings'
);

// -------------------------------------------------------------
// Test Group 10: Gamification Absence Guard
// -------------------------------------------------------------
console.log('\n--- Test Group 10: Gamification Absence Guard ---');

const generatedSample = generateTodayStudyPlan(
  {
    review: { dueCount: 5, reviewedTodayCount: 0 },
    lessons: { completedLessonIds: new Set(), recentLessonIds: [] },
  },
  { schemaVersion: 1, dailyMinutes: 15, createdAt: 1000, updatedAt: 1000 },
  '2026-08-25'
);

const sampleStr = JSON.stringify(generatedSample).toLowerCase();
const gamificationKeywords = ['xp', 'coin', 'heart', 'trophy', 'streak', 'flame', 'badge', 'leaderboard'];
let foundGamification = false;

for (const kw of gamificationKeywords) {
  if (sampleStr.includes(`"${kw}"`) || sampleStr.includes(`:${kw}`)) {
    foundGamification = true;
    console.error(`Found gamification key: ${kw}`);
  }
}
assert(!foundGamification, 'Zero gamification attributes exist in generated study plans');

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n=============================================');
console.log(`Study Plan Suite: ${passedTests}/${totalTests} tests passed (${failedTests} failed).`);
console.log('=============================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
