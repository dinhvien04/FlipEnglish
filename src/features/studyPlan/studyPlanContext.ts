import { StudyPlanContext } from './studyPlanTypes';
import { getReviewDashboardStats } from '../../utils/reviewStorage';
import { getStoredProgress } from '../../utils/storage';
import { getLatestPlacementResult } from '../placement/placementStorage';
import { getExamHistory } from '../../utils/examStorage';

/**
 * Builds a pure StudyPlanContext snapshot from local-first storage sources.
 * Non-blocking, synchronous, and safe across all devices.
 */
export function buildStudyPlanContext(): StudyPlanContext {
  // 1. Review stats
  const reviewStats = getReviewDashboardStats();

  // 2. Lesson progress
  const progress = getStoredProgress();
  const completedLessonIds = new Set<string>();
  const recentLessonEntries: { id: string; time: number }[] = [];

  for (const lessonId in progress) {
    const item = progress[lessonId];
    if (item.completed) {
      completedLessonIds.add(lessonId);
    }
    if (item.lastLearnedAt) {
      const parsedTime = Date.parse(item.lastLearnedAt);
      if (!Number.isNaN(parsedTime)) {
        recentLessonEntries.push({ id: lessonId, time: parsedTime });
      }
    }
  }

  // Sort recent lessons descending by timestamp
  recentLessonEntries.sort((a, b) => b.time - a.time);
  const recentLessonIds = recentLessonEntries.map((e) => e.id).slice(0, 5);

  // 3. Placement latest result
  const latestPlacement = getLatestPlacementResult();

  // 4. Latest Exam
  const examHistory = getExamHistory();
  const latestExam = examHistory.length > 0 ? examHistory[0] : undefined;

  return {
    placement: latestPlacement
      ? {
          estimatedLevel: latestPlacement.estimatedLevel,
          recommendedLessonIds: latestPlacement.recommendedLessonIds || [],
          latestResultId: latestPlacement.id,
        }
      : undefined,
    review: {
      dueCount: reviewStats.dueCount,
      reviewedTodayCount: reviewStats.reviewedTodayCount,
    },
    lessons: {
      completedLessonIds,
      recentLessonIds,
    },
    latestExam: latestExam
      ? {
          level: latestExam.level,
          latestId: latestExam.id,
        }
      : undefined,
  };
}
