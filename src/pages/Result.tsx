import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Lesson, VocabWord, AIPracticeQuestion } from '../types';
import { saveLessonProgress } from '../utils/storage';
import { speakWord } from '../utils/speech';
import { SafeImage } from '../components/SafeImage';
import { AIPracticeModal } from '../components/AIPracticeModal';

interface ResultProps {
  lesson: Lesson;
  score: number;
  correctCount: number;
  incorrectCount: number;
  totalQuestions: number;
  mistakeWords: VocabWord[];
  onReviewMistakes: () => void;
  onTryAgain: () => void;
  onBackToHome: () => void;
}

export const Result: React.FC<ResultProps> = ({
  lesson,
  score,
  correctCount,
  incorrectCount,
  totalQuestions,
  mistakeWords,
  onReviewMistakes,
  onTryAgain,
  onBackToHome,
}) => {
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiQuestions, setAiQuestions] = useState<AIPracticeQuestion[] | null>(null);

  useEffect(() => {
    // Automatically save lesson progress
    saveLessonProgress(lesson.id, score);

    // Trigger celebration confetti on high score
    if (score >= 70) {
      try {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4f46e5', '#8b5cf6', '#10b981', '#f59e0b'],
        });
      } catch (err) {
        console.warn('Confetti error:', err);
      }
    }
  }, [lesson.id, score]);

  const handleGenerateAiPractice = async () => {
    if (mistakeWords.length === 0) return;
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: lesson.title,
          level: lesson.level,
          mistakeWords: mistakeWords.map((w) => ({
            word: w.word,
            meaning: w.meaning,
            example: w.example,
            partOfSpeech: w.partOfSpeech,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI targeted practice questions.');
      }

      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        setAiQuestions(data.questions);
      } else {
        throw new Error('No practice questions were returned.');
      }
    } catch (err: any) {
      console.error('AI Practice generation error:', err);
      setAiError(err.message || 'Unable to connect to AI practice generator. Please try again.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const getFeedbackMessage = () => {
    if (score === 100) return 'Flawless Master! You got every question right!';
    if (score >= 80) return 'Great work! You demonstrated strong mastery of this topic.';
    if (score >= 60) return 'Good effort! A targeted review will help you reach 100%.';
    return 'Keep practicing! Review the vocabulary cards below to build recall.';
  };

  const getScoreColor = () => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-sky-600 bg-sky-50 border-sky-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Top Results Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-2xs text-center space-y-6">
        <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold uppercase tracking-wider">
          {lesson.level} • {lesson.title}
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Lesson Completed
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium max-w-md mx-auto">
            {getFeedbackMessage()}
          </p>
        </div>

        {/* Big Score Box */}
        <div className={`py-5 px-6 rounded-2xl border ${getScoreColor()} max-w-xs mx-auto space-y-1`}>
          <div className="text-4xl sm:text-5xl font-black tracking-tight">
            {score}%
          </div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">
            {correctCount} / {totalQuestions} Questions Correct
          </p>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-sm">
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center text-emerald-800 font-bold">
            Correct: {correctCount}
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 text-center text-rose-800 font-bold">
            Incorrect: {incorrectCount}
          </div>
        </div>

        {/* Words To Review Section with Photographic Thumbnails */}
        {mistakeWords.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100 text-left space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-rose-600">
                Words to review ({mistakeWords.length})
              </h3>
              <span className="text-xs font-medium text-slate-500">Reinforce your memory</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mistakeWords.map((word) => (
                <div
                  key={word.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/50 border border-rose-100 hover:bg-rose-50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {word.imageUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-rose-200/60">
                        <SafeImage
                          src={word.imageUrl}
                          alt={word.imageAlt || word.word}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm capitalize">{word.word}</span>
                        <span className="text-2xs text-slate-400 font-mono">{word.pronunciation}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{word.meaning}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => speakWord(word.word)}
                    title={`Play pronunciation for ${word.word}`}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors shrink-0 shadow-2xs border border-rose-200/60 cursor-pointer"
                  >
                    Play
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Error Alert if occurred */}
        {aiError && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left">
            <p className="font-bold">AI Practice Note</p>
            <p className="mt-1">{aiError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Gemini AI Targeted Practice Button (Only when there are mistake words) */}
          {mistakeWords.length > 0 && (
            <button
              id="result-ai-practice-btn"
              onClick={handleGenerateAiPractice}
              disabled={isGeneratingAi}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              {isGeneratingAi ? 'Generating Practice...' : 'Generate AI Practice'}
            </button>
          )}

          {mistakeWords.length > 0 && (
            <button
              id="result-review-mistakes-btn"
              onClick={onReviewMistakes}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-98 cursor-pointer"
            >
              Flashcard Review
            </button>
          )}

          <button
            id="result-try-again-btn"
            onClick={onTryAgain}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-98 cursor-pointer"
          >
            Retake Quiz
          </button>

          <button
            id="result-back-home-btn"
            onClick={onBackToHome}
            className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-98 cursor-pointer ${
              mistakeWords.length === 0
                ? 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Back to Path
          </button>
        </div>
      </div>

      {/* AI Practice Modal */}
      {aiQuestions && (
        <AIPracticeModal
          lessonTitle={lesson.title}
          mistakeWords={mistakeWords}
          questions={aiQuestions}
          onClose={() => setAiQuestions(null)}
        />
      )}
    </div>
  );
};
