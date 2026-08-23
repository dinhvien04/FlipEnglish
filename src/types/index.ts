export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'phrase'
  | 'preposition'
  | 'conjunction'
  | 'idiom'
  | 'collocation'
  | 'phrasal verb';

export type LearningItemType =
  | 'word'
  | 'phrase'
  | 'collocation'
  | 'phrasalVerb'
  | 'idiom'
  | 'wordFamily'
  | 'synonymSet'
  | 'nuanceSet'
  | 'registerPair';

export interface VocabWord {
  id: string;
  type?: LearningItemType;
  word: string;
  expression?: string;
  pronunciation?: string;
  meaning: string; // Vietnamese meaning
  partOfSpeech?: PartOfSpeech;
  level?: CEFRLevel;
  example: string; // English example sentence
  imageUrl?: string;
  imageAlt?: string;
  visualQuizEligible?: boolean;
  emoji?: string;
  definition?: string;
  collocations?: string[];
  synonyms?: string[];
  antonyms?: string[];
  wordFamily?: string[];
  register?: 'informal' | 'neutral' | 'formal';
  usageNote?: string;
  nuanceNote?: string;
  nuance?: string;
  items?: string[]; // For nuance progression / synonym set
  pattern?: string; // e.g. "take responsibility for + noun"
  promptWord?: string; // For word formation questions (e.g. "DECIDE" -> "decision")
  tags?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  level: CEFRLevel;
  levelTitle: string;
  description: string;
  category?: string; // e.g. 'Academic', 'Business', 'Collocations', 'Phrasal Verbs', 'Idioms', 'Communication', 'Writing'
  imageUrl?: string;
  imageAlt?: string;
  icon?: string;
  badgeText?: string;
  tags?: string[];
  words: VocabWord[];
}

export type QuestionType =
  | 'en-to-vi'
  | 'vi-to-en'
  | 'fill-in-the-blank'
  | 'picture-quiz'
  | 'listening-challenge'
  | 'context-choice'
  | 'matching'
  | 'collocation-choice'
  | 'word-formation'
  | 'phrase-builder'
  | 'nuance-choice';

export interface PictureOption {
  id: string;
  word: string;
  meaning: string;
  imageUrl: string;
  imageAlt?: string;
}

export interface MatchingPair {
  id: string;
  left: string; // English expression
  right: string; // Vietnamese meaning or English synonym
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  hint?: string;
  sentence?: string; // For fill-in-the-blank / context questions with placeholder _____
  correctAnswer: string;
  options?: string[]; // Multiple choice options
  imageOptions?: PictureOption[]; // 4 image choices for picture-quiz
  matchingPairs?: MatchingPair[]; // For matching exercise
  promptWord?: string; // For word-formation (e.g. "DECIDE")
  phraseTokens?: string[]; // For phrase-builder (scrambled words to tap in order)
  explanation?: string; // Optional built-in explanation
  listeningSubType?: 'hear-word' | 'hear-meaning'; // For listening-challenge
  word: VocabWord;
}

export interface MistakeExplanation {
  title?: string;
  explanation: string;
  correctExample: string;
  tip: string;
}

export interface AIPracticeQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  targetWord: string;
}

export interface AIPracticeResponse {
  questions: AIPracticeQuestion[];
  lessonTitle: string;
}

export interface DetectedObject {
  id: string;
  word: string;
  meaning: string;
  pronunciation?: string;
  partOfSpeech: PartOfSpeech;
  level: CEFRLevel;
  example: string;
  confidence?: number;
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 scale
}

export interface LessonProgress {
  completed: boolean;
  bestScore: number;
  lastLearnedAt?: string;
}

export type AllProgress = Record<string, LessonProgress>;

export interface SpecialGoalCollection {
  id: string;
  title: string;
  description: string;
  badge: string;
  levelRange: string;
  lessonIds: string[];
  iconName: string;
  color: string;
}

export type AppView = 
  | 'home'
  | 'lesson-intro'
  | 'learn'
  | 'exercise'
  | 'result'
  | 'review-mistakes'
  | 'flip-lens'
  | 'exam-center'
  | 'exam-intro'
  | 'exam-session'
  | 'exam-result'
  | 'exam-history';

export * from './exam';

