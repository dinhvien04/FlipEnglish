import { CEFRLevel, ExamResultReport, ExamSession } from '../types/exam';

const ACTIVE_EXAM_KEY = 'flipenglish_exam_active';
const EXAM_HISTORY_KEY = 'flipenglish_exam_history';
const MAX_HISTORY_ITEMS = 20;

/**
 * Save active exam session to localStorage
 */
export function saveActiveExam(session: ExamSession): void {
  try {
    localStorage.setItem(ACTIVE_EXAM_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save active exam session to localStorage', err);
  }
}

/**
 * Get active exam session if one exists
 */
export function getActiveExam(): ExamSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_EXAM_KEY);
    if (!raw) return null;
    const session: ExamSession = JSON.parse(raw);
    if (!session || !session.id || !session.questions || session.questions.length === 0) {
      return null;
    }
    // Invalidate sessions created under deprecated schema (prior to schemaVersion 2)
    if (session.schemaVersion !== 2) {
      localStorage.removeItem(ACTIVE_EXAM_KEY);
      return null;
    }
    return session;
  } catch (err) {
    console.error('Failed to read active exam session from localStorage', err);
    return null;
  }
}

/**
 * Clear active exam session
 */
export function clearActiveExam(): void {
  try {
    localStorage.removeItem(ACTIVE_EXAM_KEY);
  } catch (err) {
    console.error('Failed to clear active exam', err);
  }
}

/**
 * Save an exam result report to history (max 20 items)
 */
export function saveExamResultToHistory(report: ExamResultReport): void {
  try {
    const history = getExamHistory();
    // Filter out if already saved
    const updated = [report, ...history.filter((item) => item.id !== report.id)].slice(
      0,
      MAX_HISTORY_ITEMS
    );
    localStorage.setItem(EXAM_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('flipenglish_exam_history_updated'));
  } catch (err) {
    console.error('Failed to save exam result to history', err);
  }
}

/**
 * Get all completed exam reports
 */
export function getExamHistory(): ExamResultReport[] {
  try {
    const raw = localStorage.getItem(EXAM_HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Failed to read exam history', err);
    return [];
  }
}

/**
 * Get history filtered by level
 */
export function getExamHistoryByLevel(level: CEFRLevel): ExamResultReport[] {
  return getExamHistory().filter((item) => item.level === level);
}

/**
 * Compute progress trend for a level
 */
export function getLevelTrend(level: CEFRLevel): {
  attempts: { attemptNumber: number; percentage: number; date: string }[];
  deltaPercentage: number;
} | null {
  const levelHistory = getExamHistoryByLevel(level).reverse(); // oldest to newest
  if (levelHistory.length < 2) return null;

  const attempts = levelHistory.map((item, idx) => ({
    attemptNumber: idx + 1,
    percentage: item.overallPercentage,
    date: item.date,
  }));

  const firstScore = attempts[0].percentage;
  const lastScore = attempts[attempts.length - 1].percentage;
  const deltaPercentage = lastScore - firstScore;

  return { attempts, deltaPercentage };
}
