import React from 'react';
import { Lesson, LessonProgress } from '../types';
import { speakWord } from '../utils/speech';
import { SafeImage } from '../components/SafeImage';

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
  const isCompleted = progress?.completed ?? false;
  const bestScore = progress?.bestScore ?? 0;

  const visualItemsCount = lesson.words.filter((w) => Boolean(w.imageUrl)).length;
  const isPrimarilyVisual = visualItemsCount >= Math.ceil(lesson.words.length * 0.7);
  const flashcardsLabel = isPrimarilyVisual
    ? `${lesson.words.length} Visual Flashcards`
    : `${lesson.words.length} Vocabulary Cards`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Top back button */}
      <button
        id="intro-back-btn"
        onClick={onBackToHome}
        className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors focus:outline-hidden cursor-pointer"
      >
        Back to Learning Path
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
                {lesson.level} Level
              </span>
              {isCompleted && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-600 text-white">
                  Best Score: {bestScore}%
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
              {lesson.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 max-w-2xl">
              {lesson.description}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Feature summary points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Vocabulary Cards</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{flashcardsLabel}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Interactive Exercises</p>
              <p className="text-sm font-bold text-slate-800 mt-1">Quiz & Fill-in-the-blank</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Spaced Recall</p>
              <p className="text-sm font-bold text-slate-800 mt-1">Mistake-Targeted Review</p>
            </div>
          </div>

          {/* Vocabulary Word List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Words in this lesson ({lesson.words.length})
              </h3>
              <span className="text-xs text-slate-400 font-medium">Click Play to preview pronunciation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lesson.words.map((word) => (
                <div
                  key={word.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 hover:bg-white transition-all text-sm group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {word.imageUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80">
                        <SafeImage
                          src={word.imageUrl}
                          alt={word.imageAlt || word.word}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : null}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 capitalize">{word.word}</span>
                        <span className="text-2xs text-slate-400 font-mono">{word.pronunciation}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{word.meaning}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => speakWord(word.word)}
                    title={`Play pronunciation for ${word.word}`}
                    className="px-3 py-1 rounded-lg bg-white group-hover:bg-indigo-50 text-slate-600 group-hover:text-indigo-600 text-xs font-bold transition-colors shrink-0 shadow-2xs border border-slate-200/60 cursor-pointer"
                  >
                    Play
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              id="intro-back-secondary-btn"
              onClick={onBackToHome}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Back to Learning Path
            </button>

            <button
              id="intro-start-learning-btn"
              onClick={onStartLearning}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-extrabold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-all active:scale-98 cursor-pointer"
            >
              Start Flashcards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
