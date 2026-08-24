import { CEFRLevel } from '../../types';
import {
  ORDERED_CEFR_LEVELS,
  PlacementSession,
  PlacementResultReport,
  CompactPlacementHistoryItem,
} from './placementTypes';
import { isValidPlacementQuestion } from '../../data/placement/placementPool';

const ACTIVE_PLACEMENT_KEY = 'flipenglish_placement_active_v1';
const PLACEMENT_HISTORY_KEY = 'flipenglish_placement_history_v1';
const MAX_HISTORY_ITEMS = 5;

export const PLACEMENT_UPDATED_EVENT = 'flipenglish_placement_updated';

function emitPlacementUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PLACEMENT_UPDATED_EVENT));
  }
}

/**
 * Validates untrusted localStorage active session object
 */
export function validatePlacementSession(data: any): data is PlacementSession {
  if (!data || typeof data !== 'object') return false;
  if (data.schemaVersion !== 1) return false;
  if (typeof data.id !== 'string' || !data.id.trim()) return false;
  if (data.status !== 'active' && data.status !== 'completed') return false;
  if (typeof data.sessionSeed !== 'number' || isNaN(data.sessionSeed)) return false;
  if (typeof data.startedAt !== 'number' || isNaN(data.startedAt)) return false;
  if (typeof data.currentStageIndex !== 'number' || data.currentStageIndex < 0 || data.currentStageIndex > 3) return false;
  if (typeof data.currentQuestionInStageIndex !== 'number' || data.currentQuestionInStageIndex < 0 || data.currentQuestionInStageIndex > 5) return false;
  if (!ORDERED_CEFR_LEVELS.includes(data.currentLevel as CEFRLevel)) return false;

  if (!Array.isArray(data.stages) || data.stages.length < 1 || data.stages.length > 4) return false;
  for (const stage of data.stages) {
    if (typeof stage.stageIndex !== 'number' || stage.stageIndex < 0 || stage.stageIndex > 3) return false;
    if (!ORDERED_CEFR_LEVELS.includes(stage.level)) return false;
    if (!Array.isArray(stage.questions) || stage.questions.length > 6) return false;
    for (const q of stage.questions) {
      if (!isValidPlacementQuestion(q)) return false;
    }
  }

  if (!Array.isArray(data.stageResults) || data.stageResults.length > 4) return false;
  if (!data.answers || typeof data.answers !== 'object') return false;

  return true;
}

/**
 * Loads Active Placement Session safely from localStorage
 */
export function loadActivePlacement(): PlacementSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_PLACEMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (validatePlacementSession(parsed)) {
      return parsed;
    }
    // Corrupt or outdated session format -> safely clear active
    clearActivePlacement();
    return null;
  } catch (err) {
    clearActivePlacement();
    return null;
  }
}

/**
 * Saves Active Placement Session safely to localStorage
 */
export function saveActivePlacement(session: PlacementSession): void {
  if (typeof window === 'undefined') return;
  try {
    if (!validatePlacementSession(session)) return;
    localStorage.setItem(ACTIVE_PLACEMENT_KEY, JSON.stringify(session));
    emitPlacementUpdate();
  } catch (err) {
    // Storage quota or serialization issue
  }
}

/**
 * Clears Active Placement Session safely
 */
export function clearActivePlacement(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_PLACEMENT_KEY);
    emitPlacementUpdate();
  } catch (err) {
    // ignore
  }
}

/**
 * Validates untrusted placement history items
 */
function validateHistoryItem(item: any): item is CompactPlacementHistoryItem {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || typeof item.date !== 'string') return false;
  if (typeof item.completedAt !== 'number' || isNaN(item.completedAt)) return false;
  if (!ORDERED_CEFR_LEVELS.includes(item.estimatedLevel)) return false;
  if (typeof item.overallPercentage !== 'number' || item.overallPercentage < 0 || item.overallPercentage > 100) return false;
  if (!Array.isArray(item.stagePathLevels) || item.stagePathLevels.length > 4) return false;
  if (!Array.isArray(item.recommendedLessonIds)) return false;
  if (!Array.isArray(item.matchedWeakWordIds)) return false;
  return true;
}

/**
 * Loads compact placement history (max 5 items)
 */
export function loadPlacementHistory(): CompactPlacementHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PLACEMENT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(PLACEMENT_HISTORY_KEY);
      return [];
    }
    const validItems = parsed.filter(validateHistoryItem);
    return validItems.slice(0, MAX_HISTORY_ITEMS);
  } catch (err) {
    return [];
  }
}

/**
 * Saves completed placement result report to history
 */
export function savePlacementResultToHistory(report: PlacementResultReport): void {
  if (typeof window === 'undefined') return;
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

    localStorage.setItem(PLACEMENT_HISTORY_KEY, JSON.stringify(newHistory));
    emitPlacementUpdate();
  } catch (err) {
    // ignore
  }
}

/**
 * Retrieves the latest completed placement result summary (if any exists)
 */
export function getLatestPlacementResult(): CompactPlacementHistoryItem | null {
  const history = loadPlacementHistory();
  return history.length > 0 ? history[0] : null;
}
