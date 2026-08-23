import { AllProgress, LessonProgress } from '../types';

const STORAGE_KEY = 'flipenglish_progress_v1';

export const getStoredProgress = (): AllProgress => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AllProgress;
  } catch (err) {
    console.error('Failed to load progress from localStorage:', err);
    return {};
  }
};

export const getLessonProgress = (lessonId: string): LessonProgress | null => {
  const all = getStoredProgress();
  return all[lessonId] || null;
};

export const saveLessonProgress = (lessonId: string, score: number): LessonProgress => {
  try {
    const all = getStoredProgress();
    const existing = all[lessonId];
    const bestScore = existing ? Math.max(existing.bestScore, score) : score;

    const updated: LessonProgress = {
      completed: true,
      bestScore,
      lastLearnedAt: new Date().toISOString(),
    };

    all[lessonId] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    // Dispatch a storage event so components can update if needed
    window.dispatchEvent(new Event('flipenglish_progress_updated'));

    return updated;
  } catch (err) {
    console.error('Failed to save progress to localStorage:', err);
    return { completed: true, bestScore: score };
  }
};

export const getOverallStats = (totalLessonsCount: number) => {
  const all = getStoredProgress();
  const completedKeys = Object.keys(all).filter((k) => all[k].completed);
  const completedCount = completedKeys.length;
  const percentage = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;
  
  let totalScoreSum = 0;
  completedKeys.forEach((k) => {
    totalScoreSum += all[k].bestScore || 0;
  });
  const avgScore = completedCount > 0 ? Math.round(totalScoreSum / completedCount) : 0;

  return {
    completedCount,
    totalLessonsCount,
    percentage,
    avgScore,
  };
};

export const clearAllProgress = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('flipenglish_progress_updated'));
  } catch (err) {
    console.error('Failed to clear progress:', err);
  }
};
