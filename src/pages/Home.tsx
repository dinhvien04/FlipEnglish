import React, { useState, useEffect, useMemo } from 'react';
import { Lesson, AllProgress, CEFRLevel } from '../types';
import { NextActionRecommendation } from '../types/continuity';
import { LESSONS, getLessonById } from '../data/lessons';
import { getStoredProgress, getOverallStats } from '../utils/storage';
import { getReviewDashboardStats, REVIEW_UPDATED_EVENT } from '../utils/reviewStorage';
import { getLatestPlacementResult, PLACEMENT_UPDATED_EVENT } from '../features/placement/placementStorage';
import { CompactPlacementHistoryItem } from '../features/placement/placementTypes';
import { getOrGenerateTodayPlan, STUDY_PLAN_UPDATED_EVENT } from '../features/studyPlan/studyPlanStorage';
import { TodayStudyPlan } from '../features/studyPlan/studyPlanTypes';
import { CEFR_LEVELS_INFO } from '../data/curriculum/curriculumMeta';
import { CourseShelf } from '../components/CourseShelf';
import { LevelLibraryView } from '../components/LevelLibraryView';
import { LessonCard } from '../components/LessonCard';
import { ContinueLearningCard } from '../features/continuity/ContinueLearningCard';
import { ProgressSnapshotCard } from '../features/progress/ProgressSnapshotCard';
import { useI18n } from '../features/i18n';

interface HomeProps {
  onSelectLesson: (lesson: Lesson) => void;
  onOpenFlipLens?: () => void;
  onOpenExamCenter?: () => void;
  onNavigateReview?: () => void;
  onNavigateToday?: () => void;
  onStartPlacement?: () => void;
  onViewPlacementResult?: () => void;
  onNavigateHelp?: () => void;
  onNavigateContinueAction?: (recommendation: NextActionRecommendation) => void;
  initialLevelTab?: CEFRLevel | 'ALL';
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

export const Home: React.FC<HomeProps> = ({
  onSelectLesson,
  onOpenFlipLens,
  onOpenExamCenter,
  onNavigateReview,
  onNavigateToday,
  onStartPlacement,
  onViewPlacementResult,
  onNavigateHelp,
  onNavigateContinueAction,
  initialLevelTab = 'ALL',
}) => {
  const { t, isBilingual } = useI18n();
  const [progress, setProgress] = useState<AllProgress>(() => getStoredProgress());
  const [stats, setStats] = useState(() => getOverallStats(LESSONS.length));
  const [reviewStats, setReviewStats] = useState(() => getReviewDashboardStats());
  const [todayPlan, setTodayPlan] = useState<TodayStudyPlan>(() => getOrGenerateTodayPlan());
  const [latestPlacement, setLatestPlacement] = useState<CompactPlacementHistoryItem | null>(() =>
    getLatestPlacementResult()
  );
  const [selectedLevelTab, setSelectedLevelTab] = useState<CEFRLevel | 'ALL'>(initialLevelTab);
  const [viewAllLevel, setViewAllLevel] = useState<CEFRLevel | null>(
    initialLevelTab !== 'ALL' ? initialLevelTab : null
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Update selectedLevelTab if initialLevelTab prop changes
  useEffect(() => {
    setSelectedLevelTab(initialLevelTab);
    setViewAllLevel(initialLevelTab === 'ALL' ? null : initialLevelTab);
  }, [initialLevelTab]);

  // Listen to storage events to keep progress in sync
  useEffect(() => {
    const refresh = () => {
      setProgress(getStoredProgress());
      setStats(getOverallStats(LESSONS.length));
    };

    const refreshReview = () => {
      setReviewStats(getReviewDashboardStats());
    };

    const refreshPlacement = () => {
      setLatestPlacement(getLatestPlacementResult());
    };

    const refreshPlan = () => {
      setTodayPlan(getOrGenerateTodayPlan());
    };

    window.addEventListener('flipenglish_progress_updated', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener(REVIEW_UPDATED_EVENT, refreshReview);
    window.addEventListener(PLACEMENT_UPDATED_EVENT, refreshPlacement);
    window.addEventListener(STUDY_PLAN_UPDATED_EVENT, refreshPlan);
    window.addEventListener('focus', refreshPlan);
    return () => {
      window.removeEventListener('flipenglish_progress_updated', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener(REVIEW_UPDATED_EVENT, refreshReview);
      window.removeEventListener(PLACEMENT_UPDATED_EVENT, refreshPlacement);
      window.removeEventListener(STUDY_PLAN_UPDATED_EVENT, refreshPlan);
      window.removeEventListener('focus', refreshPlan);
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

  const [isGuideExpanded, setIsGuideExpanded] = useState<boolean>(false);

  // Curated Popular Starting Points
  const popularLessons = useMemo(() => {
    const found = POPULAR_STARTING_IDS.map((id) => LESSONS.find((l) => l.id === id)).filter(
      (l): l is Lesson => Boolean(l)
    );
    if (found.length > 0) return found;
    return LESSONS.slice(0, 6);
  }, []);

  // Global search results across all 72 curriculum lessons
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return LESSONS.filter((lesson) => {
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.description.toLowerCase().includes(q) ||
        lesson.level.toLowerCase().includes(q) ||
        (lesson.tags && lesson.tags.some((tag) => tag.toLowerCase().includes(q))) ||
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

  const hasMeaningfulHistory = stats.completedCount > 0 || reviewStats.totalTracked > 0 || latestPlacement !== null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* One-Tap Continue Learning Hero Card */}
      <ContinueLearningCard
        onContinue={(rec) => {
          if (onNavigateContinueAction) {
            onNavigateContinueAction(rec);
          } else if (rec.actionPayload?.lessonId) {
            const lesson = getLessonById(rec.actionPayload.lessonId);
            if (lesson) onSelectLesson(lesson);
          } else if (rec.targetView === 'today' && onNavigateToday) {
            onNavigateToday();
          } else if (rec.targetView === 'review' && onNavigateReview) {
            onNavigateReview();
          }
        }}
      />

      {/* Progress & Habit Snapshot Card */}
      <ProgressSnapshotCard
        estimatedLevel={latestPlacement?.estimatedLevel}
        dailyGoalMinutes={todayPlan.dailyMinutes}
        onNavigateToReview={onNavigateReview}
        onNavigateToGoalSettings={onNavigateToday}
      />

      {/* Today's Daily Plan Entrance Widget */}
      {onNavigateToday && (
        <section className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-indigo-700/60 shadow-lg shadow-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/15 text-indigo-200 border border-white/20">
                {t('today.title')}
              </span>
              <span className="text-2xs text-indigo-300 font-bold">
                {todayPlan.dailyMinutes} min
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {todayPlan.tasks.filter((tk) => tk.status === 'completed').length === todayPlan.tasks.length && todayPlan.tasks.length > 0
                ? t('today.target.allDone')
                : t('today.target.completed', {
                    completed: todayPlan.tasks.filter((tk) => tk.status === 'completed').length,
                    target: todayPlan.tasks.length,
                  })}
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed max-w-xl">
              {t('today.subtitle')}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              type="button"
              id="home-open-today-plan-btn"
              onClick={onNavigateToday}
              className="min-h-12 px-6 py-3 rounded-2xl bg-white hover:bg-slate-100 active:scale-98 text-indigo-950 font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer inline-flex items-center justify-center"
            >
              {t('home.hero.todayPlan')}
            </button>
          </div>
        </section>
      )}

      {/* Beginner / Returning Guidance Section */}
      {hasMeaningfulHistory && !isGuideExpanded ? (
        /* Compact Returning User Help Panel */
        <section className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                {t('home.guide.compactTitle')}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {t('home.guide.returningHelp')}
            </h3>
            <p className="text-xs text-slate-600">
              {t('home.guide.whereToStartSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsGuideExpanded(true)}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 min-h-11 px-4 py-2 rounded-xl transition-colors cursor-pointer inline-flex items-center"
            >
              {t('home.guide.showGuide')}
            </button>
            {onNavigateHelp && (
              <button
                type="button"
                onClick={onNavigateHelp}
                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 min-h-11 px-4 py-2 rounded-xl transition-colors cursor-pointer inline-flex items-center"
              >
                {t('ui.nav.help')}
              </button>
            )}
          </div>
        </section>
      ) : (
        /* Full Beginner Guidance Panel ("Where should I start?") */
        <section className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {t('home.guide.whereToStart')}
                  </h2>
                  {isBilingual && (
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider hidden sm:inline" lang="en">
                      {t('bilingual.whereToStart')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hasMeaningfulHistory && isGuideExpanded && (
                  <button
                    type="button"
                    onClick={() => setIsGuideExpanded(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {t('home.guide.hideGuide')}
                  </button>
                )}
                {onNavigateHelp && (
                  <button
                    type="button"
                    onClick={onNavigateHelp}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                  >
                    {t('ui.nav.help')}
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              {t('home.guide.whereToStartSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Option 1: Unknown Level */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  1. {t('placement.title')}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {t('home.guide.unknownLevelTitle')}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('home.guide.unknownLevelDesc')}
                </p>
              </div>
              {onStartPlacement && (
                <button
                  type="button"
                  onClick={onStartPlacement}
                  className="w-full min-h-11 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  {t('home.guide.unknownLevelAction')}
                </button>
              )}
            </div>

            {/* Option 2: Know Level */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  2. {t('ui.nav.curriculum')}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {t('home.guide.knowLevelTitle')}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('home.guide.knowLevelDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('curriculum-navigation-heading');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full min-h-11 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                {t('home.guide.knowLevelAction')}
              </button>
            </div>

            {/* Option 3: Spaced Repetition Review */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  3. {t('review.title')}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {t('home.guide.reviewTitle')}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('home.guide.reviewDesc')}
                </p>
              </div>
              {onNavigateReview && (
                <button
                  type="button"
                  onClick={onNavigateReview}
                  className="w-full min-h-11 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  {t('home.guide.reviewAction')}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))]" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold tracking-wide">
              <span>{t('home.levelLibrary.title')}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {t('home.hero.title')}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              {t('home.hero.subtitle')}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs font-semibold text-slate-300">
              <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <span>{LESSONS.length} {t('ui.nav.curriculum')}</span>
              </div>
              <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <span>{totalWordsInApp}+ {t('ui.nav.dictionary')}</span>
              </div>
              <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <span>{t('ui.common.offlineAvailable')}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Placement Result Box OR Progress Tracker */}
          <div className="w-full lg:w-84 shrink-0 space-y-4">
            {latestPlacement ? (
              /* Compact Placement Result Widget */
              <div className="bg-slate-800/95 backdrop-blur-md p-5 rounded-2xl border border-slate-700 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-indigo-400">
                    {t('home.stats.estimatedLevel')}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {latestPlacement.confidence}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-2xl text-white shadow-md">
                    {latestPlacement.estimatedLevel}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {latestPlacement.estimatedLevel} Foundation
                    </h3>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      {t('ui.common.score')}: {latestPlacement.overallPercentage}% • {latestPlacement.date}
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    id="home-continue-level-btn"
                    onClick={() => handleOpenViewAll(latestPlacement.estimatedLevel)}
                    className="flex-1 min-h-11 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer inline-flex items-center justify-center"
                  >
                    {t('ui.common.continue')} {latestPlacement.estimatedLevel}
                  </button>
                  {onViewPlacementResult && (
                    <button
                      type="button"
                      id="home-view-placement-result-btn"
                      onClick={onViewPlacementResult}
                      className="min-h-11 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs border border-slate-600 transition-colors cursor-pointer inline-flex items-center justify-center"
                    >
                      {t('ui.common.details')}
                    </button>
                  )}
                </div>
              </div>
            ) : onStartPlacement ? (
              /* Onboarding Placement Check CTA */
              <div className="bg-slate-800/95 backdrop-blur-md p-5 rounded-2xl border border-slate-700 shadow-lg space-y-3">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-2xs font-bold uppercase tracking-wider">
                  {t('home.guide.unknownLevelTitle')}
                </div>
                <h3 className="text-base font-bold text-white leading-snug">
                  {t('home.guide.unknownLevelDesc')}
                </h3>
                <p className="text-2xs text-slate-300">
                  24 questions • ~10 min • A1 to C2
                </p>
                <button
                  type="button"
                  id="home-find-my-level-btn"
                  onClick={onStartPlacement}
                  className="w-full min-h-12 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer inline-flex items-center justify-center"
                >
                  {t('home.hero.quickPlacement')}
                </button>
              </div>
            ) : null}

            {/* Quick Progress Tracker Box */}
            <div className="bg-slate-800/90 backdrop-blur-md p-5 rounded-2xl border border-slate-700 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">{t('home.stats.overallProgress')}</p>
                  <p className="text-lg font-black text-white">
                    {stats.completedCount} <span className="text-xs font-normal text-slate-400">/ {stats.totalLessonsCount} {t('ui.common.all')}</span>
                  </p>
                </div>
                <span className="text-xs font-extrabold text-indigo-400">{stats.percentage}%</span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
                <p className="text-2xs text-slate-400 text-right">
                  {stats.completedCount === stats.totalLessonsCount && stats.totalLessonsCount > 0
                    ? t('today.target.allDone')
                    : `${stats.totalLessonsCount - stats.completedCount} lessons remaining`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Entry Cards: Smart Review, FlipLens & Exam Center */}
      <section className={`grid grid-cols-1 md:grid-cols-2 ${onOpenFlipLens ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
        {/* Card 1: Smart Review */}
        <div className="relative overflow-hidden rounded-3xl bg-indigo-900 p-6 sm:p-7 text-white border border-indigo-700/50 shadow-lg shadow-indigo-950/20 flex flex-col justify-between space-y-6">
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 text-indigo-200 border border-white/20 text-xs font-bold uppercase tracking-wider">
                <span>{t('ui.nav.review')}</span>
              </div>
              {reviewStats.dueCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-2xs font-extrabold shadow-2xs">
                  {reviewStats.dueCount} Due
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {t('review.title')}
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
              {t('review.subtitle')}
            </p>
          </div>

          {onNavigateReview && (
            <button
              type="button"
              id="home-open-review-btn"
              onClick={onNavigateReview}
              className="self-start min-h-12 px-6 py-3 rounded-2xl bg-white hover:bg-slate-100 active:scale-98 text-indigo-950 font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center"
            >
              {reviewStats.dueCount > 0
                ? `${t('review.title')} (${reviewStats.dueCount})`
                : t('ui.nav.review')}
            </button>
          )}
        </div>

        {/* Card 2: FlipLens (Only when AI is configured) */}
        {onOpenFlipLens && (
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 sm:p-7 text-white border border-slate-800 shadow-lg shadow-slate-950/20 flex flex-col justify-between space-y-6">
            <div className="relative z-10 space-y-2.5">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
                <span>{t('ui.nav.fliplens')}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {t('fliplens.title')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t('fliplens.subtitle')}
              </p>
            </div>

            <button
              type="button"
              id="home-try-fliplens-btn"
              onClick={onOpenFlipLens}
              className="self-start min-h-12 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center"
            >
              {t('ui.nav.fliplens')}
            </button>
          </div>
        )}

        {/* Card 3: Practice Exam Center */}
        <div className={`relative overflow-hidden rounded-3xl bg-slate-900 p-6 sm:p-7 text-white border border-slate-800 shadow-lg shadow-slate-950/20 flex flex-col justify-between space-y-6 ${onOpenFlipLens ? 'md:col-span-2 lg:col-span-1' : ''}`}>
          <div className="relative z-10 space-y-2.5">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
              <span>{t('ui.nav.exams')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {t('exam.title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t('exam.subtitle')}
            </p>
          </div>

          {onOpenExamCenter && (
            <button
              type="button"
              id="home-open-exam-center-btn"
              onClick={onOpenExamCenter}
              className="self-start min-h-12 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center"
            >
              {t('exam.title')}
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
              <div className="flex items-center gap-2">
                <h2 id="curriculum-navigation-heading" className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {t('home.levelLibrary.title')}
                </h2>
                {isBilingual && (
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider hidden sm:inline" lang="en">
                    {t('bilingual.curriculum')}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {t('home.levelLibrary.subtitle')}
              </p>
            </div>

            {/* Global Search Bar */}
            <div className="relative w-full md:w-80">
              <label htmlFor="home-search-input" className="sr-only">
                {t('ui.common.search')}
              </label>
              <input
                type="search"
                id="home-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('home.search.placeholder')}
                className="w-full pl-4 pr-14 py-2.5 bg-white rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search input"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-11 px-3 inline-flex items-center justify-center text-xs text-slate-500 hover:text-slate-900 font-bold cursor-pointer rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {t('ui.common.cancel')}
                </button>
              )}
            </div>
          </div>

          {/* Level Switcher Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none py-1">
            <button
              type="button"
              id="cefr-tab-all"
              onClick={() => handleSelectLevelTab('ALL')}
              className={`min-h-11 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all cursor-pointer inline-flex items-center justify-center ${
                selectedLevelTab === 'ALL' && viewAllLevel === null
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('home.filter.all')} ({LESSONS.length})
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
                  className={`min-h-11 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                  {t('ui.common.search')}: "{searchQuery}"
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Found {searchResults.length} lessons across curriculum.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                {t('ui.common.cancel')}
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
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <p className="text-base font-bold text-slate-700">{t('home.search.noResults', { query: searchQuery })}</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  {t('ui.common.tryAgain')}
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
                title={t('home.resume.title')}
                badgeLabel="Recent"
                badgeStyle="bg-emerald-600 text-white"
                description={t('home.resume.subtitle')}
                lessons={continueLearningLessons}
                progress={progress}
                onSelectLesson={onSelectLesson}
              />
            )}

            {/* Popular Starting Points Shelf (Curated, shown in All mode) */}
            {selectedLevelTab === 'ALL' && (
              <CourseShelf
                shelfId="popular-start"
                title={t('home.startingPoints.title')}
                badgeLabel="Foundation"
                badgeStyle="bg-amber-600 text-white"
                description={t('home.startingPoints.subtitle')}
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
