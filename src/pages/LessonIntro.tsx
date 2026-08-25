import React, { useState, useEffect } from 'react';
import { Lesson, LessonProgress } from '../types';
import { speakWord } from '../utils/speech';
import { SafeImage } from '../components/SafeImage';
import {
  isItemInReview,
  toggleItemInReview,
  batchAddLessonWordsToReview,
  REVIEW_UPDATED_EVENT,
} from '../utils/reviewStorage';
import { useI18n } from '../features/i18n';

interface LessonIntroProps {
  lesson: Lesson;
  progress: LessonProgress | null;
  onStartLearning: () => void;
  onBackToHome: () => void;
}

export const LessonIntro: React.FC<LessonIntroProps> = ({
  lesson,
  progress,
  onStartLearning,
  onBackToHome,
}) => {
  const { t } = useI18n();
  const isCompleted = progress?.completed ?? false;
  const bestScore = progress?.bestScore ?? 0;

  const [reviewStateMap, setReviewStateMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    lesson.words.forEach((w) => {
      map[w.id] = isItemInReview(w.id);
    });
    return map;
  });

  useEffect(() => {
    const update = () => {
      const map: Record<string, boolean> = {};
      lesson.words.forEach((w) => {
        map[w.id] = isItemInReview(w.id);
      });
      setReviewStateMap(map);
    };

    window.addEventListener(REVIEW_UPDATED_EVENT, update);
    return () => window.removeEventListener(REVIEW_UPDATED_EVENT, update);
  }, [lesson.words]);

  const handleToggleReview = (wordId: string) => {
    toggleItemInReview(wordId);
    setReviewStateMap((prev) => ({
      ...prev,
      [wordId]: !prev[wordId],
    }));
  };

  const handleAddAllToReview = () => {
    batchAddLessonWordsToReview(lesson.id);
    const map: Record<string, boolean> = {};
    lesson.words.forEach((w) => {
      map[w.id] = true;
    });
    setReviewStateMap(map);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Top back button */}
      <button
        id="intro-back-btn"
        onClick={onBackToHome}
        className="min-h-11 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors focus:outline-hidden cursor-pointer inline-flex items-center"
      >
        ← {t('ui.common.back')}
      </button>

      {/* Main Introduction Card with photographic cover banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Photographic Hero Banner */}
        <div className="relative w-full h-48 sm:h-64 bg-slate-900 overflow-hidden">
          <SafeImage
            src={lesson.imageUrl}
            alt={lesson.imageAlt || lesson.title}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Overlaid Title & Level Info */}
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-indigo-600 text-white uppercase tracking-wider">
                {lesson.level} {t('ui.common.level')}
              </span>
              {isCompleted && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/90 text-white shadow-2xs">
                  {t('ui.common.score')}: {bestScore}%
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight" lang="en">
              {lesson.title}
            </h1>
          </div>
        </div>

        {/* Action Panel & Description */}
        <div className="p-6 sm:p-8 space-y-6">
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {lesson.description}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              id="intro-start-btn"
              onClick={onStartLearning}
              className="w-full sm:w-auto min-h-12 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>{t('learn.intro.startFlashcards', { count: lesson.words.length })}</span>
              <span className="font-black">→</span>
            </button>

            <button
              type="button"
              onClick={handleAddAllToReview}
              className="w-full sm:w-auto min-h-12 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>{t('dictionary.addToReview')} ({lesson.words.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vocabulary List in this Lesson */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          {t('learn.intro.wordsInLesson')} ({lesson.words.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lesson.words.map((w, index) => {
            const inReview = reviewStateMap[w.id];
            return (
              <div
                key={w.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900" lang="en">
                      {w.word}
                    </span>
                    {w.partOfSpeech && (
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {w.partOfSpeech}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1" lang="vi">
                    {w.meaning}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => speakWord(w.word)}
                    title={t('dictionary.audio.play')}
                    className="min-h-11 min-w-11 p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer inline-flex items-center justify-center text-xs font-bold"
                  >
                    Audio
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleReview(w.id)}
                    title={inReview ? t('dictionary.addedToReview') : t('dictionary.addToReview')}
                    className={`min-h-11 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center justify-center border ${
                      inReview
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {inReview ? '✓' : '+'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
