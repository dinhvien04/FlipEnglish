import { resolveNextAction, getActiveSessionSummary } from '../src/features/continuity/smartNextActionEngine';
import { ALL_CURRICULUM_LESSONS } from '../src/data/curriculum';
import { STORAGE_KEYS } from '../src/constants/storageKeys';

// Simple in-memory localStorage mock for node tests
class LocalStorageMock {
  store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockStorage = new LocalStorageMock();
(globalThis as any).localStorage = mockStorage;
(globalThis as any).window = globalThis;

console.log('--- 1. Testing Default Baseline (Fresh State) ---');
mockStorage.clear();
const action1 = resolveNextAction();
console.log('Priority:', action1.priority);
if (action1.priority !== 'study-plan-task' && action1.priority !== 'next-curriculum-lesson') {
  console.error('Unexpected baseline priority:', action1.priority);
  process.exit(1);
}
console.log('✅ Baseline resolved successfully');

console.log('\n--- 2. Testing Priority 1: In-Progress Active Exam ---');
mockStorage.clear();
const activeExamSession = {
  schemaVersion: 2,
  id: 'exam-test-1',
  mode: 'quick',
  level: 'B1',
  title: 'Quick Test',
  durationMinutes: 15,
  startedAt: Date.now() - 60000,
  endsAt: Date.now() + 600000, // 10 mins left
  status: 'active',
  questions: [
    {
      id: 'q1',
      sectionId: 's1',
      sectionTitle: 'Sec 1',
      sectionType: 'vocabulary',
      kind: 'multiple-choice',
      prompt: 'test prompt',
      options: [
        { id: 'opt1', text: 'A' },
        { id: 'opt2', text: 'B' },
      ],
      correctAnswer: 'A',
    },
    {
      id: 'q2',
      sectionId: 's1',
      sectionTitle: 'Sec 1',
      sectionType: 'vocabulary',
      kind: 'multiple-choice',
      prompt: 'test prompt 2',
      options: [
        { id: 'opt1', text: 'A' },
        { id: 'opt2', text: 'B' },
      ],
      correctAnswer: 'B',
    },
  ],
  answers: { q1: 'A' },
  flaggedQuestionIds: [],
  currentQuestionIndex: 1,
  timeRemainingSeconds: 600,
};
mockStorage.setItem(STORAGE_KEYS.EXAM_ACTIVE, JSON.stringify(activeExamSession));

const actionExam = resolveNextAction();
if (actionExam.priority !== 'active-exam' || actionExam.targetView !== 'exam-session') {
  console.error('Expected active-exam recommendation, got:', actionExam);
  process.exit(1);
}
if (
  actionExam.titleKey !== 'continuity.resumeExamTitle' ||
  actionExam.subtitleKey !== 'continuity.resumeExamSubtitle' ||
  actionExam.badgeKey !== 'continuity.badgeResume' ||
  actionExam.actionTextKey !== 'continuity.actionResume'
) {
  console.error('Keys mismatch for active-exam:', actionExam);
  process.exit(1);
}
console.log('✅ Priority 1 active-exam passed');

console.log('\n--- 3. Testing Priority 2: In-Progress Placement Test ---');
mockStorage.clear();
const activePlacementSession = {
  schemaVersion: 1,
  id: 'placement-test-1',
  status: 'active',
  sessionSeed: 12345,
  startedAt: Date.now() - 60000,
  currentStageIndex: 1,
  currentQuestionInStageIndex: 2,
  currentLevel: 'B1',
  stages: [
    {
      stageIndex: 0,
      level: 'B1',
      isLocked: true,
      questions: Array(6).fill(null).map((_, i) => ({
        id: `q_0_${i}`,
        level: 'B1',
        skill: 'vocabulary',
        prompt: `p0_${i}`,
        options: [
          { id: '1', text: 'Option A' },
          { id: '2', text: 'Option B' },
          { id: '3', text: 'Option C' },
          { id: '4', text: 'Option D' },
        ],
        correctAnswer: 'Option A',
        sourceType: 'curriculum',
      })),
    },
    {
      stageIndex: 1,
      level: 'B1',
      isLocked: false,
      questions: Array(6).fill(null).map((_, i) => ({
        id: `q_1_${i}`,
        level: 'B1',
        skill: 'vocabulary',
        prompt: `p1_${i}`,
        options: [
          { id: '1', text: 'Option A' },
          { id: '2', text: 'Option B' },
          { id: '3', text: 'Option C' },
          { id: '4', text: 'Option D' },
        ],
        correctAnswer: 'Option A',
        sourceType: 'curriculum',
      })),
    },
  ],
  stageResults: [
    {
      stageIndex: 0,
      level: 'B1',
      questionIds: Array(6).fill(null).map((_, i) => `q_0_${i}`),
      totalQuestions: 6,
      correctCount: 4,
      scorePercentage: 67,
      routingDecision: 'same',
      nextLevel: 'B1',
    },
  ],
  answers: {
    q_0_0: 'Option A',
    q_0_1: 'Option A',
    q_0_2: 'Option A',
    q_0_3: 'Option A',
    q_0_4: 'Option B',
    q_0_5: 'Option B',
  },
};
mockStorage.setItem(STORAGE_KEYS.PLACEMENT_ACTIVE, JSON.stringify(activePlacementSession));

const actionPlacement = resolveNextAction();
if (actionPlacement.priority !== 'active-placement' || actionPlacement.targetView !== 'placement-session') {
  console.error('Expected active-placement recommendation, got:', actionPlacement);
  process.exit(1);
}
if (
  actionPlacement.titleKey !== 'continuity.resumePlacementTitle' ||
  actionPlacement.subtitleKey !== 'continuity.resumePlacementSubtitle' ||
  actionPlacement.badgeKey !== 'continuity.badgePlacement' ||
  actionPlacement.actionTextKey !== 'continuity.actionResume'
) {
  console.error('Keys mismatch for active-placement:', actionPlacement);
  process.exit(1);
}
console.log('✅ Priority 2 active-placement passed');

console.log('\n--- 4. Testing Priority 3: In-Progress Learn Session ---');
mockStorage.clear();
const activeLearn = {
  schemaVersion: 1,
  lessonId: ALL_CURRICULUM_LESSONS[0].id,
  flashcardIndex: 3,
  hasCompletedAll: false,
  isReviewMistakesMode: false,
  totalWords: ALL_CURRICULUM_LESSONS[0].words.length,
  timestamp: Date.now(),
};
mockStorage.setItem(STORAGE_KEYS.LEARN_SESSION_ACTIVE, JSON.stringify(activeLearn));

const actionLearn = resolveNextAction();
if (actionLearn.priority !== 'active-learn' || actionLearn.targetView !== 'learn') {
  console.error('Expected active-learn recommendation, got:', actionLearn);
  process.exit(1);
}
if (
  actionLearn.titleKey !== 'continuity.resumeLearnTitle' ||
  actionLearn.subtitleKey !== 'continuity.resumeLearnSubtitle' ||
  actionLearn.badgeKey !== 'continuity.badgeInProgress' ||
  actionLearn.actionTextKey !== 'continuity.actionContinue'
) {
  console.error('Keys mismatch for active-learn:', actionLearn);
  process.exit(1);
}
console.log('✅ Priority 3 active-learn passed');

console.log('\n--- 5. Testing Priority 4: In-Progress Review Session ---');
mockStorage.clear();
const firstLessonWord = ALL_CURRICULUM_LESSONS[0].words[0];
const activeReview = {
  schemaVersion: 1,
  activeQueue: [
    {
      state: {
        itemId: firstLessonWord.id,
        status: 'learning',
        firstSeenAt: Date.now() - 86400000,
        lastReviewedAt: null,
        nextReviewAt: Date.now() - 3600000,
        intervalMinutes: 10,
        reviewCount: 1,
        correctCount: 0,
        lapseCount: 1,
        correctStreak: 0,
        lastRating: 'again',
      },
      word: firstLessonWord,
      lesson: ALL_CURRICULUM_LESSONS[0],
      level: ALL_CURRICULUM_LESSONS[0].level,
      isOverdue: true,
      nextIntervals: { again: 10, hard: 1440, good: 4320, easy: 10080 },
    },
  ],
  currentIndex: 0,
  ratingBreakdown: { again: 0, hard: 0, good: 0, easy: 0 },
  timestamp: Date.now(),
};
mockStorage.setItem(STORAGE_KEYS.REVIEW_SESSION_ACTIVE, JSON.stringify(activeReview));

const actionReview = resolveNextAction();
if (actionReview.priority !== 'active-review' || actionReview.targetView !== 'review') {
  console.error('Expected active-review recommendation, got:', actionReview);
  process.exit(1);
}
if (
  actionReview.titleKey !== 'continuity.resumeReviewTitle' ||
  actionReview.subtitleKey !== 'continuity.resumeReviewSubtitle' ||
  actionReview.badgeKey !== 'continuity.badgeReview' ||
  actionReview.actionTextKey !== 'continuity.actionContinue'
) {
  console.error('Keys mismatch for active-review:', actionReview);
  process.exit(1);
}
console.log('✅ Priority 4 active-review passed');

console.log('\n--- 6. Testing Priority 5: Due Review Items ---');
mockStorage.clear();
const reviewStorageData = {
  schemaVersion: 1,
  items: {
    [firstLessonWord.id]: {
      itemId: firstLessonWord.id,
      status: 'learning',
      firstSeenAt: Date.now() - 86400000,
      lastReviewedAt: null,
      nextReviewAt: Date.now() - 3600000, // overdue
      intervalMinutes: 10,
      reviewCount: 0,
      correctCount: 0,
      lapseCount: 0,
      correctStreak: 0,
      lastRating: null,
    },
  },
  recentLogs: [],
};
mockStorage.setItem(STORAGE_KEYS.REVIEW, JSON.stringify(reviewStorageData));

const actionDueReview = resolveNextAction();
if (actionDueReview.priority !== 'due-review' || actionDueReview.targetView !== 'review') {
  console.error('Expected due-review recommendation, got:', actionDueReview);
  process.exit(1);
}
if (
  actionDueReview.titleKey !== 'continuity.dueReviewTitle' ||
  actionDueReview.subtitleKey !== 'continuity.dueReviewSubtitle' ||
  actionDueReview.badgeKey !== 'continuity.badgeReviewDue' ||
  actionDueReview.actionTextKey !== 'continuity.actionStartReview'
) {
  console.error('Keys mismatch for due-review:', actionDueReview);
  process.exit(1);
}
console.log('✅ Priority 5 due-review passed');

console.log('\n--- 7. Testing Priority 6: Study Plan Task ---');
mockStorage.clear();
const studyPlanData = {
  schemaVersion: 1,
  id: 'plan-test-1',
  localDate: '2026-08-28',
  dailyMinutes: 15,
  planSeed: 1234,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  state: 'scheduled',
  tasks: [
    {
      id: 'task-lesson-1',
      type: 'lesson',
      title: 'Learn: Essential Greetings',
      description: 'A1 · Vocabulary',
      reason: 'Continue English curriculum',
      estimatedMinutes: 6,
      status: 'pending',
      lessonId: ALL_CURRICULUM_LESSONS[0].id,
      level: 'A1',
      createdAt: Date.now(),
    },
  ],
};
mockStorage.setItem(STORAGE_KEYS.STUDY_PLAN_TODAY, JSON.stringify(studyPlanData));

const actionStudyPlan = resolveNextAction();
if (actionStudyPlan.priority !== 'study-plan-task') {
  console.error('Expected study-plan-task recommendation, got:', actionStudyPlan);
  process.exit(1);
}
if (
  actionStudyPlan.titleKey !== 'continuity.dailyTaskTitle' ||
  actionStudyPlan.subtitleKey !== 'continuity.dailyTaskSubtitle' ||
  actionStudyPlan.badgeKey !== 'continuity.badgeToday' ||
  actionStudyPlan.actionTextKey !== 'continuity.actionStart'
) {
  console.error('Keys mismatch for study-plan-task:', actionStudyPlan);
  process.exit(1);
}
console.log('✅ Priority 6 study-plan-task passed');

console.log('\n--- 8. Testing Priority 7: Next Recommended Curriculum Lesson ---');
mockStorage.clear();
const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
// Mark today's plan as completed tasks with valid evidence and correct key
const completedStudyPlanData = {
  schemaVersion: 1,
  id: 'plan-test-2',
  localDate: todayKey,
  dailyMinutes: 15,
  planSeed: 1234,
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 1000,
  state: 'scheduled',
  tasks: [
    {
      id: 'task-lesson-1',
      type: 'lesson',
      title: 'Learn: Essential Greetings',
      description: 'A1 · Vocabulary',
      reason: 'Continue English curriculum',
      estimatedMinutes: 6,
      status: 'completed',
      lessonId: ALL_CURRICULUM_LESSONS[0].id,
      level: 'A1',
      createdAt: Date.now() - 3600000,
      completedAt: Date.now() - 1000,
      evidence: {
        lessonId: ALL_CURRICULUM_LESSONS[0].id,
        wasCompletedAtPlanCreation: false,
      },
    },
  ],
};
mockStorage.setItem('flipenglish_today_plan_v1', JSON.stringify(completedStudyPlanData));

// Mark first lesson as completed in progress
mockStorage.setItem(
  STORAGE_KEYS.PROGRESS,
  JSON.stringify({
    [ALL_CURRICULUM_LESSONS[0].id]: {
      completed: true,
      bestScore: 100,
      lastLearnedAt: new Date().toISOString(),
    },
  })
);

const actionCurriculum = resolveNextAction();
if (
  actionCurriculum.priority !== 'next-curriculum-lesson' ||
  actionCurriculum.targetView !== 'lesson-intro'
) {
  console.error('Expected next-curriculum-lesson recommendation, got:', actionCurriculum);
  process.exit(1);
}
if (actionCurriculum.actionPayload?.lessonId !== ALL_CURRICULUM_LESSONS[1].id) {
  console.error(
    `Expected lessonId to be second lesson (${ALL_CURRICULUM_LESSONS[1].id}), got:`,
    actionCurriculum.actionPayload?.lessonId
  );
  process.exit(1);
}
if (
  actionCurriculum.titleKey !== 'continuity.nextLessonTitle' ||
  actionCurriculum.subtitleKey !== 'continuity.nextLessonSubtitle' ||
  actionCurriculum.badgeKey !== 'continuity.badgeNextLesson' ||
  actionCurriculum.actionTextKey !== 'continuity.actionStartLesson'
) {
  console.error('Keys mismatch for next-curriculum-lesson:', actionCurriculum);
  process.exit(1);
}
console.log('✅ Priority 7 next-curriculum-lesson passed');

console.log('\n--- 9. Testing Summary Helper getActiveSessionSummary ---');
mockStorage.clear();
mockStorage.setItem(STORAGE_KEYS.EXAM_ACTIVE, JSON.stringify(activeExamSession));
const summary = getActiveSessionSummary();
if (!summary.hasActiveExam || summary.hasActivePlacement || summary.hasActiveLearn || summary.hasActiveReview) {
  console.error('Summary mismatch:', summary);
  process.exit(1);
}
console.log('✅ Summary helper passed');

console.log('\n🎉 ALL SMART NEXT-ACTION ENGINE TESTS PASSED WITH 100% SUCCESS.');
