import { CEFRLevel, VocabWord } from '../../types';
import {
  ExamMode,
  ExamQuestion,
  ExamQuestionKind,
  ExamSectionType,
  ExamSession,
} from '../../types/exam';
import { LESSONS } from '../lessons';
import { LEVEL_EXAM_CONFIGS, QUICK_TEST_CONFIG, FULL_MOCK_CONFIG } from './config';
import { READING_PASSAGES_BANK } from './readingPassages';
import { USE_OF_ENGLISH_BANK } from './useOfEnglishBank';

// Helper: Shuffle array
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Extract words for a specific CEFR level from all lessons
export function getWordsForLevel(level: CEFRLevel): { word: VocabWord; lessonId: string }[] {
  const pool: { word: VocabWord; lessonId: string }[] = [];
  LESSONS.filter((l) => l.level === level).forEach((l) => {
    l.words.forEach((w) => {
      pool.push({ word: w, lessonId: l.id });
    });
  });
  return pool;
}

// Generate distractor meanings
export function getMeaningDistractors(
  correctWord: VocabWord,
  allWords: { word: VocabWord; lessonId: string }[],
  count = 3
): string[] {
  const correctMeaning = correctWord.meaning.trim().toLowerCase();
  const filtered = allWords
    .map((item) => item.word.meaning.trim())
    .filter((m) => m && m.toLowerCase() !== correctMeaning);
  const unique = Array.from(new Set(filtered));
  return shuffle(unique).slice(0, count);
}

// Generate distractor words (English)
export function getWordDistractors(
  correctWord: VocabWord,
  allWords: { word: VocabWord; lessonId: string }[],
  count = 3
): string[] {
  const correctWordText = correctWord.word.trim().toLowerCase();
  const filtered = allWords
    .map((item) => item.word.word.trim())
    .filter((w) => w && w.toLowerCase() !== correctWordText);
  const unique = Array.from(new Set(filtered));
  return shuffle(unique).slice(0, count);
}

/**
 * Filter words suitable for visual picture-choice questions:
 * Must have a valid imageUrl, not marked visualQuizEligible: false,
 * and be a concrete lexical item.
 */
export function getVisualWordsForLevel(
  levelWords: { word: VocabWord; lessonId: string }[]
): { word: VocabWord; lessonId: string }[] {
  return levelWords.filter(({ word }) => {
    if (!word.imageUrl || word.imageUrl.trim() === '') return false;
    if (word.visualQuizEligible === false) return false;
    return true;
  });
}

/**
 * Validate a candidate exam question strictly to prevent broken data and leaks
 */
export function isValidExamQuestion(q: ExamQuestion): boolean {
  if (!q.id || !q.prompt || !q.correctAnswer || !q.options || q.options.length < 2) {
    return false;
  }
  if (!q.sectionId || !q.sectionTitle || !q.sectionType || !q.kind) {
    return false;
  }

  const optionTexts = q.options.map((o) => o.text.trim());
  
  // Ensure no duplicate options (case-insensitive check)
  const lowerTexts = optionTexts.map((t) => t.toLowerCase());
  const uniqueTexts = new Set(lowerTexts);
  if (uniqueTexts.size !== optionTexts.length) {
    return false;
  }

  // Ensure correct answer exists exactly in options
  const hasCorrectOption = optionTexts.some(
    (t) => t.toLowerCase() === q.correctAnswer.trim().toLowerCase()
  );
  if (!hasCorrectOption) {
    return false;
  }

  // Active exam safety: For picture-choice questions, prompt must NOT leak the correct answer word
  if (q.kind === 'picture-choice') {
    if (!q.visualUrl) return false;
    // Word shouldn't be revealed inside the prompt
    const promptLower = q.prompt.toLowerCase();
    const answerLower = q.correctAnswer.trim().toLowerCase();
    if (answerLower.length > 2 && promptLower.includes(`"${answerLower}"`)) {
      return false;
    }
  }

  // Reading question must have passage
  if (q.kind === 'reading-comprehension' && (!q.passage || !q.passage.passage)) {
    return false;
  }

  // Listening question must have audio prompt text
  if (q.kind === 'listening-comprehension' && !q.audioPromptText) {
    return false;
  }

  return true;
}

/**
 * Generates an ExamSession for the requested mode and level
 */
export function generateExamSession(mode: ExamMode, level: CEFRLevel): ExamSession {
  const now = Date.now();
  const sessionId = `exam-${mode}-${level.toLowerCase()}-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const levelWords = getWordsForLevel(level);

  let durationMinutes = 20;
  let title = `${level} Practice Exam`;
  let questions: ExamQuestion[] = [];

  if (mode === 'quick') {
    durationMinutes = QUICK_TEST_CONFIG.durationMinutes;
    title = `${level} — ${QUICK_TEST_CONFIG.title}`;
    questions = generateQuickTestQuestions(level, levelWords);
  } else if (mode === 'level') {
    const config = LEVEL_EXAM_CONFIGS[level];
    durationMinutes = config.durationMinutes;
    title = config.title;
    questions = generateLevelExamQuestions(level, levelWords);
  } else if (mode === 'mock') {
    durationMinutes = FULL_MOCK_CONFIG.durationMinutes;
    title = `${level} — ${FULL_MOCK_CONFIG.title}`;
    questions = generateFullMockQuestions(level, levelWords);
  }

  // Filter valid and deduplicate
  const seenIds = new Set<string>();
  const validQuestions: ExamQuestion[] = [];
  for (const q of questions) {
    if (isValidExamQuestion(q) && !seenIds.has(q.id)) {
      seenIds.add(q.id);
      validQuestions.push(q);
    }
  }

  const endsAt = now + durationMinutes * 60 * 1000;

  return {
    id: sessionId,
    schemaVersion: 2,
    mode,
    level,
    title,
    durationMinutes,
    startedAt: now,
    endsAt,
    status: 'active',
    questions: validQuestions,
    answers: {},
    flaggedQuestionIds: [],
    currentQuestionIndex: 0,
  };
}

/**
 * Mode 1: Quick Test (Exact 15 questions, 10 min)
 */
function generateQuickTestQuestions(
  level: CEFRLevel,
  levelWords: { word: VocabWord; lessonId: string }[]
): ExamQuestion[] {
  const questions: ExamQuestion[] = [];
  const shuffledWords = shuffle(levelWords);
  let wordIdx = 0;

  // 1. Vocabulary & Meaning (6 questions)
  for (let i = 0; i < 6 && wordIdx < shuffledWords.length; i++) {
    const { word, lessonId } = shuffledWords[wordIdx++];
    const isEnToVi = i % 2 === 0;

    if (isEnToVi) {
      const distractors = getMeaningDistractors(word, levelWords, 3);
      if (distractors.length === 3) {
        const options = shuffle([word.meaning, ...distractors]).map((text, idx) => ({
          id: `opt-${idx}`,
          text,
        }));
        questions.push({
          id: `qt-vocab-${word.id}-${i}`,
          sectionId: 'sec-qt-vocab',
          sectionTitle: 'Vocabulary & Meaning',
          sectionType: 'vocabulary',
          kind: 'multiple-choice',
          prompt: `Select the correct Vietnamese meaning of "${word.word}":`,
          options,
          correctAnswer: word.meaning,
          explanation: `"${word.word}" means "${word.meaning}". ${word.example ? `Example: "${word.example}"` : ''}`,
          targetItem: word.word,
          targetMeaning: word.meaning,
          targetExample: word.example,
          tags: ['vocabulary', word.partOfSpeech || 'word'],
          suggestedLessonId: lessonId,
        });
      }
    } else {
      const distractors = getWordDistractors(word, levelWords, 3);
      if (distractors.length === 3) {
        const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
          id: `opt-${idx}`,
          text,
        }));
        questions.push({
          id: `qt-vocab-rev-${word.id}-${i}`,
          sectionId: 'sec-qt-vocab',
          sectionTitle: 'Vocabulary & Meaning',
          sectionType: 'vocabulary',
          kind: 'multiple-choice',
          prompt: `Which English word corresponds to: "${word.meaning}"?`,
          options,
          correctAnswer: word.word,
          explanation: `"${word.word}" means "${word.meaning}".`,
          targetItem: word.word,
          targetMeaning: word.meaning,
          targetExample: word.example,
          tags: ['vocabulary', word.partOfSpeech || 'word'],
          suggestedLessonId: lessonId,
        });
      }
    }
  }

  // 2. Use of English / Cloze / Context (5 questions)
  const uoeBank = USE_OF_ENGLISH_BANK[level] || [];
  const shuffledUoe = shuffle(uoeBank);
  let uoeCount = 0;
  for (let i = 0; i < shuffledUoe.length && uoeCount < 5; i++) {
    const item = shuffledUoe[i];
    questions.push({
      id: `qt-uoe-${item.id}-${i}`,
      sectionId: 'sec-qt-uoe',
      sectionTitle: 'Use of English & Context',
      sectionType: item.sectionType,
      kind: item.kind,
      prompt: item.prompt,
      options: item.options.map((text, idx) => ({ id: `opt-${idx}`, text })),
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      targetItem: item.targetItem,
      tags: item.tags,
      suggestedLessonId: item.suggestedLessonId,
    });
    uoeCount++;
  }

  // If UoE bank had fewer than 5, supplement with sentence cloze
  while (uoeCount < 5 && wordIdx < shuffledWords.length) {
    const { word, lessonId } = shuffledWords[wordIdx++];
    if (word.example && word.example.includes(word.word)) {
      const regex = new RegExp(`\\b${word.word}\\b`, 'i');
      const sentencePrompt = word.example.replace(regex, '_____');
      const distractors = getWordDistractors(word, levelWords, 3);
      if (distractors.length === 3) {
        const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
          id: `opt-${idx}`,
          text,
        }));
        questions.push({
          id: `qt-cloze-${word.id}-${uoeCount}`,
          sectionId: 'sec-qt-uoe',
          sectionTitle: 'Use of English & Context',
          sectionType: 'fill-in-blank',
          kind: 'fill-blank',
          prompt: `Choose the correct word to complete the sentence:\n"${sentencePrompt}"`,
          options,
          correctAnswer: word.word,
          explanation: `Completed sentence: "${word.example}" (${word.meaning}).`,
          targetItem: word.word,
          targetMeaning: word.meaning,
          targetExample: word.example,
          tags: ['sentence-context', 'fill-blank'],
          suggestedLessonId: lessonId,
        });
        uoeCount++;
      }
    }
  }

  // 3. Listening Recognition (4 questions)
  let listenCount = 0;
  while (listenCount < 4 && wordIdx < shuffledWords.length) {
    const { word, lessonId } = shuffledWords[wordIdx++];
    const distractors = getMeaningDistractors(word, levelWords, 3);
    if (distractors.length === 3) {
      const options = shuffle([word.meaning, ...distractors]).map((text, idx) => ({
        id: `opt-${idx}`,
        text,
      }));
      questions.push({
        id: `qt-listen-${word.id}-${listenCount}`,
        sectionId: 'sec-qt-listening',
        sectionTitle: 'Listening Recognition',
        sectionType: 'listening',
        kind: 'listening-comprehension',
        prompt: 'Listen to the audio recording and select the matching Vietnamese meaning:',
        audioPromptText: word.word,
        options,
        correctAnswer: word.meaning,
        explanation: `Audio: "${word.word}" (/ ${word.pronunciation || ''} /) — meaning: "${word.meaning}".`,
        targetItem: word.word,
        targetMeaning: word.meaning,
        targetExample: word.example,
        tags: ['listening', 'comprehension'],
        suggestedLessonId: lessonId,
      });
      listenCount++;
    }
  }

  // Return exactly target count (15)
  return questions.slice(0, QUICK_TEST_CONFIG.totalQuestions);
}

/**
 * Mode 2: Structured Level Exam
 * A1: 20q, A2: 25q, B1: 30q, B2: 35q, C1: 40q, C2: 40q
 */
function generateLevelExamQuestions(
  level: CEFRLevel,
  levelWords: { word: VocabWord; lessonId: string }[]
): ExamQuestion[] {
  const config = LEVEL_EXAM_CONFIGS[level];
  const questions: ExamQuestion[] = [];
  const shuffledWords = shuffle(levelWords);
  let wordIdx = 0;
  const getNextWord = () => {
    const item = shuffledWords[wordIdx % shuffledWords.length];
    wordIdx++;
    return item;
  };

  for (const section of config.sections) {
    const countNeeded = section.questionCount;
    const sectionQuestions: ExamQuestion[] = [];

    switch (section.type) {
      case 'visual-vocabulary': {
        // Picture / visual-choice questions (A1/A2)
        const visualWords = getVisualWordsForLevel(shuffledWords);
        for (let i = 0; i < visualWords.length && sectionQuestions.length < countNeeded; i++) {
          const { word, lessonId } = visualWords[i];
          const distractors = getWordDistractors(word, levelWords, 3);
          if (distractors.length === 3) {
            const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
              id: `opt-${idx}`,
              text,
            }));

            sectionQuestions.push({
              id: `lvl-${section.id}-${word.id}-${i}`,
              sectionId: section.id,
              sectionTitle: section.title,
              sectionType: section.type,
              kind: 'picture-choice',
              prompt: 'Which English word best matches this picture?',
              visualUrl: word.imageUrl,
              visualType: 'photo',
              options,
              correctAnswer: word.word,
              explanation: `"${word.word}" (${word.meaning}) is the correct English word for the item shown in the image.`,
              targetItem: word.word,
              targetMeaning: word.meaning,
              targetExample: word.example,
              tags: ['visual-vocabulary', 'picture-choice', word.partOfSpeech || 'noun'],
              suggestedLessonId: lessonId,
            });
          }
        }

        // Fallback if not enough visual words: generate standard vocabulary meaning
        while (sectionQuestions.length < countNeeded) {
          const { word, lessonId } = getNextWord();
          const distractors = getWordDistractors(word, levelWords, 3);
          if (distractors.length === 3) {
            const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
              id: `opt-${idx}`,
              text,
            }));
            sectionQuestions.push({
              id: `lvl-${section.id}-fallback-${word.id}-${sectionQuestions.length}`,
              sectionId: section.id,
              sectionTitle: section.title,
              sectionType: section.type,
              kind: 'multiple-choice',
              prompt: `Select the English word matching the definition: "${word.meaning}"`,
              options,
              correctAnswer: word.word,
              explanation: `"${word.word}" means "${word.meaning}".`,
              targetItem: word.word,
              targetMeaning: word.meaning,
              tags: ['vocabulary', 'meaning'],
              suggestedLessonId: lessonId,
            });
          }
        }
        break;
      }

      case 'word-meaning':
      case 'vocabulary':
      case 'core-vocabulary':
      case 'intermediate-vocabulary': {
        let attempts = 0;
        while (sectionQuestions.length < countNeeded && attempts < 200) {
          attempts++;
          const { word, lessonId } = getNextWord();
          const isEnToVi = sectionQuestions.length % 2 === 0;

          if (isEnToVi) {
            const distractors = getMeaningDistractors(word, levelWords, 3);
            if (distractors.length === 3) {
              const options = shuffle([word.meaning, ...distractors]).map((text, idx) => ({
                id: `opt-${idx}`,
                text,
              }));
              sectionQuestions.push({
                id: `lvl-${section.id}-${word.id}-${sectionQuestions.length}`,
                sectionId: section.id,
                sectionTitle: section.title,
                sectionType: section.type,
                kind: 'multiple-choice',
                prompt: `What is the accurate Vietnamese meaning of the English word "${word.word}"?`,
                options,
                correctAnswer: word.meaning,
                explanation: `"${word.word}" means "${word.meaning}". ${word.example ? `Example: "${word.example}"` : ''}`,
                targetItem: word.word,
                targetMeaning: word.meaning,
                tags: ['vocabulary', word.partOfSpeech || 'word'],
                suggestedLessonId: lessonId,
              });
            }
          } else {
            const distractors = getWordDistractors(word, levelWords, 3);
            if (distractors.length === 3) {
              const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
                id: `opt-${idx}`,
                text,
              }));
              sectionQuestions.push({
                id: `lvl-${section.id}-rev-${word.id}-${sectionQuestions.length}`,
                sectionId: section.id,
                sectionTitle: section.title,
                sectionType: section.type,
                kind: 'multiple-choice',
                prompt: `Select the English word matching the definition: "${word.meaning}"`,
                options,
                correctAnswer: word.word,
                explanation: `"${word.word}" corresponds to "${word.meaning}".`,
                targetItem: word.word,
                targetMeaning: word.meaning,
                tags: ['vocabulary', word.partOfSpeech || 'word'],
                suggestedLessonId: lessonId,
              });
            }
          }
        }
        break;
      }

      case 'listening': {
        let attempts = 0;
        while (sectionQuestions.length < countNeeded && attempts < 200) {
          attempts++;
          const { word, lessonId } = getNextWord();
          const isHearMeaning = sectionQuestions.length % 2 === 1;

          if (isHearMeaning) {
            const distractors = getMeaningDistractors(word, levelWords, 3);
            if (distractors.length === 3) {
              const options = shuffle([word.meaning, ...distractors]).map((text, idx) => ({
                id: `opt-${idx}`,
                text,
              }));
              sectionQuestions.push({
                id: `lvl-${section.id}-${word.id}-${sectionQuestions.length}`,
                sectionId: section.id,
                sectionTitle: section.title,
                sectionType: section.type,
                kind: 'listening-comprehension',
                prompt: 'Listen carefully to the audio and choose the correct meaning:',
                audioPromptText: word.word,
                options,
                correctAnswer: word.meaning,
                explanation: `Audio: "${word.word}" (/ ${word.pronunciation || ''} /) — meaning: "${word.meaning}".`,
                targetItem: word.word,
                targetMeaning: word.meaning,
                tags: ['listening', 'recognition'],
                suggestedLessonId: lessonId,
              });
            }
          } else {
            const distractors = getWordDistractors(word, levelWords, 3);
            if (distractors.length === 3) {
              const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
                id: `opt-${idx}`,
                text,
              }));
              sectionQuestions.push({
                id: `lvl-${section.id}-spk-${word.id}-${sectionQuestions.length}`,
                sectionId: section.id,
                sectionTitle: section.title,
                sectionType: section.type,
                kind: 'listening-comprehension',
                prompt: 'Listen to the spoken audio and identify the spoken English word:',
                audioPromptText: word.word,
                options,
                correctAnswer: word.word,
                explanation: `Spoken word is "${word.word}" (/ ${word.pronunciation || ''} /).`,
                targetItem: word.word,
                targetMeaning: word.meaning,
                tags: ['listening', 'pronunciation'],
                suggestedLessonId: lessonId,
              });
            }
          }
        }
        break;
      }

      case 'basic-context':
      case 'everyday-english':
      case 'fill-in-blank':
      case 'context-vocabulary': {
        const uoeItems = USE_OF_ENGLISH_BANK[level]?.filter((u) => u.sectionType === section.type) || [];
        for (const item of shuffle(uoeItems)) {
          if (sectionQuestions.length >= countNeeded) break;
          sectionQuestions.push({
            id: `lvl-${section.id}-${item.id}`,
            sectionId: section.id,
            sectionTitle: section.title,
            sectionType: section.type,
            kind: item.kind,
            prompt: item.prompt,
            options: item.options.map((t, idx) => ({ id: `opt-${idx}`, text: t })),
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
            targetItem: item.targetItem,
            tags: item.tags,
            suggestedLessonId: item.suggestedLessonId,
          });
        }

        // Fill remaining with example sentence clozes or context questions from words
        let attempts = 0;
        while (sectionQuestions.length < countNeeded && attempts < 200) {
          attempts++;
          const { word, lessonId } = getNextWord();
          if (word.example && word.example.toLowerCase().includes(word.word.toLowerCase())) {
            const regex = new RegExp(word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const sentencePrompt = word.example.replace(regex, '_____');
            const distractors = getWordDistractors(word, levelWords, 3);
            if (distractors.length === 3) {
              const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
                id: `opt-${idx}`,
                text,
              }));
              sectionQuestions.push({
                id: `lvl-${section.id}-cloze-${word.id}-${sectionQuestions.length}`,
                sectionId: section.id,
                sectionTitle: section.title,
                sectionType: section.type,
                kind: 'fill-blank',
                prompt: `Choose the correct word to complete the sentence:\n"${sentencePrompt}"`,
                options,
                correctAnswer: word.word,
                explanation: `Completed sentence: "${word.example}" (${word.meaning}).`,
                targetItem: word.word,
                targetMeaning: word.meaning,
                targetExample: word.example,
                tags: ['sentence-context', 'fill-blank'],
                suggestedLessonId: lessonId,
              });
            }
          } else {
            // General vocabulary context question fallback
            const distractors = getWordDistractors(word, levelWords, 3);
            if (distractors.length === 3) {
              const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
                id: `opt-${idx}`,
                text,
              }));
              sectionQuestions.push({
                id: `lvl-${section.id}-ctx-${word.id}-${sectionQuestions.length}`,
                sectionId: section.id,
                sectionTitle: section.title,
                sectionType: section.type,
                kind: 'multiple-choice',
                prompt: `Which word correctly matches the meaning: "${word.meaning}"?`,
                options,
                correctAnswer: word.word,
                explanation: `"${word.word}" corresponds to "${word.meaning}".`,
                targetItem: word.word,
                targetMeaning: word.meaning,
                tags: ['vocabulary', 'context'],
                suggestedLessonId: lessonId,
              });
            }
          }
        }
        break;
      }

      case 'use-of-english':
      case 'collocations':
      case 'collocations-phrasal':
      case 'word-formation':
      case 'precision-nuance':
      case 'register-usage':
      case 'advanced-use-of-english': {
        const uoeBank = USE_OF_ENGLISH_BANK[level] || [];
        // Strict filter: match exact sectionType first
        const exactMatches = uoeBank.filter((u) => u.sectionType === section.type);
        // Fallback matches: compatible Use of English items from same level
        const compatibleMatches = uoeBank.filter((u) => u.sectionType !== section.type);

        const candidateUoe = [...shuffle(exactMatches), ...shuffle(compatibleMatches)];

        for (const item of candidateUoe) {
          if (sectionQuestions.length >= countNeeded) break;
          // Avoid duplicate item in same section
          if (sectionQuestions.some((sq) => sq.id.includes(item.id))) continue;

          sectionQuestions.push({
            id: `lvl-${section.id}-${item.id}-${sectionQuestions.length}`,
            sectionId: section.id,
            sectionTitle: section.title,
            sectionType: section.type,
            kind: item.kind,
            prompt: item.prompt,
            options: item.options.map((t, idx) => ({ id: `opt-${idx}`, text: t })),
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
            targetItem: item.targetItem,
            tags: item.tags,
            suggestedLessonId: item.suggestedLessonId,
          });
        }

        // Fill remaining with vocabulary nuance if needed
        let attempts = 0;
        while (sectionQuestions.length < countNeeded && attempts < 200) {
          attempts++;
          const { word, lessonId } = getNextWord();
          const distractors = getWordDistractors(word, levelWords, 3);
          if (distractors.length === 3) {
            const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
              id: `opt-${idx}`,
              text,
            }));
            sectionQuestions.push({
              id: `lvl-${section.id}-uoe-${word.id}-${sectionQuestions.length}`,
              sectionId: section.id,
              sectionTitle: section.title,
              sectionType: section.type,
              kind: 'multiple-choice',
              prompt: `Select the word that accurately expresses "${word.meaning}":`,
              options,
              correctAnswer: word.word,
              explanation: `"${word.word}" means "${word.meaning}". ${word.example ? `Example: "${word.example}"` : ''}`,
              targetItem: word.word,
              targetMeaning: word.meaning,
              tags: ['use-of-english', 'collocation'],
              suggestedLessonId: lessonId,
            });
          }
        }
        break;
      }

      case 'reading': {
        const readingItems = READING_PASSAGES_BANK[level] || [];
        for (const readingItem of readingItems) {
          for (const q of readingItem.questions) {
            if (sectionQuestions.length >= countNeeded) break;
            sectionQuestions.push({
              id: `lvl-${section.id}-${q.id}-${sectionQuestions.length}`,
              sectionId: section.id,
              sectionTitle: section.title,
              sectionType: 'reading',
              kind: 'reading-comprehension',
              prompt: q.prompt,
              passage: readingItem.passage,
              options: q.options.map((t, idx) => ({ id: `opt-${idx}`, text: t })),
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              tags: q.tags,
              suggestedLessonId: q.suggestedLessonId,
            });
          }
          if (sectionQuestions.length >= countNeeded) break;
        }

        // Fallback for reading if passages are fewer than questions needed
        while (sectionQuestions.length < countNeeded) {
          const { word, lessonId } = getNextWord();
          const distractors = getWordDistractors(word, levelWords, 3);
          if (distractors.length === 3) {
            const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
              id: `opt-${idx}`,
              text,
            }));
            sectionQuestions.push({
              id: `lvl-${section.id}-read-fallback-${word.id}-${sectionQuestions.length}`,
              sectionId: section.id,
              sectionTitle: section.title,
              sectionType: 'reading',
              kind: 'multiple-choice',
              prompt: `In contextual reading comprehension, which term corresponds to: "${word.meaning}"?`,
              options,
              correctAnswer: word.word,
              explanation: `"${word.word}" means "${word.meaning}". ${word.example ? `Example: "${word.example}"` : ''}`,
              targetItem: word.word,
              targetMeaning: word.meaning,
              tags: ['reading', 'contextual-vocabulary'],
              suggestedLessonId: lessonId,
            });
          }
        }
        break;
      }
    }

    questions.push(...sectionQuestions.slice(0, countNeeded));
  }

  return questions;
}

/**
 * Mode 3: Deterministic Full Mock Exam (EXACTLY 50 questions, 45 min)
 */
function generateFullMockQuestions(
  level: CEFRLevel,
  levelWords: { word: VocabWord; lessonId: string }[]
): ExamQuestion[] {
  const TARGET_COUNT = FULL_MOCK_CONFIG.totalQuestions; // 50
  const questions: ExamQuestion[] = [];
  const usedIds = new Set<string>();
  const usedSignatures = new Set<string>();

  const addQuestion = (q: ExamQuestion): boolean => {
    if (questions.length >= TARGET_COUNT) return false;
    const signature = `${q.kind}:::${q.prompt.trim().toLowerCase()}`;
    if (usedIds.has(q.id) || usedSignatures.has(signature)) return false;
    if (!isValidExamQuestion(q)) return false;

    usedIds.add(q.id);
    usedSignatures.add(signature);
    questions.push(q);
    return true;
  };

  // 1. Generate base Level Exam questions first
  const baseQuestions = generateLevelExamQuestions(level, levelWords);
  for (const q of baseQuestions) {
    addQuestion(q);
  }

  // 2. Add all unused reading passage questions for this level
  const readingItems = READING_PASSAGES_BANK[level] || [];
  for (const item of readingItems) {
    for (const q of item.questions) {
      if (questions.length >= TARGET_COUNT) break;
      const formattedQ: ExamQuestion = {
        id: `mock-reading-${q.id}`,
        sectionId: 'sec-mock-reading',
        sectionTitle: 'Extended Reading Comprehension',
        sectionType: 'reading',
        kind: 'reading-comprehension',
        prompt: q.prompt,
        passage: item.passage,
        options: q.options.map((t, idx) => ({ id: `opt-${idx}`, text: t })),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        tags: q.tags,
        suggestedLessonId: q.suggestedLessonId,
      };
      addQuestion(formattedQ);
    }
  }

  // 3. Add all unused Use of English bank items
  const uoeBank = USE_OF_ENGLISH_BANK[level] || [];
  for (const item of shuffle(uoeBank)) {
    if (questions.length >= TARGET_COUNT) break;
    const formattedQ: ExamQuestion = {
      id: `mock-uoe-${item.id}`,
      sectionId: 'sec-mock-uoe',
      sectionTitle: 'Extended Use of English',
      sectionType: item.sectionType,
      kind: item.kind,
      prompt: item.prompt,
      options: item.options.map((t, idx) => ({ id: `opt-${idx}`, text: t })),
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      targetItem: item.targetItem,
      tags: item.tags,
      suggestedLessonId: item.suggestedLessonId,
    };
    addQuestion(formattedQ);
  }

  // 4. Generate visual picture-choice questions for eligible words
  const visualWords = getVisualWordsForLevel(levelWords);
  for (let i = 0; i < visualWords.length && questions.length < TARGET_COUNT; i++) {
    const { word, lessonId } = visualWords[i];
    const distractors = getWordDistractors(word, levelWords, 3);
    if (distractors.length === 3) {
      const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
        id: `opt-${idx}`,
        text,
      }));
      const formattedQ: ExamQuestion = {
        id: `mock-visual-${word.id}-${i}`,
        sectionId: 'sec-mock-visual',
        sectionTitle: 'Visual Vocabulary Identification',
        sectionType: 'visual-vocabulary',
        kind: 'picture-choice',
        prompt: 'Which English word best matches this picture?',
        visualUrl: word.imageUrl,
        visualType: 'photo',
        options,
        correctAnswer: word.word,
        explanation: `"${word.word}" (${word.meaning}) matches the visual image.`,
        targetItem: word.word,
        targetMeaning: word.meaning,
        targetExample: word.example,
        tags: ['visual-vocabulary', 'picture-choice'],
        suggestedLessonId: lessonId,
      };
      addQuestion(formattedQ);
    }
  }

  // 5. Fill remaining slots with sentence cloze questions
  const shuffledWords = shuffle(levelWords);
  for (let i = 0; i < shuffledWords.length && questions.length < TARGET_COUNT; i++) {
    const { word, lessonId } = shuffledWords[i];
    if (word.example && word.example.includes(word.word)) {
      const regex = new RegExp(`\\b${word.word}\\b`, 'i');
      const sentencePrompt = word.example.replace(regex, '_____');
      const distractors = getWordDistractors(word, levelWords, 3);
      if (distractors.length === 3) {
        const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
          id: `opt-${idx}`,
          text,
        }));
        const formattedQ: ExamQuestion = {
          id: `mock-cloze-${word.id}-${i}`,
          sectionId: 'sec-mock-cloze',
          sectionTitle: 'Sentence Cloze & Context',
          sectionType: 'fill-in-blank',
          kind: 'fill-blank',
          prompt: `Choose the correct word to complete the sentence:\n"${sentencePrompt}"`,
          options,
          correctAnswer: word.word,
          explanation: `Completed sentence: "${word.example}" (${word.meaning}).`,
          targetItem: word.word,
          targetMeaning: word.meaning,
          targetExample: word.example,
          tags: ['sentence-context', 'fill-blank'],
          suggestedLessonId: lessonId,
        };
        addQuestion(formattedQ);
      }
    }
  }

  // 6. Fill remaining slots with listening comprehension questions
  for (let i = 0; i < shuffledWords.length && questions.length < TARGET_COUNT; i++) {
    const { word, lessonId } = shuffledWords[i];
    const distractors = getMeaningDistractors(word, levelWords, 3);
    if (distractors.length === 3) {
      const options = shuffle([word.meaning, ...distractors]).map((text, idx) => ({
        id: `opt-${idx}`,
        text,
      }));
      const formattedQ: ExamQuestion = {
        id: `mock-listen-${word.id}-${i}`,
        sectionId: 'sec-mock-listening',
        sectionTitle: 'Extended Listening Comprehension',
        sectionType: 'listening',
        kind: 'listening-comprehension',
        prompt: 'Listen to the audio recording and select the matching Vietnamese meaning:',
        audioPromptText: word.word,
        options,
        correctAnswer: word.meaning,
        explanation: `Audio: "${word.word}" (/ ${word.pronunciation || ''} /) — meaning: "${word.meaning}".`,
        targetItem: word.word,
        targetMeaning: word.meaning,
        tags: ['listening', 'comprehension'],
        suggestedLessonId: lessonId,
      };
      addQuestion(formattedQ);
    }
  }

  // 7. Fill any remaining with reverse vocabulary meaning questions
  for (let i = 0; i < shuffledWords.length && questions.length < TARGET_COUNT; i++) {
    const { word, lessonId } = shuffledWords[i];
    const distractors = getWordDistractors(word, levelWords, 3);
    if (distractors.length === 3) {
      const options = shuffle([word.word, ...distractors]).map((text, idx) => ({
        id: `opt-${idx}`,
        text,
      }));
      const formattedQ: ExamQuestion = {
        id: `mock-rev-vocab-${word.id}-${i}`,
        sectionId: 'sec-mock-vocab',
        sectionTitle: 'Applied Vocabulary Selection',
        sectionType: 'vocabulary',
        kind: 'multiple-choice',
        prompt: `Select the English word matching the definition: "${word.meaning}"`,
        options,
        correctAnswer: word.word,
        explanation: `"${word.word}" corresponds to "${word.meaning}".`,
        targetItem: word.word,
        targetMeaning: word.meaning,
        tags: ['vocabulary', 'meaning'],
        suggestedLessonId: lessonId,
      };
      addQuestion(formattedQ);
    }
  }

  return questions.slice(0, TARGET_COUNT);
}
