import React from 'react';
import { Lesson, LessonProgress } from '../types';
import { SafeImage } from './SafeImage';

interface LessonCardProps {
  lesson: Lesson;
  progress: LessonProgress | null;
  onSelect: (lesson: Lesson) => void;
  className?: string;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  progress,
  onSelect,
  className = '',
}) => {
  const isCompleted = progress?.completed ?? false;
  const bestScore = progress?.bestScore ?? 0;

  // CEFR level badge styling across A1-C2
  const levelBadge: Record<string, string> = {
    A1: 'bg-emerald-600 text-white',
    A2: 'bg-sky-600 text-white',
    B1: 'bg-indigo-600 text-white',
    B2: 'bg-purple-600 text-white',
    C1: 'bg-rose-600 text-white',
    C2: 'bg-amber-600 text-white',
  };

  return (
    <div
      id={`lesson-card-${lesson.id}`}
      onClick={() => onSelect(lesson)}
      role="button"
      tabIndex={0}
      aria-label={`Open lesson: ${lesson.title}, Level ${lesson.level}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(lesson);
        }
      }}
      className={`group relative flex flex-col bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 hover:-translate-y-0.5 h-full select-none ${className}`}
    >
      {/* 16:10 Photographic Image Container */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 shrink-0">
        <SafeImage
          src={lesson.imageUrl}
          alt={lesson.imageAlt || lesson.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

        {/* Level Badge Overlay */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span
            className={`text-2xs sm:text-xs font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-2xs ${
              levelBadge[lesson.level] || 'bg-slate-800 text-white'
            }`}
          >
            {lesson.level}
          </span>
        </div>

        {/* Completed Badge Overlay */}
        {isCompleted && (
          <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-2xs sm:text-xs font-bold px-2 py-0.5 rounded-md shadow-2xs z-10">
            <span>Score: {bestScore}%</span>
          </div>
        )}

        {/* Word Count Badge at bottom of image */}
        <div className="absolute bottom-2 left-2.5 text-white text-2xs sm:text-xs font-semibold drop-shadow-sm z-10">
          <span>{lesson.words.length} Vocabulary Items</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {lesson.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed h-8">
            {lesson.description}
          </p>
        </div>

        {/* Footer Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
          {isCompleted ? (
            <span className="text-emerald-700">
              Completed
            </span>
          ) : (
            <span className="text-indigo-600 group-hover:text-indigo-700 transition-colors">
              Start Lesson
            </span>
          )}

          <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">
            Open
          </span>
        </div>
      </div>
    </div>
  );
};


