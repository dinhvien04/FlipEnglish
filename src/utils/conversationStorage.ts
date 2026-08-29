import { ConversationStorageData, SavedConversationSummary, ConversationCategory } from '../types/conversation';
import { CEFRLevel } from '../types';
import {
  safeGetLocalStorage,
  safeSetLocalStorage,
  safeRemoveLocalStorage,
} from './storageHealth';

export const CONVERSATION_STORAGE_KEY = 'flipenglish_conversation_history_v1';
export const CONVERSATION_UPDATED_EVENT = 'flipenglish_conversation_updated';

const MAX_SAVED_HISTORY = 10;
const VALID_CATEGORIES: Set<ConversationCategory> = new Set(['Everyday', 'Travel', 'Study', 'Work', 'Advanced']);
const VALID_LEVELS: Set<CEFRLevel> = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

/**
 * Sanitizes an untrusted history entry from localStorage.
 */
function sanitizeSummary(raw: any, now: number): SavedConversationSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 80) : `conv-${now}`;
  const scenarioId = typeof raw.scenarioId === 'string' ? raw.scenarioId.trim().slice(0, 80) : '';
  const scenarioTitle = typeof raw.scenarioTitle === 'string' ? raw.scenarioTitle.trim().slice(0, 120) : 'Conversation';

  if (!scenarioId) return null;

  const category: ConversationCategory = VALID_CATEGORIES.has(raw.category) ? raw.category : 'Everyday';
  const level: CEFRLevel = VALID_LEVELS.has(raw.level) ? raw.level : 'A1';

  const rawDate = Number(raw.date);
  const date = Number.isFinite(rawDate) && rawDate > 0 && rawDate <= now + 86400000 ? Math.round(rawDate) : now;

  const rawScore = Number(raw.overallScore);
  const overallScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;

  const rawTurns = Number(raw.turnsCount);
  const turnsCount = Number.isFinite(rawTurns) ? Math.max(1, Math.min(50, Math.round(rawTurns))) : 1;

  const summary = typeof raw.summary === 'string' ? raw.summary.trim().slice(0, 1000) : '';

  return {
    id,
    scenarioId,
    scenarioTitle,
    category,
    level,
    date,
    overallScore,
    turnsCount,
    summary,
  };
}

/**
 * Loads conversation history securely from localStorage.
 */
export function loadConversationStorage(now: number = Date.now()): ConversationStorageData {
  try {
    const raw = safeGetLocalStorage(CONVERSATION_STORAGE_KEY);
    if (!raw) {
      return { schemaVersion: 1, history: [] };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { schemaVersion: 1, history: [] };
    }

    if (parsed.schemaVersion !== 1) {
      return { schemaVersion: 1, history: [] };
    }

    const rawHistory = Array.isArray(parsed.history) ? parsed.history : [];
    const sanitizedHistory: SavedConversationSummary[] = [];

    for (const entry of rawHistory) {
      if (sanitizedHistory.length >= MAX_SAVED_HISTORY) break;
      const sanitized = sanitizeSummary(entry, now);
      if (sanitized) {
        sanitizedHistory.push(sanitized);
      }
    }

    return {
      schemaVersion: 1,
      history: sanitizedHistory,
    };
  } catch (err) {
    console.error('Failed to load conversation history from localStorage:', err);
    return { schemaVersion: 1, history: [] };
  }
}

/**
 * Saves a completed conversation summary to history (keeps max 10 latest).
 */
export function saveConversationSummary(summary: Omit<SavedConversationSummary, 'id' | 'date'> & { id?: string; date?: number }, now: number = Date.now()): void {
  try {
    const currentData = loadConversationStorage(now);
    const secureIdSuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : `${now.toString(36)}`;
    const newEntry: SavedConversationSummary = {
      id: summary.id || `conv-${now}-${secureIdSuffix}`,
      scenarioId: summary.scenarioId,
      scenarioTitle: summary.scenarioTitle,
      category: summary.category,
      level: summary.level,
      date: summary.date || now,
      overallScore: Math.max(0, Math.min(100, Math.round(summary.overallScore))),
      turnsCount: summary.turnsCount,
      summary: summary.summary,
    };

    // Prepend and keep latest 10
    const updatedHistory = [newEntry, ...currentData.history.filter((h) => h.id !== newEntry.id)].slice(0, MAX_SAVED_HISTORY);

    const safeStorage: ConversationStorageData = {
      schemaVersion: 1,
      history: updatedHistory,
    };

    const writeSuccess = safeSetLocalStorage(CONVERSATION_STORAGE_KEY, JSON.stringify(safeStorage));
    if (writeSuccess) {
      window.dispatchEvent(new Event(CONVERSATION_UPDATED_EVENT));
    }
  } catch (err) {
    console.error('Failed to save conversation summary to localStorage:', err);
  }
}

/**
 * Clears saved conversation history.
 */
export function clearConversationHistory(): void {
  try {
    const removeSuccess = safeRemoveLocalStorage(CONVERSATION_STORAGE_KEY);
    if (removeSuccess) {
      window.dispatchEvent(new Event(CONVERSATION_UPDATED_EVENT));
    }
  } catch (err) {
    console.error('Failed to clear conversation history:', err);
  }
}
