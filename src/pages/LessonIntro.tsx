import React from 'react';
import { ArrowLeft, Play, BookOpen, CheckCircle2, Volume2, Sparkles } from 'lucide-react';
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Top back button */}
      <button
        id="intro-back-btn"
        onClick={onBackToHome}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors focus:outline-hidden"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Learning Path</span>
      </button>

      {/* Main Introduction Card with photographic cover banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
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
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-600 text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
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
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Vocabulary Cards</p>
                <p className="text-sm font-bold text-slate-800">{lesson.words.length} Photo Flashcards</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Interactive Exercises</p>
                <p className="text-sm font-bold text-slate-800">Quiz & Fill-in-the-blank</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Spaced Recall</p>
                <p className="text-sm font-bold text-slate-800">Mistake-Targeted Review</p>
              </div>
            </div>
          </div>

          {/* Vocabulary Word List with Photographic Thumbnails */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Words in this lesson ({lesson.words.length})
              </h3>
              <span className="text-xs text-slate-400 font-medium">Click audio to preview pronunciation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lesson.words.map((word) => (
                <div
                  key={word.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 hover:bg-white transition-all text-sm group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                      <SafeImage
                        src={word.imageUrl}
                        alt={word.imageAlt || word.word}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
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
                    title="Listen to word"
                    className="w-8 h-8 rounded-lg bg-white group-hover:bg-indigo-50 text-slate-500 group-hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0 shadow-2xs border border-slate-200/60"
                  >
                    <Volume2 className="w-4 h-4" />
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
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Back to Learning Path
            </button>

            <button
              id="intro-start-learning-btn"
              onClick={onStartLearning}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-extrabold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-lg transition-all active:scale-98"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Flashcards</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
