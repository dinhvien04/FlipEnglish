import { CEFRLevel, ExamResultReport, ExamSession } from '../types/exam';
import { safeGetLocalStorage, safeSetLocalStorage, safeRemoveLocalStorage } from './storageHealth';

const ACTIVE_EXAM_KEY = 'flipenglish_exam_active';
const EXAM_HISTORY_KEY = 'flipenglish_exam_history';
const MAX_HISTORY_ITEMS = 20;
const MAX_SESSION_QUESTIONS = 120;
const MAX_STR_LEN = 1000;

/**
 * Validate untrusted ExamSession structure from localStorage
 */
function isValidSessionObject(obj: any): obj is ExamSession {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (obj.schemaVersion !== 2) return false;
  if (typeof obj.id !== 'string' || obj.id.length === 0 || obj.id.length > 100) return false;
  if (!Array.isArray(obj.questions) || obj.questions.length === 0 || obj.questions.length > MAX_SESSION_QUESTIONS) return false;
  if (!obj.answers || typeof obj.answers !== 'object' || Array.isArray(obj.answers)) return false;
  if (typeof obj.currentQuestionIndex !== 'number' || obj.currentQuestionIndex < 0 || obj.currentQuestionIndex >= obj.questions.length) return false;
  if (typeof obj.startedAt !== 'number' || typeof obj.endsAt !== 'number') return false;

  return true;
}

/**
 * Validate untrusted ExamResultReport structure from localStorage
 */
function isValidReportObject(obj: any): obj is ExamResultReport {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (typeof obj.id !== 'string' || obj.id.length === 0 || obj.id.length > 100) return false;
  if (typeof obj.title !== 'string' || obj.title.length > MAX_STR_LEN) return false;
  if (typeof obj.overallPercentage !== 'number' || obj.overallPercentage < 0 || obj.overallPercentage > 100) return false;
  if (typeof obj.score !== 'number' || obj.score < 0 || obj.score > 200) return false;
  if (typeof obj.totalQuestions !== 'number' || obj.totalQuestions <= 0 || obj.totalQuestions > 200) return false;
  if (!Array.isArray(obj.sectionBreakdown)) return false;

  return true;
}

/**
 * Save active exam session to localStorage
 */
export function saveActiveExam(session: ExamSession): void {
  try {
    if (!isValidSessionObject(session)) return;
    safeSetLocalStorage(ACTIVE_EXAM_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save active exam session to localStorage', err);
  }
}

/**
 * Get active exam session if one exists
 */
export function getActiveExam(): ExamSession | null {
  try {
    const raw = safeGetLocalStorage(ACTIVE_EXAM_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!isValidSessionObject(session)) {
      safeRemoveLocalStorage(ACTIVE_EXAM_KEY);
      return null;
    }
    return session;
  } catch (err) {
    console.error('Failed to read active exam session from localStorage', err);
    try {
      safeRemoveLocalStorage(ACTIVE_EXAM_KEY);
    } catch {}
    return null;
  }
}

/**
 * Clear active exam session
 */
export function clearActiveExam(): void {
  try {
    safeRemoveLocalStorage(ACTIVE_EXAM_KEY);
  } catch (err) {
    console.error('Failed to clear active exam', err);
  }
}

/**
 * Save an exam result report to history (max 20 items)
 */
export function saveExamResultToHistory(report: ExamResultReport): void {
  try {
    if (!isValidReportObject(report)) return;
    const history = getExamHistory();
    // Filter out if already saved
    const updated = [report, ...history.filter((item) => item.id !== report.id)].slice(
      0,
      MAX_HISTORY_ITEMS
    );
    const writeSuccess = safeSetLocalStorage(EXAM_HISTORY_KEY, JSON.stringify(updated));
    if (writeSuccess) {
      window.dispatchEvent(new CustomEvent('flipenglish_exam_history_updated'));
    }
  } catch (err) {
    console.error('Failed to save exam result to history', err);
  }
}

/**
 * Get all completed exam reports
 */
export function getExamHistory(): ExamResultReport[] {
  try {
    const raw = safeGetLocalStorage(EXAM_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidReportObject).slice(0, MAX_HISTORY_ITEMS);
  } catch (err) {
    console.error('Failed to read exam history from localStorage', err);
    return [];
  }
}

/**
 * Clear all exam history
 */
export function clearExamHistory(): void {
  try {
    const removed = safeRemoveLocalStorage(EXAM_HISTORY_KEY);
    if (removed) {
      window.dispatchEvent(new CustomEvent('flipenglish_exam_history_updated'));
    }
  } catch (err) {
    console.error('Failed to clear exam history', err);
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
