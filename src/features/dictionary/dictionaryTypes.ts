import { CEFRLevel } from '../../types';

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
  partOfSpeech?: string;
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

export interface ReverseDictionaryResult {
  word: string;
  score?: number;
  definitionPreview?: string;
}

export interface DictionaryEntrySnapshot {
  word: string;
  normalizedWord: string;
  phonetic?: string;
  primaryPartOfSpeech?: string;
  primaryDefinition?: string;
  primaryMeaningVi?: string;
  audioUrl?: string;
  cefrLevel?: CEFRLevel;
  lessonTitle?: string;
}

export interface SavedDictionaryWord {
  schemaVersion: 1;
  id: string;
  normalizedWord: string;
  displayWord: string;
  savedAt: number;
  source: 'curriculum' | 'dictionary';
  curriculumWordId?: string;
  lessonId?: string;
  snapshot?: DictionaryEntrySnapshot;
}

export interface RecentSearchItem {
  word: string;
  searchedAt: number;
}

export interface LearnResumeContext {
  lessonId: string;
  flashcardIndex: number;
  hasCompletedAll: boolean;
  isReviewMistakesMode: boolean;
}

export interface ReviewResumeContext {
  activeQueue: any[]; // ResolvedReviewItem[]
  currentIndex: number;
  ratingBreakdown: Record<string, number>;
}

export type DictionaryReturnContext =
  | {
      source: 'learn';
      view: 'learn';
      learnContext: LearnResumeContext;
    }
  | {
      source: 'review';
      view: 'review';
      reviewContext: ReviewResumeContext;
    }
  | {
      source: 'view';
      view: import('../../types').AppView;
    };
