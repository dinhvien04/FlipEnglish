import { CEFRLevel, Lesson } from '../../types';
import {
  AllowedDailyMinutes,
  StudyPlanContext,
  StudyPlanSettings,
  StudyPlanTask,
  TodayStudyPlan,
} from './studyPlanTypes';
import { LESSONS, getLessonById } from '../../data/lessons';

export const ORDERED_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

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
 * 5m  -> max 5 items
 * 10m -> max 8 items
 * 15m -> max 10 items
 * 20m -> max 15 items
 * 30m -> max 20 items
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
 * Estimates review time rounded to integer minutes based on ~25-30s per item.
 */
export function estimateReviewMinutes(itemCount: number): number {
  if (itemCount <= 0) return 0;
  // ~25 seconds per item: itemCount * 25 / 60, rounded to nearest whole min, minimum 1 min
  const rawMinutes = (itemCount * 25) / 60;
  return Math.max(1, Math.round(rawMinutes));
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
 * Pure generator for Today Study Plan.
 * Completely deterministic, zero external network/AI dependencies, respects dailyMinutes.
 */
export function generateTodayStudyPlan(
  context: StudyPlanContext,
  settings: StudyPlanSettings,
  localDate: string,
  seed: number = stringToHash(localDate)
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
    const chunkLimit = getReviewChunkLimit(dailyMinutes);
    const targetCount = Math.min(context.review.dueCount, chunkLimit);
    let reviewMinutes = estimateReviewMinutes(targetCount);

    // Ensure review leaves at least 2 minutes for curriculum if budget > 5
    if (dailyMinutes > 5 && remainingMinutes - reviewMinutes < 3 && reviewMinutes > 2) {
      reviewMinutes = Math.max(2, remainingMinutes - 3);
    }
    // For 5-minute plan, allow review to take up to 3 mins
    if (dailyMinutes === 5 && reviewMinutes > 3) {
      reviewMinutes = 3;
    }

    if (reviewMinutes >= 1 && remainingMinutes >= reviewMinutes) {
      tasks.push({
        id: `task-review-${localDate}-${tasks.length}`,
        type: 'review',
        title: 'Smart Review',
        description: `Review ${targetCount} vocabulary item${targetCount > 1 ? 's' : ''}`,
        reason: `${context.review.dueCount} item${context.review.dueCount > 1 ? 's are' : ' is'} due for spaced repetition review.`,
        estimatedMinutes: reviewMinutes,
        status: 'pending',
        reviewItemTarget: targetCount,
        createdAt: seed,
        evidence: {
          reviewedTodayBaseline: context.review.reviewedTodayCount || 0,
          reviewTargetCount: targetCount,
        },
      });
      remainingMinutes -= reviewMinutes;
    }
  }

  // ----------------------------------------------------
  // 2. ONBOARDING FOR BRAND-NEW LEARNER (15+ min)
  // ----------------------------------------------------
  // If brand new learner with 10+ min budget and no placement, offer Placement Check
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
      createdAt: seed,
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

  // Helper to find next incomplete lesson
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

    // 3E. Fallback for completely finished or new learners: first incomplete in entire curriculum
    for (const l of LESSONS) {
      if (!context.lessons.completedLessonIds.has(l.id) && !usedLessonIds.has(l.id)) {
        return { lesson: l, reason: `Continue English curriculum practice in ${l.level}.` };
      }
    }

    // If ALL 72 lessons completed, return first lesson as review fallback
    const fallback = LESSONS[0];
    return { lesson: fallback, reason: `Curriculum practice review in ${fallback.level}.` };
  };

  // Add Primary Curriculum Lesson if time permits
  if (remainingMinutes >= 2 && tasks.length < 4) {
    const candidate = findNextLesson();
    if (candidate) {
      usedLessonIds.add(candidate.lesson.id);
      // Allocate lesson time: 5-8 min depending on remaining budget
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
        createdAt: seed,
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
  if (remainingMinutes >= 4 && tasks.length < 4) {
    // Check if we should add Quick Test (20-30 min plans with enough budget)
    if (dailyMinutes >= 20 && remainingMinutes >= 8 && context.lessons.completedLessonIds.size >= 1) {
      const testLevel = context.placement?.estimatedLevel || context.latestExam?.level || 'B1';
      const testMinutes = Math.min(8, remainingMinutes);
      tasks.push({
        id: `task-test-${localDate}-${tasks.length}`,
        type: 'quick-test',
        title: `Quick Test: ${testLevel}`,
        description: `15-question level assessment in ${testLevel}`,
        reason: `Evaluate retention and measure progress in ${testLevel}.`,
        estimatedMinutes: testMinutes,
        status: 'pending',
        level: testLevel,
        createdAt: seed,
        evidence: {
          examHistoryLatestIdAtCreation: context.latestExam?.latestId || null,
          examLevel: testLevel,
        },
      });
      remainingMinutes -= testMinutes;
    } else {
      // Otherwise add a second distinct curriculum lesson
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
          createdAt: seed,
          evidence: {
            lessonId: candidate2.lesson.id,
            wasCompletedAtPlanCreation: context.lessons.completedLessonIds.has(candidate2.lesson.id),
          },
        });
        remainingMinutes -= lessonMinutes2;
      }
    }
  }

  // Fallback guard: Ensure at least one task is created
  if (tasks.length === 0) {
    const starterLesson = LESSONS[0];
    tasks.push({
      id: `task-lesson-${localDate}-0`,
      type: 'lesson',
      title: `Start with ${starterLesson.level}: ${starterLesson.title}`,
      description: `${starterLesson.level} · ${starterLesson.category || 'Vocabulary & Practice'}`,
      reason: 'Essential introductory English vocabulary and concepts.',
      estimatedMinutes: Math.min(5, dailyMinutes),
      status: 'pending',
      lessonId: starterLesson.id,
      level: starterLesson.level,
      createdAt: seed,
      evidence: {
        lessonId: starterLesson.id,
        wasCompletedAtPlanCreation: false,
      },
    });
  }

  return {
    schemaVersion: 1,
    id: `plan-${localDate}-${dailyMinutes}`,
    localDate,
    dailyMinutes,
    createdAt: seed,
    updatedAt: seed,
    tasks: tasks.slice(0, 4), // Hard ceiling of 4 tasks
  };
}
