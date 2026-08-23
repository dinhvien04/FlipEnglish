import { Lesson, QuizQuestion, VocabWord, QuestionType } from '../types';

// Helper to shuffle an array
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate fill-in-the-blank masked sentence from example
function createBlankSentence(example: string, word: string): string {
  // Regex to replace the word (case-insensitive, handling common plural or endings)
  const regex = new RegExp(`\\b${word}\\b`, 'i');
  if (regex.test(example)) {
    return example.replace(regex, '_______');
  }

  // Fallback: replace any case-insensitive substring
  const fallbackRegex = new RegExp(word, 'i');
  if (fallbackRegex.test(example)) {
    return example.replace(fallbackRegex, '_______');
  }

  // If no match found, create a clear template
  return `The word is: _______ (${word.length} letters)`;
}

// Fallback distractors when lesson has fewer than 4 vocabulary items
const FALLBACK_DISTRACTORS: { word: string; meaning: string }[] = [
  { word: 'Book', meaning: 'Sách' },
  { word: 'Chair', meaning: 'Ghế' },
  { word: 'Table', meaning: 'Bàn' },
  { word: 'Pen', meaning: 'Bút' },
  { word: 'Phone', meaning: 'Điện thoại' },
  { word: 'Clock', meaning: 'Đồng hồ' },
  { word: 'Window', meaning: 'Cửa sổ' },
  { word: 'Door', meaning: 'Cửa ra vào' },
  { word: 'Bag', meaning: 'Túi xách' },
  { word: 'Water', meaning: 'Nước' },
];

export function generateQuiz(lesson: Lesson): QuizQuestion[] {
  const words = shuffleArray(lesson.words);
  const totalQuestions = Math.min(10, words.length);
  const questions: QuizQuestion[] = [];

  // For FlipLens mini lessons where all words share the same image, skip 'picture-quiz'
  // since 4 identical photo options would be ambiguous, unless different images exist
  const hasDistinctImages = new Set(lesson.words.map((w) => w.imageUrl)).size > 1;

  const types: QuestionType[] = hasDistinctImages
    ? ['en-to-vi', 'listening-challenge', 'picture-quiz', 'vi-to-en', 'fill-in-the-blank']
    : ['en-to-vi', 'listening-challenge', 'vi-to-en', 'fill-in-the-blank'];

  for (let i = 0; i < totalQuestions; i++) {
    const targetWord = words[i];
    const type = types[i % types.length];
    const otherWords = lesson.words.filter((w) => w.id !== targetWord.id);
    const shuffledOthers = shuffleArray(otherWords);

    // Ensure we always have 3 wrong choices for 4 total options
    const getWrongWordOptions = (count: number = 3): string[] => {
      const fromLesson = shuffledOthers.map((w) => w.word);
      if (fromLesson.length >= count) return fromLesson.slice(0, count);
      const extra = FALLBACK_DISTRACTORS.filter(
        (f) => f.word.toLowerCase() !== targetWord.word.toLowerCase() && !fromLesson.includes(f.word)
      ).map((f) => f.word);
      return [...fromLesson, ...extra].slice(0, count);
    };

    const getWrongMeaningOptions = (count: number = 3): string[] => {
      const fromLesson = shuffledOthers.map((w) => w.meaning);
      if (fromLesson.length >= count) return fromLesson.slice(0, count);
      const extra = FALLBACK_DISTRACTORS.filter(
        (f) => f.meaning.toLowerCase() !== targetWord.meaning.toLowerCase() && !fromLesson.includes(f.meaning)
      ).map((f) => f.meaning);
      return [...fromLesson, ...extra].slice(0, count);
    };

    if (type === 'listening-challenge') {
      // Alternate between Format A (Which word did you hear? -> English words)
      // and Format B (What does this word mean? -> Vietnamese meanings)
      const isFormatA = i % 2 === 0;

      if (isFormatA) {
        // Format A: English vocabulary options
        const wrongOptions = getWrongWordOptions(3);
        const options = shuffleArray([targetWord.word, ...wrongOptions]);

        questions.push({
          id: `q-${lesson.id}-${i}-${targetWord.id}`,
          type: 'listening-challenge',
          listeningSubType: 'hear-word',
          prompt: 'Which word did you hear?',
          correctAnswer: targetWord.word,
          options,
          word: targetWord,
        });
      } else {
        // Format B: Vietnamese meaning options
        const wrongOptions = getWrongMeaningOptions(3);
        const options = shuffleArray([targetWord.meaning, ...wrongOptions]);

        questions.push({
          id: `q-${lesson.id}-${i}-${targetWord.id}`,
          type: 'listening-challenge',
          listeningSubType: 'hear-meaning',
          prompt: 'What does this word mean?',
          correctAnswer: targetWord.meaning,
          options,
          word: targetWord,
        });
      }
    } else if (type === 'picture-quiz') {
      // Type 4: Picture Quiz — select the correct photo for the English word
      const distractorWords = shuffledOthers.slice(0, 3);
      const rawImageOptions = [
        {
          id: targetWord.id,
          word: targetWord.word,
          meaning: targetWord.meaning,
          imageUrl: targetWord.imageUrl,
          imageAlt: targetWord.imageAlt || targetWord.word,
        },
        ...distractorWords.map((w) => ({
          id: w.id,
          word: w.word,
          meaning: w.meaning,
          imageUrl: w.imageUrl,
          imageAlt: w.imageAlt || w.word,
        })),
      ];

      questions.push({
        id: `q-${lesson.id}-${i}-${targetWord.id}`,
        type: 'picture-quiz',
        prompt: `Which photo represents "${targetWord.word}"?`,
        hint: `Meaning: ${targetWord.meaning}`,
        correctAnswer: targetWord.id,
        imageOptions: shuffleArray(rawImageOptions),
        word: targetWord,
      });
    } else if (type === 'en-to-vi') {
      // Type 1: English to Vietnamese
      const wrongOptions = getWrongMeaningOptions(3);
      const options = shuffleArray([targetWord.meaning, ...wrongOptions]);

      questions.push({
        id: `q-${lesson.id}-${i}-${targetWord.id}`,
        type: 'en-to-vi',
        prompt: `What does "${targetWord.word}" mean?`,
        correctAnswer: targetWord.meaning,
        options,
        word: targetWord,
      });
    } else if (type === 'vi-to-en') {
      // Type 2: Vietnamese to English
      const wrongOptions = getWrongWordOptions(3);
      const options = shuffleArray([targetWord.word, ...wrongOptions]);

      questions.push({
        id: `q-${lesson.id}-${i}-${targetWord.id}`,
        type: 'vi-to-en',
        prompt: `Which word means "${targetWord.meaning}"?`,
        correctAnswer: targetWord.word,
        options,
        word: targetWord,
      });
    } else {
      // Type 3: Fill in the blank
      const sentence = createBlankSentence(targetWord.example, targetWord.word);

      questions.push({
        id: `q-${lesson.id}-${i}-${targetWord.id}`,
        type: 'fill-in-the-blank',
        prompt: 'Complete the sentence:',
        sentence,
        hint: `${targetWord.meaning}`,
        correctAnswer: targetWord.word,
        word: targetWord,
      });
    }
  }

  return questions;
}
