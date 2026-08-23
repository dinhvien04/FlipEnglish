import { CEFRLevel } from '../types';

export type ConversationCategory = 'Everyday' | 'Travel' | 'Study' | 'Work' | 'Advanced';

export interface UsefulExpression {
  expression: string;
  meaning: string;
  level?: CEFRLevel;
}

export interface ConversationScenario {
  id: string;
  title: string;
  category: ConversationCategory;
  supportedLevels: CEFRLevel[];
  description: string;
  learnerGoal: string;
  aiRole: string;
  openingContext: string;
  usefulExpressions: UsefulExpression[];
  tags: string[];
  maxTurns: number;
}

export interface TurnFeedback {
  hasCorrection: boolean;
  original?: string;
  suggestion?: string;
  explanation?: string;
}

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  feedback?: TurnFeedback;
  usefulExpressions?: UsefulExpression[];
}

export interface EvaluationReviewItem {
  expression: string;
  meaning: string;
  reason: string;
  matchedCurriculumId?: string;
}

export interface ConversationEvaluation {
  summary: string;
  scores: {
    communication: number; // 0 - 100
    vocabulary: number; // 0 - 100
    grammar: number; // 0 - 100
    naturalExpression: number; // 0 - 100
  };
  overallScore: number;
  strengths: string[];
  improvements: string[];
  reviewItems: EvaluationReviewItem[];
}

export interface SavedConversationSummary {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  category: ConversationCategory;
  level: CEFRLevel;
  date: number;
  overallScore: number;
  turnsCount: number;
  summary: string;
}

export interface ConversationStorageData {
  schemaVersion: number;
  history: SavedConversationSummary[];
}
