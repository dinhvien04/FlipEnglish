import { CEFRLevel } from '../../types';
import {
  ORDERED_CEFR_LEVELS,
  PLACEMENT_STAGE_COUNT,
  PLACEMENT_STAGE_SIZE,
  PLACEMENT_TOTAL_QUESTIONS,
  PlacementSession,
  PlacementResultReport,
  CompactPlacementHistoryItem,
  PlacementSkill,
  PlacementConfidence,
  PlacementPersistenceResult,
} from './placementTypes';
import { isValidPlacementQuestion } from './placementValidation';
import { routeNextLevel } from './placementEngine';
import { LESSONS } from '../../data/lessons';
import {
  safeGetLocalStorage,
  safeSetLocalStorage,
  safeRemoveLocalStorage,
} from '../../utils/storageHealth';

const ACTIVE_PLACEMENT_KEY = 'flipenglish_placement_active_v1';
const PLACEMENT_HISTORY_KEY = 'flipenglish_placement_history_v1';
export const PLACEMENT_LATEST_REPORT_KEY = 'flipenglish_placement_latest_report_v1';
export const PLACEMENT_REVIEW_EXPORTS_KEY = 'flipenglish_placement_review_exports_v1';
const MAX_HISTORY_ITEMS = 5;
const MAX_EXPORTED_REPORTS = 20;

export const PLACEMENT_UPDATED_EVENT = 'flipenglish_placement_updated';

function emitPlacementUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PLACEMENT_UPDATED_EVENT));
  }
}

/**
 * Validates untrusted localStorage active session object with strict integrity guards
 */
export function validatePlacementSession(data: any): data is PlacementSession {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (data.schemaVersion !== 1) return false;
  if (typeof data.id !== 'string' || !data.id.trim() || data.id.length > 100) return false;
  if (data.status !== 'active' && data.status !== 'completed') return false;
  if (typeof data.sessionSeed !== 'number' || !Number.isFinite(data.sessionSeed) || !Number.isSafeInteger(data.sessionSeed)) return false;
  if (typeof data.startedAt !== 'number' || !Number.isFinite(data.startedAt) || data.startedAt <= 0 || data.startedAt > Date.now() + 86400000) return false;
  if (data.completedAt !== undefined) {
    if (typeof data.completedAt !== 'number' || !Number.isFinite(data.completedAt) || data.completedAt < data.startedAt || data.completedAt > Date.now() + 86400000) return false;
  }
  if (typeof data.currentStageIndex !== 'number' || data.currentStageIndex < 0 || data.currentStageIndex >= PLACEMENT_STAGE_COUNT) return false;
  if (typeof data.currentQuestionInStageIndex !== 'number' || data.currentQuestionInStageIndex < 0 || data.currentQuestionInStageIndex >= PLACEMENT_STAGE_SIZE) return false;
  if (!ORDERED_CEFR_LEVELS.includes(data.currentLevel as CEFRLevel)) return false;

  // Stages array validation
  if (!Array.isArray(data.stages) || data.stages.length < 1 || data.stages.length > PLACEMENT_STAGE_COUNT) return false;
  if (data.currentStageIndex >= data.stages.length) return false;
  if (data.stages.length > data.currentStageIndex + 1) return false;
  if (data.currentLevel !== data.stages[data.currentStageIndex]?.level) return false;

  const allQuestionIds = new Set<string>();
  const questionById = new Map<string, any>();

  for (let sIdx = 0; sIdx < data.stages.length; sIdx++) {
    const stage = data.stages[sIdx];
    if (!stage || typeof stage !== 'object') return false;
    if (typeof stage.stageIndex !== 'number' || stage.stageIndex !== sIdx) return false;
    if (!ORDERED_CEFR_LEVELS.includes(stage.level)) return false;
    if (typeof stage.isLocked !== 'boolean') return false;

    if (sIdx < data.currentStageIndex && !stage.isLocked) return false;
    if (sIdx === data.currentStageIndex && stage.isLocked) return false;

    if (!Array.isArray(stage.questions) || stage.questions.length !== PLACEMENT_STAGE_SIZE) return false;

    for (const q of stage.questions) {
      if (!isValidPlacementQuestion(q)) return false;
      if (q.level !== stage.level) return false;
      if (allQuestionIds.has(q.id)) return false;
      allQuestionIds.add(q.id);
      questionById.set(q.id, q);
    }
  }

  // Stage Results validation & consistency
  if (!Array.isArray(data.stageResults) || data.stageResults.length > PLACEMENT_STAGE_COUNT) return false;
  if (data.stageResults.length !== data.currentStageIndex) return false;

  for (let srIdx = 0; srIdx < data.stageResults.length; srIdx++) {
    const sr = data.stageResults[srIdx];
    const correspondingStage = data.stages[srIdx];
    if (!sr || typeof sr !== 'object') return false;
    if (sr.stageIndex !== srIdx) return false;
    if (!ORDERED_CEFR_LEVELS.includes(sr.level)) return false;
    if (!correspondingStage || sr.level !== correspondingStage.level) return false;
    if (sr.totalQuestions !== PLACEMENT_STAGE_SIZE) return false;
    if (typeof sr.correctCount !== 'number' || sr.correctCount < 0 || sr.correctCount > PLACEMENT_STAGE_SIZE) return false;
    if (typeof sr.scorePercentage !== 'number' || sr.scorePercentage < 0 || sr.scorePercentage > 100) return false;
    const expectedPercentage = Math.round((sr.correctCount / PLACEMENT_STAGE_SIZE) * 100);
    if (sr.scorePercentage !== expectedPercentage) return false;

    if (!Array.isArray(sr.questionIds) || sr.questionIds.length !== PLACEMENT_STAGE_SIZE) return false;
    if (correspondingStage) {
      const stageQIds = correspondingStage.questions.map((q: any) => q.id);
      if (sr.questionIds.some((qid: string, idx: number) => qid !== stageQIds[idx])) return false;
    }

    if (!['up', 'same', 'down'].includes(sr.routingDecision)) return false;

    const expected = routeNextLevel(sr.level, sr.correctCount, PLACEMENT_STAGE_SIZE);
    if (sr.routingDecision !== expected.decision) return false;
    if (sr.nextLevel !== expected.nextLevel) return false;

    if (data.stages[srIdx + 1] && data.stages[srIdx + 1].level !== expected.nextLevel) return false;
  }

  // Answers validation
  if (!data.answers || typeof data.answers !== 'object' || Array.isArray(data.answers)) return false;
  const answerKeys = Object.keys(data.answers);
  if (answerKeys.length > PLACEMENT_TOTAL_QUESTIONS) return false;

  for (const qId of answerKeys) {
    if (!allQuestionIds.has(qId)) return false;
    const ansVal = data.answers[qId];
    if (typeof ansVal !== 'string' || ansVal.length > 500) return false;

    const question = questionById.get(qId);
    if (!question) return false;
    const optionTexts = question.options.map((opt: any) => opt.text);
    if (!optionTexts.includes(ansVal)) return false;
  }

  return true;
}

/**
 * Validates a persisted PlacementResultReport strictly
 */
export function validatePlacementResultReport(data: any): data is PlacementResultReport {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (typeof data.id !== 'string' || !data.id.trim() || data.id.length > 150) return false;
  if (typeof data.sessionId !== 'string' || !data.sessionId.trim() || data.sessionId.length > 100) return false;
  if (typeof data.date !== 'string' || !data.date.trim() || data.date.length > 100) return false;
  if (typeof data.startedAt !== 'number' || !Number.isFinite(data.startedAt) || data.startedAt <= 0 || data.startedAt > Date.now() + 86400000) return false;
  if (typeof data.completedAt !== 'number' || !Number.isFinite(data.completedAt) || data.completedAt < data.startedAt || data.completedAt > Date.now() + 86400000) return false;

  if (!ORDERED_CEFR_LEVELS.includes(data.estimatedLevel)) return false;
  if (typeof data.levelTitle !== 'string' || !data.levelTitle.trim() || data.levelTitle.length > 200) return false;
  if (typeof data.levelDescription !== 'string' || !data.levelDescription.trim() || data.levelDescription.length > 1000) return false;
  if (typeof data.canDoSummary !== 'string' || !data.canDoSummary.trim() || data.canDoSummary.length > 1000) return false;

  const validConfidences: PlacementConfidence[] = ['Strong evidence', 'Moderate evidence', 'Tentative estimate'];
  if (!validConfidences.includes(data.confidence)) return false;
  if (typeof data.confidenceReason !== 'string' || !data.confidenceReason.trim() || data.confidenceReason.length > 500) return false;

  if (data.totalQuestions !== PLACEMENT_TOTAL_QUESTIONS) return false;
  if (typeof data.correctCount !== 'number' || data.correctCount < 0 || data.correctCount > PLACEMENT_TOTAL_QUESTIONS) return false;
  if (typeof data.overallPercentage !== 'number' || data.overallPercentage < 0 || data.overallPercentage > 100) return false;

  // Skill Scores validation
  const skills: PlacementSkill[] = ['vocabulary', 'use-of-english', 'reading', 'listening'];
  if (!data.skillScores || typeof data.skillScores !== 'object') return false;
  for (const s of skills) {
    const sc = data.skillScores[s];
    if (!sc || typeof sc !== 'object') return false;
    if (sc.skill !== s) return false;
    if (typeof sc.attempted !== 'number' || sc.attempted < 0 || sc.attempted > PLACEMENT_TOTAL_QUESTIONS) return false;
    if (typeof sc.correct !== 'number' || sc.correct < 0 || sc.correct > sc.attempted) return false;
    if (typeof sc.percentage !== 'number' || sc.percentage < 0 || sc.percentage > 100) return false;
    if (sc.weightedScore !== undefined && (typeof sc.weightedScore !== 'number' || sc.weightedScore < 0 || sc.weightedScore > 100)) return false;
  }

  // StagePath validation
  if (!Array.isArray(data.stagePath) || data.stagePath.length !== PLACEMENT_STAGE_COUNT) return false;
  for (let sIdx = 0; sIdx < data.stagePath.length; sIdx++) {
    const sr = data.stagePath[sIdx];
    if (!sr || typeof sr !== 'object') return false;
    if (sr.stageIndex !== sIdx) return false;
    if (!ORDERED_CEFR_LEVELS.includes(sr.level)) return false;
    if (sr.totalQuestions !== PLACEMENT_STAGE_SIZE) return false;
    if (typeof sr.correctCount !== 'number' || sr.correctCount < 0 || sr.correctCount > PLACEMENT_STAGE_SIZE) return false;
    if (typeof sr.scorePercentage !== 'number' || sr.scorePercentage < 0 || sr.scorePercentage > 100) return false;
    if (!Array.isArray(sr.questionIds) || sr.questionIds.length !== PLACEMENT_STAGE_SIZE) return false;
    if (!['up', 'same', 'down'].includes(sr.routingDecision)) return false;

    const expected = routeNextLevel(sr.level, sr.correctCount, PLACEMENT_STAGE_SIZE);
    if (sr.routingDecision !== expected.decision) return false;
    if (sr.nextLevel !== expected.nextLevel) return false;
  }

  // Recommended Lessons validation
  if (!Array.isArray(data.recommendedLessons) || data.recommendedLessons.length > 5) return false;
  for (const rec of data.recommendedLessons) {
    if (!rec || typeof rec !== 'object') return false;
    if (typeof rec.lessonId !== 'string' || !rec.lessonId.trim()) return false;
    const lessonExists = LESSONS.some((l) => l.id === rec.lessonId);
    if (!lessonExists) return false;
    if (!ORDERED_CEFR_LEVELS.includes(rec.level)) return false;
    if (typeof rec.reason !== 'string' || !rec.reason.trim() || rec.reason.length > 500) return false;
  }

  // Missed Target Items validation
  if (!Array.isArray(data.missedTargetItems) || data.missedTargetItems.length > PLACEMENT_TOTAL_QUESTIONS) return false;
  for (const item of data.missedTargetItems) {
    if (!item || typeof item !== 'object') return false;
    if (typeof item.targetItem !== 'string' || !item.targetItem.trim() || item.targetItem.length > 200) return false;
    if (item.wordId !== undefined && (typeof item.wordId !== 'string' || item.wordId.length > 100)) return false;
    if (!ORDERED_CEFR_LEVELS.includes(item.level)) return false;
    if (!skills.includes(item.skill)) return false;
  }

  return true;
}

/**
 * Loads Active Placement Session safely from localStorage
 */
export function loadActivePlacement(): PlacementSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = safeGetLocalStorage(ACTIVE_PLACEMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (validatePlacementSession(parsed)) {
      if (parsed.status !== 'active') {
        clearActivePlacement();
        return null;
      }
      return parsed;
    }
    clearActivePlacement();
    return null;
  } catch (err) {
    clearActivePlacement();
    return null;
  }
}

/**
 * Alias for loadActivePlacement for consistency with getActiveExam
 */
export const getActivePlacement = loadActivePlacement;

/**
 * Saves Active Placement Session safely to localStorage. Returns boolean.
 */
export function saveActivePlacement(session: PlacementSession): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (!validatePlacementSession(session)) return false;
    const writeSuccess = safeSetLocalStorage(ACTIVE_PLACEMENT_KEY, JSON.stringify(session));
    if (writeSuccess) {
      emitPlacementUpdate();
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Clears Active Placement Session safely. Returns boolean indicating success.
 */
export function clearActivePlacement(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const removeSuccess = safeRemoveLocalStorage(ACTIVE_PLACEMENT_KEY);
    if (removeSuccess) {
      emitPlacementUpdate();
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Saves Latest Validated Placement Result Report. Returns boolean indicating success.
 */
export function saveLatestPlacementReport(report: PlacementResultReport): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (!validatePlacementResultReport(report)) return false;
    const writeSuccess = safeSetLocalStorage(PLACEMENT_LATEST_REPORT_KEY, JSON.stringify(report));
    if (writeSuccess) {
      emitPlacementUpdate();
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Loads Latest Validated Placement Result Report
 */
export function loadLatestPlacementReport(): PlacementResultReport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = safeGetLocalStorage(PLACEMENT_LATEST_REPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (validatePlacementResultReport(parsed)) {
      return parsed;
    }
    safeRemoveLocalStorage(PLACEMENT_LATEST_REPORT_KEY);
    return null;
  } catch (err) {
    safeRemoveLocalStorage(PLACEMENT_LATEST_REPORT_KEY);
    return null;
  }
}

/**
 * Validates untrusted placement history items
 */
function validateHistoryItem(item: any): item is CompactPlacementHistoryItem {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  if (typeof item.id !== 'string' || !item.id.trim() || item.id.length > 150) return false;
  if (typeof item.date !== 'string' || !item.date.trim() || item.date.length > 100) return false;
  if (typeof item.completedAt !== 'number' || !Number.isFinite(item.completedAt) || item.completedAt <= 0 || item.completedAt > Date.now() + 86400000) return false;
  if (!ORDERED_CEFR_LEVELS.includes(item.estimatedLevel)) return false;
  if (typeof item.overallPercentage !== 'number' || item.overallPercentage < 0 || item.overallPercentage > 100) return false;
  const validConfidences: PlacementConfidence[] = ['Strong evidence', 'Moderate evidence', 'Tentative estimate'];
  if (!validConfidences.includes(item.confidence)) return false;

  if (!Array.isArray(item.stagePathLevels) || item.stagePathLevels.length < 1 || item.stagePathLevels.length > PLACEMENT_STAGE_COUNT) return false;
  for (const lvl of item.stagePathLevels) {
    if (!ORDERED_CEFR_LEVELS.includes(lvl)) return false;
  }

  if (!Array.isArray(item.recommendedLessonIds) || item.recommendedLessonIds.length > 5) return false;
  for (const lId of item.recommendedLessonIds) {
    if (typeof lId !== 'string' || !lId.trim()) return false;
    const exists = LESSONS.some((l) => l.id === lId);
    if (!exists) return false;
  }

  if (!Array.isArray(item.matchedWeakWordIds) || item.matchedWeakWordIds.length > PLACEMENT_TOTAL_QUESTIONS) return false;
  for (const wId of item.matchedWeakWordIds) {
    if (typeof wId !== 'string' || !wId.trim() || wId.length > 100) return false;
  }

  return true;
}

/**
 * Checks whether a given placement report ID was already exported to Smart Review
 */
export function isPlacementResultExportedToReview(reportId: string): boolean {
  if (typeof window === 'undefined' || !reportId) return false;
  try {
    const raw = safeGetLocalStorage(PLACEMENT_REVIEW_EXPORTS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    return parsed.includes(reportId);
  } catch (err) {
    return false;
  }
}

import { exportMissedItemsToReview } from '../../utils/reviewStorage';
import { ReviewExportResult } from '../../types/review';

/**
 * Marks a placement report ID as exported to Smart Review (max 20 stored)
 */
export function markPlacementResultExportedToReview(reportId: string): boolean {
  if (typeof window === 'undefined' || !reportId) return false;
  try {
    const raw = safeGetLocalStorage(PLACEMENT_REVIEW_EXPORTS_KEY);
    let list: string[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()));
      }
    }
    if (!list.includes(reportId)) {
      list.unshift(reportId);
      list = list.slice(0, MAX_EXPORTED_REPORTS);
      return safeSetLocalStorage(PLACEMENT_REVIEW_EXPORTS_KEY, JSON.stringify(list));
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Atomically exports placement missed items to Smart Review and records the export marker idempotently.
 */
export function exportPlacementMissedToReview(
  reportId: string,
  canonicalWordIds: string[]
): ReviewExportResult {
  if (isPlacementResultExportedToReview(reportId)) {
    return {
      attempted: canonicalWordIds.length,
      persisted: canonicalWordIds.length,
      failed: 0,
      exportMarkerSaved: true,
      success: true,
    };
  }

  const exportRes = exportMissedItemsToReview(canonicalWordIds, reportId);
  let markerSaved = false;
  if (exportRes.success) {
    markerSaved = markPlacementResultExportedToReview(reportId);
  }

  return {
    attempted: exportRes.attempted,
    persisted: exportRes.persisted,
    failed: exportRes.failed,
    exportMarkerSaved: markerSaved,
    success: exportRes.success && markerSaved,
  };
}

/**
 * Loads compact placement history (max 5 items)
 */
export function loadPlacementHistory(): CompactPlacementHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = safeGetLocalStorage(PLACEMENT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      safeRemoveLocalStorage(PLACEMENT_HISTORY_KEY);
      return [];
    }
    const validItems = parsed.filter(validateHistoryItem);
    return validItems.slice(0, MAX_HISTORY_ITEMS);
  } catch (err) {
    return [];
  }
}

/**
 * Saves completed placement result report to history and saves dedicated latest report.
 * Returns a structured report persistence object with latestSaved, historySaved, and overall success status.
 */
export function savePlacementResultToHistory(report: PlacementResultReport): {
  latestSaved: boolean;
  historySaved: boolean;
  success: boolean;
} {
  if (typeof window === 'undefined') {
    return { latestSaved: false, historySaved: false, success: false };
  }
  try {
    const latestSaved = saveLatestPlacementReport(report);

    let historySaved = false;
    try {
      const history = loadPlacementHistory();
      const matchedWeakWordIds = report.missedTargetItems
        .map((m) => m.wordId)
        .filter((id): id is string => Boolean(id));

      const compactItem: CompactPlacementHistoryItem = {
        id: report.id,
        date: report.date,
        completedAt: report.completedAt,
        estimatedLevel: report.estimatedLevel,
        overallPercentage: report.overallPercentage,
        confidence: report.confidence,
        stagePathLevels: report.stagePath.map((s) => s.level),
        recommendedLessonIds: report.recommendedLessons.map((r) => r.lessonId),
        matchedWeakWordIds: Array.from(new Set(matchedWeakWordIds)),
      };

      const newHistory = [compactItem, ...history.filter((h) => h.id !== compactItem.id)].slice(
        0,
        MAX_HISTORY_ITEMS
      );

      historySaved = safeSetLocalStorage(PLACEMENT_HISTORY_KEY, JSON.stringify(newHistory));
      if (historySaved) {
        emitPlacementUpdate();
      }
    } catch {
      historySaved = false;
    }

    return {
      latestSaved,
      historySaved,
      success: latestSaved && historySaved,
    };
  } catch (err) {
    return { latestSaved: false, historySaved: false, success: false };
  }
}

/**
 * Retrieves the latest completed placement result summary (if any exists)
 */
export function getLatestPlacementResult(): CompactPlacementHistoryItem | null {
  const history = loadPlacementHistory();
  return history.length > 0 ? history[0] : null;
}
