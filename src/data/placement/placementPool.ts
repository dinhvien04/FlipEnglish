import { CEFRLevel, VocabWord } from '../../types';
import { LESSONS } from '../lessons';
import { USE_OF_ENGLISH_BANK } from '../exams/useOfEnglishBank';
import { READING_PASSAGES_BANK } from '../exams/readingPassages';
import {
  PlacementQuestion,
  PlacementSkill,
  ORDERED_CEFR_LEVELS,
} from '../../features/placement/placementTypes';

/**
 * Deterministic PRNG using Mulberry32 algorithm.
 * Seed is numeric (e.g. timestamp or hash) to generate reproducible pseudo-random sequences.
 */
export function createSeededRandom(seed: number) {
  let s = Math.floor(seed);
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded Fisher-Yates shuffle that does not mutate original array.
 */
export function seededShuffle<T>(array: readonly T[], randomFn: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Internal Cache for Placement Question Pool by CEFR level
 */
let cachedPlacementPool: Record<CEFRLevel, PlacementQuestion[]> | null = null;

// Helper: Extract distractor English meanings
function getMeaningDistractors(
  correctWord: VocabWord,
  allWords: VocabWord[],
  count = 3
): string[] {
  const correctMeaning = correctWord.meaning.trim().toLowerCase();
  const filtered = allWords
    .map((w) => w.meaning.trim())
    .filter((m) => m && m.toLowerCase() !== correctMeaning);
  const unique = Array.from(new Set(filtered));
  return unique.slice(0, count);
}

// Helper: Extract distractor English words
function getWordDistractors(
  correctWord: VocabWord,
  allWords: VocabWord[],
  count = 3
): string[] {
  const correctWordText = correctWord.word.trim().toLowerCase();
  const filtered = allWords
    .map((w) => w.word.trim())
    .filter((w) => w && w.toLowerCase() !== correctWordText);
  const unique = Array.from(new Set(filtered));
  return unique.slice(0, count);
}

/**
 * Validates whether a candidate question satisfies strict placement quality criteria:
 * - exactly 4 options
 * - 4 unique options case-insensitively
 * - exactly one correct answer matching one of the options
 * - non-empty prompt and valid skill
 * - reading questions have passage
 * - listening questions have audioPromptText
 */
export function isValidPlacementQuestion(q: PlacementQuestion): boolean {
  if (!q.id || !q.prompt || !q.prompt.trim()) return false;
  if (!q.correctAnswer || !q.correctAnswer.trim()) return false;
  if (!q.options || q.options.length !== 4) return false;
  if (!ORDERED_CEFR_LEVELS.includes(q.level)) return false;

  const optionTexts = q.options.map((o) => o.text.trim());
  if (optionTexts.some((t) => !t)) return false;

  // Unique options case-insensitively
  const lowerTexts = optionTexts.map((t) => t.toLowerCase());
  const uniqueTexts = new Set(lowerTexts);
  if (uniqueTexts.size !== 4) return false;

  // Correct answer must exist in options
  const hasMatch = optionTexts.some((t) => t.toLowerCase() === q.correctAnswer.trim().toLowerCase());
  if (!hasMatch) return false;

  if (q.skill === 'reading') {
    if (!q.passage || !q.passage.trim()) return false;
  }

  if (q.skill === 'listening') {
    if (!q.audioPromptText || !q.audioPromptText.trim()) return false;
  }

  return true;
}

/**
 * Builds the canonical static placement pool from existing curriculum,
 * Use of English banks, and Reading passages.
 * Zero external network calls or AI generation.
 */
export function buildPlacementPool(): Record<CEFRLevel, PlacementQuestion[]> {
  if (cachedPlacementPool) {
    return cachedPlacementPool;
  }

  const pool: Record<CEFRLevel, PlacementQuestion[]> = {
    A1: [],
    A2: [],
    B1: [],
    B2: [],
    C1: [],
    C2: [],
  };

  for (const level of ORDERED_CEFR_LEVELS) {
    const levelLessons = LESSONS.filter((l) => l.level === level);
    const levelWords: VocabWord[] = [];
    const wordToLessonMap = new Map<string, string>();

    for (const lesson of levelLessons) {
      for (const word of lesson.words) {
        levelWords.push(word);
        wordToLessonMap.set(word.id, lesson.id);
      }
    }

    const seenIds = new Set<string>();
    const seenPrompts = new Set<string>();

    const pushQuestion = (q: PlacementQuestion) => {
      const promptNorm = q.prompt.trim().toLowerCase();
      if (!seenIds.has(q.id) && !seenPrompts.has(promptNorm) && isValidPlacementQuestion(q)) {
        seenIds.add(q.id);
        seenPrompts.add(promptNorm);
        pool[level].push(q);
      }
    };

    // 1. Convert Curriculum Words into Vocabulary Questions (En -> Vi & Vi -> En)
    for (let i = 0; i < levelWords.length; i++) {
      const word = levelWords[i];
      const lessonId = wordToLessonMap.get(word.id);

      // 1A. En -> Vi meaning multiple choice
      const meaningDistractors = getMeaningDistractors(word, levelWords, 6);
      if (meaningDistractors.length >= 3) {
        const opts = [word.meaning, meaningDistractors[0], meaningDistractors[1], meaningDistractors[2]];
        pushQuestion({
          id: `pq-vocab-envi-${level.toLowerCase()}-${word.id}`,
          level,
          skill: 'vocabulary',
          prompt: `Select the most accurate Vietnamese meaning for "${word.word}":`,
          options: opts.map((text, idx) => ({ id: `opt-${idx}`, text })),
          correctAnswer: word.meaning,
          explanation: `"${word.word}" means "${word.meaning}". ${word.example ? `Example: "${word.example}"` : ''}`,
          targetItem: word.word,
          targetMeaning: word.meaning,
          suggestedLessonId: lessonId,
          sourceType: 'curriculum',
        });
      }

      // 1B. Vi -> En word selection
      const wordDistractors = getWordDistractors(word, levelWords, 6);
      if (wordDistractors.length >= 3) {
        const opts = [word.word, wordDistractors[0], wordDistractors[1], wordDistractors[2]];
        pushQuestion({
          id: `pq-vocab-vien-${level.toLowerCase()}-${word.id}`,
          level,
          skill: 'vocabulary',
          prompt: `Which English word corresponds to "${word.meaning}"?`,
          options: opts.map((text, idx) => ({ id: `opt-${idx}`, text })),
          correctAnswer: word.word,
          explanation: `"${word.word}" corresponds to "${word.meaning}".`,
          targetItem: word.word,
          targetMeaning: word.meaning,
          suggestedLessonId: lessonId,
          sourceType: 'curriculum',
        });
      }

      // 1C. Listening question (audioPromptText = word.word or sentence)
      if (meaningDistractors.length >= 3) {
        const opts = [word.meaning, meaningDistractors[0], meaningDistractors[1], meaningDistractors[2]];
        pushQuestion({
          id: `pq-listen-${level.toLowerCase()}-${word.id}`,
          level,
          skill: 'listening',
          prompt: `Listen to the audio recording #${i + 1} and choose the matching Vietnamese meaning:`,
          audioPromptText: word.word,
          options: opts.map((text, idx) => ({ id: `opt-${idx}`, text })),
          correctAnswer: word.meaning,
          explanation: `Audio: "${word.word}" (/ ${word.pronunciation || ''} /) means "${word.meaning}".`,
          targetItem: word.word,
          targetMeaning: word.meaning,
          suggestedLessonId: lessonId,
          sourceType: 'curriculum',
        });
      }
    }

    // 2. Convert Use of English Bank into Use of English Placement Questions
    const uoeList = USE_OF_ENGLISH_BANK[level] || [];
    for (const uoe of uoeList) {
      if (uoe.options && uoe.options.length === 4) {
        pushQuestion({
          id: `pq-uoe-${level.toLowerCase()}-${uoe.id}`,
          level,
          skill: 'use-of-english',
          prompt: uoe.prompt,
          options: uoe.options.map((text, idx) => ({ id: `opt-${idx}`, text })),
          correctAnswer: uoe.correctAnswer,
          explanation: uoe.explanation,
          targetItem: uoe.targetItem || uoe.correctAnswer,
          targetMeaning: uoe.targetMeaning,
          suggestedLessonId: uoe.suggestedLessonId,
          sourceType: 'use-of-english',
        });
      }
    }

    // 3. Convert Reading Passages Bank into Reading Placement Questions
    const readingItems = READING_PASSAGES_BANK[level] || [];
    for (const item of readingItems) {
      for (const q of item.questions) {
        if (q.options && q.options.length === 4) {
          pushQuestion({
            id: `pq-read-${level.toLowerCase()}-${q.id}`,
            level,
            skill: 'reading',
            prompt: q.prompt,
            passage: item.passage.passage,
            passageTitle: item.passage.title,
            options: q.options.map((text, idx) => ({ id: `opt-${idx}`, text })),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            targetItem: item.passage.title,
            suggestedLessonId: q.suggestedLessonId,
            sourceType: 'reading',
          });
        }
      }
    }
  }

  cachedPlacementPool = pool;
  return pool;
}

/**
 * Selects 6 placement questions for a given stage and level using seeded deterministic selection.
 * Target composition:
 * - 2 Vocabulary questions
 * - 2 Use of English questions
 * - 1 Reading question
 * - 1 Listening question
 * Total: 6 questions
 *
 * Ensures no duplicate IDs and no repeated normalized prompts across previous stages.
 */
export function selectPlacementQuestionsForStage(
  level: CEFRLevel,
  stageIndex: number,
  sessionSeed: number,
  excludeQuestionIds: Set<string> = new Set(),
  excludeTargetItems: Set<string> = new Set()
): PlacementQuestion[] {
  const pool = buildPlacementPool();
  const levelPool = pool[level] || [];

  // Create stage-specific seeded PRNG to ensure reproducibility
  const stageSeed = sessionSeed + stageIndex * 997 + ORDERED_CEFR_LEVELS.indexOf(level) * 31;
  const randomFn = createSeededRandom(stageSeed);

  // Group level questions by skill
  const vocabPool = seededShuffle(
    levelPool.filter(
      (q) =>
        q.skill === 'vocabulary' &&
        !excludeQuestionIds.has(q.id) &&
        (!q.targetItem || !excludeTargetItems.has(q.targetItem.toLowerCase()))
    ),
    randomFn
  );

  const uoePool = seededShuffle(
    levelPool.filter(
      (q) =>
        q.skill === 'use-of-english' &&
        !excludeQuestionIds.has(q.id) &&
        (!q.targetItem || !excludeTargetItems.has(q.targetItem.toLowerCase()))
    ),
    randomFn
  );

  const readPool = seededShuffle(
    levelPool.filter(
      (q) =>
        q.skill === 'reading' &&
        !excludeQuestionIds.has(q.id) &&
        (!q.targetItem || !excludeTargetItems.has(q.targetItem.toLowerCase()))
    ),
    randomFn
  );

  const listenPool = seededShuffle(
    levelPool.filter(
      (q) =>
        q.skill === 'listening' &&
        !excludeQuestionIds.has(q.id) &&
        (!q.targetItem || !excludeTargetItems.has(q.targetItem.toLowerCase()))
    ),
    randomFn
  );

  const selected: PlacementQuestion[] = [];
  const stageQuestionIds = new Set<string>();

  const tryAdd = (q?: PlacementQuestion): boolean => {
    if (!q || stageQuestionIds.has(q.id) || excludeQuestionIds.has(q.id)) {
      return false;
    }
    // Shuffle the options of the selected question with the stage randomizer
    const shuffledOptions = seededShuffle(q.options, randomFn);
    selected.push({
      ...q,
      options: shuffledOptions,
    });
    stageQuestionIds.add(q.id);
    return true;
  };

  // 1. Pick 2 Vocabulary items
  let vocabCount = 0;
  for (const q of vocabPool) {
    if (vocabCount >= 2) break;
    if (tryAdd(q)) vocabCount++;
  }

  // 2. Pick 2 Use of English items
  let uoeCount = 0;
  for (const q of uoePool) {
    if (uoeCount >= 2) break;
    if (tryAdd(q)) uoeCount++;
  }

  // 3. Pick 1 Reading item
  let readCount = 0;
  for (const q of readPool) {
    if (readCount >= 1) break;
    if (tryAdd(q)) readCount++;
  }

  // 4. Pick 1 Listening item
  let listenCount = 0;
  for (const q of listenPool) {
    if (listenCount >= 1) break;
    if (tryAdd(q)) listenCount++;
  }

  // Fallback: If any skill bank was thin, supplement with any unused valid question from levelPool
  if (selected.length < 6) {
    const fallbackPool = seededShuffle(
      levelPool.filter((q) => !stageQuestionIds.has(q.id) && !excludeQuestionIds.has(q.id)),
      randomFn
    );
    for (const q of fallbackPool) {
      if (selected.length >= 6) break;
      tryAdd(q);
    }
  }

  return selected.slice(0, 6);
}
