import { CEFRLevel } from '../../types';
import {
  DictionaryEntry,
  DictionaryEntrySnapshot,
  SavedDictionaryWord,
  DictionaryMeaning,
  DictionaryDefinition,
  DictionaryPronunciation,
  CurriculumDictionaryMatch,
} from './dictionaryTypes';

const VALID_CEFR_LEVELS = new Set<string>(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const VALID_SOURCES = new Set<string>(['flipenglish', 'dictionaryapi', 'combined']);

/**
 * Validates audio URL: must be https:// and well-formed
 */
export function isSafeHttpsUrl(url: any): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://') || trimmed.length > 500) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Runtime validator for DictionaryPronunciation
 */
export function isValidPronunciation(p: any): p is DictionaryPronunciation {
  if (!p || typeof p !== 'object') return false;
  if (p.text !== undefined && (typeof p.text !== 'string' || p.text.length > 100)) return false;
  if (p.audioUrl !== undefined && (typeof p.audioUrl !== 'string' || !isSafeHttpsUrl(p.audioUrl))) return false;
  if (p.region !== undefined && (typeof p.region !== 'string' || p.region.length > 50)) return false;
  return Boolean(p.text || p.audioUrl);
}

/**
 * Runtime validator for DictionaryDefinition
 */
export function isValidDefinition(d: any): d is DictionaryDefinition {
  if (!d || typeof d !== 'object') return false;
  if (typeof d.definition !== 'string' || d.definition.trim().length === 0 || d.definition.length > 1000) {
    return false;
  }
  if (d.example !== undefined && (typeof d.example !== 'string' || d.example.length > 1000)) {
    return false;
  }
  if (d.synonyms !== undefined) {
    if (!Array.isArray(d.synonyms) || d.synonyms.some((s: any) => typeof s !== 'string' || s.length > 100)) {
      return false;
    }
  }
  if (d.antonyms !== undefined) {
    if (!Array.isArray(d.antonyms) || d.antonyms.some((a: any) => typeof a !== 'string' || a.length > 100)) {
      return false;
    }
  }
  return true;
}

/**
 * Runtime validator for DictionaryMeaning
 */
export function isValidMeaning(m: any): m is DictionaryMeaning {
  if (!m || typeof m !== 'object') return false;
  if (typeof m.partOfSpeech !== 'string' || m.partOfSpeech.length > 60) return false;
  if (!Array.isArray(m.definitions) || m.definitions.length === 0 || m.definitions.length > 10) return false;
  return m.definitions.every(isValidDefinition);
}

/**
 * Runtime validator for CurriculumDictionaryMatch
 */
export function isValidCurriculumMatch(c: any): c is CurriculumDictionaryMatch {
  if (!c || typeof c !== 'object') return false;
  if (typeof c.wordId !== 'string' || c.wordId.length > 100) return false;
  if (typeof c.lessonId !== 'string' || c.lessonId.length > 100) return false;
  if (typeof c.lessonTitle !== 'string' || c.lessonTitle.length > 150) return false;
  if (typeof c.level !== 'string' || !VALID_CEFR_LEVELS.has(c.level)) return false;
  if (c.meaning !== undefined && (typeof c.meaning !== 'string' || c.meaning.length > 500)) return false;
  if (c.example !== undefined && (typeof c.example !== 'string' || c.example.length > 800)) return false;
  if (c.imageUrl !== undefined && (typeof c.imageUrl !== 'string' || c.imageUrl.length > 500)) return false;
  return true;
}

/**
 * Runtime validator for complete DictionaryEntry
 */
export function isValidDictionaryEntry(obj: any): obj is DictionaryEntry {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.schemaVersion !== 1) return false;
  if (typeof obj.id !== 'string' || obj.id.length === 0 || obj.id.length > 120) return false;
  if (typeof obj.word !== 'string' || obj.word.length === 0 || obj.word.length > 100) return false;
  if (typeof obj.normalizedWord !== 'string' || obj.normalizedWord.length === 0 || obj.normalizedWord.length > 100) {
    return false;
  }
  if (obj.phonetic !== undefined && (typeof obj.phonetic !== 'string' || obj.phonetic.length > 100)) return false;

  if (!Array.isArray(obj.pronunciations) || obj.pronunciations.length > 10 || !obj.pronunciations.every(isValidPronunciation)) {
    return false;
  }
  if (!Array.isArray(obj.meanings) || obj.meanings.length > 10 || !obj.meanings.every(isValidMeaning)) {
    return false;
  }
  if (!Array.isArray(obj.synonyms) || obj.synonyms.length > 50 || obj.synonyms.some((s: any) => typeof s !== 'string' || s.length > 100)) {
    return false;
  }
  if (!Array.isArray(obj.antonyms) || obj.antonyms.length > 50 || obj.antonyms.some((a: any) => typeof a !== 'string' || a.length > 100)) {
    return false;
  }
  if (!VALID_SOURCES.has(obj.source)) return false;

  if (obj.fetchedAt !== undefined && (typeof obj.fetchedAt !== 'number' || !Number.isFinite(obj.fetchedAt) || obj.fetchedAt <= 0)) {
    return false;
  }
  if (obj.curriculumMatches !== undefined) {
    if (!Array.isArray(obj.curriculumMatches) || obj.curriculumMatches.length > 20 || !obj.curriculumMatches.every(isValidCurriculumMatch)) {
      return false;
    }
  }

  return true;
}

/**
 * Runtime validator for DictionaryEntrySnapshot
 */
export function isValidDictionaryEntrySnapshot(obj: any): obj is DictionaryEntrySnapshot {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.word !== 'string' || obj.word.length === 0 || obj.word.length > 100) return false;
  if (typeof obj.normalizedWord !== 'string' || obj.normalizedWord.length === 0 || obj.normalizedWord.length > 100) return false;
  if (obj.phonetic !== undefined && (typeof obj.phonetic !== 'string' || obj.phonetic.length > 100)) return false;
  if (obj.primaryPartOfSpeech !== undefined && (typeof obj.primaryPartOfSpeech !== 'string' || obj.primaryPartOfSpeech.length > 60)) return false;
  if (obj.primaryDefinition !== undefined && (typeof obj.primaryDefinition !== 'string' || obj.primaryDefinition.length > 1000)) return false;
  if (obj.primaryMeaningVi !== undefined && (typeof obj.primaryMeaningVi !== 'string' || obj.primaryMeaningVi.length > 800)) return false;
  if (obj.audioUrl !== undefined && (typeof obj.audioUrl !== 'string' || !isSafeHttpsUrl(obj.audioUrl))) return false;
  if (obj.cefrLevel !== undefined && (typeof obj.cefrLevel !== 'string' || !VALID_CEFR_LEVELS.has(obj.cefrLevel))) return false;
  if (obj.lessonTitle !== undefined && (typeof obj.lessonTitle !== 'string' || obj.lessonTitle.length > 150)) return false;
  return true;
}

/**
 * Runtime validator for SavedDictionaryWord
 */
export function isValidSavedDictionaryWord(obj: any): obj is SavedDictionaryWord {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.schemaVersion !== 1) return false;
  if (typeof obj.id !== 'string' || obj.id.length === 0 || obj.id.length > 120) return false;
  if (typeof obj.normalizedWord !== 'string' || obj.normalizedWord.length === 0 || obj.normalizedWord.length > 100) return false;
  if (typeof obj.displayWord !== 'string' || obj.displayWord.length === 0 || obj.displayWord.length > 100) return false;
  if (typeof obj.savedAt !== 'number' || !Number.isFinite(obj.savedAt) || obj.savedAt <= 0) return false;
  if (obj.source !== 'curriculum' && obj.source !== 'dictionary') return false;
  if (obj.curriculumWordId !== undefined && (typeof obj.curriculumWordId !== 'string' || obj.curriculumWordId.length > 100)) return false;
  if (obj.lessonId !== undefined && (typeof obj.lessonId !== 'string' || obj.lessonId.length > 100)) return false;
  if (obj.snapshot !== undefined && !isValidDictionaryEntrySnapshot(obj.snapshot)) return false;
  return true;
}
