import { AppView, CEFRLevel, Lesson } from '../../types';
import { NextActionRecommendation, ActiveSessionSummary } from '../../types/continuity';
import { getActiveExam } from '../../utils/examStorage';
import { getActivePlacement } from '../placement/placementStorage';
import { getActiveLearnSession, getActiveReviewSession } from '../../utils/sessionResume';
import { loadReviewStorage } from '../../utils/reviewStorage';
import { getOrGenerateTodayPlan } from '../studyPlan/studyPlanStorage';
import { StudyPlanTask } from '../studyPlan/studyPlanTypes';
import { getStoredProgress } from '../../utils/storage';
import { ALL_CURRICULUM_LESSONS, getLessonById } from '../../data/curriculum';

export interface NextActionContext {
  now?: number;
}

/**
 * Returns a high-level summary of active unfinished sessions and review counts.
 * 100% deterministic, local-first, zero external network/AI calls.
 */
export function getActiveSessionSummary(now: number = Date.now()): ActiveSessionSummary {
  const activeExam = getActiveExam();
  const hasActiveExam = Boolean(
    activeExam &&
      activeExam.status === 'active' &&
      typeof activeExam.endsAt === 'number' &&
      activeExam.endsAt > now
  );

  const activePlacement = getActivePlacement();
  const hasActivePlacement = Boolean(
    activePlacement &&
      activePlacement.status === 'active'
  );

  const activeLearn = getActiveLearnSession();
  const hasActiveLearn = Boolean(
    activeLearn &&
      !activeLearn.hasCompletedAll
  );

  const activeReview = getActiveReviewSession();
  const hasActiveReview = Boolean(
    activeReview &&
      Array.isArray(activeReview.activeQueue) &&
      activeReview.activeQueue.length > 0 &&
      activeReview.currentIndex < activeReview.activeQueue.length
  );

  const reviewStorage = loadReviewStorage(now);
  let dueReviewCount = 0;
  for (const itemId in reviewStorage.items) {
    const item = reviewStorage.items[itemId];
    if (item && typeof item.nextReviewAt === 'number' && item.nextReviewAt <= now) {
      dueReviewCount++;
    }
  }

  return {
    hasActiveExam,
    hasActivePlacement,
    hasActiveLearn,
    hasActiveReview,
    dueReviewCount,
  };
}

/**
 * Maps a StudyPlanTask to its corresponding AppView and actionPayload.
 */
function mapStudyPlanTaskToView(task: StudyPlanTask): {
  targetView: AppView;
  actionPayload?: {
    lessonId?: string;
    level?: CEFRLevel;
    examMode?: string;
    dueCount?: number;
  };
} {
  switch (task.type) {
    case 'review':
      return {
        targetView: 'review',
        actionPayload: {
          dueCount: task.reviewItemTarget,
        },
      };
    case 'placement':
      return {
        targetView: 'placement-intro',
      };
    case 'quick-test':
      return {
        targetView: 'exam-intro',
        actionPayload: {
          level: task.level || 'B1',
          examMode: 'quick',
        },
      };
    case 'lesson':
    default:
      return {
        targetView: 'lesson-intro',
        actionPayload: {
          lessonId: task.lessonId,
          level: task.level,
        },
      };
  }
}

/**
 * Resolves the deterministic Next-Action Recommendation following the strict 7-tier priority hierarchy:
 * 1. Priority 1: In-progress Timed Exam (flipenglish_exam_active via getActiveExam()).
 * 2. Priority 2: In-progress Placement Test (flipenglish_placement_active_v1 via getActivePlacement()).
 * 3. Priority 3: In-progress Flashcard Lesson session (getActiveLearnSession()).
 * 4. Priority 4: In-progress Smart Review session (getActiveReviewSession()).
 * 5. Priority 5: Due Smart Review items (items where nextReviewAt <= Date.now(), count > 0).
 * 6. Priority 6: Scheduled Daily Study Plan task (getOrGenerateTodayPlan() has pending tasks).
 * 7. Priority 7: Next recommended curriculum lesson (first incomplete lesson in curriculum).
 *
 * Fallback: If all curriculum is completed, returns first lesson in curriculum.
 */
export function resolveNextAction(context?: NextActionContext): NextActionRecommendation {
  const now = context?.now ?? Date.now();

  // ---------------------------------------------------------------------------
  // Priority 1: In-progress Timed Exam
  // ---------------------------------------------------------------------------
  const activeExam = getActiveExam();
  if (
    activeExam &&
    activeExam.status === 'active' &&
    typeof activeExam.endsAt === 'number' &&
    activeExam.endsAt > now
  ) {
    const totalQuestions = activeExam.questions?.length || 0;
    const answeredCount = Object.keys(activeExam.answers || {}).length;
    const progressPercentage =
      totalQuestions > 0 ? Math.min(100, Math.round((answeredCount / totalQuestions) * 100)) : 0;
    const remainingSeconds = Math.max(0, Math.round((activeExam.endsAt - now) / 1000));
    const estimatedMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));

    return {
      priority: 'active-exam',
      targetView: 'exam-session',
      titleKey: 'continuity.resumeExamTitle',
      subtitleKey: 'continuity.resumeExamSubtitle',
      badgeKey: 'continuity.badgeResume',
      actionTextKey: 'continuity.actionResume',
      actionPayload: {
        examMode: activeExam.mode,
        level: activeExam.level,
        stepIndex: answeredCount,
        totalSteps: totalQuestions,
      },
      progressPercentage,
      estimatedMinutes,
    };
  }

  // ---------------------------------------------------------------------------
  // Priority 2: In-progress Placement Test
  // ---------------------------------------------------------------------------
  const activePlacement = getActivePlacement();
  if (activePlacement && activePlacement.status === 'active') {
    const stage = activePlacement.currentStageIndex ?? 0;
    const questionInStage = activePlacement.currentQuestionInStageIndex ?? 0;
    const totalAnswered = stage * 6 + questionInStage;
    const totalQuestions = 24;
    const progressPercentage = Math.min(100, Math.round((totalAnswered / totalQuestions) * 100));

    // Approximate remaining time: ~25s per remaining question
    const remainingQuestions = Math.max(1, totalQuestions - totalAnswered);
    const estimatedMinutes = Math.max(1, Math.round((remainingQuestions * 25) / 60));

    return {
      priority: 'active-placement',
      targetView: 'placement-session',
      titleKey: 'continuity.resumePlacementTitle',
      subtitleKey: 'continuity.resumePlacementSubtitle',
      badgeKey: 'continuity.badgePlacement',
      actionTextKey: 'continuity.actionResume',
      actionPayload: {
        stepIndex: totalAnswered,
        totalSteps: totalQuestions,
        level: activePlacement.currentLevel,
      },
      progressPercentage,
      estimatedMinutes,
    };
  }

  // ---------------------------------------------------------------------------
  // Priority 3: In-progress Flashcard Lesson session
  // ---------------------------------------------------------------------------
  const activeLearn = getActiveLearnSession();
  if (activeLearn && !activeLearn.hasCompletedAll) {
    const lesson = getLessonById(activeLearn.lessonId);
    const totalWords = lesson?.words?.length || activeLearn.totalWords || 10;
    const currentIndex = activeLearn.flashcardIndex ?? 0;
    const progressPercentage = Math.min(100, Math.round((currentIndex / totalWords) * 100));
    const remainingCards = Math.max(1, totalWords - currentIndex);
    const estimatedMinutes = Math.max(1, Math.round((remainingCards * 20) / 60));

    return {
      priority: 'active-learn',
      targetView: 'learn',
      titleKey: 'continuity.resumeLearnTitle',
      subtitleKey: 'continuity.resumeLearnSubtitle',
      badgeKey: 'continuity.badgeInProgress',
      actionTextKey: 'continuity.actionContinue',
      actionPayload: {
        lessonId: activeLearn.lessonId,
        level: lesson?.level,
        stepIndex: currentIndex,
        totalSteps: totalWords,
      },
      progressPercentage,
      estimatedMinutes,
    };
  }

  // ---------------------------------------------------------------------------
  // Priority 4: In-progress Smart Review session
  // ---------------------------------------------------------------------------
  const activeReview = getActiveReviewSession();
  if (
    activeReview &&
    Array.isArray(activeReview.activeQueue) &&
    activeReview.activeQueue.length > 0 &&
    activeReview.currentIndex < activeReview.activeQueue.length
  ) {
    const totalSteps = activeReview.activeQueue.length;
    const currentIndex = activeReview.currentIndex;
    const progressPercentage = Math.min(100, Math.round((currentIndex / totalSteps) * 100));
    const remainingItems = Math.max(1, totalSteps - currentIndex);
    const estimatedMinutes = Math.max(1, Math.round((remainingItems * 25) / 60));

    return {
      priority: 'active-review',
      targetView: 'review',
      titleKey: 'continuity.resumeReviewTitle',
      subtitleKey: 'continuity.resumeReviewSubtitle',
      badgeKey: 'continuity.badgeReview',
      actionTextKey: 'continuity.actionContinue',
      actionPayload: {
        stepIndex: currentIndex,
        totalSteps,
      },
      progressPercentage,
      estimatedMinutes,
    };
  }

  // ---------------------------------------------------------------------------
  // Priority 5: Due Smart Review items
  // ---------------------------------------------------------------------------
  const reviewStorage = loadReviewStorage(now);
  let dueReviewCount = 0;
  for (const itemId in reviewStorage.items) {
    const item = reviewStorage.items[itemId];
    if (item && typeof item.nextReviewAt === 'number' && item.nextReviewAt <= now) {
      dueReviewCount++;
    }
  }

  if (dueReviewCount > 0) {
    const estimatedMinutes = Math.max(1, Math.round((Math.min(20, dueReviewCount) * 25) / 60));
    return {
      priority: 'due-review',
      targetView: 'review',
      titleKey: 'continuity.dueReviewTitle',
      subtitleKey: 'continuity.dueReviewSubtitle',
      badgeKey: 'continuity.badgeReviewDue',
      actionTextKey: 'continuity.actionStartReview',
      actionPayload: {
        dueCount: dueReviewCount,
      },
      estimatedMinutes,
    };
  }

  // ---------------------------------------------------------------------------
  // Priority 6: Scheduled Daily Study Plan task
  // ---------------------------------------------------------------------------
  const todayPlan = getOrGenerateTodayPlan();
  const pendingTasks = todayPlan.tasks.filter((t) => t.status === 'pending');

  if (pendingTasks.length > 0) {
    const firstPendingTask = pendingTasks[0];
    const { targetView, actionPayload } = mapStudyPlanTaskToView(firstPendingTask);
    const estimatedMinutes = firstPendingTask.estimatedMinutes || 5;

    return {
      priority: 'study-plan-task',
      targetView,
      titleKey: 'continuity.dailyTaskTitle',
      subtitleKey: 'continuity.dailyTaskSubtitle',
      badgeKey: 'continuity.badgeToday',
      actionTextKey: 'continuity.actionStart',
      actionPayload,
      estimatedMinutes,
    };
  }

  // ---------------------------------------------------------------------------
  // Priority 7: Next recommended curriculum lesson
  // ---------------------------------------------------------------------------
  const progress = getStoredProgress();
  let nextLesson: Lesson | null = null;

  for (const lesson of ALL_CURRICULUM_LESSONS) {
    if (!progress[lesson.id]?.completed) {
      nextLesson = lesson;
      break;
    }
  }

  // If all lessons in curriculum are completed, fall back to first lesson
  const targetLesson = nextLesson || ALL_CURRICULUM_LESSONS[0];

  return {
    priority: 'next-curriculum-lesson',
    targetView: 'lesson-intro',
    titleKey: 'continuity.nextLessonTitle',
    subtitleKey: 'continuity.nextLessonSubtitle',
    badgeKey: 'continuity.badgeNextLesson',
    actionTextKey: 'continuity.actionStartLesson',
    actionPayload: {
      lessonId: targetLesson.id,
      level: targetLesson.level,
    },
    estimatedMinutes: 5,
  };
}
