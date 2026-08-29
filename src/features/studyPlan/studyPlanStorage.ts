import {
  AllowedDailyMinutes,
  ALLOWED_DAILY_MINUTES,
  DEFAULT_DAILY_MINUTES,
  StudyPlanSettings,
  TodayStudyPlan,
  CompactStudyPlanHistoryItem,
  StudyPlanTask,
  StudyPlanTaskEvidence,
  StudyPlanGoalUpdateResult,
} from './studyPlanTypes';
import {
  getLocalDateKey,
  isValidLocalDateKey,
  generateTodayStudyPlan,
  getTaskTargetKey,
} from './studyPlanEngine';
import { buildStudyPlanContext } from './studyPlanContext';
import { getLessonById } from '../../data/lessons';
import { getReviewDashboardStats } from '../../utils/reviewStorage';
import { getStoredProgress } from '../../utils/storage';
import { getLatestPlacementResult } from '../placement/placementStorage';
import { getExamHistory } from '../../utils/examStorage';
import {
  safeGetLocalStorage,
  safeSetLocalStorage,
  safeRemoveLocalStorage,
} from '../../utils/storageHealth';

export const STUDY_PLAN_SETTINGS_KEY = 'flipenglish_study_plan_settings_v1';
export const TODAY_PLAN_KEY = 'flipenglish_today_plan_v1';
export const STUDY_PLAN_HISTORY_KEY = 'flipenglish_study_plan_history_v1';
export const STUDY_PLAN_UPDATED_EVENT = 'flipenglish_study_plan_updated';

const MAX_HISTORY_DAYS = 30;

const ALLOWED_EVIDENCE_KEYS = new Set([
  'reviewedTodayBaseline',
  'reviewTargetCount',
  'lessonId',
  'wasCompletedAtPlanCreation',
  'latestPlacementResultIdAtCreation',
  'examHistoryLatestIdAtCreation',
  'examLevel',
  'examMode',
]);

const VALID_CEFR_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

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
  if (
    typeof data.createdAt !== 'number' ||
    !Number.isFinite(data.createdAt) ||
    data.createdAt <= 0 ||
    data.createdAt > Date.now() + 86400000
  ) {
    return false;
  }
  if (
    typeof data.updatedAt !== 'number' ||
    !Number.isFinite(data.updatedAt) ||
    data.updatedAt < data.createdAt ||
    data.updatedAt > Date.now() + 86400000
  ) {
    return false;
  }
  return true;
}

/**
 * Validates untrusted task evidence with strict key and type enforcement.
 */
export function validateStudyPlanTaskEvidence(evidence: any, taskType: string): evidence is StudyPlanTaskEvidence {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return false;

  // Strict unknown key rejection
  for (const key of Object.keys(evidence)) {
    if (!ALLOWED_EVIDENCE_KEYS.has(key)) {
      return false;
    }
  }

  if (taskType === 'review') {
    if (
      typeof evidence.reviewedTodayBaseline !== 'number' ||
      !Number.isInteger(evidence.reviewedTodayBaseline) ||
      evidence.reviewedTodayBaseline < 0 ||
      evidence.reviewedTodayBaseline > 10000
    ) {
      return false;
    }
    if (
      typeof evidence.reviewTargetCount !== 'number' ||
      !Number.isInteger(evidence.reviewTargetCount) ||
      evidence.reviewTargetCount < 1 ||
      evidence.reviewTargetCount > 100
    ) {
      return false;
    }
    // Must not contain other task-specific evidence
    if (evidence.lessonId !== undefined || evidence.examLevel !== undefined || evidence.examMode !== undefined) {
      return false;
    }
  } else if (taskType === 'lesson') {
    if (typeof evidence.lessonId !== 'string' || !evidence.lessonId.trim() || !getLessonById(evidence.lessonId)) {
      return false;
    }
    if (evidence.wasCompletedAtPlanCreation !== undefined && typeof evidence.wasCompletedAtPlanCreation !== 'boolean') {
      return false;
    }
    if (evidence.reviewTargetCount !== undefined || evidence.reviewedTodayBaseline !== undefined) {
      return false;
    }
    if (evidence.examLevel !== undefined || evidence.examMode !== undefined) {
      return false;
    }
  } else if (taskType === 'placement') {
    if (
      evidence.latestPlacementResultIdAtCreation !== null &&
      evidence.latestPlacementResultIdAtCreation !== undefined &&
      (typeof evidence.latestPlacementResultIdAtCreation !== 'string' ||
        evidence.latestPlacementResultIdAtCreation.length > 100)
    ) {
      return false;
    }
    if (evidence.lessonId !== undefined || evidence.reviewTargetCount !== undefined) {
      return false;
    }
    if (evidence.examLevel !== undefined || evidence.examMode !== undefined) {
      return false;
    }
  } else if (taskType === 'quick-test') {
    if (evidence.examMode !== 'quick') return false;
    if (typeof evidence.examLevel !== 'string' || !VALID_CEFR_LEVELS.has(evidence.examLevel)) return false;
    if (
      evidence.examHistoryLatestIdAtCreation !== null &&
      evidence.examHistoryLatestIdAtCreation !== undefined &&
      (typeof evidence.examHistoryLatestIdAtCreation !== 'string' ||
        evidence.examHistoryLatestIdAtCreation.length > 100)
    ) {
      return false;
    }
    if (evidence.lessonId !== undefined || evidence.reviewTargetCount !== undefined) {
      return false;
    }
  }

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
  if (
    typeof task.estimatedMinutes !== 'number' ||
    !Number.isInteger(task.estimatedMinutes) ||
    task.estimatedMinutes < 1 ||
    task.estimatedMinutes > 30
  ) {
    return false;
  }
  if (!['pending', 'completed', 'skipped'].includes(task.status)) return false;

  // Task-specific constraints & strict forbidden field validation
  if (task.type === 'lesson') {
    if (typeof task.lessonId !== 'string' || !task.lessonId.trim()) return false;
    const canonicalLesson = getLessonById(task.lessonId);
    if (!canonicalLesson) return false;
    if (task.level !== undefined && task.level !== canonicalLesson.level) return false;
    if (task.reviewItemTarget !== undefined) return false;
    if (task.evidence) {
      if (!validateStudyPlanTaskEvidence(task.evidence, 'lesson')) return false;
      if (task.evidence.lessonId !== task.lessonId) return false;
    }
  } else if (task.type === 'placement') {
    if (task.lessonId !== undefined) return false;
    if (task.reviewItemTarget !== undefined) return false;
    if (task.evidence && !validateStudyPlanTaskEvidence(task.evidence, 'placement')) return false;
  } else if (task.type === 'review') {
    if (task.lessonId !== undefined) return false;
    if (
      typeof task.reviewItemTarget !== 'number' ||
      !Number.isInteger(task.reviewItemTarget) ||
      task.reviewItemTarget < 1 ||
      task.reviewItemTarget > 100
    ) {
      return false;
    }
    // Review task strictly requires valid evidence with matching target count
    if (!task.evidence || !validateStudyPlanTaskEvidence(task.evidence, 'review')) return false;
    if (task.evidence.reviewTargetCount !== task.reviewItemTarget) return false;
  } else if (task.type === 'quick-test') {
    if (task.lessonId !== undefined) return false;
    if (task.reviewItemTarget !== undefined) return false;
    if (typeof task.level !== 'string' || !VALID_CEFR_LEVELS.has(task.level)) return false;
    if (!task.evidence || !validateStudyPlanTaskEvidence(task.evidence, 'quick-test')) return false;
    if (task.evidence.examMode !== 'quick') return false;
    if (task.evidence.examLevel !== task.level) return false;
  }

  // Strict timestamp validation
  if (
    typeof task.createdAt !== 'number' ||
    !Number.isFinite(task.createdAt) ||
    task.createdAt <= 0 ||
    task.createdAt > Date.now() + 86400000
  ) {
    return false;
  }
  if (task.completedAt !== undefined) {
    if (
      typeof task.completedAt !== 'number' ||
      !Number.isFinite(task.completedAt) ||
      task.completedAt < task.createdAt ||
      task.completedAt > Date.now() + 86400000
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Validates untrusted TodayStudyPlan from localStorage.
 */
export function validateTodayStudyPlan(data: any): data is TodayStudyPlan {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (data.schemaVersion !== 1) return false;
  if (typeof data.id !== 'string' || !data.id.trim() || data.id.length > 100) return false;
  if (!isValidLocalDateKey(data.localDate)) return false;
  if (!ALLOWED_DAILY_MINUTES.includes(data.dailyMinutes)) return false;
  if (
    typeof data.planSeed !== 'number' ||
    !Number.isInteger(data.planSeed) ||
    data.planSeed < 0
  ) {
    return false;
  }
  if (
    typeof data.createdAt !== 'number' ||
    !Number.isFinite(data.createdAt) ||
    data.createdAt <= 0 ||
    data.createdAt > Date.now() + 86400000
  ) {
    return false;
  }
  if (
    typeof data.updatedAt !== 'number' ||
    !Number.isFinite(data.updatedAt) ||
    data.updatedAt < data.createdAt ||
    data.updatedAt > Date.now() + 86400000
  ) {
    return false;
  }

  const state = data.state || 'scheduled';
  if (state !== 'scheduled' && state !== 'curriculum-complete') return false;

  if (!Array.isArray(data.tasks)) return false;

  // Invariants per state
  if (state === 'curriculum-complete') {
    if (data.tasks.length > 4) return false;
  } else {
    // state === 'scheduled' requires 1 to 4 tasks
    if (data.tasks.length < 1 || data.tasks.length > 4) return false;
  }

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
  if (!isValidLocalDateKey(item.date)) return false;
  if (!ALLOWED_DAILY_MINUTES.includes(item.plannedMinutes)) return false;
  if (typeof item.taskCount !== 'number' || !Number.isInteger(item.taskCount) || item.taskCount < 0 || item.taskCount > 4) {
    return false;
  }
  if (
    typeof item.completedCount !== 'number' ||
    !Number.isInteger(item.completedCount) ||
    item.completedCount < 0 ||
    item.completedCount > item.taskCount
  ) {
    return false;
  }
  if (
    typeof item.skippedCount !== 'number' ||
    !Number.isInteger(item.skippedCount) ||
    item.skippedCount < 0 ||
    item.skippedCount > item.taskCount
  ) {
    return false;
  }
  // Invariant: sum of completed and skipped cannot exceed total task count
  if (item.completedCount + item.skippedCount > item.taskCount) return false;
  if (
    typeof item.completedAt !== 'number' ||
    !Number.isFinite(item.completedAt) ||
    item.completedAt <= 0 ||
    item.completedAt > Date.now() + 86400000
  ) {
    return false;
  }
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
    const raw = safeGetLocalStorage(STUDY_PLAN_SETTINGS_KEY);
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
 * Returns true if validated and saved; false otherwise.
 */
export function saveStudyPlanSettings(settings: StudyPlanSettings): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (!validateStudyPlanSettings(settings)) return false;
    safeSetLocalStorage(STUDY_PLAN_SETTINGS_KEY, JSON.stringify(settings));
    emitStudyPlanUpdate();
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Loads compact study plan history (max 30 items).
 */
export function loadStudyPlanHistory(): CompactStudyPlanHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetLocalStorage(STUDY_PLAN_HISTORY_KEY);
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
export function archivePlanToHistory(plan: TodayStudyPlan): boolean {
  if (typeof window === 'undefined') return false;
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

    if (!validateHistoryItem(historyItem)) return false;

    const newHistory = [historyItem, ...history.filter((h) => h.date !== plan.localDate)].slice(
      0,
      MAX_HISTORY_DAYS
    );
    safeSetLocalStorage(STUDY_PLAN_HISTORY_KEY, JSON.stringify(newHistory));
    return true;
  } catch (err) {
    return false;
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
      if (
        currentReviewedToday >= baseline + target ||
        (reviewStats.dueCount === 0 && currentReviewedToday > baseline)
      ) {
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

    // 4. Quick Test Task Reconciliation (strictly requires mode === 'quick')
    if (task.type === 'quick-test') {
      const baselineId = task.evidence?.examHistoryLatestIdAtCreation || null;
      const latestExam = examHistory.length > 0 ? examHistory[0] : null;
      if (latestExam && latestExam.id !== baselineId && latestExam.mode === 'quick') {
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
      const raw = safeGetLocalStorage(TODAY_PLAN_KEY);
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
 * Returns true if validated and saved; false otherwise.
 */
export function saveTodayPlan(plan: TodayStudyPlan): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (!validateTodayStudyPlan(plan)) return false;
    safeSetLocalStorage(TODAY_PLAN_KEY, JSON.stringify(plan));
    emitStudyPlanUpdate();
    return true;
  } catch (err) {
    return false;
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
 * Updates the user's daily time goal in settings (for future days) and adapts today's plan
 * if possible without violating budget invariants.
 *
 * Employs safe greedy allocation:
 * 1. Generates candidate tasks with full newGoal.
 * 2. Deduplicates against preserved completed/skipped tasks.
 * 3. Greedily adds only candidate tasks that fit exact remaining budget (newGoal - resolvedMinutes).
 * 4. Respects max 4 total tasks.
 * 5. Requires validateTodayStudyPlan(mergedPlan) === true before saving/returning.
 */
export function updateDailyGoalAndRegeneratePlan(
  newMinutes: AllowedDailyMinutes
): StudyPlanGoalUpdateResult {
  const currentSettings = loadStudyPlanSettings();
  const updatedSettings: StudyPlanSettings = {
    ...currentSettings,
    dailyMinutes: newMinutes,
    updatedAt: Date.now(),
  };
  saveStudyPlanSettings(updatedSettings);

  const localDate = getLocalDateKey();
  const currentPlan = getOrGenerateTodayPlan();

  const preservedTasks = currentPlan.tasks.filter(
    (t) => t.status === 'completed' || t.status === 'skipped'
  );

  // If no tasks have started yet, regenerate fresh plan for today
  if (preservedTasks.length === 0) {
    const context = buildStudyPlanContext();
    const newPlan = generateTodayStudyPlan(context, updatedSettings, localDate);
    const saved = saveTodayPlan(newPlan);
    if (saved) {
      return { plan: newPlan, appliedToToday: true };
    } else {
      return { plan: currentPlan, appliedToToday: false, message: 'Could not save new daily plan.' };
    }
  }

  // Calculate resolved minutes already committed today
  let resolvedMinutes = 0;
  for (const t of preservedTasks) {
    resolvedMinutes += t.estimatedMinutes;
  }

  // Goal Downgrade Invariant: If resolved minutes exceed new goal, preserve today's plan
  if (newMinutes < resolvedMinutes) {
    return {
      plan: currentPlan,
      appliedToToday: false,
      message: `Your ${newMinutes}-minute daily goal will apply starting tomorrow. Today's plan remains active because you've already completed or resolved ${resolvedMinutes} minutes of study.`,
    };
  }

  const remainingBudget = newMinutes - resolvedMinutes;
  const context = buildStudyPlanContext();
  const candidatePlan = generateTodayStudyPlan(context, updatedSettings, localDate);

  const preservedTargetKeys = new Set(preservedTasks.map(getTaskTargetKey));
  const additionalTasks: StudyPlanTask[] = [];
  let additionalMinutes = 0;

  for (const candidateTask of candidatePlan.tasks) {
    if (preservedTasks.length + additionalTasks.length >= 4) break;
    const targetKey = getTaskTargetKey(candidateTask);
    if (!preservedTargetKeys.has(targetKey)) {
      if (additionalMinutes + candidateTask.estimatedMinutes <= remainingBudget) {
        preservedTargetKeys.add(targetKey);
        additionalTasks.push(candidateTask);
        additionalMinutes += candidateTask.estimatedMinutes;
      }
    }
  }

  const mergedPlan: TodayStudyPlan = {
    schemaVersion: 1,
    id: `plan-${localDate}-${newMinutes}`,
    localDate,
    dailyMinutes: newMinutes,
    planSeed: currentPlan.planSeed,
    createdAt: currentPlan.createdAt,
    updatedAt: Date.now(),
    state: preservedTasks.length + additionalTasks.length === 0 ? candidatePlan.state : 'scheduled',
    tasks: [...preservedTasks, ...additionalTasks],
  };

  // Hard Invariant: Merged plan must pass strict validation before being returned/persisted
  if (validateTodayStudyPlan(mergedPlan)) {
    const saved = saveTodayPlan(mergedPlan);
    if (saved) {
      return { plan: mergedPlan, appliedToToday: true };
    }
  }

  // Fallback: Retain current valid plan and inform user
  return {
    plan: currentPlan,
    appliedToToday: false,
    message: `Your ${newMinutes}-minute daily goal will apply starting tomorrow.`,
  };
}
