import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  BookOpen,
  Layers,
  Award,
  Sparkles,
  Camera,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
} from 'lucide-react';
import { Lesson, AllProgress, CEFRLevel } from '../types';
import { LESSONS } from '../data/lessons';
import { getStoredProgress, getOverallStats } from '../utils/storage';
import { CEFR_LEVELS_INFO } from '../data/curriculum/curriculumMeta';
import { CourseShelf } from '../components/CourseShelf';
import { LevelLibraryView } from '../components/LevelLibraryView';
import { LessonCard } from '../components/LessonCard';

interface HomeProps {
  onSelectLesson: (lesson: Lesson) => void;
  onOpenFlipLens: () => void;
  onOpenExamCenter?: () => void;
}

const ALL_LEVEL_KEYS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Curated Popular Starting Points IDs
const POPULAR_STARTING_IDS = [
  'greetings',
  'food',
  'travel',
  'shopping',
  'technology',
  'career-workplace',
];

export const Home: React.FC<HomeProps> = ({ onSelectLesson, onOpenFlipLens, onOpenExamCenter }) => {
  const [progress, setProgress] = useState<AllProgress>(() => getStoredProgress());
  const [stats, setStats] = useState(() => getOverallStats(LESSONS.length));
  const [selectedLevelTab, setSelectedLevelTab] = useState<CEFRLevel | 'ALL'>('ALL');
  const [viewAllLevel, setViewAllLevel] = useState<CEFRLevel | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Listen to storage events to keep progress in sync
  useEffect(() => {
    const refresh = () => {
      setProgress(getStoredProgress());
      setStats(getOverallStats(LESSONS.length));
    };

    window.addEventListener('flipenglish_progress_updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('flipenglish_progress_updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const totalWordsInApp = useMemo(
    () => LESSONS.reduce((acc, l) => acc + l.words.length, 0),
    []
  );

  // Continue Learning lessons: items with existing progress
  const continueLearningLessons = useMemo(() => {
    return LESSONS.filter((l) => progress[l.id] && progress[l.id].completed)
      .sort((a, b) => {
        const timeA = progress[a.id]?.lastLearnedAt ? new Date(progress[a.id].lastLearnedAt!).getTime() : 0;
        const timeB = progress[b.id]?.lastLearnedAt ? new Date(progress[b.id].lastLearnedAt!).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 8);
  }, [progress]);

  // Curated Popular Starting Points
  const popularLessons = useMemo(() => {
    const found = POPULAR_STARTING_IDS.map((id) => LESSONS.find((l) => l.id === id)).filter(
      (l): l is Lesson => Boolean(l)
    );
    if (found.length > 0) return found;
    return LESSONS.slice(0, 6);
  }, []);

  // Global search results across all 72+ curriculum lessons
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return LESSONS.filter((lesson) => {
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.description.toLowerCase().includes(q) ||
        lesson.level.toLowerCase().includes(q) ||
        (lesson.tags && lesson.tags.some((t) => t.toLowerCase().includes(q))) ||
        lesson.words.some(
          (w) =>
            w.word.toLowerCase().includes(q) ||
            w.meaning.toLowerCase().includes(q)
        )
      );
    });
  }, [searchQuery]);

  // Handle switching tabs
  const handleSelectLevelTab = (lvl: CEFRLevel | 'ALL') => {
    setSelectedLevelTab(lvl);
    setViewAllLevel(null);
  };

  // Handle "View All" on a specific level
  const handleOpenViewAll = (lvl: CEFRLevel) => {
    setViewAllLevel(lvl);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleBackToShelves = () => {
    setViewAllLevel(null);
  };

  // Determine active level shelves to render
  const visibleLevelKeys = useMemo(() => {
    if (selectedLevelTab === 'ALL') {
      return ALL_LEVEL_KEYS;
    }
    return [selectedLevelTab];
  }, [selectedLevelTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 overflow-x-hidden">
      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))]" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Comprehensive CEFR A1 — C2 Curriculum</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Master English Vocabulary <br className="hidden sm:inline" />
              <span className="text-indigo-400">with Real-World Visuals</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              From beginner essentials to executive precision and native eloquence. Flip through realistic photographic cards, hear native pronunciations, take listening challenges, and learn from mistakes with Gemini AI.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>{LESSONS.length} Structured Lessons</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>{totalWordsInApp}+ Curated Items</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Zero Sign-up Required</span>
              </div>
            </div>
          </div>

          {/* Quick Progress Tracker Box */}
          <div className="w-full lg:w-80 shrink-0 bg-slate-800/90 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Overall Progress</p>
                  <p className="text-xl font-black text-white">
                    {stats.completedCount} <span className="text-xs font-normal text-slate-400">/ {stats.totalLessonsCount} Lessons</span>
                  </p>
                </div>
              </div>
              <span className="text-sm font-extrabold text-indigo-400">{stats.percentage}%</span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-2.5 w-full bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              <p className="text-2xs text-slate-400 text-right">
                {stats.completedCount === stats.totalLessonsCount && stats.totalLessonsCount > 0
                  ? 'All lessons completed! Outstanding work.'
                  : `${stats.totalLessonsCount - stats.completedCount} lessons remaining`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Entry Cards: FlipLens & Exam Center */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: ✨ FlipLens */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white border border-indigo-500/30 shadow-lg shadow-indigo-950/20 flex flex-col justify-between space-y-6">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>✨ FlipLens</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Learn English From Your World
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Take or upload a real-world photo. Gemini AI detects objects in the image and generates interactive flashcards and quizzes instantly.
            </p>
          </div>

          <button
            type="button"
            id="home-try-fliplens-btn"
            onClick={onOpenFlipLens}
            className="self-start inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer group"
          >
            <Camera className="w-4 h-4 text-indigo-200 group-hover:scale-110 transition-transform" />
            <span>Try FlipLens</span>
            <ArrowRight className="w-4 h-4 text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Card 2: 🎯 Exam Center */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 sm:p-7 text-white border border-slate-800 shadow-lg shadow-slate-950/20 flex flex-col justify-between space-y-6">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>🎯 Practice Exam Center</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Timed CEFR Practice Exams
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Test your vocabulary, Use of English, and reading with authentic timers, question navigator, and Gemini diagnostic breakdown.
            </p>
          </div>

          {onOpenExamCenter && (
            <button
              type="button"
              id="home-open-exam-center-btn"
              onClick={onOpenExamCenter}
              className="self-start inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer group"
            >
              <Trophy className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>Go to Exam Center</span>
              <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </section>

      {/* Curriculum Navigation Section */}
      <div className="space-y-8">
        {/* Navigation Bar: Level Selector & Global Search */}
        <div className="space-y-4 border-b border-slate-200/90 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Curriculum Shelves
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Browse courses horizontally by CEFR level or select a tier below.
              </p>
            </div>

            {/* Global Search Bar */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                id="home-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lessons, words or topics..."
                className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-2xs"
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
          </div>

          {/* Level Switcher Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              id="cefr-tab-all"
              onClick={() => handleSelectLevelTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all cursor-pointer ${
                selectedLevelTab === 'ALL' && viewAllLevel === null
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Shelves ({LESSONS.length})
            </button>

            {ALL_LEVEL_KEYS.map((lvl) => {
              const count = LESSONS.filter((l) => l.level === lvl).length;
              const isSelected = selectedLevelTab === lvl || viewAllLevel === lvl;
              const info = CEFR_LEVELS_INFO[lvl];

              return (
                <button
                  key={lvl}
                  type="button"
                  id={`cefr-tab-${lvl.toLowerCase()}`}
                  onClick={() => handleSelectLevelTab(lvl)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? `${info.badgeBg} shadow-md`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{lvl}</span>
                  <span
                    className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Global Search Mode (if search is active) */}
        {searchQuery.trim() ? (
          <section className="space-y-6 animate-fadeIn" aria-label="Search results">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Search Results for "{searchQuery}"
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Found {searchResults.length} {searchResults.length === 1 ? 'lesson' : 'lessons'} across the curriculum.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {searchResults.map((lesson) => (
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
                <p className="text-base font-bold text-slate-700">No lessons matched "{searchQuery}"</p>
                <p className="text-xs text-slate-500 mt-1">Try searching for other words like "business", "food", "travel", or "idiom".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Reset Search
                </button>
              </div>
            )}
          </section>
        ) : viewAllLevel ? (
          /* 2. View All Level Library Mode */
          <LevelLibraryView
            level={viewAllLevel}
            lessons={LESSONS.filter((l) => l.level === viewAllLevel)}
            progress={progress}
            onSelectLesson={onSelectLesson}
            onBackToShelves={handleBackToShelves}
          />
        ) : (
          /* 3. Horizontal Course Shelves Mode */
          <div className="space-y-12">
            {/* Continue Learning Shelf (Only shown if progress exists) */}
            {continueLearningLessons.length > 0 && selectedLevelTab === 'ALL' && (
              <CourseShelf
                shelfId="continue-learning"
                title="Continue Learning"
                badgeLabel="Recent"
                badgeStyle="bg-emerald-600 text-white"
                icon={<Clock className="w-5 h-5 text-emerald-600" />}
                description="Pick up right where you left off with your recently practiced vocabulary topics."
                lessons={continueLearningLessons}
                progress={progress}
                onSelectLesson={onSelectLesson}
              />
            )}

            {/* Popular Starting Points Shelf (Curated, shown in All mode) */}
            {selectedLevelTab === 'ALL' && (
              <CourseShelf
                shelfId="popular-start"
                title="Start Here — Popular Foundations"
                badgeLabel="Recommended"
                badgeStyle="bg-amber-600 text-white"
                icon={<Flame className="w-5 h-5 text-amber-500" />}
                description="Essential starter topics covering high-frequency daily conversations, travel, food, and workplace skills."
                lessons={popularLessons}
                progress={progress}
                onSelectLesson={onSelectLesson}
              />
            )}

            {/* CEFR Level Shelves */}
            {visibleLevelKeys.map((lvl) => {
              const levelLessons = LESSONS.filter((l) => l.level === lvl);
              if (levelLessons.length === 0) return null;

              const info = CEFR_LEVELS_INFO[lvl];
              const completedCount = levelLessons.filter((l) => progress[l.id]?.completed).length;
              const totalWords = levelLessons.reduce((acc, l) => acc + l.words.length, 0);

              return (
                <CourseShelf
                  key={lvl}
                  shelfId={`level-${lvl.toLowerCase()}`}
                  title={`${lvl} — ${info.title}`}
                  badgeLabel={lvl}
                  badgeStyle={info.badgeBg}
                  description={info.description}
                  statsText={`${levelLessons.length} Lessons • ~${totalWords} Words`}
                  completedCount={completedCount}
                  totalCount={levelLessons.length}
                  lessons={levelLessons}
                  progress={progress}
                  onSelectLesson={onSelectLesson}
                  onViewAll={() => handleOpenViewAll(lvl)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
