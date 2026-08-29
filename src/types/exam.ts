import { CEFRLevel } from './index';
export type { CEFRLevel };

export type ExamMode = 'quick' | 'level' | 'mock';

export type ExamSectionType =
  | 'visual-vocabulary'
  | 'vocabulary'
  | 'core-vocabulary'
  | 'intermediate-vocabulary'
  | 'word-meaning'
  | 'everyday-english'
  | 'basic-context'
  | 'fill-in-blank'
  | 'use-of-english'
  | 'context-vocabulary'
  | 'collocations'
  | 'collocations-phrasal'
  | 'word-formation'
  | 'precision-nuance'
  | 'register-usage'
  | 'advanced-use-of-english'
  | 'reading'
  | 'listening';

export interface ExamSectionConfig {
  id: string;
  type: ExamSectionType;
  title: string;
  questionCount: number;
}

export interface ExamLevelConfig {
  level: CEFRLevel;
  title: string;
  questionCount: number;
  totalQuestions?: number;
  durationMinutes: number;
  sections: ExamSectionConfig[];
}

export type ExamQuestionKind =
  | 'multiple-choice'
  | 'picture-choice'
  | 'fill-blank'
  | 'word-formation'
  | 'collocation-choice'
  | 'reading-comprehension'
  | 'listening-comprehension'
  | 'register-nuance';

export interface ExamQuestionOption {
  id: string;
  text: string;
}

export interface ReadingPassage {
  id: string;
  level: CEFRLevel;
  title: string;
  topic: string;
  passage: string;
  wordCount: number;
}

export interface ExamQuestion {
  id: string;
  sectionId: string;
  sectionTitle: string;
  sectionType: ExamSectionType;
  kind: ExamQuestionKind;
  prompt: string;
  visualUrl?: string;
  visualType?: 'photo';
  passage?: ReadingPassage;
  audioPromptText?: string;
  audioSlowAvailable?: boolean;
  options: ExamQuestionOption[];
  correctAnswer: string; // The text matching the correct option
  explanation?: string;
  targetItem?: string;
  targetMeaning?: string;
  targetExample?: string;
  tags?: string[];
  suggestedLessonId?: string;
}

export type ExamStatus = 'notStarted' | 'active' | 'submitted' | 'expired';

export interface ExamSession {
  id: string;
  schemaVersion?: number; // Schema version (2 for current visualUrl architecture)
  mode: ExamMode;
  level: CEFRLevel;
  title: string;
  durationMinutes: number;
  startedAt: number; // timestamp in ms
  endsAt: number; // timestamp in ms
  status: ExamStatus;
  questions: ExamQuestion[];
  answers: Record<string, string>; // questionId -> selectedOptionText
  flaggedQuestionIds: string[];
  currentQuestionIndex: number;
  submittedAt?: number;
}

export interface SectionScoreReport {
  sectionId: string;
  sectionTitle: string;
  sectionType: ExamSectionType;
  total: number;
  correct: number;
  percentage: number;
}

export interface ExamResultReport {
  id: string;
  sessionId: string;
  mode: ExamMode;
  level: CEFRLevel;
  title: string;
  date: string;
  startedAt: number;
  submittedAt: number;
  durationSpentSeconds: number;
  totalQuestions: number;
  correctCount: number;
  overallPercentage: number;
  performanceLabel: 'Excellent' | 'Strong' | 'Good' | 'Developing' | 'Needs More Practice';
  sectionScores: SectionScoreReport[];
  strengths: string[];
  weaknesses: string[];
  missedTags: string[];
  missedQuestions: {
    question: ExamQuestion;
    userAnswer: string;
  }[];
  recommendedLessonIds: string[];
  isPersisted?: boolean;
}

export interface AIExamAnalysisRecommendation {
  lessonId: string;
  lessonTitle: string;
  level: CEFRLevel;
  reason: string;
}

export interface AIExamAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: AIExamAnalysisRecommendation[];
  studyTip: string;
}
