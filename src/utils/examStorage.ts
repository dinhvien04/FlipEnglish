import { CEFRLevel, ExamMode, ExamResultReport, ExamSession, ExamStatus } from '../types/exam';
import { safeGetLocalStorage, safeSetLocalStorage, safeRemoveLocalStorage } from './storageHealth';

const ACTIVE_EXAM_KEY = 'flipenglish_exam_active';
const EXAM_HISTORY_KEY = 'flipenglish_exam_history';
const MAX_HISTORY_ITEMS = 20;
const MAX_SESSION_QUESTIONS = 120;
const MAX_STR_LEN = 1000;

export const VALID_CEFR_LEVELS: readonly CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const VALID_EXAM_MODES: readonly ExamMode[] = ['quick', 'level', 'mock'];
export const VALID_EXAM_STATUSES: readonly ExamStatus[] = ['notStarted', 'active', 'submitted', 'expired'];
export const VALID_PERFORMANCE_LABELS = ['Excellent', 'Strong', 'Good', 'Developing', 'Needs More Practice'] as const;

/**
 * Validate individual ExamQuestion structure
 */
function isValidQuestion(q: any): boolean {
  if (!q || typeof q !== 'object' || Array.isArray(q)) return false;
  if (typeof q.id !== 'string' || !q.id.trim() || q.id.length > 100) return false;
  if (typeof q.sectionId !== 'string' || !q.sectionId.trim() || q.sectionId.length > 100) return false;
  if (typeof q.sectionTitle !== 'string' || !q.sectionTitle.trim() || q.sectionTitle.length > MAX_STR_LEN) return false;
  if (typeof q.sectionType !== 'string' || !q.sectionType.trim() || q.sectionType.length > 100) return false;
  if (typeof q.kind !== 'string' || !q.kind.trim() || q.kind.length > 100) return false;
  if (typeof q.prompt !== 'string' || !q.prompt.trim() || q.prompt.length > MAX_STR_LEN * 5) return false;
  if (typeof q.correctAnswer !== 'string' || !q.correctAnswer.trim() || q.correctAnswer.length > MAX_STR_LEN) return false;
  if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 10) return false;

  for (const opt of q.options) {
    if (!opt || typeof opt !== 'object' || Array.isArray(opt)) return false;
    if (typeof opt.id !== 'string' || !opt.id.trim() || opt.id.length > 100) return false;
    if (typeof opt.text !== 'string' || opt.text.length > MAX_STR_LEN) return false;
  }

  if (q.visualUrl !== undefined && (typeof q.visualUrl !== 'string' || q.visualUrl.length > MAX_STR_LEN)) return false;
  if (q.audioPromptText !== undefined && (typeof q.audioPromptText !== 'string' || q.audioPromptText.length > MAX_STR_LEN)) return false;
  if (q.explanation !== undefined && (typeof q.explanation !== 'string' || q.explanation.length > MAX_STR_LEN * 5)) return false;
  if (q.tags !== undefined) {
    if (!Array.isArray(q.tags) || q.tags.length > 50) return false;
    for (const tag of q.tags) {
      if (typeof tag !== 'string' || tag.length > 100) return false;
    }
  }
  return true;
}

/**
 * Validate untrusted ExamSession structure from localStorage
 */
export function isValidSessionObject(obj: any): obj is ExamSession {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (obj.schemaVersion !== 2) return false;
  if (typeof obj.id !== 'string' || !obj.id.trim() || obj.id.length > 100) return false;
  if (!VALID_EXAM_MODES.includes(obj.mode)) return false;
  if (!VALID_CEFR_LEVELS.includes(obj.level)) return false;
  if (typeof obj.title !== 'string' || !obj.title.trim() || obj.title.length > MAX_STR_LEN) return false;
  if (typeof obj.durationMinutes !== 'number' || !Number.isFinite(obj.durationMinutes) || obj.durationMinutes <= 0 || obj.durationMinutes > 180) return false;
  if (typeof obj.startedAt !== 'number' || !Number.isFinite(obj.startedAt) || obj.startedAt <= 0 || obj.startedAt > Date.now() + 86400000) return false;
  if (typeof obj.endsAt !== 'number' || !Number.isFinite(obj.endsAt) || obj.endsAt <= obj.startedAt) return false;
  if (!VALID_EXAM_STATUSES.includes(obj.status)) return false;

  if (!Array.isArray(obj.questions) || obj.questions.length === 0 || obj.questions.length > MAX_SESSION_QUESTIONS) return false;
  const questionIdSet = new Set<string>();
  for (const q of obj.questions) {
    if (!isValidQuestion(q)) return false;
    if (questionIdSet.has(q.id)) return false;
    questionIdSet.add(q.id);
  }

  if (!obj.answers || typeof obj.answers !== 'object' || Array.isArray(obj.answers)) return false;
  for (const [qId, ansText] of Object.entries(obj.answers)) {
    if (!questionIdSet.has(qId)) return false;
    if (typeof ansText !== 'string' || (ansText as string).length > MAX_STR_LEN) return false;
  }

  if (!Array.isArray(obj.flaggedQuestionIds)) return false;
  const flaggedSet = new Set<string>();
  for (const fId of obj.flaggedQuestionIds) {
    if (typeof fId !== 'string' || !questionIdSet.has(fId) || flaggedSet.has(fId)) return false;
    flaggedSet.add(fId);
  }

  if (typeof obj.currentQuestionIndex !== 'number' || !Number.isInteger(obj.currentQuestionIndex) || obj.currentQuestionIndex < 0 || obj.currentQuestionIndex >= obj.questions.length) return false;

  if (obj.submittedAt !== undefined) {
    if (typeof obj.submittedAt !== 'number' || !Number.isFinite(obj.submittedAt) || obj.submittedAt < obj.startedAt) return false;
  }

  return true;
}

/**
 * Validate untrusted ExamResultReport structure from localStorage
 */
export function isValidReportObject(obj: any): obj is ExamResultReport {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (typeof obj.id !== 'string' || !obj.id.trim() || obj.id.length > 100) return false;
  if (typeof obj.sessionId !== 'string' || !obj.sessionId.trim() || obj.sessionId.length > 100) return false;
  if (!VALID_EXAM_MODES.includes(obj.mode)) return false;
  if (!VALID_CEFR_LEVELS.includes(obj.level)) return false;
  if (typeof obj.title !== 'string' || !obj.title.trim() || obj.title.length > MAX_STR_LEN) return false;
  if (typeof obj.date !== 'string' || !obj.date.trim() || obj.date.length > 100) return false;
  if (typeof obj.startedAt !== 'number' || !Number.isFinite(obj.startedAt) || obj.startedAt <= 0 || obj.startedAt > Date.now() + 86400000) return false;
  if (typeof obj.submittedAt !== 'number' || !Number.isFinite(obj.submittedAt) || obj.submittedAt < obj.startedAt) return false;
  if (typeof obj.durationSpentSeconds !== 'number' || !Number.isFinite(obj.durationSpentSeconds) || obj.durationSpentSeconds < 0 || obj.durationSpentSeconds > 86400) return false;

  if (typeof obj.totalQuestions !== 'number' || !Number.isInteger(obj.totalQuestions) || obj.totalQuestions <= 0 || obj.totalQuestions > 200) return false;
  if (typeof obj.correctCount !== 'number' || !Number.isInteger(obj.correctCount) || obj.correctCount < 0 || obj.correctCount > obj.totalQuestions) return false;
  if (typeof obj.overallPercentage !== 'number' || !Number.isFinite(obj.overallPercentage) || obj.overallPercentage < 0 || obj.overallPercentage > 100) return false;
  if (!VALID_PERFORMANCE_LABELS.includes(obj.performanceLabel)) return false;

  if (!Array.isArray(obj.sectionScores) || obj.sectionScores.length === 0 || obj.sectionScores.length > 20) return false;
  for (const sec of obj.sectionScores) {
    if (!sec || typeof sec !== 'object' || Array.isArray(sec)) return false;
    if (typeof sec.sectionId !== 'string' || !sec.sectionId.trim() || sec.sectionId.length > 100) return false;
    if (typeof sec.sectionTitle !== 'string' || !sec.sectionTitle.trim() || sec.sectionTitle.length > MAX_STR_LEN) return false;
    if (typeof sec.sectionType !== 'string' || !sec.sectionType.trim() || sec.sectionType.length > 100) return false;
    if (typeof sec.total !== 'number' || !Number.isInteger(sec.total) || sec.total <= 0 || sec.total > 200) return false;
    if (typeof sec.correct !== 'number' || !Number.isInteger(sec.correct) || sec.correct < 0 || sec.correct > sec.total) return false;
    if (typeof sec.percentage !== 'number' || !Number.isFinite(sec.percentage) || sec.percentage < 0 || sec.percentage > 100) return false;
  }

  if (!Array.isArray(obj.strengths) || obj.strengths.length > 50) return false;
  for (const s of obj.strengths) {
    if (typeof s !== 'string' || s.length > MAX_STR_LEN) return false;
  }

  if (!Array.isArray(obj.weaknesses) || obj.weaknesses.length > 50) return false;
  for (const w of obj.weaknesses) {
    if (typeof w !== 'string' || w.length > MAX_STR_LEN) return false;
  }

  if (!Array.isArray(obj.missedTags) || obj.missedTags.length > 200) return false;
  for (const t of obj.missedTags) {
    if (typeof t !== 'string' || t.length > 100) return false;
  }

  if (!Array.isArray(obj.missedQuestions) || obj.missedQuestions.length > obj.totalQuestions) return false;
  for (const mq of obj.missedQuestions) {
    if (!mq || typeof mq !== 'object' || Array.isArray(mq)) return false;
    if (!isValidQuestion(mq.question)) return false;
    if (typeof mq.userAnswer !== 'string' || mq.userAnswer.length > MAX_STR_LEN) return false;
  }

  if (!Array.isArray(obj.recommendedLessonIds) || obj.recommendedLessonIds.length > 50) return false;
  for (const rl of obj.recommendedLessonIds) {
    if (typeof rl !== 'string' || rl.length > 100) return false;
  }

  return true;
}

/**
 * Save active exam session to localStorage. Returns boolean indicating success.
 */
export function saveActiveExam(session: ExamSession): boolean {
  try {
    if (!isValidSessionObject(session)) return false;
    return safeSetLocalStorage(ACTIVE_EXAM_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save active exam session to localStorage', err);
    return false;
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
    // Only active unexpired sessions can be resumed
    if (session.status !== 'active' || session.endsAt <= Date.now()) {
      safeRemoveLocalStorage(ACTIVE_EXAM_KEY);
      return null;
    }

    // Protection against resurrecting completed exams if clearActiveExam failed during finalization
    const history = getExamHistory();
    if (history.some((h) => h.sessionId === session.id)) {
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
 * Clear active exam session. Returns boolean indicating success.
 */
export function clearActiveExam(): boolean {
  try {
    return safeRemoveLocalStorage(ACTIVE_EXAM_KEY);
  } catch (err) {
    console.error('Failed to clear active exam', err);
    return false;
  }
}

/**
 * Save an exam result report to history (max 20 items). Returns boolean indicating success.
 */
export function saveExamResultToHistory(report: ExamResultReport): boolean {
  try {
    if (!isValidReportObject(report)) return false;
    const history = getExamHistory();
    const updated = [report, ...history.filter((item) => item.id !== report.id)].slice(
      0,
      MAX_HISTORY_ITEMS
    );
    const writeSuccess = safeSetLocalStorage(EXAM_HISTORY_KEY, JSON.stringify(updated));
    if (writeSuccess) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flipenglish_exam_history_updated'));
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to save exam result to history', err);
    return false;
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
 * Clear all exam history. Returns boolean indicating success.
 */
export function clearExamHistory(): boolean {
  try {
    const removed = safeRemoveLocalStorage(EXAM_HISTORY_KEY);
    if (removed && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flipenglish_exam_history_updated'));
      return true;
    }
    return removed;
  } catch (err) {
    console.error('Failed to clear exam history', err);
    return false;
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

