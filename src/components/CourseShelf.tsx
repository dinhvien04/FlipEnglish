import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Lesson, AllProgress } from '../types';
import { LessonCard } from './LessonCard';
import { useI18n } from '../features/i18n';

interface CourseShelfProps {
  shelfId: string;
  title: string;
  badgeLabel?: string;
  badgeStyle?: string;
  description?: string;
  statsText?: string;
  completedCount?: number;
  totalCount?: number;
  lessons: Lesson[];
  progress: AllProgress;
  onSelectLesson: (lesson: Lesson) => void;
  onViewAll?: () => void;
}

export const CourseShelf: React.FC<CourseShelfProps> = ({
  shelfId,
  title,
  badgeLabel,
  badgeStyle = 'bg-slate-900 text-white',
  description,
  statsText,
  completedCount,
  totalCount,
  lessons,
  progress,
  onSelectLesson,
  onViewAll,
}) => {
  const { t } = useI18n();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll boundary to enable/disable navigation buttons
  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    const timeoutId = setTimeout(checkScroll, 200);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timeoutId);
    };
  }, [checkScroll, lessons]);

  const handleScrollBy = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollAmount = Math.max(el.clientWidth * 0.78, 280);
    const targetScroll = direction === 'left' ? el.scrollLeft - scrollAmount : el.scrollLeft + scrollAmount;

    el.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  if (lessons.length === 0) {
    return null;
  }

  const isAllCompleted = totalCount !== undefined && completedCount !== undefined && totalCount > 0 && completedCount === totalCount;

  return (
    <section
      id={`course-shelf-${shelfId}`}
      className="space-y-4 pt-2"
      aria-label={t('curriculum.shelfAria', { title })}
    >
      {/* Shelf Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            {badgeLabel && (
              <span className={`text-2xs sm:text-xs font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${badgeStyle}`}>
                {badgeLabel}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {title}
            </h2>

            {completedCount !== undefined && totalCount !== undefined && totalCount > 0 && (
              <span className={`text-2xs font-bold px-2 py-0.5 rounded-md ${
                isAllCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {t('curriculum.completed', { completed: completedCount, total: totalCount })}
              </span>
            )}
          </div>

          {description && (
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Action Controls: View All & Previous / Next buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          {statsText && (
            <span className="text-xs text-slate-400 font-semibold hidden md:inline">
              {statsText}
            </span>
          )}

          {onViewAll && (
            <button
              type="button"
              id={`view-all-${shelfId}-btn`}
              onClick={onViewAll}
              className="min-h-11 px-3 py-1.5 inline-flex items-center text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer rounded-lg"
            >
              {t('curriculum.viewAll')}
            </button>
          )}

          {/* Desktop/Tablet Text Scroll Buttons (hidden on narrow phone where native horizontal swipe is primary) */}
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200">
            <button
              type="button"
              id={`shelf-prev-${shelfId}`}
              onClick={() => handleScrollBy('left')}
              disabled={!canScrollLeft}
              aria-label={t('curriculum.previousLessonsAria', { title })}
              className={`min-h-11 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center justify-center cursor-pointer ${
                canScrollLeft
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs active:scale-95'
                  : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
              }`}
            >
              {t('curriculum.prev')}
            </button>

            <button
              type="button"
              id={`shelf-next-${shelfId}`}
              onClick={() => handleScrollBy('right')}
              disabled={!canScrollRight}
              aria-label={t('curriculum.nextLessonsAria', { title })}
              className={`min-h-11 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center justify-center cursor-pointer ${
                canScrollRight
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs active:scale-95'
                  : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-50'
              }`}
            >
              {t('curriculum.next')}
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Course Rail */}
      <div className="relative group/rail">
        <div
          ref={scrollContainerRef}
          className="course-rail-container gap-4 sm:gap-5 pb-3 pt-1 px-0.5"
          tabIndex={0}
          role="region"
          aria-label={t('curriculum.lessonsListAria', { title })}
        >
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="w-[78vw] sm:w-[280px] md:w-[290px] lg:w-[300px] max-w-[310px] shrink-0 course-rail-item"
            >
              <LessonCard
                lesson={lesson}
                progress={progress[lesson.id] || null}
                onSelect={onSelectLesson}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
