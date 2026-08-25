import { CEFRLevel } from '../../types';
import { LESSONS } from '../../data/lessons';
import { resolveCurriculumItem, resolveCurriculumItemByText } from '../../utils/curriculumIndex';
import {
  ORDERED_CEFR_LEVELS,
  PLACEMENT_STAGE_COUNT,
  PLACEMENT_STAGE_SIZE,
  PLACEMENT_TOTAL_QUESTIONS,
  LEVEL_WEIGHTS,
  PlacementConfidence,
  PlacementQuestion,
  PlacementResultReport,
  PlacementSkill,
  PlacementStageResult,
  RecommendedLessonItem,
  SkillScoreSummary,
} from './placementTypes';

/**
 * Pure Multistage Adaptive Routing Function
 *
 * Rules:
 * - 5-6 correct out of 6 -> UP one level (clamped at C2)
 * - 3-4 correct out of 6 -> STAY at same level
 * - 0-2 correct out of 6 -> DOWN one level (clamped at A1)
 */
export function routeNextLevel(
  currentLevel: CEFRLevel,
  correctCount: number,
  totalQuestions = PLACEMENT_STAGE_SIZE
): { nextLevel: CEFRLevel; decision: 'up' | 'same' | 'down' } {
  const currentIndex = ORDERED_CEFR_LEVELS.indexOf(currentLevel);
  if (currentIndex === -1) {
    return { nextLevel: 'B1', decision: 'same' };
  }

  if (correctCount >= 5) {
    const nextIdx = Math.min(currentIndex + 1, ORDERED_CEFR_LEVELS.length - 1);
    return {
      nextLevel: ORDERED_CEFR_LEVELS[nextIdx],
      decision: 'up',
    };
  }

  if (correctCount <= 2) {
    const nextIdx = Math.max(currentIndex - 1, 0);
    return {
      nextLevel: ORDERED_CEFR_LEVELS[nextIdx],
      decision: 'down',
    };
  }

  return {
    nextLevel: currentLevel,
    decision: 'same',
  };
}

/**
 * Level Title & Paraphrased Broad CEFR Descriptor Metadata
 * Original FlipEnglish pedagogical descriptions (non-copyrighted).
 */
export const PLACEMENT_LEVEL_METADATA: Record<
  CEFRLevel,
  {
    title: string;
    description: string;
    canDoSummary: string;
  }
> = {
  A1: {
    title: 'Beginner Starting Point',
    description: 'Foundation English focusing on high-frequency everyday words and basic expressions.',
    canDoSummary:
      'Can manage very simple familiar exchanges and recognise common words and short expressions.',
  },
  A2: {
    title: 'Elementary Starting Point',
    description: 'Essential communicative English for routine situations and familiar topics.',
    canDoSummary:
      'Can handle routine everyday situations and understand common language about familiar topics.',
  },
  B1: {
    title: 'Intermediate Starting Point',
    description: 'Practical independent English for work, travel, and personal interests.',
    canDoSummary:
      'Can follow the main ideas of clear everyday English and handle many familiar situations independently.',
  },
  B2: {
    title: 'Upper Intermediate Starting Point',
    description: 'Confident English for complex ideas, professional discussions, and spontaneous interaction.',
    canDoSummary:
      'Can understand more complex ideas and participate in detailed conversation with reasonable fluency.',
  },
  C1: {
    title: 'Advanced Starting Point',
    description: 'Nuanced English for demanding academic, professional, and social environments.',
    canDoSummary:
      'Can understand demanding language and communicate flexibly in professional, academic and social contexts.',
  },
  C2: {
    title: 'Proficient Starting Point',
    description: 'Mastery of subtle connotations, idioms, precise collocations, and complex arguments.',
    canDoSummary:
      'Can handle highly complex language and communicate with precision, nuance and strong control.',
  },
};

/**
 * Calculates Per-Skill Performance across all answered placement questions.
 * Produces both raw percentage (for UI) and internal difficulty-aware weightedScore (for recommendations).
 * Deterministic and zero NaN.
 */
export function calculateSkillPerformance(
  questions: PlacementQuestion[],
  answers: Record<string, string>
): Record<PlacementSkill, SkillScoreSummary> {
  const skills: PlacementSkill[] = ['vocabulary', 'use-of-english', 'reading', 'listening'];
  const summary: Record<PlacementSkill, SkillScoreSummary> = {
    vocabulary: { skill: 'vocabulary', attempted: 0, correct: 0, percentage: 0, weightedScore: 0 },
    'use-of-english': { skill: 'use-of-english', attempted: 0, correct: 0, percentage: 0, weightedScore: 0 },
    reading: { skill: 'reading', attempted: 0, correct: 0, percentage: 0, weightedScore: 0 },
    listening: { skill: 'listening', attempted: 0, correct: 0, percentage: 0, weightedScore: 0 },
  };

  const skillWeighted: Record<PlacementSkill, { correct: number; possible: number }> = {
    vocabulary: { correct: 0, possible: 0 },
    'use-of-english': { correct: 0, possible: 0 },
    reading: { correct: 0, possible: 0 },
    listening: { correct: 0, possible: 0 },
  };

  for (const q of questions) {
    const userAns = answers[q.id];
    if (userAns !== undefined) {
      const weight = LEVEL_WEIGHTS[q.level] || 1.0;
      summary[q.skill].attempted += 1;
      skillWeighted[q.skill].possible += weight;

      if (userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        summary[q.skill].correct += 1;
        skillWeighted[q.skill].correct += weight;
      }
    }
  }

  for (const s of skills) {
    const item = summary[s];
    item.percentage = item.attempted > 0 ? Math.round((item.correct / item.attempted) * 100) : 0;
    const w = skillWeighted[s];
    item.weightedScore = w.possible > 0 ? Math.round((w.correct / w.possible) * 100) : 0;
  }

  return summary;
}

/**
 * Pure helper to evaluate placement evidence confidence based on completed stage results:
 * - Tentative estimate: Final estimated level was not directly tested (e.g. projected by routing).
 * - Strong evidence:
 *     1. estimatedLevel directly tested
 *     2. roughly >=67% evidence (>= 66.6%) at estimated level
 *     3. all 4 stages completed
 *     4. routing near final level is reasonably stable
 *     5. no strong contradictory neighboring evidence
 * - Moderate evidence: Other valid completed sessions.
 */
export function evaluatePlacementEvidence(
  stageResults: PlacementStageResult[],
  estimatedLevel: CEFRLevel
): { confidence: PlacementConfidence; reason: string } {
  if (!stageResults || stageResults.length === 0) {
    return {
      confidence: 'Tentative estimate',
      reason: 'No completed stages recorded to evaluate placement evidence.',
    };
  }

  const testedLevels = new Set(stageResults.map((r) => r.level));
  const finalStage = stageResults[stageResults.length - 1];

  // 1. If estimatedLevel was not directly tested in any stage -> Tentative
  if (!testedLevels.has(estimatedLevel)) {
    return {
      confidence: 'Tentative estimate',
      reason: `Estimated starting level ${estimatedLevel} was projected from performance in stage ${stageResults.length} (${finalStage?.level || 'B2'}), but ${estimatedLevel} was not directly tested in this session.`,
    };
  }

  // 2. Aggregate evidence specifically at the estimated level
  const stagesAtEstimatedLevel = stageResults.filter((r) => r.level === estimatedLevel);
  const totalCorrectAtLevel = stagesAtEstimatedLevel.reduce((sum, r) => sum + r.correctCount, 0);
  const totalQuestionsAtLevel = stagesAtEstimatedLevel.reduce((sum, r) => sum + r.totalQuestions, 0);
  const levelPercentage = totalQuestionsAtLevel > 0 ? (totalCorrectAtLevel / totalQuestionsAtLevel) * 100 : 0;

  // Check stability conditions
  const allStagesCompleted = stageResults.length === PLACEMENT_STAGE_COUNT;
  const hasStrongScoreAtLevel = levelPercentage >= 66.6; // e.g. 4/6 (66.67%) or 5/6 (83%) or 6/6 (100%)
  const isFinalStageAtLevel = finalStage.level === estimatedLevel;

  // Check for contradictory evidence: e.g. if an earlier stage at the same level was failed badly (<=2/6)
  // or routing bounced erratically
  const hasContradictoryEvidence = stagesAtEstimatedLevel.some((s) => s.correctCount <= 2);

  if (
    allStagesCompleted &&
    hasStrongScoreAtLevel &&
    isFinalStageAtLevel &&
    !hasContradictoryEvidence
  ) {
    return {
      confidence: 'Strong evidence',
      reason: `Direct evidence gathered across all 4 stages with consistent performance (>=67%) at the ${estimatedLevel} level boundary.`,
    };
  }

  return {
    confidence: 'Moderate evidence',
    reason: `Multi-stage adaptive performance across ${stageResults.length} stages indicates ${estimatedLevel} as the most suitable starting foundation.`,
  };
}

/**
 * Calculates Result Confidence (alias to evaluatePlacementEvidence)
 */
export function calculateResultConfidence(
  stageResults: PlacementStageResult[],
  estimatedLevel: CEFRLevel
): { confidence: PlacementConfidence; reason: string } {
  return evaluatePlacementEvidence(stageResults, estimatedLevel);
}

/**
 * Builds Deterministic Recommended Lessons based on:
 * 1. Lessons directly tied to missed placement items
 * 2. Starting module at estimated level
 * 3. Foundational review lesson at lower level ONLY if meaningful match exists
 */
export function buildRecommendedLessons(
  estimatedLevel: CEFRLevel,
  skillScores: Record<PlacementSkill, SkillScoreSummary>,
  missedSuggestedLessonIds: string[]
): RecommendedLessonItem[] {
  const recommendations: RecommendedLessonItem[] = [];
  const addedLessonIds = new Set<string>();

  // 1. Lessons directly tied to missed placement questions
  for (const lessonId of missedSuggestedLessonIds) {
    if (recommendations.length >= 2) break;
    const lesson = LESSONS.find((l) => l.id === lessonId);
    if (lesson && !addedLessonIds.has(lesson.id)) {
      addedLessonIds.add(lesson.id);
      recommendations.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        level: lesson.level,
        category: lesson.category || 'Targeted Vocabulary',
        reason: `Review this module because related vocabulary was missed during your Placement Check.`,
      });
    }
  }

  // 2. Identify weakest skill by weightedScore (or raw percentage if tied)
  const skillsList = Object.keys(skillScores) as PlacementSkill[];
  const sortedSkills = skillsList.sort((a, b) => {
    const scoreA = skillScores[a].weightedScore ?? skillScores[a].percentage;
    const scoreB = skillScores[b].weightedScore ?? skillScores[b].percentage;
    return scoreA - scoreB;
  });
  const weakestSkill = sortedSkills[0];

  // Starting lessons at the estimated level
  const estimatedLevelLessons = LESSONS.filter((l) => l.level === estimatedLevel);
  for (const lesson of estimatedLevelLessons) {
    if (recommendations.length >= 3) break;
    if (!addedLessonIds.has(lesson.id)) {
      addedLessonIds.add(lesson.id);
      recommendations.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        level: lesson.level,
        category: lesson.category || 'Core Curriculum',
        reason: `Recommended starting module at ${estimatedLevel}.`,
      });
    }
  }

  // 3. Lower Level Review: only if weakest skill weighted score < 60% and lower level exists
  const currentIdx = ORDERED_CEFR_LEVELS.indexOf(estimatedLevel);
  const weakestMetric = skillScores[weakestSkill].weightedScore ?? skillScores[weakestSkill].percentage;

  if (currentIdx > 0 && weakestMetric < 60) {
    const lowerLevel = ORDERED_CEFR_LEVELS[currentIdx - 1];
    const lowerLevelLessons = LESSONS.filter((l) => l.level === lowerLevel);

    // Prefer lower level lesson tied to missed items or shared category
    let bestReviewLesson = lowerLevelLessons.find(
      (l) => missedSuggestedLessonIds.includes(l.id) && !addedLessonIds.has(l.id)
    );

    if (!bestReviewLesson) {
      bestReviewLesson = lowerLevelLessons.find((l) => !addedLessonIds.has(l.id));
    }

    if (bestReviewLesson && !addedLessonIds.has(bestReviewLesson.id)) {
      addedLessonIds.add(bestReviewLesson.id);
      recommendations.push({
        lessonId: bestReviewLesson.id,
        lessonTitle: bestReviewLesson.title,
        level: bestReviewLesson.level,
        category: bestReviewLesson.category || 'Foundational Review',
        reason: `Consolidate foundational concepts from ${lowerLevel} before advancing.`,
      });
    }
  }

  // Bound recommendations to 1-4 items
  return recommendations.slice(0, 4);
}

/**
 * Calculates Final Placement Result Report from Completed Session
 * Pure function: No React, no localStorage calls, no side-effects.
 */
export function calculatePlacementResult(
  sessionId: string,
  startedAt: number,
  completedAt: number,
  allQuestions: PlacementQuestion[],
  answers: Record<string, string>,
  stageResults: PlacementStageResult[]
): PlacementResultReport {
  if (!stageResults || stageResults.length === 0) {
    throw new Error('Placement result could not be calculated: no completed stages recorded.');
  }

  // 1. Determine estimated level
  const finalStage = stageResults[stageResults.length - 1];
  let candidateLevel: CEFRLevel = finalStage.level;

  if (finalStage.routingDecision === 'up' && finalStage.nextLevel) {
    candidateLevel = finalStage.nextLevel;
  } else if (finalStage.routingDecision === 'down' && finalStage.nextLevel) {
    candidateLevel = finalStage.nextLevel;
  }

  const estimatedLevel = candidateLevel;
  const levelMeta = PLACEMENT_LEVEL_METADATA[estimatedLevel] || PLACEMENT_LEVEL_METADATA.B1;

  // 2. Aggregate question correctness and missed items
  let totalCorrect = 0;
  const missedLessonIds: string[] = [];
  const missedTargetItems: {
    targetItem: string;
    wordId?: string;
    level: CEFRLevel;
    skill: PlacementSkill;
  }[] = [];

  for (const q of allQuestions) {
    const userAns = answers[q.id];
    const isCorrect = userAns !== undefined && userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    if (isCorrect) {
      totalCorrect++;
    } else {
      if (q.suggestedLessonId) {
        missedLessonIds.push(q.suggestedLessonId);
      }
      if (q.targetItem) {
        const resolved = resolveCurriculumItem(q.targetItem) || resolveCurriculumItemByText(q.targetItem);
        missedTargetItems.push({
          targetItem: q.targetItem,
          wordId: resolved?.word.id,
          level: q.level,
          skill: q.skill,
        });
      }
    }
  }

  const totalQuestions = allQuestions.length > 0 ? allQuestions.length : PLACEMENT_TOTAL_QUESTIONS;
  const overallPercentage = Math.round((totalCorrect / totalQuestions) * 100);

  // 3. Skill Scores (raw percentage + weighted score)
  const skillScores = calculateSkillPerformance(allQuestions, answers);

  // 4. Confidence via evaluatePlacementEvidence
  const { confidence, reason: confidenceReason } = evaluatePlacementEvidence(stageResults, estimatedLevel);

  // 5. Recommendations
  const recommendedLessons = buildRecommendedLessons(estimatedLevel, skillScores, missedLessonIds);

  const now = new Date(completedAt);
  const dateFormatted = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return {
    id: `placement-report-${sessionId}`,
    sessionId,
    date: dateFormatted,
    startedAt,
    completedAt,
    estimatedLevel,
    levelTitle: levelMeta.title,
    levelDescription: levelMeta.description,
    canDoSummary: levelMeta.canDoSummary,
    confidence,
    confidenceReason,
    totalQuestions,
    correctCount: totalCorrect,
    overallPercentage,
    skillScores,
    stagePath: stageResults,
    recommendedLessons,
    missedTargetItems,
  };
}

