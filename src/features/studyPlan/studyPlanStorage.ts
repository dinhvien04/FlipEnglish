import {
  AllowedDailyMinutes,
  ALLOWED_DAILY_MINUTES,
  DEFAULT_DAILY_MINUTES,
  StudyPlanSettings,
  TodayStudyPlan,
  CompactStudyPlanHistoryItem,
  StudyPlanTask,
} from './studyPlanTypes';
import { getLocalDateKey, generateTodayStudyPlan } from './studyPlanEngine';
import { buildStudyPlanContext } from './studyPlanContext';
import { getLessonById } from '../../data/lessons';
import { getReviewDashboardStats } from '../../utils/reviewStorage';
import { getStoredProgress } from '../../utils/storage';
import { getLatestPlacementResult } from '../placement/placementStorage';
import { getExamHistory } from '../../utils/examStorage';

export const STUDY_PLAN_SETTINGS_KEY = 'flipenglish_study_plan_settings_v1';
export const TODAY_PLAN_KEY = 'flipenglish_today_plan_v1';
export const STUDY_PLAN_HISTORY_KEY = 'flipenglish_study_plan_history_v1';
export const STUDY_PLAN_UPDATED_EVENT = 'flipenglish_study_plan_updated';

const MAX_HISTORY_DAYS = 30;

function emitStudyPlanUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STUDY_PLAN_UPDATED_EVENT));
  }
}

/**
 * Validates untrusted StudyPlanSettings from localStorage.
 */
export function validateStudyPlanSettings(data: any): data is StudyPlanSettings {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (data.schemaVersion !== 1) return false;
  if (!ALLOWED_DAILY_MINUTES.includes(data.dailyMinutes)) return false;
  if (typeof data.createdAt !== 'number' || !Number.isFinite(data.createdAt) || data.createdAt <= 0 || data.createdAt > Date.now() + 86400000) return false;
  if (typeof data.updatedAt !== 'number' || !Number.isFinite(data.updatedAt) || data.updatedAt < data.createdAt || data.updatedAt > Date.now() + 86400000) return false;
  return true;
}

/**
 * Validates a single untrusted StudyPlanTask object.
 */
export function validateStudyPlanTask(task: any): task is StudyPlanTask {
  if (!task || typeof task !== 'object' || Array.isArray(task)) return false;
  if (typeof task.id !== 'string' || !task.id.trim() || task.id.length > 100) return false;
  if (!['placement', 'review', 'lesson', 'quick-test'].includes(task.type)) return false;
  if (typeof task.title !== 'string' || !task.title.trim() || task.title.length > 150) return false;
  if (typeof task.description !== 'string' || !task.description.trim() || task.description.length > 300) return false;
  if (typeof task.reason !== 'string' || !task.reason.trim() || task.reason.length > 300) return false;
  if (typeof task.estimatedMinutes !== 'number' || task.estimatedMinutes < 1 || task.estimatedMinutes > 30) return false;
  if (!['pending', 'completed', 'skipped'].includes(task.status)) return false;

  // Task-specific constraints
  if (task.type === 'lesson') {
    if (typeof task.lessonId !== 'string' || !task.lessonId.trim() || !getLessonById(task.lessonId)) return false;
  }
  if (task.type === 'placement') {
    if (task.lessonId !== undefined) return false; // Placement must not have fake lessonId
  }
  if (task.type === 'review') {
    if (task.reviewItemTarget !== undefined && (typeof task.reviewItemTarget !== 'number' || task.reviewItemTarget < 1 || task.reviewItemTarget > 100)) {
      return false;
    }
  }

  if (typeof task.createdAt !== 'number' || !Number.isFinite(task.createdAt)) return false;
  if (task.completedAt !== undefined && (typeof task.completedAt !== 'number' || !Number.isFinite(task.completedAt))) return false;

  return true;
}

/**
 * Validates untrusted TodayStudyPlan from localStorage.
 */
export function validateTodayStudyPlan(data: any): data is TodayStudyPlan {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (data.schemaVersion !== 1) return false;
  if (typeof data.id !== 'string' || !data.id.trim() || data.id.length > 100) return false;
  if (typeof data.localDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.localDate)) return false;
  if (!ALLOWED_DAILY_MINUTES.includes(data.dailyMinutes)) return false;
  if (typeof data.createdAt !== 'number' || !Number.isFinite(data.createdAt) || data.createdAt <= 0 || data.createdAt > Date.now() + 86400000) return false;
  if (typeof data.updatedAt !== 'number' || !Number.isFinite(data.updatedAt) || data.updatedAt < data.createdAt || data.updatedAt > Date.now() + 86400000) return false;

  if (!Array.isArray(data.tasks) || data.tasks.length < 1 || data.tasks.length > 4) return false;

  const seenIds = new Set<string>();
  let totalEstimatedMinutes = 0;

  for (const t of data.tasks) {
    if (!validateStudyPlanTask(t)) return false;
    if (seenIds.has(t.id)) return false; // Unique task IDs
    seenIds.add(t.id);
    totalEstimatedMinutes += t.estimatedMinutes;
  }

  // Sum of estimatedMinutes must be reasonable (not > dailyMinutes + 5 min tolerance)
  if (totalEstimatedMinutes > data.dailyMinutes + 5) return false;

  return true;
}

/**
 * Validates untrusted CompactStudyPlanHistoryItem.
 */
export function validateHistoryItem(item: any): item is CompactStudyPlanHistoryItem {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  if (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return false;
  if (typeof item.plannedMinutes !== 'number' || item.plannedMinutes < 1 || item.plannedMinutes > 30) return false;
  if (typeof item.taskCount !== 'number' || item.taskCount < 1 || item.taskCount > 4) return false;
  if (typeof item.completedCount !== 'number' || item.completedCount < 0 || item.completedCount > item.taskCount) return false;
  if (typeof item.skippedCount !== 'number' || item.skippedCount < 0 || item.skippedCount > item.taskCount) return false;
  if (typeof item.completedAt !== 'number' || !Number.isFinite(item.completedAt)) return false;
  return true;
}

/**
 * Loads or initializes user StudyPlanSettings safely.
 */
export function loadStudyPlanSettings(): StudyPlanSettings {
  if (typeof window === 'undefined') {
    return {
      schemaVersion: 1,
      dailyMinutes: DEFAULT_DAILY_MINUTES,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  try {
    const raw = localStorage.getItem(STUDY_PLAN_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (validateStudyPlanSettings(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    // Ignore and fallback
  }

  const defaultSettings: StudyPlanSettings = {
    schemaVersion: 1,
    dailyMinutes: DEFAULT_DAILY_MINUTES,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveStudyPlanSettings(defaultSettings);
  return defaultSettings;
}

/**
 * Saves StudyPlanSettings to localStorage safely.
 */
export function saveStudyPlanSettings(settings: StudyPlanSettings): void {
  if (typeof window === 'undefined') return;
  try {
    if (!validateStudyPlanSettings(settings)) return;
    localStorage.setItem(STUDY_PLAN_SETTINGS_KEY, JSON.stringify(settings));
    emitStudyPlanUpdate();
  } catch (err) {
    // Storage quota or serialization issue
  }
}

/**
 * Loads compact study plan history (max 30 items).
 */
export function loadStudyPlanHistory(): CompactStudyPlanHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STUDY_PLAN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validateHistoryItem).slice(0, MAX_HISTORY_DAYS);
  } catch (err) {
    return [];
  }
}

/**
 * Saves a completed/archived day's summary into history.
 */
export function archivePlanToHistory(plan: TodayStudyPlan): void {
  if (typeof window === 'undefined') return;
  try {
    const history = loadStudyPlanHistory();
    const completedCount = plan.tasks.filter((t) => t.status === 'completed').length;
    const skippedCount = plan.tasks.filter((t) => t.status === 'skipped').length;

    const historyItem: CompactStudyPlanHistoryItem = {
      date: plan.localDate,
      plannedMinutes: plan.dailyMinutes,
      taskCount: plan.tasks.length,
      completedCount,
      skippedCount,
      completedAt: Date.now(),
    };

    const newHistory = [historyItem, ...history.filter((h) => h.date !== plan.localDate)].slice(
      0,
      MAX_HISTORY_DAYS
    );
    localStorage.setItem(STUDY_PLAN_HISTORY_KEY, JSON.stringify(newHistory));
  } catch (err) {
    // Ignore
  }
}

/**
 * Reconciles and updates task completion statuses against authoritative storage.
 * Synchronous and idempotent.
 */
export function reconcilePlanTaskStatuses(plan: TodayStudyPlan): {
  plan: TodayStudyPlan;
  hasChanged: boolean;
} {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') {
    return { plan, hasChanged: false };
  }

  let hasChanged = false;
  const reviewStats = getReviewDashboardStats();
  const progress = getStoredProgress();
  const latestPlacement = getLatestPlacementResult();
  const examHistory = getExamHistory();

  const updatedTasks = plan.tasks.map((task) => {
    if (task.status === 'completed' || task.status === 'skipped') {
      return task;
    }

    let isNowCompleted = false;

    // 1. Review Task Reconciliation
    if (task.type === 'review') {
      const baseline = task.evidence?.reviewedTodayBaseline || 0;
      const target = task.reviewItemTarget || 1;
      const currentReviewedToday = reviewStats.reviewedTodayCount || 0;
      // If reviewedToday has increased by target count, or due count reached 0 after reviews
      if (currentReviewedToday >= baseline + target || (reviewStats.dueCount === 0 && currentReviewedToday > baseline)) {
        isNowCompleted = true;
      }
    }

    // 2. Lesson Task Reconciliation
    if (task.type === 'lesson' && task.lessonId) {
      const lessonProgress = progress[task.lessonId];
      if (lessonProgress && lessonProgress.completed) {
        isNowCompleted = true;
      }
    }

    // 3. Placement Task Reconciliation
    if (task.type === 'placement') {
      const baselineId = task.evidence?.latestPlacementResultIdAtCreation || null;
      if (latestPlacement && latestPlacement.id !== baselineId) {
        isNowCompleted = true;
      }
    }

    // 4. Quick Test Task Reconciliation
    if (task.type === 'quick-test') {
      const baselineId = task.evidence?.examHistoryLatestIdAtCreation || null;
      const latestExam = examHistory.length > 0 ? examHistory[0] : null;
      if (latestExam && latestExam.id !== baselineId) {
        if (!task.level || latestExam.level === task.level) {
          isNowCompleted = true;
        }
      }
    }

    if (isNowCompleted) {
      hasChanged = true;
      return {
        ...task,
        status: 'completed' as const,
        completedAt: Date.now(),
      };
    }

    return task;
  });

  if (!hasChanged) {
    return { plan, hasChanged: false };
  }

  const updatedPlan: TodayStudyPlan = {
    ...plan,
    updatedAt: Date.now(),
    tasks: updatedTasks,
  };

  return { plan: updatedPlan, hasChanged: true };
}

/**
 * Loads Today's active study plan.
 * If no plan exists or local date has changed, archives previous day and generates a new one.
 * Also runs reconciliation.
 */
export function getOrGenerateTodayPlan(): TodayStudyPlan {
  const localDate = getLocalDateKey();
  const settings = loadStudyPlanSettings();

  let activePlan: TodayStudyPlan | null = null;

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(TODAY_PLAN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (validateTodayStudyPlan(parsed)) {
          if (parsed.localDate === localDate) {
            activePlan = parsed;
          } else {
            // Previous day plan -> Archive to history
            archivePlanToHistory(parsed);
          }
        }
      }
    } catch (err) {
      // Ignore
    }
  }

  // If no valid active plan for today, generate a new one
  if (!activePlan) {
    const context = buildStudyPlanContext();
    activePlan = generateTodayStudyPlan(context, settings, localDate);
    saveTodayPlan(activePlan);
    return activePlan;
  }

  // Reconcile tasks against latest storage state
  const { plan: reconciledPlan, hasChanged } = reconcilePlanTaskStatuses(activePlan);
  if (hasChanged) {
    saveTodayPlan(reconciledPlan);
  }

  return reconciledPlan;
}

/**
 * Saves TodayStudyPlan to localStorage safely.
 */
export function saveTodayPlan(plan: TodayStudyPlan): void {
  if (typeof window === 'undefined') return;
  try {
    if (!validateTodayStudyPlan(plan)) return;
    localStorage.setItem(TODAY_PLAN_KEY, JSON.stringify(plan));
    emitStudyPlanUpdate();
  } catch (err) {
    // Ignore
  }
}

/**
 * Updates a specific task's status (e.g. mark skipped).
 */
export function updateTaskStatus(taskId: string, status: 'completed' | 'skipped'): void {
  const currentPlan = getOrGenerateTodayPlan();
  let hasFound = false;

  const updatedTasks = currentPlan.tasks.map((task) => {
    if (task.id === taskId) {
      hasFound = true;
      return {
        ...task,
        status,
        completedAt: status === 'completed' ? Date.now() : task.completedAt,
      };
    }
    return task;
  });

  if (hasFound) {
    const updatedPlan: TodayStudyPlan = {
      ...currentPlan,
      updatedAt: Date.now(),
      tasks: updatedTasks,
    };
    saveTodayPlan(updatedPlan);
  }
}

/**
 * Updates the user's daily time goal and regenerates the current day plan
 * while preserving already completed or skipped tasks.
 */
export function updateDailyGoalAndRegeneratePlan(newMinutes: AllowedDailyMinutes): TodayStudyPlan {
  const currentSettings = loadStudyPlanSettings();
  const updatedSettings: StudyPlanSettings = {
    ...currentSettings,
    dailyMinutes: newMinutes,
    updatedAt: Date.now(),
  };
  saveStudyPlanSettings(updatedSettings);

  const localDate = getLocalDateKey();
  const currentPlan = getOrGenerateTodayPlan();

  // If all tasks are pending (no progress yet), generate fresh plan
  const completedOrSkipped = currentPlan.tasks.filter(
    (t) => t.status === 'completed' || t.status === 'skipped'
  );

  if (completedOrSkipped.length === 0) {
    const context = buildStudyPlanContext();
    const newPlan = generateTodayStudyPlan(context, updatedSettings, localDate);
    saveTodayPlan(newPlan);
    return newPlan;
  }

  // If some tasks are already completed/skipped, preserve them and adapt remaining minutes
  let spentMinutes = 0;
  for (const t of completedOrSkipped) {
    spentMinutes += t.estimatedMinutes;
  }

  const remainingMinutes = Math.max(0, newMinutes - spentMinutes);

  // If budget increased, we can generate additional tasks up to max 4 tasks total
  if (remainingMinutes >= 2 && currentPlan.tasks.length < 4) {
    const context = buildStudyPlanContext();
    const clampedRemainingDailyMinutes: AllowedDailyMinutes =
      remainingMinutes <= 5
        ? 5
        : remainingMinutes <= 10
        ? 10
        : remainingMinutes <= 15
        ? 15
        : remainingMinutes <= 20
        ? 20
        : 30;

    const tempSettings: StudyPlanSettings = {
      ...updatedSettings,
      dailyMinutes: clampedRemainingDailyMinutes,
    };
    const freshPlan = generateTodayStudyPlan(context, tempSettings, localDate);

    const existingTargetIds = new Set(
      completedOrSkipped.map((t) => (t.type === 'lesson' ? t.lessonId : t.type))
    );

    const additionalTasks: StudyPlanTask[] = [];
    for (const ft of freshPlan.tasks) {
      if (completedOrSkipped.length + additionalTasks.length >= 4) break;
      const targetId = ft.type === 'lesson' ? ft.lessonId : ft.type;
      if (!existingTargetIds.has(targetId)) {
        existingTargetIds.add(targetId);
        additionalTasks.push(ft);
      }
    }

    const mergedPlan: TodayStudyPlan = {
      ...currentPlan,
      dailyMinutes: newMinutes,
      updatedAt: Date.now(),
      tasks: [...completedOrSkipped, ...additionalTasks],
    };

    saveTodayPlan(mergedPlan);
    return mergedPlan;
  }

  // Otherwise, simply update dailyMinutes attribute and retain preserved tasks
  const updatedPlan: TodayStudyPlan = {
    ...currentPlan,
    dailyMinutes: newMinutes,
    updatedAt: Date.now(),
  };
  saveTodayPlan(updatedPlan);
  return updatedPlan;
}
