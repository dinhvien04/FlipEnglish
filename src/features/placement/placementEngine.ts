import { CEFRLevel } from '../../types';
import { LESSONS } from '../../data/lessons';
import { resolveCurriculumItem, resolveCurriculumItemByText } from '../../utils/curriculumIndex';
import {
  ORDERED_CEFR_LEVELS,
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
  totalQuestions = 6
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
 * Modest, non-copyrighted, pedagogical descriptions.
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
      'Can understand and use familiar everyday expressions and very basic phrases aimed at satisfying concrete needs. Can introduce themselves and answer simple personal questions.',
  },
  A2: {
    title: 'Elementary Starting Point',
    description: 'Essential communicative English for routine situations and familiar topics.',
    canDoSummary:
      'Can understand sentences and frequently used expressions related to areas of most immediate relevance (e.g. basic personal and family information, shopping, local geography, employment).',
  },
  B1: {
    title: 'Intermediate Starting Point',
    description: 'Practical independent English for work, travel, and personal interests.',
    canDoSummary:
      'Can understand the main points of clear standard input on familiar matters regularly encountered in work, school, and leisure. Can deal with most situations likely to arise while travelling.',
  },
  B2: {
    title: 'Upper Intermediate Starting Point',
    description: 'Confident English for complex ideas, professional discussions, and spontaneous interaction.',
    canDoSummary:
      'Can understand the main ideas of complex text on both concrete and abstract topics. Can interact with a degree of fluency and spontaneity that makes regular interaction with native speakers quite possible without strain.',
  },
  C1: {
    title: 'Advanced Starting Point',
    description: 'Nuanced English for demanding academic, professional, and social environments.',
    canDoSummary:
      'Can understand a wide range of demanding, longer texts, and recognise implicit meaning. Can express ideas fluently and spontaneously without much obvious searching for expressions.',
  },
  C2: {
    title: 'Proficient Starting Point',
    description: 'Mastery of subtle connotations, idioms, precise collocations, and complex arguments.',
    canDoSummary:
      'Can understand with ease virtually everything heard or read. Can summarise information from different spoken and written sources, reconstructing arguments and accounts in a coherent presentation.',
  },
};

/**
 * Calculates Per-Skill Performance across all answered placement questions.
 * Deterministic and zero NaN.
 */
export function calculateSkillPerformance(
  questions: PlacementQuestion[],
  answers: Record<string, string>
): Record<PlacementSkill, SkillScoreSummary> {
  const skills: PlacementSkill[] = ['vocabulary', 'use-of-english', 'reading', 'listening'];
  const summary: Record<PlacementSkill, SkillScoreSummary> = {
    vocabulary: { skill: 'vocabulary', attempted: 0, correct: 0, percentage: 0 },
    'use-of-english': { skill: 'use-of-english', attempted: 0, correct: 0, percentage: 0 },
    reading: { skill: 'reading', attempted: 0, correct: 0, percentage: 0 },
    listening: { skill: 'listening', attempted: 0, correct: 0, percentage: 0 },
  };

  for (const q of questions) {
    const userAns = answers[q.id];
    if (userAns !== undefined) {
      summary[q.skill].attempted += 1;
      if (userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        summary[q.skill].correct += 1;
      }
    }
  }

  for (const s of skills) {
    const item = summary[s];
    item.percentage = item.attempted > 0 ? Math.round((item.correct / item.attempted) * 100) : 0;
  }

  return summary;
}

/**
 * Calculates Result Confidence based on stage path and testing history:
 * - Strong evidence: Final estimated level was directly tested and score was consistent.
 * - Moderate evidence: Solid evidence across 4 stages with moderate boundary change.
 * - Tentative estimate: Final estimate is an adjacent level not directly tested (e.g. final stage was B2 with 6/6 routing to C1 without testing C1).
 */
export function calculateResultConfidence(
  stageResults: PlacementStageResult[],
  estimatedLevel: CEFRLevel
): { confidence: PlacementConfidence; reason: string } {
  const testedLevels = new Set(stageResults.map((r) => r.level));
  const finalStage = stageResults[stageResults.length - 1];

  if (!testedLevels.has(estimatedLevel)) {
    return {
      confidence: 'Tentative estimate',
      reason: `Estimated starting level ${estimatedLevel} was projected from high performance in stage ${stageResults.length} (${finalStage?.level || 'B2'}), but ${estimatedLevel} was not directly tested in this session.`,
    };
  }

  const finalStageResult = stageResults.filter((r) => r.level === estimatedLevel);
  const totalCorrectAtLevel = finalStageResult.reduce((sum, r) => sum + r.correctCount, 0);
  const totalQuestionsAtLevel = finalStageResult.reduce((sum, r) => sum + r.totalQuestions, 0);
  const levelPercentage = totalQuestionsAtLevel > 0 ? (totalCorrectAtLevel / totalQuestionsAtLevel) * 100 : 0;

  if (levelPercentage >= 50 && stageResults.length >= 4) {
    return {
      confidence: 'Strong evidence',
      reason: `Direct evidence gathered across 4 stages with consistent performance around the ${estimatedLevel} level boundary.`,
    };
  }

  return {
    confidence: 'Moderate evidence',
    reason: `Multi-stage adaptive performance indicates ${estimatedLevel} as the most suitable starting foundation.`,
  };
}

/**
 * Builds Deterministic Recommended Lessons based on:
 * 1. Estimated Level lessons targeting weak skill topics
 * 2. Another useful lesson at the estimated level
 * 3. One foundational review lesson if a lower level or core skill had errors
 */
export function buildRecommendedLessons(
  estimatedLevel: CEFRLevel,
  skillScores: Record<PlacementSkill, SkillScoreSummary>,
  missedSuggestedLessonIds: string[]
): RecommendedLessonItem[] {
  const recommendations: RecommendedLessonItem[] = [];
  const addedLessonIds = new Set<string>();

  // 1. Lessons directly tied to missed placement questions at the estimated level
  const estimatedLevelLessons = LESSONS.filter((l) => l.level === estimatedLevel);

  for (const lessonId of missedSuggestedLessonIds) {
    if (recommendations.length >= 2) break;
    const lesson = LESSONS.find((l) => l.id === lessonId && l.level === estimatedLevel);
    if (lesson && !addedLessonIds.has(lesson.id)) {
      addedLessonIds.add(lesson.id);
      recommendations.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        level: lesson.level,
        category: lesson.category || 'Targeted Vocabulary',
        reason: `Targeted reinforcement for vocabulary and expressions missed during placement check.`,
      });
    }
  }

  // 2. Identify weakest skill to recommend corresponding category
  const sortedSkills = (Object.keys(skillScores) as PlacementSkill[]).sort(
    (a, b) => skillScores[a].percentage - skillScores[b].percentage
  );
  const weakestSkill = sortedSkills[0];

  for (const lesson of estimatedLevelLessons) {
    if (recommendations.length >= 3) break;
    if (!addedLessonIds.has(lesson.id)) {
      addedLessonIds.add(lesson.id);
      recommendations.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        level: lesson.level,
        category: lesson.category || 'Core Curriculum',
        reason: `Recommended starting module at your estimated ${estimatedLevel} level to strengthen ${weakestSkill.replace(
          '-',
          ' '
        )}.`,
      });
    }
  }

  // 3. If there is a lower CEFR level available and weakest skill < 60%, recommend 1 foundational review lesson
  const currentIdx = ORDERED_CEFR_LEVELS.indexOf(estimatedLevel);
  if (currentIdx > 0 && skillScores[weakestSkill].percentage < 60) {
    const lowerLevel = ORDERED_CEFR_LEVELS[currentIdx - 1];
    const lowerLevelLessons = LESSONS.filter((l) => l.level === lowerLevel);
    if (lowerLevelLessons.length > 0) {
      const reviewLesson = lowerLevelLessons[0];
      if (!addedLessonIds.has(reviewLesson.id)) {
        addedLessonIds.add(reviewLesson.id);
        recommendations.push({
          lessonId: reviewLesson.id,
          lessonTitle: reviewLesson.title,
          level: reviewLesson.level,
          category: reviewLesson.category || 'Foundational Review',
          reason: `Foundational review from ${lowerLevel} to consolidate core ${weakestSkill.replace('-', ' ')} concepts.`,
        });
      }
    }
  }

  // Bound recommendations to 3-5 items
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

  // If the last stage was 5-6/6 and routed up, or 0-2/6 and routed down
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

  const totalQuestions = allQuestions.length > 0 ? allQuestions.length : 24;
  const overallPercentage = Math.round((totalCorrect / totalQuestions) * 100);

  // 3. Skill Scores
  const skillScores = calculateSkillPerformance(allQuestions, answers);

  // 4. Confidence
  const { confidence, reason: confidenceReason } = calculateResultConfidence(stageResults, estimatedLevel);

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
