import React, { useState, useMemo } from 'react';
import { Lesson, AllProgress, CEFRLevel } from '../types';
import { CEFR_LEVELS_INFO } from '../data/curriculum/curriculumMeta';
import { LessonCard } from './LessonCard';

interface LevelLibraryViewProps {
  level: CEFRLevel;
  lessons: Lesson[];
  progress: AllProgress;
  onSelectLesson: (lesson: Lesson) => void;
  onBackToShelves: () => void;
}

export const LevelLibraryView: React.FC<LevelLibraryViewProps> = ({
  level,
  lessons,
  progress,
  onSelectLesson,
  onBackToShelves,
}) => {
  const levelInfo = CEFR_LEVELS_INFO[level];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  // Extract unique tags/types for filter pills
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    lessons.forEach((l) => {
      if (l.tags) {
        l.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet);
  }, [lessons]);

  // Compute level stats
  const completedLessonsCount = useMemo(() => {
    return lessons.filter((l) => progress[l.id]?.completed).length;
  }, [lessons, progress]);

  const totalWordsInLevel = useMemo(() => {
    return lessons.reduce((acc, l) => acc + l.words.length, 0);
  }, [lessons]);

  const levelPercentage = lessons.length > 0 ? Math.round((completedLessonsCount / lessons.length) * 100) : 0;

  // Filter lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      // Tag filter
      if (selectedTag !== 'ALL') {
        const matchesTag = lesson.tags && lesson.tags.includes(selectedTag);
        if (!matchesTag) return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.description.toLowerCase().includes(q) ||
        (lesson.tags && lesson.tags.some((t) => t.toLowerCase().includes(q))) ||
        lesson.words.some(
          (w) =>
            w.word.toLowerCase().includes(q) ||
            w.meaning.toLowerCase().includes(q)
        )
      );
    });
  }, [lessons, selectedTag, searchQuery]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          id="back-to-shelves-btn"
          onClick={onBackToShelves}
          className="text-xs sm:text-sm font-bold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shadow-2xs transition-all cursor-pointer"
        >
          Back to All Shelves
        </button>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
          Viewing {lessons.length} {level} Lessons
        </span>
      </div>

      {/* Level Header Banner */}
      <div className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.2),rgba(255,255,255,0))]" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-xs font-black px-3.5 py-1 rounded-lg uppercase tracking-wider ${levelInfo.badgeBg}`}>
                {level}
              </span>
              <span className="text-xs font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/30">
                {levelInfo.title} Tier
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {level} — {levelInfo.title} Curriculum
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              {levelInfo.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300">
              <span className="bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700 font-semibold">
                {lessons.length} Structured Lessons
              </span>
              <span className="bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700 font-semibold">
                ~{totalWordsInLevel} Curated Items
              </span>
            </div>
          </div>

          {/* Level Progress Widget */}
          <div className="w-full md:w-64 shrink-0 bg-slate-800/90 backdrop-blur-md p-5 rounded-2xl border border-slate-700 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Level Progress</span>
              <span className="text-sm font-black text-indigo-400">{levelPercentage}%</span>
            </div>

            <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all duration-700"
                style={{ width: `${levelPercentage}%` }}
              />
            </div>

            <p className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Completed:</span>
              <span className="font-bold text-white">{completedLessonsCount} / {lessons.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Level Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            id={`level-search-${level}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${level} lessons or vocabulary...`}
            className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tag Filters */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedTag('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedTag === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Topics ({lessons.length})
            </button>

            {availableTags.slice(0, 6).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 capitalize transition-all cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of Lesson Cards */}
      {filteredLessons.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              progress={progress[lesson.id] || null}
              onSelect={onSelectLesson}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-base font-bold text-slate-700">No {level} lessons matched your search "{searchQuery}"</p>
          <p className="text-xs text-slate-500 mt-1">Try searching a different word or clear your filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedTag('ALL');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};

