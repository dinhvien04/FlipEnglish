import {
  LearnerStreak,
  MeaningfulLearningEvent,
  StreakEvaluationResult,
} from '../../types/streak';
import { getLocalDateKey, isValidLocalDateKey } from '../studyPlan/studyPlanEngine';
import { getStoredLearnerStreak, saveLearnerStreak } from './streakStorage';

/**
 * Calculates calendar day difference between two local date keys (YYYY-MM-DD).
 * Parses dates at local midnight to avoid daylight saving or timezone shifts.
 * Returns:
 *   0 if dates are the same calendar day
 *   1 if date2 is the immediate next day after date1
 *   >1 if date2 is multiple days after date1
 *   <0 if date2 is before date1
 */
export function getCalendarDayDifference(dateKey1: string, dateKey2: string): number {
  if (!isValidLocalDateKey(dateKey1) || !isValidLocalDateKey(dateKey2)) {
    return Number.NaN;
  }

  const [y1, m1, d1] = dateKey1.split('-').map((num) => parseInt(num, 10));
  const [y2, m2, d2] = dateKey2.split('-').map((num) => parseInt(num, 10));

  // Construct UTC midnight dates to reliably calculate whole-day difference without DST artifacts
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);

  const MS_PER_DAY = 86_400_000;
  return Math.round((utc2 - utc1) / MS_PER_DAY);
}

/**
 * Evaluates and records a meaningful learning event for the streak engine.
 *
 * Rules:
 * - Consecutive day: If lastActiveDateKey was yesterday (1 day difference), increment currentStreak = currentStreak + 1.
 * - Same day: If lastActiveDateKey === todayKey, maintain currentStreak (do not double count).
 * - Missed days: If lastActiveDateKey was before yesterday (> 1 day difference), reset currentStreak = 1.
 * - Initial: If lastActiveDateKey === null, set currentStreak = 1.
 * - Monotonic longestStreak: longestStreak = Math.max(longestStreak, currentStreak).
 * - Increment totalMeaningfulDays only on new active days.
 *
 * @param event The meaningful learning event occurring now.
 * @param overrideDate Optional Date override for testing / simulation.
 */
export function recordMeaningfulLearningEvent(
  event: MeaningfulLearningEvent,
  overrideDate?: Date
): StreakEvaluationResult {
  const currentStreakRecord = getStoredLearnerStreak();
  const eventDate = overrideDate ?? new Date(event.timestamp || Date.now());
  const todayKey = getLocalDateKey(eventDate);
  const now = Date.now();

  const { lastActiveDateKey, longestStreak, totalMeaningfulDays } = currentStreakRecord;

  // Case 1: Same day activity - already recorded today
  if (lastActiveDateKey === todayKey) {
    const updatedStreak: LearnerStreak = {
      ...currentStreakRecord,
      updatedAt: now,
    };
    saveLearnerStreak(updatedStreak);
    return {
      streak: updatedStreak,
      isNewActiveDay: false,
      streakIncremented: false,
    };
  }

  let newCurrentStreak: number;
  let streakIncremented: boolean;

  if (lastActiveDateKey === null) {
    // Case 2: Initial streak entry
    newCurrentStreak = 1;
    streakIncremented = true;
  } else {
    const dayDiff = getCalendarDayDifference(lastActiveDateKey, todayKey);

    if (dayDiff === 1) {
      // Case 3: Consecutive day (yesterday -> today)
      newCurrentStreak = currentStreakRecord.currentStreak + 1;
      streakIncremented = true;
    } else if (dayDiff > 1) {
      // Case 4: Missed at least one calendar day (reset to 1)
      newCurrentStreak = 1;
      streakIncremented = true;
    } else {
      // Case 5: Clock rollback / westbound timezone travel / out-of-order event (dayDiff < 0)
      // Do NOT rewind watermark date and do NOT double-count meaningful days.
      return {
        streak: currentStreakRecord,
        isNewActiveDay: false,
        streakIncremented: false,
      };
    }
  }

  const newLongestStreak = Math.max(longestStreak, newCurrentStreak);
  const newTotalMeaningfulDays = totalMeaningfulDays + 1;

  const evaluatedStreak: LearnerStreak = {
    schemaVersion: 1,
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    lastActiveDateKey: todayKey,
    totalMeaningfulDays: newTotalMeaningfulDays,
    updatedAt: now,
  };

  saveLearnerStreak(evaluatedStreak);

  return {
    streak: evaluatedStreak,
    isNewActiveDay: true,
    streakIncremented,
  };
}

/**
 * Returns the current learner streak status from storage.
 */
export function getStreakStatus(): LearnerStreak {
  return getStoredLearnerStreak();
}
