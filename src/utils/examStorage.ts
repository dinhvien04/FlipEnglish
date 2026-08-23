import { CEFRLevel, ExamResultReport, ExamSession } from '../types/exam';

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
  if (!Array.isArray(obj.userAnswers)) return false;
  if (typeof obj.currentQuestionIndex !== 'number' || obj.currentQuestionIndex < 0 || obj.currentQuestionIndex >= obj.questions.length) return false;
  if (typeof obj.timeRemainingSeconds !== 'number' || obj.timeRemainingSeconds < 0 || obj.timeRemainingSeconds > 36000) return false;

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
    const session = JSON.parse(raw);
    if (!isValidSessionObject(session)) {
      localStorage.removeItem(ACTIVE_EXAM_KEY);
      return null;
    }
    return session;
  } catch (err) {
    console.error('Failed to read active exam session from localStorage', err);
    try {
      localStorage.removeItem(ACTIVE_EXAM_KEY);
    } catch {}
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
    if (!isValidReportObject(report)) return;
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
    if (!Array.isArray(list)) return [];

    const validItems = list.filter(isValidReportObject).slice(0, MAX_HISTORY_ITEMS);
    return validItems;
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
