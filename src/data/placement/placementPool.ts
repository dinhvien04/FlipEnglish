import { CEFRLevel, VocabWord } from '../../types';
import { LESSONS } from '../lessons';
import { USE_OF_ENGLISH_BANK } from '../exams/useOfEnglishBank';
import { READING_PASSAGES_BANK } from '../exams/readingPassages';
import {
  PlacementQuestion,
  ORDERED_CEFR_LEVELS,
  PLACEMENT_STAGE_SIZE,
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
 * Normalizes text for comparison: trim, lowercase, collapse whitespace, strip punctuation.
 */
export function normalizeText(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Word with lesson metadata for intelligent distractor scoring
 */
export interface ScoredVocabWord {
  word: VocabWord;
  lessonId: string;
  lessonCategory?: string;
  lessonTags?: string[];
}

/**
 * Deterministic Distractor Scoring:
 * Computes a similarity/suitability score between candidate and target word:
 * +5 same part of speech
 * +4 same lesson category
 * +3 shared tags
 * +2 same learning item type
 * +1 same register
 */
export function scoreDistractorCandidate(target: ScoredVocabWord, candidate: ScoredVocabWord): number {
  let score = 0;

  // 1. Same Part of Speech (+5)
  if (
    target.word.partOfSpeech &&
    candidate.word.partOfSpeech &&
    target.word.partOfSpeech === candidate.word.partOfSpeech
  ) {
    score += 5;
  }

  // 2. Same Lesson Category (+4)
  if (
    target.lessonCategory &&
    candidate.lessonCategory &&
    target.lessonCategory.toLowerCase() === candidate.lessonCategory.toLowerCase()
  ) {
    score += 4;
  }

  // 3. Shared Tags (+3)
  const targetTags = new Set((target.word.tags || target.lessonTags || []).map((t) => t.toLowerCase()));
  const candidateTags = (candidate.word.tags || candidate.lessonTags || []).map((t) => t.toLowerCase());
  const sharedTagCount = candidateTags.filter((t) => targetTags.has(t)).length;
  if (sharedTagCount > 0) {
    score += Math.min(sharedTagCount * 3, 6);
  }

  // 4. Same learning item type (+2)
  if (target.word.type && candidate.word.type && target.word.type === candidate.word.type) {
    score += 2;
  }

  // 5. Same Register (+1)
  if (target.word.register && candidate.word.register && target.word.register === candidate.word.register) {
    score += 1;
  }

  return score;
}

/**
 * Deterministic Meaning Distractors:
 * Selects candidate Vietnamese meanings ranked by structural relevance,
 * filtered to reject duplicates, case-only duplicates, and whitespace/punctuation variations.
 */
export function getIntelligentMeaningDistractors(
  target: ScoredVocabWord,
  allScoredWords: ScoredVocabWord[],
  count = 3
): string[] {
  const normTargetMeaning = normalizeText(target.word.meaning);

  // Filter out exact/normalized matches and duplicates
  const candidateList = allScoredWords.filter((candidate) => {
    if (candidate.word.id === target.word.id) return false;
    const normCandMeaning = normalizeText(candidate.word.meaning);
    if (!normCandMeaning || normCandMeaning === normTargetMeaning) return false;
    return true;
  });

  // Score each candidate
  const scored = candidateList.map((cand) => ({
    meaning: cand.word.meaning.trim(),
    normMeaning: normalizeText(cand.word.meaning),
    score: scoreDistractorCandidate(target, cand),
    id: cand.word.id,
  }));

  // Sort deterministically by: score descending, then stable canonical id
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });

  // Pick unique normalized meanings
  const result: string[] = [];
  const seenNorm = new Set<string>([normTargetMeaning]);

  for (const item of scored) {
    if (!seenNorm.has(item.normMeaning)) {
      seenNorm.add(item.normMeaning);
      result.push(item.meaning);
      if (result.length >= count) break;
    }
  }

  return result;
}

/**
 * Deterministic English Word Distractors:
 * Selects candidate English words ranked by structural relevance,
 * filtered to reject duplicates, case-only duplicates, and whitespace/punctuation variations.
 */
function getIntelligentWordDistractors(
  target: ScoredVocabWord,
  allScoredWords: ScoredVocabWord[],
  count = 3
): string[] {
  const normTargetWord = normalizeText(target.word.word);

  // Filter out exact/normalized matches
  const candidateList = allScoredWords.filter((candidate) => {
    if (candidate.word.id === target.word.id) return false;
    const normCandWord = normalizeText(candidate.word.word);
    if (!normCandWord || normCandWord === normTargetWord) return false;
    return true;
  });

  // Score each candidate
  const scored = candidateList.map((cand) => ({
    wordText: cand.word.word.trim(),
    normWord: normalizeText(cand.word.word),
    score: scoreDistractorCandidate(target, cand),
    id: cand.word.id,
  }));

  // Sort deterministically by: score descending, then stable canonical id
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });

  // Pick unique normalized words
  const result: string[] = [];
  const seenNorm = new Set<string>([normTargetWord]);

  for (const item of scored) {
    if (!seenNorm.has(item.normWord)) {
      seenNorm.add(item.normWord);
      result.push(item.wordText);
      if (result.length >= count) break;
    }
  }

  return result;
}

/**
 * Internal Cache for Placement Question Pool by CEFR level
 */
let cachedPlacementPool: Record<CEFRLevel, PlacementQuestion[]> | null = null;

/**
 * Validates whether a candidate question satisfies strict placement quality criteria:
 * - exactly 4 options
 * - 4 unique options case-insensitively & normalized
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

  // Unique options case-insensitively and whitespace/punctuation normalized
  const normTexts = optionTexts.map(normalizeText);
  const uniqueNorm = new Set(normTexts);
  if (uniqueNorm.size !== 4) return false;

  // Correct answer must exist in options
  const normCorrect = normalizeText(q.correctAnswer);
  const hasMatch = optionTexts.some((t) => normalizeText(t) === normCorrect);
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
    const scoredWords: ScoredVocabWord[] = [];

    for (const lesson of levelLessons) {
      for (const word of lesson.words) {
        scoredWords.push({
          word,
          lessonId: lesson.id,
          lessonCategory: lesson.category,
          lessonTags: lesson.tags,
        });
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
    for (let i = 0; i < scoredWords.length; i++) {
      const item = scoredWords[i];
      const word = item.word;
      const lessonId = item.lessonId;

      // 1A. En -> Vi meaning multiple choice with intelligent distractors
      const meaningDistractors = getIntelligentMeaningDistractors(item, scoredWords, 3);
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

      // 1B. Vi -> En word selection with intelligent distractors
      const wordDistractors = getIntelligentWordDistractors(item, scoredWords, 3);
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
          prompt: `Listen to the audio recording and choose the matching Vietnamese meaning:`,
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
    for (const rItem of readingItems) {
      for (const q of rItem.questions) {
        if (q.options && q.options.length === 4) {
          pushQuestion({
            id: `pq-read-${level.toLowerCase()}-${q.id}`,
            level,
            skill: 'reading',
            prompt: q.prompt,
            passage: rItem.passage.passage,
            passageTitle: rItem.passage.title,
            options: q.options.map((text, idx) => ({ id: `opt-${idx}`, text })),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            targetItem: rItem.passage.title,
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
 * Selects exactly 6 placement questions for a given stage and level using seeded deterministic selection.
 * Target composition:
 * - 2 Vocabulary questions
 * - 2 Use of English questions
 * - 1 Reading question
 * - 1 Listening question
 * Total: exactly 6 questions
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
  if (selected.length < PLACEMENT_STAGE_SIZE) {
    const fallbackPool = seededShuffle(
      levelPool.filter((q) => !stageQuestionIds.has(q.id) && !excludeQuestionIds.has(q.id)),
      randomFn
    );
    for (const q of fallbackPool) {
      if (selected.length >= PLACEMENT_STAGE_SIZE) break;
      tryAdd(q);
    }
  }

  return selected.slice(0, PLACEMENT_STAGE_SIZE);
}

