import React, { useState } from 'react';
import { Lesson, VocabWord } from '../types';
import { FlashCard } from '../components/FlashCard';
import { ProgressBar } from '../components/ProgressBar';
import { batchAddLessonWordsToReview } from '../utils/reviewStorage';

interface LearnProps {
  lesson: Lesson;
  wordsToLearn: VocabWord[];
  isReviewMistakesMode?: boolean;
  onFinishFlashcards: () => void;
  onBackToIntro: () => void;
}

export const Learn: React.FC<LearnProps> = ({
  lesson,
  wordsToLearn,
  isReviewMistakesMode = false,
  onFinishFlashcards,
  onBackToIntro,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasCompletedAll, setHasCompletedAll] = useState(false);

  const totalWords = wordsToLearn.length;
  const currentWord = wordsToLearn[currentIndex];

  const handleNext = () => {
    if (currentIndex < totalWords - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      batchAddLessonWordsToReview(lesson.id);
      setHasCompletedAll(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleRestartCards = () => {
    setCurrentIndex(0);
    setHasCompletedAll(false);
  };

  if (!currentWord || totalWords === 0) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <p className="text-slate-500">No vocabulary words found for this session.</p>
        <button
          onClick={onBackToIntro}
          className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer"
        >
          Return to Lesson
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          id="learn-back-btn"
          onClick={onBackToIntro}
          className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          Exit Lesson
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              {lesson.level}
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {lesson.title}
            </h2>
          </div>
          {isReviewMistakesMode && (
            <span className="inline-block text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full mt-1">
              Reviewing Mistakes
            </span>
          )}
        </div>

        <div className="w-16 text-right text-xs font-bold text-slate-500">
          {currentIndex + 1} / {totalWords}
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar
        current={hasCompletedAll ? totalWords : currentIndex + 1}
        total={totalWords}
        label={
          isReviewMistakesMode
            ? `Reviewing: ${hasCompletedAll ? totalWords : currentIndex + 1} / ${totalWords}`
            : `Cards: ${hasCompletedAll ? totalWords : currentIndex + 1} of ${totalWords}`
        }
      />

      {/* Main Flashcard or Completion Screen */}
      {!hasCompletedAll ? (
        <div className="mt-4">
          <FlashCard
            word={currentWord}
            currentIndex={currentIndex}
            totalWords={totalWords}
            onNext={handleNext}
            onPrev={handlePrev}
            isFirst={currentIndex === 0}
            isLast={currentIndex === totalWords - 1}
          />
        </div>
      ) : (
        /* Completion State */
        <div
          id="flashcard-completion-card"
          className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-2xs text-center max-w-lg mx-auto space-y-6"
        >
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
            Completed
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
              {isReviewMistakesMode
                ? 'Mistakes Reviewed!'
                : 'All Flashcards Completed!'}
            </h3>
            <p className="text-sm sm:text-base text-slate-600">
              {isReviewMistakesMode
                ? 'Ready to test your memory again and boost your score?'
                : 'Great job! Test your memory with the quick lesson quiz.'}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              id="review-cards-again-btn"
              onClick={handleRestartCards}
              className="px-6 py-3.5 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Review Cards Again
            </button>

            <button
              id="start-exercises-btn"
              onClick={onFinishFlashcards}
              className="px-8 py-3.5 rounded-xl font-extrabold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all active:scale-98 cursor-pointer"
            >
              {isReviewMistakesMode ? 'Retake Exercises' : 'Start Exercises'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
