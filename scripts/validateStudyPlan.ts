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
// Test Group 5: Priority Order Verification
// -------------------------------------------------------------
console.log('\n--- Test Group 5: Priority Ordering Logic ---');

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

// Case D: All Curriculum Completed Edge Case -> does NOT fake LESSONS[0] as uncompleted
const allCompletedContext: StudyPlanContext = {
  review: { dueCount: 0, reviewedTodayCount: 0 },
  lessons: {
    completedLessonIds: new Set(LESSONS.map((l) => l.id)),
    recentLessonIds: [],
  },
  placement: { estimatedLevel: 'C2', recommendedLessonIds: [], latestResultId: 'p-c2' },
};
const allCompletedPlan = generateTodayStudyPlan(allCompletedContext, newLearnerSettings, '2026-08-25');
assert(
  allCompletedPlan.tasks.every((t) => t.type !== 'lesson'),
  'When entire curriculum is completed, engine does not output fake uncompleted lesson tasks'
);

// -------------------------------------------------------------
// Test Group 6: Schema Validation and Tamper Attack Tests
// -------------------------------------------------------------
console.log('\n--- Test Group 6: Storage Schema Validation & Tamper Rejection ---');

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

// Task tests
const validTask = {
  id: 'task-1',
  type: 'lesson',
  title: 'Test Lesson',
  description: 'Desc',
  reason: 'Reason',
  estimatedMinutes: 8,
  status: 'pending',
  lessonId: LESSONS[0].id,
  createdAt: 1000,
};
assert(validateStudyPlanTask(validTask), 'Valid lesson task accepted');

assert(
  !validateStudyPlanTask({ ...validTask, lessonId: 'fake-nonexistent-lesson-id-999' }),
  'Task with non-existent lessonId rejected'
);

assert(
  !validateStudyPlanTask({ ...validTask, type: 'hacked-type' }),
  'Task with invalid type rejected'
);

assert(
  !validateStudyPlanTask({ ...validTask, estimatedMinutes: 120 }),
  'Task with excessive estimatedMinutes (>30) rejected'
);

assert(
  !validateStudyPlanTask({ ...validTask, type: 'placement', lessonId: 'greetings' }),
  'Placement task with forbidden lessonId rejected'
);

assert(
  !validateStudyPlanTask({ ...validTask, type: 'lesson', reviewItemTarget: 10 }),
  'Lesson task with forbidden reviewItemTarget rejected'
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
  tasks: [validTask as any],
};
assert(validateTodayStudyPlan(validPlan), 'Valid TodayStudyPlan accepted');

assert(
  !validateTodayStudyPlan({ ...validPlan, localDate: '2026-02-31' }),
  'Plan with non-existent calendar date (2026-02-31) rejected'
);

assert(
  !validateTodayStudyPlan({ ...validPlan, tasks: [] }),
  'Plan with 0 tasks rejected'
);

assert(
  !validateTodayStudyPlan({
    ...validPlan,
    dailyMinutes: 5,
    tasks: [
      { ...validTask, id: 't1', estimatedMinutes: 15 },
      { ...validTask, id: 't2', estimatedMinutes: 15 },
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
    plannedMinutes: 15,
    taskCount: 3,
    completedCount: 2,
    skippedCount: 2, // 2 + 2 = 4 > taskCount (3)
    completedAt: 1000,
  }),
  'History item with (completedCount + skippedCount) > taskCount rejected'
);

// -------------------------------------------------------------
// Test Group 7: Goal Downgrade Invariants
// -------------------------------------------------------------
console.log('\n--- Test Group 7: Goal Downgrade Invariant Tests ---');

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

// Setup a plan with 1 completed task of 8 mins
const activePlanWithProgress: TodayStudyPlan = {
  schemaVersion: 1,
  id: 'plan-downgrade-test',
  localDate: getLocalDateKey(),
  dailyMinutes: 15,
  planSeed: 9999,
  createdAt: 1000,
  updatedAt: 1000,
  tasks: [
    {
      id: 'task-1',
      type: 'lesson',
      title: 'Lesson 1',
      description: 'Desc',
      reason: 'Reason',
      estimatedMinutes: 8,
      status: 'completed',
      lessonId: LESSONS[0].id,
      createdAt: 1000,
    },
    {
      id: 'task-2',
      type: 'lesson',
      title: 'Lesson 2',
      description: 'Desc',
      reason: 'Reason',
      estimatedMinutes: 7,
      status: 'pending',
      lessonId: LESSONS[1].id,
      createdAt: 1000,
    },
  ],
};
saveTodayPlan(activePlanWithProgress);
saveStudyPlanSettings({
  schemaVersion: 1,
  dailyMinutes: 15,
  createdAt: 1000,
  updatedAt: 1000,
});

// Downgrade goal to 5 minutes (less than the 8 minutes already completed)
const downgradeResult = updateDailyGoalAndRegeneratePlan(5);
assert(
  downgradeResult.appliedToToday === false,
  'Goal downgrade when resolved minutes > newGoal sets appliedToToday = false'
);
assert(
  downgradeResult.message !== undefined && downgradeResult.message.includes('tomorrow'),
  'Goal downgrade provides explanatory message for tomorrow'
);
assert(
  loadStudyPlanSettings().dailyMinutes === 5,
  'Study plan settings are updated to 5 minutes for future days'
);

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
      evidence: { reviewedTodayBaseline: 0 },
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
      createdAt: 1000,
    },
  ],
};

const recResult = reconcilePlanTaskStatuses(basePlan);
assert(typeof recResult.hasChanged === 'boolean', 'Reconciliation returns pure result');
assert(recResult.plan.tasks.length === 2, 'Reconciliation preserves task count');

// -------------------------------------------------------------
// Test Group 9: No Gamification Elements
// -------------------------------------------------------------
console.log('\n--- Test Group 9: Gamification Absence Guard ---');

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
