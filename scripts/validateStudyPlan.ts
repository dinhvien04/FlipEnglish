/**
 * Validation and test suite for FlipEnglish Today / Smart Study Plan.
 * Validates deterministic plan generation, time budgeting, review chunk limits,
 * curriculum selection priorities, storage schemas, tamper-resistance, and evidence-based reconciliation.
 */

import {
  generateTodayStudyPlan,
  getLocalDateKey,
  getReviewChunkLimit,
  estimateReviewMinutes,
} from '../src/features/studyPlan/studyPlanEngine';
import {
  validateStudyPlanSettings,
  validateStudyPlanTask,
  validateTodayStudyPlan,
  validateHistoryItem,
  reconcilePlanTaskStatuses,
} from '../src/features/studyPlan/studyPlanStorage';
import {
  StudyPlanContext,
  StudyPlanSettings,
  TodayStudyPlan,
  ALLOWED_DAILY_MINUTES,
} from '../src/features/studyPlan/studyPlanTypes';
import { LESSONS, getLessonById } from '../src/data/lessons';

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

// -------------------------------------------------------------
// Test Group 2: Local Calendar Date Formatting
// -------------------------------------------------------------
console.log('\n--- Test Group 2: Local Calendar Date Formatter ---');

const testDate = new Date(2026, 7, 25, 23, 45, 0); // Local Aug 25, 2026 23:45
assert(getLocalDateKey(testDate) === '2026-08-25', 'Local calendar date correctly formatted YYYY-MM-DD');

const testDate2 = new Date(2026, 0, 5, 0, 15, 0); // Local Jan 5, 2026 00:15
assert(getLocalDateKey(testDate2) === '2026-01-05', 'Single digit month and day padded with zeros');

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
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const plan1 = generateTodayStudyPlan(context, settings, '2026-08-25', 12345);
  const plan2 = generateTodayStudyPlan(context, settings, '2026-08-25', 12345);

  assert(
    JSON.stringify(plan1) === JSON.stringify(plan2),
    `Plan generation is 100% deterministic for ${minutes} min goal`
  );

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
// Test Group 4: Priority Order Verification
// -------------------------------------------------------------
console.log('\n--- Test Group 4: Priority Ordering Logic ---');

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

// -------------------------------------------------------------
// Test Group 5: Schema Validation and Tamper Attack Tests
// -------------------------------------------------------------
console.log('\n--- Test Group 5: Storage Schema Validation & Tamper Rejection ---');

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
  'Placement task with fake lessonId rejected'
);

// Today Plan tests
const validPlan: TodayStudyPlan = {
  schemaVersion: 1,
  id: 'plan-1',
  localDate: '2026-08-25',
  dailyMinutes: 15,
  createdAt: 1000,
  updatedAt: 1000,
  tasks: [validTask as any],
};
assert(validateTodayStudyPlan(validPlan), 'Valid TodayStudyPlan accepted');

assert(
  !validateTodayStudyPlan({ ...validPlan, localDate: 'invalid-date-format' }),
  'Plan with invalid localDate format rejected'
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
    completedCount: 3,
    skippedCount: 0,
    completedAt: 1000,
  }),
  'Valid history item accepted'
);

assert(
  !validateHistoryItem({
    date: '2026-08-25',
    plannedMinutes: 15,
    taskCount: 3,
    completedCount: 5, // Impossible: > taskCount
    skippedCount: 0,
    completedAt: 1000,
  }),
  'History item with completedCount > taskCount rejected'
);

// -------------------------------------------------------------
// Test Group 6: Evidence-Based Task Reconciliation
// -------------------------------------------------------------
console.log('\n--- Test Group 6: Evidence-Based Status Reconciliation ---');

const basePlan: TodayStudyPlan = {
  schemaVersion: 1,
  id: 'plan-rec-1',
  localDate: '2026-08-25',
  dailyMinutes: 15,
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
// Test Group 7: No Gamification Elements
// -------------------------------------------------------------
console.log('\n--- Test Group 7: Gamification Absence Guard ---');

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
