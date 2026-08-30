import {
  ReviewItemState,
  ReviewRating,
  ReviewStatus,
  ReviewStorage,
  ResolvedReviewItem,
  ReviewDashboardStats,
  ReviewLogEntry,
  ReviewExportResult,
  ReviewBatchAddResult,
  ReviewResetResult,
} from '../types/review';
import {
  clampInterval,
  scheduleReview,
  createInitialReviewState,
  recordMistakeSignal,
  calculateNextInterval,
} from './reviewScheduler';
import { resolveCurriculumItem } from './curriculumIndex';
import { ALL_CURRICULUM_LESSONS } from '../data/curriculum';
import { safeGetLocalStorage, safeSetLocalStorage, safeRemoveLocalStorage } from './storageHealth';

export const REVIEW_STORAGE_KEY = 'flipenglish_review_v1';
export const REVIEW_UPDATED_EVENT = 'flipenglish_review_updated';

const MAX_TRACKED_ITEMS = 2000;
const MAX_LOG_ENTRIES = 500;
const MAX_ITEM_ID_LENGTH = 100;
const MAX_FUTURE_TIME_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years
export const DEFAULT_SESSION_MAX_DUE = 20;

const VALID_RATINGS: Set<string> = new Set(['again', 'hard', 'good', 'easy']);
const VALID_STATUSES: Set<string> = new Set(['learning', 'review', 'mastered']);

/**
 * Sanitizes an untrusted review item record from localStorage.
 */
function sanitizeItemState(raw: any, now: number): ReviewItemState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const itemId = typeof raw.itemId === 'string' ? raw.itemId.trim() : '';
  if (!itemId || itemId.length > MAX_ITEM_ID_LENGTH) return null;

  // Verify item exists in canonical curriculum
  const resolved = resolveCurriculumItem(itemId);
  if (!resolved) return null; // Ignore orphaned records

  const status: ReviewStatus = VALID_STATUSES.has(raw.status) ? raw.status : 'learning';

  // Sanitize timestamps
  const rawFirstSeen = Number(raw.firstSeenAt);
  const firstSeenAt = Number.isFinite(rawFirstSeen) && rawFirstSeen > 0 && rawFirstSeen <= now + 86400000
    ? Math.round(rawFirstSeen)
    : now;

  let lastReviewedAt: number | null = null;
  if (raw.lastReviewedAt !== null && raw.lastReviewedAt !== undefined) {
    const rawLast = Number(raw.lastReviewedAt);
    if (Number.isFinite(rawLast) && rawLast > 0 && rawLast <= now + 86400000) {
      lastReviewedAt = Math.round(rawLast);
    }
  }

  const rawNext = Number(raw.nextReviewAt);
  const nextReviewAt = Number.isFinite(rawNext) && rawNext > 0 && rawNext <= now + MAX_FUTURE_TIME_MS
    ? Math.round(rawNext)
    : now;

  const intervalMinutes = clampInterval(Number(raw.intervalMinutes) || 10);

  // Counters
  const sanitizeCounter = (val: any) => {
    const num = Number(val);
    return Number.isFinite(num) && num >= 0 ? Math.min(100000, Math.round(num)) : 0;
  };

  const reviewCount = sanitizeCounter(raw.reviewCount);
  const correctCount = sanitizeCounter(raw.correctCount);
  const lapseCount = sanitizeCounter(raw.lapseCount);
  const correctStreak = sanitizeCounter(raw.correctStreak);

  const lastRating: ReviewRating | null =
    typeof raw.lastRating === 'string' && VALID_RATINGS.has(raw.lastRating)
      ? (raw.lastRating as ReviewRating)
      : null;

  return {
    itemId,
    status,
    firstSeenAt,
    lastReviewedAt,
    nextReviewAt,
    intervalMinutes,
    reviewCount,
    correctCount,
    lapseCount,
    correctStreak,
    lastRating,
  };
}

/**
 * Sanitizes untrusted recent review logs.
 */
function sanitizeRecentLogs(rawLogs: any, now: number): ReviewLogEntry[] {
  if (!Array.isArray(rawLogs)) return [];

  const sanitized: ReviewLogEntry[] = [];
  for (const entry of rawLogs.slice(0, MAX_LOG_ENTRIES)) {
    if (!entry || typeof entry !== 'object') continue;
    const itemId = typeof entry.itemId === 'string' ? entry.itemId.trim() : '';
    if (!itemId || itemId.length > MAX_ITEM_ID_LENGTH) continue;
    if (!VALID_RATINGS.has(entry.rating)) continue;

    const rawTime = Number(entry.reviewedAt);
    const reviewedAt = Number.isFinite(rawTime) && rawTime > 0 && rawTime <= now + 86400000
      ? Math.round(rawTime)
      : now;

    sanitized.push({
      itemId,
      reviewedAt,
      rating: entry.rating as ReviewRating,
    });
  }

  return sanitized;
}

/**
 * Loads and sanitizes review storage from localStorage.
 */
export function loadReviewStorage(now: number = Date.now()): ReviewStorage {
  try {
    const raw = safeGetLocalStorage(REVIEW_STORAGE_KEY);
    if (!raw) {
      return { schemaVersion: 1, items: {}, recentLogs: [] };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { schemaVersion: 1, items: {}, recentLogs: [] };
    }

    if (parsed.schemaVersion !== 1) {
      // Future versions or invalid schema -> return safe blank version 1 container
      return { schemaVersion: 1, items: {}, recentLogs: [] };
    }

    const rawItems = parsed.items;
    const sanitizedItems: Record<string, ReviewItemState> = {};

    if (rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems)) {
      const keys = Object.keys(rawItems).slice(0, MAX_TRACKED_ITEMS);
      for (const key of keys) {
        const item = sanitizeItemState(rawItems[key], now);
        if (item) {
          sanitizedItems[item.itemId] = item;
        }
      }
    }

    const recentLogs = sanitizeRecentLogs(parsed.recentLogs, now);

    const rawExported = parsed.exportedReportIds;
    const exportedReportIds: string[] = [];
    if (Array.isArray(rawExported)) {
      for (const id of rawExported.slice(0, 50)) {
        if (typeof id === 'string' && id.trim().length > 0 && id.length <= 100) {
          exportedReportIds.push(id.trim());
        }
      }
    }

    return {
      schemaVersion: 1,
      items: sanitizedItems,
      recentLogs,
      exportedReportIds,
    };
  } catch (err) {
    console.error('Failed to load review state from localStorage:', err);
    return { schemaVersion: 1, items: {}, recentLogs: [], exportedReportIds: [] };
  }
}

/**
 * Saves review storage to localStorage and emits an update event.
 */
export function saveReviewStorage(storage: ReviewStorage): boolean {
  try {
    const safeKeys = Object.keys(storage.items).slice(0, MAX_TRACKED_ITEMS);
    const prunedItems: Record<string, ReviewItemState> = {};
    for (const k of safeKeys) {
      prunedItems[k] = storage.items[k];
    }

    const prunedLogs = (storage.recentLogs || []).slice(0, MAX_LOG_ENTRIES);
    const prunedExports = (storage.exportedReportIds || []).slice(0, 50);

    const safeStorage: ReviewStorage = {
      schemaVersion: 1,
      items: prunedItems,
      recentLogs: prunedLogs,
      exportedReportIds: prunedExports,
    };

    const writeSuccess = safeSetLocalStorage(REVIEW_STORAGE_KEY, JSON.stringify(safeStorage));
    if (writeSuccess) {
      window.dispatchEvent(new Event(REVIEW_UPDATED_EVENT));
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to save review state to localStorage:', err);
    return false;
  }
}

/**
 * Resolves a ReviewItemState with canonical curriculum data and next intervals.
 */
export function resolveReviewItem(state: ReviewItemState, now: number = Date.now()): ResolvedReviewItem | null {
  const resolved = resolveCurriculumItem(state.itemId);
  if (!resolved) return null;

  return {
    state,
    word: resolved.word,
    lesson: resolved.lesson,
    level: resolved.level,
    isOverdue: state.nextReviewAt <= now,
    nextIntervals: {
      again: calculateNextInterval(state, 'again'),
      hard: calculateNextInterval(state, 'hard'),
      good: calculateNextInterval(state, 'good'),
      easy: calculateNextInterval(state, 'easy'),
    },
  };
}

/**
 * Retrieves the prioritized queue of due items for a review session.
 * Prioritizes:
 * 1. Most overdue items (now - nextReviewAt descending)
 * 2. Lapsed/failed items (status === 'learning' & lapseCount > 0)
 * 3. Soonest due items
 */
export function getDueReviewItems(
  maxSessionCount: number = DEFAULT_SESSION_MAX_DUE,
  now: number = Date.now()
): ResolvedReviewItem[] {
  const storage = loadReviewStorage(now);
  const dueStates: ReviewItemState[] = [];

  for (const itemId in storage.items) {
    const item = storage.items[itemId];
    if (item.nextReviewAt <= now) {
      dueStates.push(item);
    }
  }

  // Sort queue by priority
  dueStates.sort((a, b) => {
    // 1. Lapsed items first if heavily failed
    if (a.status === 'learning' && b.status !== 'learning') return -1;
    if (b.status === 'learning' && a.status !== 'learning') return 1;

    // 2. Overdue amount (earlier nextReviewAt first)
    return a.nextReviewAt - b.nextReviewAt;
  });

  const resolvedQueue: ResolvedReviewItem[] = [];
  const limit = Math.max(1, maxSessionCount);

  for (const state of dueStates) {
    if (resolvedQueue.length >= limit) break;
    const resolved = resolveReviewItem(state, now);
    if (resolved) {
      resolvedQueue.push(resolved);
    }
  }

  return resolvedQueue;
}

/**
 * Retrieves all tracked items for full review mode or browsing.
 * Bounded by maxCount (default 20) to prevent oversized sessions.
 */
export function getAllTrackedReviewItems(
  maxCount: number = DEFAULT_SESSION_MAX_DUE,
  now: number = Date.now()
): ResolvedReviewItem[] {
  const storage = loadReviewStorage(now);
  const list: ResolvedReviewItem[] = [];

  for (const itemId in storage.items) {
    const resolved = resolveReviewItem(storage.items[itemId], now);
    if (resolved) {
      list.push(resolved);
    }
  }

  // Sort: due first, then alphabetically by word
  list.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.word.word.localeCompare(b.word.word);
  });

  const limit = Math.max(1, maxCount);
  return list.slice(0, limit);
}

/**
 * Computes live dashboard metrics from stored review items.
 * Uses exact local calendar day boundaries:
 * - todayStart: 00:00:00 today
 * - tomorrowStart: 00:00:00 tomorrow
 * - dayAfterTomorrowStart: 00:00:00 day after tomorrow
 * - next7DaysEnd: 00:00:00 8 days from today (covering 7 upcoming days)
 */
export function getReviewDashboardStats(now: number = Date.now()): ReviewDashboardStats {
  const storage = loadReviewStorage(now);
  let dueCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let masteredCount = 0;
  let reviewedTodayCount = 0;
  let dueTomorrowCount = 0;
  let dueNext7DaysCount = 0;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowStartMs = tomorrowStart.getTime();

  const dayAfterTomorrowStart = new Date(todayStart);
  dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 2);
  const dayAfterTomorrowStartMs = dayAfterTomorrowStart.getTime();

  const next7DaysEnd = new Date(todayStart);
  next7DaysEnd.setDate(next7DaysEnd.getDate() + 8);
  const next7DaysEndMs = next7DaysEnd.getTime();

  const items = Object.values(storage.items);
  const totalTracked = items.length;

  for (const item of items) {
    if (item.status === 'mastered') {
      masteredCount++;
    } else if (item.status === 'review') {
      reviewCount++;
    } else {
      learningCount++;
    }

    if (item.nextReviewAt <= now) {
      dueCount++;
    } else {
      // Upcoming intervals based on exact calendar boundaries:
      // Tomorrow: nextReviewAt >= tomorrowStart AND nextReviewAt < dayAfterTomorrowStart
      if (item.nextReviewAt >= tomorrowStartMs && item.nextReviewAt < dayAfterTomorrowStartMs) {
        dueTomorrowCount++;
      }
      // Next 7 calendar days: nextReviewAt >= tomorrowStart AND nextReviewAt < next7DaysEnd
      if (item.nextReviewAt >= tomorrowStartMs && item.nextReviewAt < next7DaysEndMs) {
        dueNext7DaysCount++;
      }
    }

    if (item.lastReviewedAt && item.lastReviewedAt >= todayStartMs) {
      reviewedTodayCount++;
    }
  }

  // Compute recent accuracy from logs (last 50 reviews)
  // successful = hard OR good OR easy; failed = again
  let recentAccuracy: number | null = null;
  const logs = storage.recentLogs || [];
  if (logs.length > 0) {
    const recentSample = logs.slice(-50);
    const successfulCount = recentSample.filter(
      (l) => l.rating === 'hard' || l.rating === 'good' || l.rating === 'easy'
    ).length;
    recentAccuracy = Math.round((successfulCount / recentSample.length) * 100);
  }

  return {
    dueCount,
    learningCount,
    reviewCount,
    masteredCount,
    totalTracked,
    reviewedTodayCount,
    dueTomorrowCount,
    dueNext7DaysCount,
    recentAccuracy,
  };
}

/**
 * Checks whether an item is currently tracked in Smart Review.
 */
export function isItemInReview(itemId: string): boolean {
  if (!itemId) return false;
  const storage = loadReviewStorage();
  return Boolean(storage.items[itemId]);
}

/**
 * Ensures an item exists in Smart Review. If absent, adds it with status 'learning'.
 */
export function ensureReviewItem(itemId: string, now: number = Date.now()): ReviewItemState | null {
  if (!itemId) return null;
  const resolved = resolveCurriculumItem(itemId);
  if (!resolved) return null;

  const storage = loadReviewStorage();
  if (storage.items[itemId]) {
    return storage.items[itemId];
  }

  const newState = createInitialReviewState(itemId, now, 0);
  storage.items[itemId] = newState;
  const saved = saveReviewStorage(storage);
  return saved ? newState : null;
}

/**
 * Manually adds or removes an item from Smart Review (Toggle).
 */
export function toggleItemInReview(
  itemId: string,
  now: number = Date.now()
): { success: boolean; inReview: boolean } {
  if (!itemId) return { success: false, inReview: false };
  const resolved = resolveCurriculumItem(itemId);
  if (!resolved) return { success: false, inReview: false };

  const storage = loadReviewStorage();
  if (storage.items[itemId]) {
    delete storage.items[itemId];
    const saved = saveReviewStorage(storage);
    return { success: saved, inReview: !saved };
  } else {
    storage.items[itemId] = createInitialReviewState(itemId, now, 0);
    const saved = saveReviewStorage(storage);
    return { success: saved, inReview: saved };
  }
}

/**
 * Records a mistake signal from an interactive quiz or exam.
 */
export function recordQuizMistake(itemId: string, now: number = Date.now()): boolean {
  if (!itemId) return false;
  const resolved = resolveCurriculumItem(itemId);
  if (!resolved) return false;

  const storage = loadReviewStorage();
  const current = storage.items[itemId];

  if (current) {
    storage.items[itemId] = recordMistakeSignal(current, now);
  } else {
    // New item created with immediate/near due time
    const initial = createInitialReviewState(itemId, now, 10);
    initial.lapseCount = 1;
    storage.items[itemId] = initial;
  }

  return saveReviewStorage(storage);
}

/**
 * Applies a learner's self-rating to a review item and records a log entry.
 */
export function applyReviewRatingToItem(
  itemId: string,
  rating: ReviewRating,
  now: number = Date.now()
): ReviewItemState | null {
  if (!itemId) return null;
  const storage = loadReviewStorage();
  const current = storage.items[itemId] || createInitialReviewState(itemId, now, 0);

  const updated = scheduleReview(current, rating, now);
  storage.items[itemId] = updated;

  // Append to recent logs (capped to MAX_LOG_ENTRIES)
  if (!storage.recentLogs) {
    storage.recentLogs = [];
  }
  storage.recentLogs.push({
    itemId,
    reviewedAt: now,
    rating,
  });
  if (storage.recentLogs.length > MAX_LOG_ENTRIES) {
    storage.recentLogs = storage.recentLogs.slice(-MAX_LOG_ENTRIES);
  }

  const saved = saveReviewStorage(storage);
  return saved ? updated : null;
}

/**
 * Batch adds specific item IDs to Smart Review (e.g. upon reviewing mistake items).
 * Ensures only valid canonical curriculum items are added.
 */
export function batchAddItemsToReview(
  itemIds: string[],
  now: number = Date.now()
): ReviewBatchAddResult {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return { attempted: 0, added: 0, success: true };
  }

  const storage = loadReviewStorage();
  let addedCount = 0;
  let validCount = 0;

  for (const rawId of itemIds) {
    if (typeof rawId !== 'string') continue;
    const itemId = rawId.trim();
    if (!itemId) continue;

    // Verify it exists in canonical curriculum
    const resolved = resolveCurriculumItem(itemId);
    if (!resolved) continue;
    validCount++;

    if (!storage.items[itemId]) {
      storage.items[itemId] = createInitialReviewState(itemId, now, 0);
      addedCount++;
    }
  }

  if (addedCount > 0) {
    const saved = saveReviewStorage(storage);
    return { attempted: itemIds.length, added: saved ? addedCount : 0, success: saved };
  }

  return { attempted: itemIds.length, added: 0, success: true };
}

/**
 * Batch adds all words in multiple lessons to Smart Review atomically in a single storage cycle.
 */
export function batchAddLessonsToReview(
  lessonIds: string[],
  now: number = Date.now()
): ReviewBatchAddResult {
  if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
    return { attempted: 0, added: 0, success: true };
  }

  const storage = loadReviewStorage(now);
  let attemptedCount = 0;
  let addedCount = 0;

  for (const lessonId of lessonIds) {
    const lesson = ALL_CURRICULUM_LESSONS.find((l) => l.id === lessonId);
    if (!lesson) continue;

    for (const word of lesson.words) {
      attemptedCount++;
      if (!storage.items[word.id]) {
        storage.items[word.id] = createInitialReviewState(word.id, now, 0);
        addedCount++;
      }
    }
  }

  if (addedCount > 0) {
    const saved = saveReviewStorage(storage);
    return { attempted: attemptedCount, added: saved ? addedCount : 0, success: saved };
  }

  return { attempted: attemptedCount, added: 0, success: true };
}

/**
 * Batch adds all words in a lesson to Smart Review (e.g. upon lesson or flashcard completion).
 */
export function batchAddLessonWordsToReview(
  lessonId: string,
  now: number = Date.now()
): ReviewBatchAddResult {
  return batchAddLessonsToReview([lessonId], now);
}

/**
 * Batch exports missed item IDs into Smart Review atomically with report-level idempotency.
 */
export function exportMissedItemsToReview(
  itemIds: string[],
  reportId?: string,
  now: number = Date.now()
): { attempted: number; persisted: number; failed: number; success: boolean } {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return { attempted: 0, persisted: 0, failed: 0, success: true };
  }

  const storage = loadReviewStorage(now);

  // Idempotency guard: If this reportId was already exported into reviewStorage, do not re-apply mistake signals
  if (reportId && storage.exportedReportIds?.includes(reportId)) {
    return {
      attempted: itemIds.length,
      persisted: itemIds.length,
      failed: 0,
      success: true,
    };
  }

  let validCount = 0;
  let updatedOrAdded = 0;

  for (const rawId of itemIds) {
    if (typeof rawId !== 'string') continue;
    const itemId = rawId.trim();
    if (!itemId) continue;

    const resolved = resolveCurriculumItem(itemId);
    if (!resolved) continue;
    validCount++;

    const current = storage.items[itemId];
    if (current) {
      storage.items[itemId] = recordMistakeSignal(current, now);
    } else {
      const initial = createInitialReviewState(itemId, now, 10);
      initial.lapseCount = 1;
      storage.items[itemId] = initial;
    }
    updatedOrAdded++;
  }

  let reportIdAdded = false;
  if (reportId) {
    const list = storage.exportedReportIds || [];
    if (!list.includes(reportId)) {
      storage.exportedReportIds = [reportId, ...list].slice(0, 50);
      reportIdAdded = true;
    }
  }

  if (updatedOrAdded > 0 || reportIdAdded) {
    const saved = saveReviewStorage(storage);
    return {
      attempted: itemIds.length,
      persisted: saved ? updatedOrAdded : 0,
      failed: saved ? itemIds.length - validCount : itemIds.length,
      success: saved,
    };
  }

  return {
    attempted: itemIds.length,
    persisted: 0,
    failed: itemIds.length - validCount,
    success: true,
  };
}

/**
 * Counts how many items belonging to a lesson are due for review.
 */
export function getLessonDueCount(lessonId: string, now: number = Date.now()): number {
  const lesson = ALL_CURRICULUM_LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return 0;

  const storage = loadReviewStorage();
  let count = 0;
  for (const word of lesson.words) {
    const item = storage.items[word.id];
    if (item && item.nextReviewAt <= now) {
      count++;
    }
  }
  return count;
}

/**
 * Migrates legacy Placement review export markers from `flipenglish_placement_review_exports_v1`
 * into canonical `ReviewStorage.exportedReportIds`.
 * Performs metadata-only migration without applying review mistake signals.
 * Deletes the legacy key only AFTER canonical save succeeds.
 */
export function migrateLegacyPlacementReviewExports(now: number = Date.now()): boolean {
  try {
    const rawLegacy = safeGetLocalStorage('flipenglish_placement_review_exports_v1');
    if (!rawLegacy) {
      return true;
    }

    let legacyIds: string[] = [];
    try {
      const parsed = JSON.parse(rawLegacy);
      if (Array.isArray(parsed)) {
        for (const id of parsed.slice(0, 50)) {
          if (typeof id === 'string' && id.trim().length > 0 && id.length <= 100) {
            legacyIds.push(id.trim());
          }
        }
      }
    } catch {
      // Corrupt legacy data - safe to purge
      safeRemoveLocalStorage('flipenglish_placement_review_exports_v1');
      return true;
    }

    if (legacyIds.length === 0) {
      safeRemoveLocalStorage('flipenglish_placement_review_exports_v1');
      return true;
    }

    const storage = loadReviewStorage(now);
    const existing = new Set(storage.exportedReportIds || []);
    let modified = false;

    for (const id of legacyIds) {
      if (!existing.has(id)) {
        existing.add(id);
        modified = true;
      }
    }

    if (modified) {
      storage.exportedReportIds = Array.from(existing).slice(0, 50);
      const saved = saveReviewStorage(storage);
      if (saved) {
        safeRemoveLocalStorage('flipenglish_placement_review_exports_v1');
        return true;
      }
      return false;
    }

    // All legacy IDs were already present in canonical storage
    safeRemoveLocalStorage('flipenglish_placement_review_exports_v1');
    return true;
  } catch (err) {
    console.error('Failed to migrate legacy placement review exports:', err);
    return false;
  }
}

/**
 * Resets Smart Review data without affecting lesson progress or exam scores.
 * Also clears the legacy placement review exports secondary key so placement reports can be re-exported.
 * Returns structured ReviewResetResult. Dispatches REVIEW_UPDATED_EVENT if review data was removed.
 */
export function resetReviewStorage(): ReviewResetResult {
  try {
    const reviewRemoved = safeRemoveLocalStorage(REVIEW_STORAGE_KEY);
    const markerRemoved = safeRemoveLocalStorage('flipenglish_placement_review_exports_v1');
    const success = reviewRemoved && markerRemoved;

    // Truthful domain notification: if Review data was removed, listeners and UI must refresh stats
    if (reviewRemoved && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event(REVIEW_UPDATED_EVENT));
    }

    return {
      reviewRemoved,
      legacyMarkerRemoved: markerRemoved,
      success,
    };
  } catch (err) {
    console.error('Failed to reset review storage:', err);
    return {
      reviewRemoved: false,
      legacyMarkerRemoved: false,
      success: false,
    };
  }
}
