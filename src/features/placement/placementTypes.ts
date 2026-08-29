export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type PlacementSkill = 'vocabulary' | 'use-of-english' | 'reading' | 'listening';

export const ORDERED_CEFR_LEVELS: readonly CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const PLACEMENT_STAGE_COUNT = 4;
export const PLACEMENT_STAGE_SIZE = 6;
export const PLACEMENT_TOTAL_QUESTIONS = 24;

export const LEVEL_WEIGHTS: Record<CEFRLevel, number> = {
  A1: 1.0,
  A2: 1.2,
  B1: 1.4,
  B2: 1.6,
  C1: 1.8,
  C2: 2.0,
};

export interface PlacementQuestionOption {
  id: string;
  text: string;
}

export interface PlacementQuestion {
  id: string;
  level: CEFRLevel;
  skill: PlacementSkill;
  prompt: string;
  options: PlacementQuestionOption[];
  correctAnswer: string;
  explanation?: string;
  audioPromptText?: string;
  passage?: string;
  passageTitle?: string;
  targetItem?: string;
  targetMeaning?: string;
  suggestedLessonId?: string;
  sourceType: 'curriculum' | 'use-of-english' | 'reading';
}

export interface PlacementStageResult {
  stageIndex: number; // 0, 1, 2, 3
  level: CEFRLevel;
  questionIds: string[];
  totalQuestions: number; // 6
  correctCount: number;
  scorePercentage: number;
  routingDecision: 'up' | 'same' | 'down';
  nextLevel?: CEFRLevel;
}

export interface PlacementStage {
  stageIndex: number; // 0..3
  level: CEFRLevel;
  questions: PlacementQuestion[];
  isLocked: boolean; // Once submitted and routed, locked = true
}

export interface SkillScoreSummary {
  skill: PlacementSkill;
  attempted: number;
  correct: number;
  percentage: number;
  weightedScore?: number;
}

export type PlacementConfidence = 'Strong evidence' | 'Moderate evidence' | 'Tentative estimate';

export interface RecommendedLessonItem {
  lessonId: string;
  lessonTitle: string;
  level: CEFRLevel;
  category?: string;
  reason: string;
}

export interface PlacementResultReport {
  id: string;
  sessionId: string;
  date: string;
  startedAt: number;
  completedAt: number;
  estimatedLevel: CEFRLevel;
  levelTitle: string;
  levelDescription: string;
  canDoSummary: string;
  confidence: PlacementConfidence;
  confidenceReason: string;
  totalQuestions: number; // 24
  correctCount: number;
  overallPercentage: number;
  skillScores: Record<PlacementSkill, SkillScoreSummary>;
  stagePath: PlacementStageResult[];
  recommendedLessons: RecommendedLessonItem[];
  missedTargetItems: {
    targetItem: string;
    wordId?: string;
    level: CEFRLevel;
    skill: PlacementSkill;
  }[];
  isPersisted?: boolean;
}

export interface PlacementSession {
  schemaVersion: 1;
  id: string;
  status: 'active' | 'completed';
  sessionSeed: number;
  startedAt: number;
  completedAt?: number;
  currentStageIndex: number; // 0..3
  currentQuestionInStageIndex: number; // 0..5
  currentLevel: CEFRLevel;
  stages: PlacementStage[];
  stageResults: PlacementStageResult[];
  answers: Record<string, string>; // questionId -> selectedOptionText
  resultReport?: PlacementResultReport;
}

export interface CompactPlacementHistoryItem {
  id: string;
  date: string;
  completedAt: number;
  estimatedLevel: CEFRLevel;
  overallPercentage: number;
  confidence: PlacementConfidence;
  stagePathLevels: CEFRLevel[];
  recommendedLessonIds: string[];
  matchedWeakWordIds: string[];
}
