import { CEFRLevel, Lesson } from '../../types';
import {
  AllowedDailyMinutes,
  StudyPlanContext,
  StudyPlanSettings,
  StudyPlanTask,
  TodayStudyPlan,
  TodayPlanState,
} from './studyPlanTypes';
import { LESSONS, getLessonById } from '../../data/lessons';
import { QUICK_TEST_CONFIG } from '../../data/exams/config';

export const ORDERED_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Checks if a string is a valid local calendar date in format YYYY-MM-DD.
 * Validates actual calendar boundaries (e.g. rejects 2026-02-31, 2026-13-01).
 */
export function isValidLocalDateKey(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Local calendar date round-trip validation
  const testDate = new Date(year, month - 1, day);
  return (
    testDate.getFullYear() === year &&
    testDate.getMonth() === month - 1 &&
    testDate.getDate() === day
  );
}

/**
 * Returns formatted YYYY-MM-DD string strictly in the user's LOCAL calendar timezone.
 * Avoids any UTC ISO extraction shift near midnight.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Determines maximum allowed review chunk size according to the daily time budget.
 * 5m  -> max 5 items (~2 min)
 * 10m -> max 8 items (~3-4 min)
 * 15m -> max 10 items (~4 min)
 * 20m -> max 15 items (~6 min)
 * 30m -> max 20 items (~8 min)
 */
export function getReviewChunkLimit(dailyMinutes: AllowedDailyMinutes): number {
  switch (dailyMinutes) {
    case 5:
      return 5;
    case 10:
      return 8;
    case 15:
      return 10;
    case 20:
      return 15;
    case 30:
      return 20;
    default:
      return 10;
  }
}

/**
 * Estimates review time rounded to integer minutes based on ~25 seconds per item.
 */
export function estimateReviewMinutes(itemCount: number): number {
  if (itemCount <= 0) return 0;
  const rawMinutes = (itemCount * 25) / 60;
  return Math.max(1, Math.round(rawMinutes));
}

/**
 * Central allocation helper that returns both targetCount and estimatedMinutes
 * while ensuring that if available time is constrained, targetCount scales down
 * consistently with the 25-30s/item heuristic.
 */
export function allocateReviewBlock(
  dueCount: number,
  dailyMinutes: AllowedDailyMinutes,
  availableMinutes: number
): { targetCount: number; estimatedMinutes: number } {
  if (dueCount <= 0 || availableMinutes <= 0) {
    return { targetCount: 0, estimatedMinutes: 0 };
  }

  const chunkLimit = getReviewChunkLimit(dailyMinutes);
  let targetCount = Math.min(dueCount, chunkLimit);
  let estimatedMinutes = estimateReviewMinutes(targetCount);

  // If daily budget > 5, ensure review leaves at least 2 minutes for curriculum if possible
  if (dailyMinutes > 5 && availableMinutes - estimatedMinutes < 2 && estimatedMinutes > 2) {
    estimatedMinutes = Math.max(2, availableMinutes - 2);
    // Scale targetCount down so count remains realistic for the reduced time (~2 items per minute)
    const maxItemsInTime = Math.max(1, Math.floor((estimatedMinutes * 60) / 25));
    targetCount = Math.min(targetCount, maxItemsInTime);
  }

  // For 5-minute plan, cap review to max 3 minutes and scale items accordingly
  if (dailyMinutes === 5 && estimatedMinutes > 3) {
    estimatedMinutes = 3;
    const maxItemsInTime = Math.max(1, Math.floor((estimatedMinutes * 60) / 25));
    targetCount = Math.min(targetCount, maxItemsInTime);
  }

  // Ensure estimatedMinutes does not exceed available budget
  if (estimatedMinutes > availableMinutes) {
    estimatedMinutes = availableMinutes;
    const maxItemsInTime = Math.max(1, Math.floor((estimatedMinutes * 60) / 25));
    targetCount = Math.min(targetCount, maxItemsInTime);
  }

  return { targetCount, estimatedMinutes };
}

/**
 * Generates a deterministic hash code from a string.
 */
export function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generates a stable task target key for deduplication.
 */
export function getTaskTargetKey(task: StudyPlanTask): string {
  switch (task.type) {
    case 'review':
      return 'review';
    case 'placement':
      return 'placement';
    case 'quick-test':
      return `quick-test:${task.level || 'all'}`;
    case 'lesson':
      return `lesson:${task.lessonId || 'unknown'}`;
  }
}

/**
 * Pure generator for Today Study Plan.
 * Completely deterministic, zero external network/AI dependencies, respects dailyMinutes.
 */
export function generateTodayStudyPlan(
  context: StudyPlanContext,
  settings: StudyPlanSettings,
  localDate: string,
  seed: number = stringToHash(localDate),
  now: number = Date.now()
): TodayStudyPlan {
  const tasks: StudyPlanTask[] = [];
  const dailyMinutes = settings.dailyMinutes;
  let remainingMinutes = dailyMinutes;

  const usedLessonIds = new Set<string>();
  const isNewLearner =
    !context.placement &&
    context.lessons.completedLessonIds.size === 0 &&
    context.review.dueCount === 0;

  // ----------------------------------------------------
  // 1. SMART REVIEW PRIORITY (Task #1 if items are due)
  // ----------------------------------------------------
  if (context.review.dueCount > 0) {
    const reviewBlock = allocateReviewBlock(context.review.dueCount, dailyMinutes, remainingMinutes);
    if (reviewBlock.targetCount > 0 && reviewBlock.estimatedMinutes >= 1) {
      tasks.push({
        id: `task-review-${localDate}-${tasks.length}`,
        type: 'review',
        title: 'Smart Review',
        description: `Review ${reviewBlock.targetCount} vocabulary item${reviewBlock.targetCount > 1 ? 's' : ''}`,
        reason: `${context.review.dueCount} item${context.review.dueCount > 1 ? 's are' : ' is'} due for spaced repetition review.`,
        estimatedMinutes: reviewBlock.estimatedMinutes,
        status: 'pending',
        reviewItemTarget: reviewBlock.targetCount,
        createdAt: now,
        evidence: {
          reviewedTodayBaseline: context.review.reviewedTodayCount || 0,
          reviewTargetCount: reviewBlock.targetCount,
        },
      });
      remainingMinutes -= reviewBlock.estimatedMinutes;
    }
  }

  // ----------------------------------------------------
  // 2. ONBOARDING FOR BRAND-NEW LEARNER (15+ min)
  // ----------------------------------------------------
  if (isNewLearner && dailyMinutes >= 15 && tasks.length === 0) {
    const placementMinutes = Math.min(10, remainingMinutes);
    tasks.push({
      id: `task-placement-${localDate}`,
      type: 'placement',
      title: 'Find Your Level',
      description: 'Take the adaptive Placement Check to discover your recommended starting point.',
      reason: 'Adaptive 4-stage check across Vocabulary, Use of English, Reading, and Listening.',
      estimatedMinutes: placementMinutes,
      status: 'pending',
      createdAt: now,
      evidence: {
        latestPlacementResultIdAtCreation: context.placement?.latestResultId || null,
      },
    });
    remainingMinutes -= placementMinutes;
  }

  // ----------------------------------------------------
  // 3. CURRICULUM LESSON SELECTION (Continue / Recommended)
  // ----------------------------------------------------
  const targetStartingLevel: CEFRLevel = context.placement?.estimatedLevel || 'A1';

  // Helper to find next incomplete lesson (returns null when all curriculum is completed)
  const findNextLesson = (): { lesson: Lesson; reason: string } | null => {
    // 3A. Meaningful recently active unfinished lesson
    for (const rId of context.lessons.recentLessonIds) {
      if (!context.lessons.completedLessonIds.has(rId) && !usedLessonIds.has(rId)) {
        const l = getLessonById(rId);
        if (l) return { lesson: l, reason: `Continue your active ${l.level} lesson.` };
      }
    }

    // 3B. Uncompleted Placement-recommended lesson
    if (context.placement?.recommendedLessonIds) {
      for (const recId of context.placement.recommendedLessonIds) {
        if (!context.lessons.completedLessonIds.has(recId) && !usedLessonIds.has(recId)) {
          const l = getLessonById(recId);
          if (l) return { lesson: l, reason: `Recommended from your latest ${context.placement.estimatedLevel} Placement Check.` };
        }
      }
    }

    // 3C. Uncompleted lesson at the Placement estimated level
    const levelLessons = LESSONS.filter((l) => l.level === targetStartingLevel);
    for (const l of levelLessons) {
      if (!context.lessons.completedLessonIds.has(l.id) && !usedLessonIds.has(l.id)) {
        return { lesson: l, reason: `Next uncompleted lesson at your ${targetStartingLevel} starting level.` };
      }
    }

    // 3D. Next uncompleted lesson across subsequent levels
    const startIndex = ORDERED_LEVELS.indexOf(targetStartingLevel);
    for (let i = startIndex; i < ORDERED_LEVELS.length; i++) {
      const lvl = ORDERED_LEVELS[i];
      const lessonsAtLvl = LESSONS.filter((l) => l.level === lvl);
      for (const l of lessonsAtLvl) {
        if (!context.lessons.completedLessonIds.has(l.id) && !usedLessonIds.has(l.id)) {
          return { lesson: l, reason: `Advance your curriculum progress in ${lvl}.` };
        }
      }
    }

    // 3E. Fallback for new or earlier learners: first incomplete in entire curriculum
    for (const l of LESSONS) {
      if (!context.lessons.completedLessonIds.has(l.id) && !usedLessonIds.has(l.id)) {
        return { lesson: l, reason: `Continue English curriculum practice in ${l.level}.` };
      }
    }

    // When ALL curriculum lessons are completed, return null (do NOT fake LESSONS[0] as uncompleted)
    return null;
  };

  // Add Primary Curriculum Lesson if time permits
  if (remainingMinutes >= 2 && tasks.length < 4) {
    const candidate = findNextLesson();
    if (candidate) {
      usedLessonIds.add(candidate.lesson.id);
      const lessonMinutes = Math.min(
        remainingMinutes >= 10 ? 8 : remainingMinutes >= 7 ? 6 : Math.max(2, remainingMinutes),
        remainingMinutes
      );

      tasks.push({
        id: `task-lesson-${localDate}-${tasks.length}`,
        type: 'lesson',
        title: `Learn: ${candidate.lesson.title}`,
        description: `${candidate.lesson.level} · ${candidate.lesson.category || 'Vocabulary & Practice'}`,
        reason: candidate.reason,
        estimatedMinutes: lessonMinutes,
        status: 'pending',
        lessonId: candidate.lesson.id,
        level: candidate.lesson.level,
        createdAt: now,
        evidence: {
          lessonId: candidate.lesson.id,
          wasCompletedAtPlanCreation: context.lessons.completedLessonIds.has(candidate.lesson.id),
        },
      });
      remainingMinutes -= lessonMinutes;
    }
  }

  // ----------------------------------------------------
  // 4. SECONDARY REINFORCEMENT / QUICK TEST (for 15-30m)
  // ----------------------------------------------------
  const quickTestDuration = QUICK_TEST_CONFIG.durationMinutes; // Canonical 10 min
  const quickTestQuestions = QUICK_TEST_CONFIG.questionCount;   // Canonical 15 questions

  if (remainingMinutes >= 4 && tasks.length < 4) {
    // Check if we should add Quick Test (dailyMinutes >= 20, remaining budget >= quickTestDuration)
    if (
      dailyMinutes >= 20 &&
      remainingMinutes >= quickTestDuration &&
      (context.lessons.completedLessonIds.size >= 1 || context.placement !== undefined)
    ) {
      const testLevel = context.placement?.estimatedLevel || context.latestExam?.level || 'B1';
      tasks.push({
        id: `task-test-${localDate}-${tasks.length}`,
        type: 'quick-test',
        title: `Quick Test: ${testLevel}`,
        description: `${quickTestQuestions}-question quick test at ${testLevel}`,
        reason: `Evaluate retention and measure progress in ${testLevel}.`,
        estimatedMinutes: quickTestDuration,
        status: 'pending',
        level: testLevel,
        createdAt: now,
        evidence: {
          examHistoryLatestIdAtCreation: context.latestExam?.latestId || null,
          examLevel: testLevel,
          examMode: 'quick',
        },
      });
      remainingMinutes -= quickTestDuration;
    } else {
      // Otherwise try to add a second distinct curriculum lesson if available
      const candidate2 = findNextLesson();
      if (candidate2 && !usedLessonIds.has(candidate2.lesson.id)) {
        usedLessonIds.add(candidate2.lesson.id);
        const lessonMinutes2 = Math.min(remainingMinutes, 5);
        tasks.push({
          id: `task-lesson-${localDate}-${tasks.length}`,
          type: 'lesson',
          title: `Practice: ${candidate2.lesson.title}`,
          description: `${candidate2.lesson.level} · ${candidate2.lesson.category || 'Vocabulary & Practice'}`,
          reason: candidate2.reason,
          estimatedMinutes: lessonMinutes2,
          status: 'pending',
          lessonId: candidate2.lesson.id,
          level: candidate2.lesson.level,
          createdAt: now,
          evidence: {
            lessonId: candidate2.lesson.id,
            wasCompletedAtPlanCreation: context.lessons.completedLessonIds.has(candidate2.lesson.id),
          },
        });
        remainingMinutes -= lessonMinutes2;
      } else if (
        tasks.length > 0 &&
        tasks[0].type === 'review' &&
        remainingMinutes >= quickTestDuration &&
        context.lessons.completedLessonIds.size >= LESSONS.length
      ) {
        // All curriculum completed edge-case: Quick test fits alongside review when budget >= 10m
        const testLevel = context.placement?.estimatedLevel || context.latestExam?.level || 'B1';
        tasks.push({
          id: `task-test-${localDate}-${tasks.length}`,
          type: 'quick-test',
          title: `Quick Test: ${testLevel}`,
          description: `${quickTestQuestions}-question quick test at ${testLevel}`,
          reason: `Evaluate retention and measure progress in ${testLevel}.`,
          estimatedMinutes: quickTestDuration,
          status: 'pending',
          level: testLevel,
          createdAt: now,
          evidence: {
            examHistoryLatestIdAtCreation: context.latestExam?.latestId || null,
            examLevel: testLevel,
            examMode: 'quick',
          },
        });
        remainingMinutes -= quickTestDuration;
      }
    }
  }

  // ----------------------------------------------------
  // 5. FALLBACK / STARTER / CURRICULUM-COMPLETE GUARD
  // ----------------------------------------------------
  let planState: TodayPlanState = 'scheduled';

  // If no tasks have been scheduled yet
  if (tasks.length === 0) {
    const candidate = findNextLesson();
    if (candidate) {
      tasks.push({
        id: `task-lesson-${localDate}-0`,
        type: 'lesson',
        title: `Start with ${candidate.lesson.level}: ${candidate.lesson.title}`,
        description: `${candidate.lesson.level} · ${candidate.lesson.category || 'Vocabulary & Practice'}`,
        reason: candidate.reason,
        estimatedMinutes: Math.min(5, dailyMinutes),
        status: 'pending',
        lessonId: candidate.lesson.id,
        level: candidate.lesson.level,
        createdAt: now,
        evidence: {
          lessonId: candidate.lesson.id,
          wasCompletedAtPlanCreation: false,
        },
      });
    } else {
      // All curriculum is completed & no review due:
      // If daily budget is at least canonical Quick Test duration (10 min), schedule real Quick Test
      if (dailyMinutes >= quickTestDuration) {
        const testLevel = context.placement?.estimatedLevel || context.latestExam?.level || 'B1';
        tasks.push({
          id: `task-test-${localDate}-0`,
          type: 'quick-test',
          title: `Quick Test: ${testLevel}`,
          description: `${quickTestQuestions}-question quick test at ${testLevel}`,
          reason: `All curriculum completed! Practice retention with a quick test at ${testLevel}.`,
          estimatedMinutes: quickTestDuration,
          status: 'pending',
          level: testLevel,
          createdAt: now,
          evidence: {
            examHistoryLatestIdAtCreation: context.latestExam?.latestId || null,
            examLevel: testLevel,
            examMode: 'quick',
          },
        });
      } else {
        // Goal < 10m (e.g. 5m): No required task fits cleanly -> explicitly mark plan as 'curriculum-complete'
        planState = 'curriculum-complete';
      }
    }
  }

  return {
    schemaVersion: 1,
    id: `plan-${localDate}-${dailyMinutes}`,
    localDate,
    dailyMinutes,
    planSeed: seed,
    createdAt: now,
    updatedAt: now,
    state: planState,
    tasks: tasks.slice(0, 4), // Hard ceiling of 4 tasks
  };
}
