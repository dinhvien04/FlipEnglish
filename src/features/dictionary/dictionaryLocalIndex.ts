import { LESSONS } from '../../data/lessons';
import { VocabWord, Lesson, CEFRLevel } from '../../types';
import {
  CurriculumDictionaryMatch,
  DictionaryEntry,
  DictionaryMeaning,
  DictionarySuggestion,
  SavedDictionaryWord,
} from './dictionaryTypes';

/**
 * Pure query normalization: collapses whitespace, trims, lowercases,
 * preserves hyphens and apostrophes.
 */
export function normalizeDictionaryQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  return query
    .trim()
    .toLowerCase()
    .replace(/[‘’]/g, "'") // normalize smart quotes
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ');
}

interface IndexedCurriculumItem {
  match: CurriculumDictionaryMatch;
  vocabWord: VocabWord;
  lesson: Lesson;
}

// Module-level memoized index: normalizedWord -> Array<IndexedCurriculumItem>
let curriculumIndex: Map<string, IndexedCurriculumItem[]> | null = null;
let allCurriculumWordsList: { normalized: string; display: string }[] | null = null;

function ensureIndexBuilt(): {
  index: Map<string, IndexedCurriculumItem[]>;
  wordsList: { normalized: string; display: string }[];
} {
  if (curriculumIndex && allCurriculumWordsList) {
    return { index: curriculumIndex, wordsList: allCurriculumWordsList };
  }

  const index = new Map<string, IndexedCurriculumItem[]>();
  const wordsList: { normalized: string; display: string }[] = [];
  const seenWords = new Set<string>();

  for (const lesson of LESSONS) {
    for (const word of lesson.words) {
      const displayWord = word.word.trim();
      const normalized = normalizeDictionaryQuery(displayWord);
      if (!normalized) continue;

      const match: CurriculumDictionaryMatch = {
        wordId: word.id,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        level: (word.level || lesson.level) as CEFRLevel,
        meaning: word.meaning,
        example: word.example,
        imageUrl: word.imageUrl,
        partOfSpeech: word.partOfSpeech,
      };

      const item: IndexedCurriculumItem = {
        match,
        vocabWord: word,
        lesson,
      };

      const existing = index.get(normalized) || [];
      existing.push(item);
      index.set(normalized, existing);

      if (!seenWords.has(normalized)) {
        seenWords.add(normalized);
        wordsList.push({ normalized, display: displayWord });
      }

      // Also index expression if different
      if (word.expression && word.expression.trim()) {
        const normExpr = normalizeDictionaryQuery(word.expression);
        if (normExpr && normExpr !== normalized) {
          const existingExpr = index.get(normExpr) || [];
          existingExpr.push(item);
          index.set(normExpr, existingExpr);
          if (!seenWords.has(normExpr)) {
            seenWords.add(normExpr);
            wordsList.push({ normalized: normExpr, display: word.expression.trim() });
          }
        }
      }
    }
  }

  curriculumIndex = index;
  allCurriculumWordsList = wordsList;
  return { index, wordsList };
}

/**
 * Finds exact curriculum matches for a word.
 */
export function getCurriculumMatchesForWord(query: string): CurriculumDictionaryMatch[] {
  const normalized = normalizeDictionaryQuery(query);
  if (!normalized) return [];
  const { index } = ensureIndexBuilt();
  const items = index.get(normalized) || [];
  return items.map((i) => i.match);
}

/**
 * Finds all raw indexed curriculum items for a word.
 */
export function getIndexedCurriculumItems(query: string): IndexedCurriculumItem[] {
  const normalized = normalizeDictionaryQuery(query);
  if (!normalized) return [];
  const { index } = ensureIndexBuilt();
  return index.get(normalized) || [];
}

/**
 * Builds a synthetic DictionaryEntry solely from FlipEnglish curriculum data.
 * Useful when offline or when no external provider entry exists.
 */
export function buildCurriculumDictionaryEntry(query: string): DictionaryEntry | null {
  const normalized = normalizeDictionaryQuery(query);
  const items = getIndexedCurriculumItems(normalized);
  if (items.length === 0) return null;

  const firstItem = items[0];
  const displayWord = firstItem.vocabWord.word;

  const meaningsMap = new Map<string, DictionaryMeaning>();
  const synonymsSet = new Set<string>();
  const antonymsSet = new Set<string>();

  for (const { vocabWord } of items) {
    const pos = vocabWord.partOfSpeech || 'word';
    const existingMeaning = meaningsMap.get(pos) || {
      partOfSpeech: pos,
      definitions: [],
    };

    existingMeaning.definitions.push({
      definition: vocabWord.definition || vocabWord.meaning,
      example: vocabWord.example,
      synonyms: vocabWord.synonyms,
      antonyms: vocabWord.antonyms,
    });

    meaningsMap.set(pos, existingMeaning);

    if (Array.isArray(vocabWord.synonyms)) {
      vocabWord.synonyms.forEach((s) => synonymsSet.add(s.toLowerCase()));
    }
    if (Array.isArray(vocabWord.antonyms)) {
      vocabWord.antonyms.forEach((a) => antonymsSet.add(a.toLowerCase()));
    }
  }

  return {
    schemaVersion: 1,
    id: `curr_${normalized.replace(/[^a-z0-9]/g, '_')}`,
    word: displayWord,
    normalizedWord: normalized,
    phonetic: firstItem.vocabWord.pronunciation,
    pronunciations: firstItem.vocabWord.pronunciation
      ? [{ text: firstItem.vocabWord.pronunciation }]
      : [],
    meanings: Array.from(meaningsMap.values()),
    synonyms: Array.from(synonymsSet).slice(0, 20),
    antonyms: Array.from(antonymsSet).slice(0, 20),
    curriculumMatches: items.map((i) => i.match),
    source: 'flipenglish',
    fetchedAt: Date.now(),
  };
}

/**
 * Searches local curriculum for autocomplete suggestions.
 * Prefix matches first, then substring matches.
 */
export function getLocalCurriculumSuggestions(query: string, maxResults = 6): DictionarySuggestion[] {
  const normalized = normalizeDictionaryQuery(query);
  if (!normalized || normalized.length < 1) return [];

  const { wordsList } = ensureIndexBuilt();
  const prefixMatches: DictionarySuggestion[] = [];
  const containsMatches: DictionarySuggestion[] = [];

  for (const item of wordsList) {
    if (item.normalized === normalized) {
      // exact match at front
      prefixMatches.unshift({ word: item.display, isCurriculum: true, score: 1000 });
    } else if (item.normalized.startsWith(normalized)) {
      prefixMatches.push({ word: item.display, isCurriculum: true, score: 800 });
    } else if (item.normalized.includes(normalized) && containsMatches.length < maxResults) {
      containsMatches.push({ word: item.display, isCurriculum: true, score: 500 });
    }

    if (prefixMatches.length >= maxResults) break;
  }

  return [...prefixMatches, ...containsMatches].slice(0, maxResults);
}

/**
 * Finds exact curriculum match by canonical wordId and lessonId.
 */
export function getCurriculumMatchByIds(
  wordId: string,
  lessonId: string
): CurriculumDictionaryMatch | null {
  if (!wordId || !lessonId) return null;
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return null;
  const vocab = lesson.words.find((w) => w.id === wordId);
  if (!vocab) return null;

  return {
    wordId: vocab.id,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    level: (vocab.level || lesson.level) as CEFRLevel,
    meaning: vocab.meaning,
    example: vocab.example,
    imageUrl: vocab.imageUrl,
    partOfSpeech: vocab.partOfSpeech,
  };
}

/**
 * Builds a valid DictionaryEntry from a saved word snapshot or minimal saved word record.
 * Used for offline opening when full dictionary cache entry was evicted.
 * - NEVER invents fake English definitions (does not convert Vietnamese meaning into English definition).
 * - NEVER invents fake "Saved vocabulary item" placeholder definitions.
 * - NEVER uses fake fallback CEFR levels like B1.
 * - Resolves canonical curriculum data when curriculumWordId and lessonId match.
 */
export function buildDictionaryEntryFromSavedSnapshot(savedWord: SavedDictionaryWord): DictionaryEntry {
  const snapshot = savedWord.snapshot;
  const word = snapshot?.word || savedWord.displayWord;
  const normalizedWord = savedWord.normalizedWord;

  const meanings: DictionaryMeaning[] = [];

  // Only create a meaning definition if a real primaryDefinition exists on the snapshot
  if (snapshot?.primaryDefinition && snapshot.primaryDefinition.trim()) {
    meanings.push({
      partOfSpeech: snapshot.primaryPartOfSpeech || 'word',
      definitions: [
        {
          definition: snapshot.primaryDefinition.trim(),
          synonyms: [],
          antonyms: [],
        },
      ],
    });
  }

  const pronunciations = [];
  if (snapshot?.phonetic) {
    pronunciations.push({ text: snapshot.phonetic, audioUrl: snapshot.audioUrl });
  } else if (snapshot?.audioUrl) {
    pronunciations.push({ audioUrl: snapshot.audioUrl });
  }

  // Resolve curriculum match: ONLY from current canonical FlipEnglish curriculum data
  const curriculumMatches: CurriculumDictionaryMatch[] = [];
  if (savedWord.curriculumWordId && savedWord.lessonId) {
    const canonicalMatch = getCurriculumMatchByIds(savedWord.curriculumWordId, savedWord.lessonId);
    if (canonicalMatch) {
      curriculumMatches.push(canonicalMatch);
    } else {
      // Fallback: check if normalized word exists in current bundled curriculum
      const localMatches = getCurriculumMatchesForWord(normalizedWord);
      if (localMatches.length > 0) {
        curriculumMatches.push(...localMatches);
      }
    }
  } else {
    // If no wordId/lessonId, check if normalized word matches local curriculum index
    const localMatches = getCurriculumMatchesForWord(normalizedWord);
    if (localMatches.length > 0) {
      curriculumMatches.push(...localMatches);
    }
  }

  const hasCanonicalMatches = curriculumMatches.length > 0;

  return {
    schemaVersion: 1,
    id: `saved_entry_${normalizedWord.replace(/[^a-z0-9]/g, '_')}`,
    word,
    normalizedWord,
    phonetic: snapshot?.phonetic,
    pronunciations,
    meanings,
    synonyms: [],
    antonyms: [],
    curriculumMatches: hasCanonicalMatches ? curriculumMatches : undefined,
    source: hasCanonicalMatches ? 'flipenglish' : 'dictionaryapi',
    fetchedAt: savedWord.savedAt,
  };
}

