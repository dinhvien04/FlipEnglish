import React, { useState, useEffect, useRef } from 'react';
import { Lesson, VocabWord } from '../types';
import { FlashCard } from '../components/FlashCard';
import { ProgressBar } from '../components/ProgressBar';
import { batchAddLessonWordsToReview, batchAddItemsToReview } from '../utils/reviewStorage';
import { LearnResumeContext } from '../types/sessionResume';
import { normalizeLearnResumeContext } from '../utils/sessionResume';
import { useI18n } from '../features/i18n';

import {
  saveActiveLearnSession,
  clearActiveLearnSession,
} from '../features/continuity/sessionPersistence';

interface LearnProps {
  lesson: Lesson;
  wordsToLearn: VocabWord[];
  isReviewMistakesMode?: boolean;
  resumeState?: LearnResumeContext | null;
  onResumeConsumed?: () => void;
  onFinishFlashcards: () => void;
  onBackToIntro: () => void;
  onLookupWord?: (word: string, resumeContext: LearnResumeContext) => void;
  onSessionContextChange?: (resumeContext: LearnResumeContext) => void;
}

export const Learn: React.FC<LearnProps> = ({
  lesson,
  wordsToLearn,
  isReviewMistakesMode = false,
  resumeState = null,
  onResumeConsumed,
  onFinishFlashcards,
  onBackToIntro,
  onLookupWord,
  onSessionContextChange,
}) => {
  const { t } = useI18n();
  const totalWords = wordsToLearn.length;

  // Initialize from production normalized resume state if present
  const initialResume = normalizeLearnResumeContext(resumeState, lesson.id, totalWords);

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    return initialResume ? initialResume.currentIndex : 0;
  });
  const [hasCompletedAll, setHasCompletedAll] = useState<boolean>(() => {
    return initialResume ? initialResume.hasCompletedAll : false;
  });

  // Keep parent session context in sync for header navigations and persist active session
  useEffect(() => {
    const sessionData = {
      lessonId: lesson.id,
      flashcardIndex: currentIndex,
      hasCompletedAll,
      isReviewMistakesMode,
    };
    onSessionContextChange?.(sessionData);

    if (!hasCompletedAll) {
      saveActiveLearnSession({
        lessonId: lesson.id,
        flashcardIndex: currentIndex,
        hasCompletedAll,
        isReviewMistakesMode,
      });
    } else {
      clearActiveLearnSession();
    }
  }, [lesson.id, currentIndex, hasCompletedAll, isReviewMistakesMode, onSessionContextChange]);

  // Signal consumption to App after initial client-side mount (one-shot)
  const didConsumeResumeRef = useRef<boolean>(false);

  useEffect(() => {
    if (resumeState && !didConsumeResumeRef.current) {
      didConsumeResumeRef.current = true;
      onResumeConsumed?.();
    }
  }, [resumeState, onResumeConsumed]);

  const currentWord = wordsToLearn[currentIndex];

  const handleNext = () => {
    if (currentIndex < totalWords - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (isReviewMistakesMode) {
        batchAddItemsToReview(wordsToLearn.map((w) => w.id));
      } else {
        batchAddLessonWordsToReview(lesson.id);
      }
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

  const handleLookup = (word: string) => {
    if (onLookupWord) {
      onLookupWord(word, {
        lessonId: lesson.id,
        flashcardIndex: currentIndex,
        hasCompletedAll,
        isReviewMistakesMode,
      });
    }
  };

  if (!currentWord || totalWords === 0) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <p className="text-slate-500">{t('home.search.noResults', { query: '' })}</p>
        <button
          onClick={onBackToIntro}
          className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer"
        >
          {t('ui.common.back')}
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
          {t('ui.common.back')}
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              {lesson.level}
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900" lang="en">
              {lesson.title}
            </h2>
          </div>
          {isReviewMistakesMode && (
            <span className="inline-block text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full mt-1">
              {t('result.reviewMistakesBtn')}
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
            ? `${t('result.reviewMistakesBtn')}: ${hasCompletedAll ? totalWords : currentIndex + 1} / ${totalWords}`
            : `${t('learn.flashcard.progress', { current: hasCompletedAll ? totalWords : currentIndex + 1, total: totalWords })}`
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
            onLookupWord={onLookupWord ? handleLookup : undefined}
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
            {t('ui.common.done')}
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
              {t('learn.flashcard.completedTitle')}
            </h3>
            <p className="text-sm sm:text-base text-slate-600">
              {t('learn.flashcard.completedDesc', { count: totalWords })}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              id="flashcard-finish-btn"
              onClick={onFinishFlashcards}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>{t('learn.flashcard.goToQuiz')}</span>
            </button>
            <button
              onClick={handleRestartCards}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              {t('learn.flashcard.reviewAgain')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
