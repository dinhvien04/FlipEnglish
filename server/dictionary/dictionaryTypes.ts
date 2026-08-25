import { CEFRLevel } from '../../src/types';

export interface DictionaryPronunciation {
  text?: string;
  audioUrl?: string;
  region?: string;
}

export interface DictionaryDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface CurriculumDictionaryMatch {
  wordId: string;
  lessonId: string;
  lessonTitle: string;
  level: CEFRLevel;
  meaning?: string;
  example?: string;
  imageUrl?: string;
}

export interface DictionaryEntry {
  schemaVersion: 1;
  id: string;
  word: string;
  normalizedWord: string;
  phonetic?: string;
  pronunciations: DictionaryPronunciation[];
  meanings: DictionaryMeaning[];
  synonyms: string[];
  antonyms: string[];
  relatedWords?: string[];
  curriculumMatches?: CurriculumDictionaryMatch[];
  source: 'flipenglish' | 'dictionaryapi' | 'combined';
  fetchedAt?: number;
}

export interface DictionarySuggestion {
  word: string;
  score?: number;
  isCurriculum?: boolean;
}

export type DictionaryRelationType = 'synonym' | 'antonym' | 'similar' | 'sounds-like';

export interface DictionaryRelatedResponse {
  word: string;
  relationType: DictionaryRelationType;
  results: string[];
}

export interface ReverseDictionaryResult {
  word: string;
  score?: number;
  definitionPreview?: string;
}
