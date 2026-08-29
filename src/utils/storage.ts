import { AllProgress, LessonProgress } from '../types';
import { safeGetLocalStorage, safeSetLocalStorage, safeRemoveLocalStorage } from './storageHealth';

const STORAGE_KEY = 'flipenglish_progress_v1';
const MAX_PROGRESS_ENTRIES = 200;
const MAX_KEY_LENGTH = 100;

/**
 * Validates and sanitizes a single progress record from untrusted localStorage.
 */
function sanitizeProgressRecord(raw: any): LessonProgress | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const completed = Boolean(raw.completed);
  const rawScore = Number(raw.bestScore);
  const bestScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;

  let lastLearnedAt: string | undefined = undefined;
  if (typeof raw.lastLearnedAt === 'string' && raw.lastLearnedAt.length <= 50) {
    const parsedDate = Date.parse(raw.lastLearnedAt);
    if (!Number.isNaN(parsedDate)) {
      lastLearnedAt = new Date(parsedDate).toISOString();
    }
  }

  return {
    completed,
    bestScore,
    lastLearnedAt,
  };
}

export const getStoredProgress = (): AllProgress => {
  try {
    const raw = safeGetLocalStorage(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const sanitized: AllProgress = {};
    const keys = Object.keys(parsed).slice(0, MAX_PROGRESS_ENTRIES);

    for (const key of keys) {
      if (typeof key !== 'string' || key.length === 0 || key.length > MAX_KEY_LENGTH) continue;
      const validRecord = sanitizeProgressRecord(parsed[key]);
      if (validRecord) {
        sanitized[key] = validRecord;
      }
    }

    return sanitized;
  } catch (err) {
    console.error('Failed to load progress from localStorage:', err);
    return {};
  }
};

export const getLessonProgress = (lessonId: string): LessonProgress | null => {
  if (typeof lessonId !== 'string' || lessonId.length > MAX_KEY_LENGTH) return null;
  const all = getStoredProgress();
  return all[lessonId] || null;
};

export const saveLessonProgress = (lessonId: string, score: number): LessonProgress => {
  try {
    if (typeof lessonId !== 'string' || lessonId.length === 0 || lessonId.length > MAX_KEY_LENGTH) {
      return { completed: true, bestScore: 0 };
    }

    const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
    const all = getStoredProgress();
    const existing = all[lessonId];
    const bestScore = existing ? Math.max(existing.bestScore, safeScore) : safeScore;

    const updated: LessonProgress = {
      completed: true,
      bestScore,
      lastLearnedAt: new Date().toISOString(),
    };

    all[lessonId] = updated;

    // Prune if total keys exceed maximum
    const safeKeys = Object.keys(all).slice(0, MAX_PROGRESS_ENTRIES);
    const pruned: AllProgress = {};
    for (const k of safeKeys) {
      pruned[k] = all[k];
    }

    const writeSuccess = safeSetLocalStorage(STORAGE_KEY, JSON.stringify(pruned));

    // Dispatch a storage event only when persistence succeeds
    if (writeSuccess) {
      window.dispatchEvent(new Event('flipenglish_progress_updated'));
    }

    return updated;
  } catch (err) {
    console.error('Failed to save progress to localStorage:', err);
    return { completed: true, bestScore: Math.max(0, Math.min(100, Math.round(score || 0))) };
  }
};

export const getOverallStats = (totalLessonsCount: number) => {
  const all = getStoredProgress();
  const completedKeys = Object.keys(all).filter((k) => all[k]?.completed);
  const completedCount = completedKeys.length;
  const safeTotalLessons = Math.max(1, Math.min(1000, Number(totalLessonsCount) || 1));
  const percentage = Math.min(100, Math.max(0, Math.round((completedCount / safeTotalLessons) * 100)));

  let totalScoreSum = 0;
  completedKeys.forEach((k) => {
    totalScoreSum += all[k]?.bestScore || 0;
  });
  const avgScore = completedCount > 0 ? Math.round(totalScoreSum / completedCount) : 0;

  return {
    completedCount,
    totalLessonsCount: safeTotalLessons,
    percentage,
    avgScore,
  };
};

export const clearAllProgress = () => {
  try {
    safeRemoveLocalStorage(STORAGE_KEY);
    window.dispatchEvent(new Event('flipenglish_progress_updated'));
  } catch (err) {
    console.error('Failed to clear progress:', err);
  }
};
