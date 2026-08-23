import { LESSONS } from '../data/lessons';
import {
  ExamQuestion,
  ExamResultReport,
  ExamSectionType,
  ExamSession,
  SectionScoreReport,
} from '../types/exam';

export function calculateExamResult(session: ExamSession): ExamResultReport {
  const now = Date.now();
  const submittedAt = session.submittedAt || now;
  const durationSpentSeconds = Math.max(10, Math.round((submittedAt - session.startedAt) / 1000));

  let correctCount = 0;
  const sectionStats: Record<
    string,
    { sectionId: string; sectionTitle: string; sectionType: ExamSectionType; total: number; correct: number }
  > = {};

  const missedQuestions: { question: ExamQuestion; userAnswer: string }[] = [];
  const missedTagsSet = new Set<string>();
  const recommendedLessonIdSet = new Set<string>();

  session.questions.forEach((q) => {
    // Init section stats
    if (!sectionStats[q.sectionId]) {
      sectionStats[q.sectionId] = {
        sectionId: q.sectionId,
        sectionTitle: q.sectionTitle,
        sectionType: q.sectionType,
        total: 0,
        correct: 0,
      };
    }
    sectionStats[q.sectionId].total += 1;

    const userAnswer = (session.answers[q.id] || '').trim();
    const isCorrect = userAnswer.toLowerCase() === q.correctAnswer.trim().toLowerCase();

    if (isCorrect) {
      correctCount += 1;
      sectionStats[q.sectionId].correct += 1;
    } else {
      missedQuestions.push({
        question: q,
        userAnswer: userAnswer || '(Unanswered)',
      });

      if (q.tags) {
        q.tags.forEach((t) => missedTagsSet.add(t));
      }

      if (q.suggestedLessonId) {
        recommendedLessonIdSet.add(q.suggestedLessonId);
      }
    }
  });

  const totalQuestions = session.questions.length;
  const overallPercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Performance label
  let performanceLabel: ExamResultReport['performanceLabel'] = 'Needs More Practice';
  if (overallPercentage >= 90) performanceLabel = 'Excellent';
  else if (overallPercentage >= 80) performanceLabel = 'Strong';
  else if (overallPercentage >= 70) performanceLabel = 'Good';
  else if (overallPercentage >= 60) performanceLabel = 'Developing';

  // Section scores
  const sectionScores: SectionScoreReport[] = Object.values(sectionStats).map((s) => ({
    sectionId: s.sectionId,
    sectionTitle: s.sectionTitle,
    sectionType: s.sectionType,
    total: s.total,
    correct: s.correct,
    percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
  }));

  // Strengths & Weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  sectionScores.forEach((sec) => {
    if (sec.percentage >= 80) {
      strengths.push(`${sec.sectionTitle} (${sec.percentage}%)`);
    } else if (sec.percentage < 70) {
      weaknesses.push(`${sec.sectionTitle} (${sec.percentage}%)`);
    }
  });

  if (strengths.length === 0 && sectionScores.length > 0) {
    const highest = [...sectionScores].sort((a, b) => b.percentage - a.percentage)[0];
    strengths.push(`${highest.sectionTitle} (${highest.percentage}%)`);
  }

  if (weaknesses.length === 0 && sectionScores.length > 0) {
    const lowest = [...sectionScores].sort((a, b) => a.percentage - b.percentage)[0];
    if (lowest.percentage < 90) {
      weaknesses.push(`${lowest.sectionTitle} (${lowest.percentage}%)`);
    }
  }

  // Find fallback recommended lessons from the same level if none were collected
  let recommendedLessonIds = Array.from(recommendedLessonIdSet).filter((id) =>
    LESSONS.some((l) => l.id === id)
  );

  if (recommendedLessonIds.length === 0) {
    const levelLessons = LESSONS.filter((l) => l.level === session.level);
    recommendedLessonIds = levelLessons.slice(0, 3).map((l) => l.id);
  }

  const dateStr = new Date(submittedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    id: `result-${session.id}`,
    sessionId: session.id,
    mode: session.mode,
    level: session.level,
    title: session.title,
    date: dateStr,
    startedAt: session.startedAt,
    submittedAt,
    durationSpentSeconds,
    totalQuestions,
    correctCount,
    overallPercentage,
    performanceLabel,
    sectionScores,
    strengths,
    weaknesses,
    missedTags: Array.from(missedTagsSet),
    missedQuestions,
    recommendedLessonIds: recommendedLessonIds.slice(0, 4),
  };
}
