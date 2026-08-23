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

// Helper: Shuffle array deterministically or with Math.random
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Extract words for a specific CEFR level from all lessons
function getWordsForLevel(level: CEFRLevel): { word: VocabWord; lessonId: string }[] {
  const pool: { word: VocabWord; lessonId: string }[] = [];
  LESSONS.filter((l) => l.level === level).forEach((l) => {
    l.words.forEach((w) => {
      pool.push({ word: w, lessonId: l.id });
    });
  });
  return pool;
}

// Generate distractor meanings or words
function getMeaningDistractors(
  correctWord: VocabWord,
  allWords: { word: VocabWord; lessonId: string }[],
  count = 3
): string[] {
  const filtered = allWords
    .map((item) => item.word.meaning.trim())
    .filter((m) => m && m !== correctWord.meaning.trim());
  const unique = Array.from(new Set(filtered));
  return shuffle(unique).slice(0, count);
}

function getWordDistractors(
  correctWord: VocabWord,
  allWords: { word: VocabWord; lessonId: string }[],
  count = 3
): string[] {
  const filtered = allWords
    .map((item) => item.word.word.trim())
    .filter((w) => w && w.toLowerCase() !== correctWord.word.trim().toLowerCase());
  const unique = Array.from(new Set(filtered));
  return shuffle(unique).slice(0, count);
}

// Validate a candidate exam question
function isValidExamQuestion(q: ExamQuestion): boolean {
  if (!q.id || !q.prompt || !q.correctAnswer || !q.options || q.options.length < 2) {
    return false;
  }
  const optionTexts = q.options.map((o) => o.text.trim());
  // Ensure no duplicate options
  const uniqueTexts = new Set(optionTexts);
  if (uniqueTexts.size !== optionTexts.length) return false;
  // Ensure correct answer is in options
  if (!optionTexts.includes(q.correctAnswer.trim())) return false;
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

  // Ensure unique question IDs and order
  questions = questions.filter(isValidExamQuestion);

  const endsAt = now + durationMinutes * 60 * 1000;

  return {
    id: sessionId,
    mode,
    level,
    title,
    durationMinutes,
    startedAt: now,
    endsAt,
    status: 'active',
    questions,
    answers: {},
    flaggedQuestionIds: [],
    currentQuestionIndex: 0,
  };
}

/**
 * Mode 1: Quick Test (15 questions, 10 min)
 */
function generateQuickTestQuestions(
  level: CEFRLevel,
  levelWords: { word: VocabWord; lessonId: string }[]
): ExamQuestion[] {
  const questions: ExamQuestion[] = [];
  const shuffledWords = shuffle(levelWords);

  // 1. Vocabulary & Meaning (6 questions)
  for (let i = 0; i < Math.min(6, shuffledWords.length); i++) {
    const { word, lessonId } = shuffledWords[i];
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
  for (let i = 0; i < Math.min(5, shuffledUoe.length); i++) {
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
  }

  // 3. Listening (4 questions)
  const remainingWords = shuffledWords.slice(6);
  for (let i = 0; i < Math.min(4, remainingWords.length); i++) {
    const { word, lessonId } = remainingWords[i];
    const distractors = getMeaningDistractors(word, levelWords, 3);
    if (distractors.length === 3) {
      const options = shuffle([word.meaning, ...distractors]).map((text, idx) => ({
        id: `opt-${idx}`,
        text,
      }));
      questions.push({
        id: `qt-listen-${word.id}-${i}`,
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
    }
  }

  return questions.slice(0, 15);
}

/**
 * Mode 2: Structured Level Exam (A1: 20q, A2: 25q, B1: 30q, B2: 35q, C1: 40q, C2: 40q)
 */
function generateLevelExamQuestions(
  level: CEFRLevel,
  levelWords: { word: VocabWord; lessonId: string }[]
): ExamQuestion[] {
  const config = LEVEL_EXAM_CONFIGS[level];
  const questions: ExamQuestion[] = [];
  const shuffledWords = shuffle(levelWords);
  let wordIdx = 0;

  for (const section of config.sections) {
    const countNeeded = section.questionCount;
    let sectionQuestions: ExamQuestion[] = [];

    switch (section.type) {
      case 'visual-vocabulary': {
        // Picture / visual based questions (primarily A1)
        const photoWords = shuffledWords.filter((w) => Boolean(w.word.imageUrl));
        for (let i = 0; i < countNeeded && i < photoWords.length; i++) {
          const { word, lessonId } = photoWords[i];
          const distractors = getMeaningDistractors(word, levelWords, 3);
          if (distractors.length === 3) {
            const options = shuffle([word.meaning, ...distractors]).map((text, idx) => ({
              id: `opt-${idx}`,
              text,
            }));
            sectionQuestions.push({
              id: `lvl-${section.id}-${word.id}-${i}`,
              sectionId: section.id,
              sectionTitle: section.title,
              sectionType: section.type,
              kind: 'picture-choice',
              prompt: `Look at the picture. What is the correct meaning for "${word.word}"?`,
              options: options.map((opt) => ({
                ...opt,
                imageUrl: opt.text === word.meaning ? word.imageUrl : undefined,
              })),
              correctAnswer: word.meaning,
              explanation: `"${word.word}" (${word.meaning}) describes the shown item.`,
              targetItem: word.word,
              targetMeaning: word.meaning,
              tags: ['visual-vocabulary', 'a1'],
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
        for (let i = 0; i < countNeeded && wordIdx < shuffledWords.length; i++, wordIdx++) {
          const { word, lessonId } = shuffledWords[wordIdx];
          const isEnToVi = i % 2 === 0;

          if (isEnToVi) {
            const distractors = getMeaningDistractors(word, levelWords, 3);
            if (distractors.length === 3) {
              const options = shuffle([word.meaning, ...distractors]).map((text, idx) => ({
                id: `opt-${idx}`,
                text,
              }));
              sectionQuestions.push({
                id: `lvl-${section.id}-${word.id}-${i}`,
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
                id: `lvl-${section.id}-rev-${word.id}-${i}`,
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
        for (let i = 0; i < countNeeded && wordIdx < shuffledWords.length; i++, wordIdx++) {
          const { word, lessonId } = shuffledWords[wordIdx];
          const isHearMeaning = i % 2 === 1;

          if (isHearMeaning) {
            const distractors = getMeaningDistractors(word, levelWords, 3);
            if (distractors.length === 3) {
              const options = shuffle([word.meaning, ...distractors]).map((text, idx) => ({
                id: `opt-${idx}`,
                text,
              }));
              sectionQuestions.push({
                id: `lvl-${section.id}-${word.id}-${i}`,
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
                id: `lvl-${section.id}-spk-${word.id}-${i}`,
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
        // Sentence examples with cloze or Use of English Bank items
        const uoeItems = USE_OF_ENGLISH_BANK[level]?.filter((u) => u.sectionType === section.type) || [];
        for (const item of uoeItems) {
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

        // Fill remaining with example sentence clozes from words
        while (sectionQuestions.length < countNeeded && wordIdx < shuffledWords.length) {
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
        const uoeItems = USE_OF_ENGLISH_BANK[level] || [];
        const matchingUoe = uoeItems.filter((u) => u.sectionType === section.type || uoeItems.length > 0);
        for (const item of shuffle(matchingUoe)) {
          if (sectionQuestions.length >= countNeeded) break;
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
        while (sectionQuestions.length < countNeeded && wordIdx < shuffledWords.length) {
          const { word, lessonId } = shuffledWords[wordIdx++];
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
        if (readingItems.length > 0) {
          const selectedReading = readingItems[0];
          for (const q of selectedReading.questions) {
            if (sectionQuestions.length >= countNeeded) break;
            sectionQuestions.push({
              id: `lvl-${section.id}-${q.id}`,
              sectionId: section.id,
              sectionTitle: section.title,
              sectionType: 'reading',
              kind: 'reading-comprehension',
              prompt: q.prompt,
              passage: selectedReading.passage,
              options: q.options.map((t, idx) => ({ id: `opt-${idx}`, text: t })),
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              tags: q.tags,
              suggestedLessonId: q.suggestedLessonId,
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
 * Mode 3: Full Mock Exam (50 questions, 45 min)
 */
function generateFullMockQuestions(
  level: CEFRLevel,
  levelWords: { word: VocabWord; lessonId: string }[]
): ExamQuestion[] {
  // Combine level exam questions + extended reading and use of english to reach 50 items
  const baseQuestions = generateLevelExamQuestions(level, levelWords);
  const additionalNeeded = 50 - baseQuestions.length;

  if (additionalNeeded <= 0) return baseQuestions.slice(0, 50);

  const extraPool: ExamQuestion[] = [];
  const uoeBank = USE_OF_ENGLISH_BANK[level] || [];
  uoeBank.forEach((item, idx) => {
    extraPool.push({
      id: `mock-extra-uoe-${item.id}-${idx}`,
      sectionId: 'sec-mock-uoe',
      sectionTitle: 'Extended Use of English',
      sectionType: item.sectionType,
      kind: item.kind,
      prompt: item.prompt,
      options: item.options.map((t, i) => ({ id: `opt-${i}`, text: t })),
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      targetItem: item.targetItem,
      tags: item.tags,
      suggestedLessonId: item.suggestedLessonId,
    });
  });

  // Additional reading passages if available
  const readingList = READING_PASSAGES_BANK[level] || [];
  if (readingList.length > 1) {
    const secondPassage = readingList[1];
    secondPassage.questions.forEach((q) => {
      extraPool.push({
        id: `mock-extra-read-${q.id}`,
        sectionId: 'sec-mock-reading',
        sectionTitle: 'Extended Reading Comprehension',
        sectionType: 'reading',
        kind: 'reading-comprehension',
        prompt: q.prompt,
        passage: secondPassage.passage,
        options: q.options.map((t, i) => ({ id: `opt-${i}`, text: t })),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        tags: q.tags,
        suggestedLessonId: q.suggestedLessonId,
      });
    });
  }

  // Shuffle and append
  const extraSelected = shuffle(extraPool).slice(0, additionalNeeded);
  return [...baseQuestions, ...extraSelected].slice(0, 50);
}
