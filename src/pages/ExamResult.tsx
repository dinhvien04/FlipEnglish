import React, { useState } from 'react';
import { Lesson, VocabWord } from '../types';
import { AIExamAnalysis, ExamResultReport } from '../types/exam';
import { LESSONS } from '../data/lessons';
import { EXAM_DISCLAIMER } from '../data/exams/config';

interface ExamResultProps {
  report: ExamResultReport;
  onRetakeExam: () => void;
  onReturnToExamCenter: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  onStartAIPractice?: (words: VocabWord[]) => void;
}

export const ExamResultPage: React.FC<ExamResultProps> = ({
  report,
  onRetakeExam,
  onReturnToExamCenter,
  onSelectLesson,
  onStartAIPractice,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'incorrect' | 'correct'>('all');
  const [aiAnalysis, setAiAnalysis] = useState<AIExamAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [expandedExplanationMap, setExpandedExplanationMap] = useState<Record<string, string>>({});
  const [explainingQuestionId, setExplainingQuestionId] = useState<string | null>(null);

  const durationMin = Math.floor(report.durationSpentSeconds / 60);
  const durationSec = report.durationSpentSeconds % 60;

  // Performance Badge Color
  const getBadgeStyle = () => {
    switch (report.performanceLabel) {
      case 'Excellent':
        return 'bg-emerald-500 text-white shadow-emerald-500/20';
      case 'Strong':
        return 'bg-indigo-600 text-white shadow-indigo-600/20';
      case 'Good':
        return 'bg-blue-600 text-white shadow-blue-600/20';
      case 'Developing':
        return 'bg-amber-500 text-slate-950 shadow-amber-500/20';
      default:
        return 'bg-rose-500 text-white shadow-rose-500/20';
    }
  };

  // Recommended Lesson objects
  const recommendedLessons = report.recommendedLessonIds
    .map((id) => LESSONS.find((l) => l.id === id))
    .filter((l): l is Lesson => Boolean(l));

  // Request Gemini AI Exam Analysis
  const handleRequestAIAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const missedItems = report.missedQuestions.map((m) => ({
        target: m.question.targetItem || m.question.prompt,
        type: m.question.sectionTitle,
      }));

      const res = await fetch('/api/analyze-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: report.level,
          title: report.title,
          overallPercentage: report.overallPercentage,
          sectionScores: report.sectionScores,
          missedTags: report.missedTags,
          missedItems,
        }),
      });

      if (!res.ok) {
        throw new Error('Could not generate AI diagnostic analysis.');
      }

      const data: AIExamAnalysis = await res.json();
      setAiAnalysis(data);
    } catch (err: any) {
      console.error('Error analyzing exam:', err);
      setAnalysisError(err.message || 'Failed to connect to AI Tutor.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Request "Explain My Mistake" for a single question
  const handleExplainMistake = async (questionId: string, prompt: string, userAns: string, correctAns: string, explanation: string) => {
    setExplainingQuestionId(questionId);
    try {
      const res = await fetch('/api/explain-mistake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: prompt,
          meaning: correctAns,
          userAnswer: userAns,
          correctAnswer: correctAns,
          context: explanation,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExpandedExplanationMap((prev) => ({
          ...prev,
          [questionId]: data.explanation || 'Review the explanation provided above.',
        }));
      } else {
        setExpandedExplanationMap((prev) => ({
          ...prev,
          [questionId]: explanation,
        }));
      }
    } catch (err) {
      setExpandedExplanationMap((prev) => ({
        ...prev,
        [questionId]: explanation,
      }));
    } finally {
      setExplainingQuestionId(null);
    }
  };

  // Words for AI practice
  const handleLaunchAIPractice = () => {
    if (!onStartAIPractice) return;
    const wordsPool: VocabWord[] = [];
    LESSONS.filter((l) => l.level === report.level).forEach((l) => {
      l.words.forEach((w) => {
        if (report.missedTags.includes(w.word.toLowerCase()) || report.missedQuestions.some(m => m.question.targetItem === w.word)) {
          wordsPool.push(w);
        }
      });
    });

    if (wordsPool.length === 0) {
      // Fallback to first 5 words of recommended lesson
      if (recommendedLessons.length > 0) {
        wordsPool.push(...recommendedLessons[0].words.slice(0, 6));
      }
    }

    if (wordsPool.length > 0) {
      onStartAIPractice(wordsPool);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 animate-fadeIn">
      {/* Top Banner / Score Card */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-black uppercase px-3 py-1 rounded-lg bg-indigo-600 text-white">
                {report.level}
              </span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                Exam Report • {report.date}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {report.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 font-semibold">
              Time Spent: {durationMin}m {durationSec}s
            </p>
          </div>

          {/* Overall Score Badge */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-md text-center min-w-[200px] space-y-2 shrink-0">
            <p className="text-2xs uppercase tracking-widest font-extrabold text-slate-400">
              Overall Score
            </p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl sm:text-5xl font-black text-indigo-400">
                {report.overallPercentage}%
              </span>
            </div>
            <p className="text-xs text-slate-300 font-semibold">
              {report.correctCount} / {report.totalQuestions} Correct
            </p>
            <span
              className={`inline-block text-2xs font-black uppercase px-3 py-1 rounded-full shadow-xs ${getBadgeStyle()}`}
            >
              {report.performanceLabel}
            </span>
          </div>
        </div>

        {/* Section Score Breakdown */}
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
            Section-by-Section Performance
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {report.sectionScores.map((sec) => (
              <div
                key={sec.sectionId}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-900">{sec.sectionTitle}</span>
                  <span className="text-indigo-600 font-black">
                    {sec.correct}/{sec.total} ({sec.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sec.percentage >= 80
                        ? 'bg-emerald-500'
                        : sec.percentage >= 60
                        ? 'bg-indigo-600'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${sec.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & Weaknesses Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="bg-emerald-50/60 rounded-2xl p-5 border border-emerald-200/80 space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
              Demonstrated Strengths
            </h3>
            {report.strengths.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-emerald-950 font-medium">
                {report.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-800">Keep practicing to build your core strengths.</p>
            )}
          </div>

          {/* Weaknesses / Focus Areas */}
          <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200/80 space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
              Areas for Improvement
            </h3>
            {report.weaknesses.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-amber-950 font-medium">
                {report.weaknesses.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-amber-800">Outstanding work! No major weak sections identified.</p>
            )}
          </div>
        </div>

        {/* AI Exam Diagnostic Analysis */}
        <div className="border-t border-slate-200 pt-6 space-y-4">
          {!aiAnalysis ? (
            <div className="bg-indigo-50/70 rounded-3xl p-6 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-indigo-900 font-black text-sm sm:text-base">
                  Gemini AI Exam Diagnostic
                </div>
                <p className="text-xs text-indigo-700 max-w-md">
                  Get a personalized AI breakdown analyzing your mistake patterns, specific linguistic gaps, and customized study plan.
                </p>
              </div>

              <button
                type="button"
                id="request-ai-exam-analysis-btn"
                onClick={handleRequestAIAnalysis}
                disabled={isAnalyzing}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isAnalyzing ? 'Analyzing Exam...' : 'Analyze My Exam'}
              </button>
            </div>
          ) : (
            <div className="bg-indigo-50/80 rounded-3xl p-6 sm:p-8 border border-indigo-200 space-y-6 animate-fadeIn">
              <div className="border-b border-indigo-200/80 pb-4">
                <h3 className="text-base font-black text-slate-900">AI Diagnostic Report</h3>
                <p className="text-2xs text-indigo-700">Powered by Gemini assessment intelligence</p>
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <h4 className="text-2xs uppercase tracking-wider font-extrabold text-indigo-900">
                  Diagnostic Overview
                </h4>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {aiAnalysis.summary}
                </p>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-indigo-100 space-y-2">
                  <p className="text-2xs font-black uppercase text-emerald-700">Demonstrated Competencies</p>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {aiAnalysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-indigo-100 space-y-2">
                  <p className="text-2xs font-black uppercase text-amber-700">Priority Study Targets</p>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {aiAnalysis.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Study Tip */}
              <div className="bg-white rounded-2xl p-4 border border-indigo-100 space-y-1">
                <p className="text-2xs font-black uppercase tracking-wider text-slate-900">High-Impact Study Strategy</p>
                <p className="text-xs text-slate-700 leading-relaxed">{aiAnalysis.studyTip}</p>
              </div>
            </div>
          )}

          {analysisError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
              {analysisError}
            </p>
          )}
        </div>
      </section>

      {/* Recommended Lessons to Bridge Gaps */}
      {recommendedLessons.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Recommended Lessons For You</h2>
            <p className="text-xs text-slate-500">Targeted lessons in FlipEnglish to address your missed topics.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      {lesson.level}
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">
                      {lesson.words.length} Words
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {lesson.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2">{lesson.description}</p>
                </div>

                <button
                  type="button"
                  id={`study-recommended-lesson-${lesson.id}`}
                  onClick={() => onSelectLesson(lesson)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Study This Lesson
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Detailed Question Review List */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Review Answers & Explanations</h2>
            <p className="text-xs text-slate-500">Examine correct choices and learn from mistakes.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({report.totalQuestions})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('incorrect')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'incorrect'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Incorrect ({report.missedQuestions.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('correct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'correct'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Correct ({report.correctCount})
            </button>
          </div>
        </div>

        {/* Question Cards List */}
        <div className="space-y-4">
          {report.missedQuestions
            .filter(() => filterMode === 'all' || filterMode === 'incorrect')
            .map((item) => {
              const q = item.question;
              const hasCustomExplanation = Boolean(expandedExplanationMap[q.id]);
              const isExplainingThis = explainingQuestionId === q.id;

              return (
                <div
                  key={q.id}
                  className="bg-rose-50/30 rounded-2xl p-5 sm:p-6 border border-rose-200/80 space-y-4 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-rose-100 pb-2">
                    <span className="text-xs font-black text-rose-900">
                      {q.sectionTitle}
                    </span>
                    <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                      Incorrect
                    </span>
                  </div>

                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug whitespace-pre-line">
                    {q.prompt}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white rounded-xl p-3 border border-rose-200 space-y-1">
                      <p className="text-2xs font-extrabold uppercase text-slate-400">Your Answer:</p>
                      <p className="font-bold text-rose-600">{item.userAnswer}</p>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-emerald-200 space-y-1">
                      <p className="text-2xs font-extrabold uppercase text-slate-400">Correct Answer:</p>
                      <p className="font-bold text-emerald-600">{q.correctAnswer}</p>
                    </div>
                  </div>

                  {/* Built-in Explanation */}
                  <div className="bg-white/80 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-700 space-y-1">
                    <p className="font-extrabold text-slate-900">Explanation:</p>
                    <p className="leading-relaxed">{q.explanation}</p>
                  </div>

                  {/* Gemini "Explain My Mistake" */}
                  {hasCustomExplanation ? (
                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200 text-xs text-indigo-950 space-y-1.5 animate-fadeIn">
                      <div className="font-black text-indigo-900">
                        AI Tutor Insight:
                      </div>
                      <p className="leading-relaxed">{expandedExplanationMap[q.id]}</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id={`explain-mistake-btn-${q.id}`}
                      onClick={() =>
                        handleExplainMistake(
                          q.id,
                          q.prompt,
                          item.userAnswer,
                          q.correctAnswer,
                          q.explanation
                        )
                      }
                      disabled={isExplainingThis}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50/50 border border-indigo-200 px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isExplainingThis ? 'Generating explanation...' : 'Explain My Mistake with Gemini'}
                    </button>
                  )}
                </div>
              );
            })}

          {/* If filtering correct questions */}
          {filterMode === 'correct' && (
            <div className="text-center py-6 text-xs text-slate-500">
              Showing {report.correctCount} correctly answered questions.
            </div>
          )}
        </div>
      </section>

      {/* Bottom Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          id="retake-exam-result-btn"
          onClick={onRetakeExam}
          className="w-full sm:w-auto py-3 px-6 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer"
        >
          Retake Practice Exam
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {report.missedQuestions.length > 0 && onStartAIPractice && (
            <button
              type="button"
              id="ai-practice-missed-words-btn"
              onClick={handleLaunchAIPractice}
              className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-extrabold text-xs sm:text-sm transition-all cursor-pointer"
            >
              AI Practice On Missed Words
            </button>
          )}

          <button
            type="button"
            id="return-to-exam-center-btn"
            onClick={onReturnToExamCenter}
            className="w-full sm:w-auto py-3 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm shadow-2xs transition-all cursor-pointer active:scale-98"
          >
            Return to Exam Center
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-2xs text-slate-400 text-center">{EXAM_DISCLAIMER}</p>
    </div>
  );
};
