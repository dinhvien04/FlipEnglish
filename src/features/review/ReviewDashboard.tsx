import React, { useEffect, useState, useRef } from 'react';
import {
  ReviewDashboardStats,
  ResolvedReviewItem,
  ReviewSessionSummary,
  ReviewRating,
} from '../../types/review';
import {
  getReviewDashboardStats,
  getDueReviewItems,
  getAllTrackedReviewItems,
  resetReviewStorage,
  batchAddLessonWordsToReview,
  REVIEW_UPDATED_EVENT,
  DEFAULT_SESSION_MAX_DUE,
} from '../../utils/reviewStorage';
import { ReviewSession } from './ReviewSession';
import { ReviewResult } from './ReviewResult';
import { ReviewResumeContext } from '../../types/sessionResume';
import { normalizeReviewResumeContext } from '../../utils/sessionResume';
import { useI18n } from '../i18n';

interface ReviewDashboardProps {
  onNavigateToHome: () => void;
  resumeContext?: ReviewResumeContext | null;
  onResumeConsumed?: () => void;
  onLookupWord?: (word: string, resumeContext: ReviewResumeContext) => void;
}

export const ReviewDashboard: React.FC<ReviewDashboardProps> = ({
  onNavigateToHome,
  resumeContext = null,
  onResumeConsumed,
  onLookupWord,
}) => {
  const { t } = useI18n();
  const [stats, setStats] = useState<ReviewDashboardStats>(getReviewDashboardStats());

  // Normalized review resume if present and valid
  const normalizedResume = normalizeReviewResumeContext(resumeContext);

  const [activeQueue, setActiveQueue] = useState<ResolvedReviewItem[] | null>(() => {
    if (normalizedResume) {
      return normalizedResume.activeQueue;
    }
    return null;
  });
  const [sessionSummary, setSessionSummary] = useState<ReviewSessionSummary | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Signal consumption of resume context (one-shot) after initial mount
  const didConsumeResumeRef = useRef<boolean>(false);

  useEffect(() => {
    if (resumeContext && !didConsumeResumeRef.current) {
      didConsumeResumeRef.current = true;
      onResumeConsumed?.();
    }
  }, [resumeContext, onResumeConsumed]);

  // Sync state whenever review updates occur
  const refreshStats = () => {
    setStats(getReviewDashboardStats());
  };

  useEffect(() => {
    refreshStats();
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'flipenglish_review_v1') {
        refreshStats();
      }
    };
    window.addEventListener(REVIEW_UPDATED_EVENT, refreshStats);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(REVIEW_UPDATED_EVENT, refreshStats);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleStartDueReview = () => {
    const queue = getDueReviewItems(DEFAULT_SESSION_MAX_DUE);
    if (queue.length > 0) {
      setSessionSummary(null);
      setActiveQueue(queue);
    }
  };

  const handleStartAllReview = () => {
    const queue = getAllTrackedReviewItems(DEFAULT_SESSION_MAX_DUE);
    if (queue.length > 0) {
      setSessionSummary(null);
      setActiveQueue(queue);
    }
  };

  const handleFinishSession = (summary: ReviewSessionSummary) => {
    setActiveQueue(null);
    setSessionSummary(summary);
    refreshStats();
  };

  const handleExitSession = () => {
    setActiveQueue(null);
    refreshStats();
  };

  const handleLookup = (
    word: string,
    sessionState: { currentIndex: number; ratingBreakdown: Record<ReviewRating, number> }
  ) => {
    if (onLookupWord && activeQueue) {
      onLookupWord(word, {
        activeQueue,
        currentIndex: sessionState.currentIndex,
        ratingBreakdown: sessionState.ratingBreakdown,
      });
    }
  };

  const handleAddA1Essentials = () => {
    batchAddLessonWordsToReview('greetings');
    batchAddLessonWordsToReview('family');
    batchAddLessonWordsToReview('food-drink');
    refreshStats();
  };

  const handleConfirmReset = () => {
    resetReviewStorage();
    setShowResetConfirm(false);
    refreshStats();
  };

  // If in active session
  if (activeQueue && activeQueue.length > 0) {
    return (
      <ReviewSession
        queue={activeQueue}
        initialIndex={normalizedResume?.currentIndex}
        initialRatingBreakdown={normalizedResume?.ratingBreakdown}
        onFinishSession={handleFinishSession}
        onExit={handleExitSession}
        onLookupWord={onLookupWord ? handleLookup : undefined}
      />
    );
  }

  // If viewing session result
  if (sessionSummary) {
    return (
      <ReviewResult
        summary={sessionSummary}
        onBackToReviewDashboard={() => {
          setSessionSummary(null);
          refreshStats();
        }}
        onContinueCurriculum={onNavigateToHome}
        onReviewRemaining={handleStartDueReview}
      />
    );
  }

  const hasTrackedItems = stats.totalTracked > 0;
  const hasDueItems = stats.dueCount > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('review.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            {t('review.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="review-back-home-btn"
            type="button"
            onClick={onNavigateToHome}
            className="min-h-11 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
          >
            {t('ui.nav.curriculum')}
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Due Now */}
        <div
          id="stat-due-now"
          className={`p-5 rounded-2xl border transition-all ${
            hasDueItems
              ? 'bg-indigo-50/70 border-indigo-200 shadow-xs'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-2xs font-extrabold uppercase tracking-wider text-slate-600">
            {t('home.stats.dueReviews')}
          </div>
          <div
            className={`text-3xl sm:text-4xl font-black mt-2 ${
              hasDueItems ? 'text-indigo-600' : 'text-slate-700'
            }`}
          >
            {stats.dueCount}
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            {hasDueItems
              ? `${Math.min(stats.dueCount, DEFAULT_SESSION_MAX_DUE)} in batch`
              : t('review.dashboard.noDueTitle')}
          </div>
        </div>

        {/* Card 2: In Learning */}
        <div id="stat-learning" className="p-5 bg-white rounded-2xl border border-slate-200">
          <div className="text-2xs font-extrabold uppercase tracking-wider text-slate-600">
            {t('review.dashboard.learning')}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-600 mt-2">
            {stats.learningCount}
          </div>
          <div className="text-2xs text-slate-500 mt-1">10m - 1d</div>
        </div>

        {/* Card 3: In Review */}
        <div id="stat-reviewing" className="p-5 bg-white rounded-2xl border border-slate-200">
          <div className="text-2xs font-extrabold uppercase tracking-wider text-slate-600">
            {t('ui.nav.review')}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-sky-600 mt-2">
            {stats.reviewCount}
          </div>
          <div className="text-2xs text-slate-500 mt-1">3d - 30d</div>
        </div>

        {/* Card 4: Mastered */}
        <div id="stat-mastered" className="p-5 bg-white rounded-2xl border border-slate-200">
          <div className="text-2xs font-extrabold uppercase tracking-wider text-slate-600">
            {t('review.dashboard.mastered')}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 mt-2">
            {stats.masteredCount}
          </div>
          <div className="text-2xs text-slate-500 mt-1">30d+</div>
        </div>
      </div>

      {/* Primary Action Area */}
      {hasDueItems ? (
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-2xs font-black uppercase tracking-wider text-indigo-300 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-700">
              {t('home.stats.dueReviews')}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold">
              {t('review.dashboard.dueCount', { count: stats.dueCount })}
            </h2>
            <p className="text-xs text-indigo-200 max-w-md">
              {t('review.subtitle')}
            </p>
          </div>

          <button
            id="start-due-review-btn"
            type="button"
            onClick={handleStartDueReview}
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-indigo-900 font-extrabold rounded-2xl shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer text-sm shrink-0"
          >
            {t('review.dashboard.startReview', { count: Math.min(stats.dueCount, DEFAULT_SESSION_MAX_DUE) })}
          </button>
        </div>
      ) : hasTrackedItems ? (
        /* Up to date state */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider">
            {t('review.dashboard.noDueTitle')}
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {t('review.dashboard.noDueDesc')}
          </h2>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="practice-all-tracked-btn"
              type="button"
              onClick={handleStartAllReview}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              {t('review.dashboard.startReview', { count: Math.min(stats.totalTracked, DEFAULT_SESSION_MAX_DUE) })}
            </button>

            <button
              id="goto-curriculum-btn"
              type="button"
              onClick={onNavigateToHome}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              {t('home.hero.startCurriculum')}
            </button>
          </div>
        </div>
      ) : (
        /* Empty state: No tracked items */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-5 shadow-xs">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider">
            {t('review.title')}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">
              {t('review.dashboard.noDueTitle')}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {t('review.dashboard.noDueDesc')}
            </p>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="seed-a1-review-btn"
              type="button"
              onClick={handleAddA1Essentials}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
            >
              {t('dictionary.addToReview')} (A1)
            </button>

            <button
              id="browse-curriculum-empty-btn"
              type="button"
              onClick={onNavigateToHome}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              {t('home.hero.startCurriculum')}
            </button>
          </div>
        </div>
      )}

      {/* Secondary Metrics / Spaced Repetition Schedule Details */}
      {hasTrackedItems && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">
              {t('today.title')}
            </span>
            <div className="text-2xl font-black text-slate-800">
              {stats.reviewedTodayCount}
            </div>
            <p className="text-2xs text-slate-500">{t('review.result.reviewedCount', { count: stats.reviewedTodayCount })}</p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">
              {t('home.stats.dueReviews')}
            </span>
            <div className="text-2xl font-black text-slate-800">
              {stats.dueTomorrowCount}
            </div>
            <p className="text-2xs text-slate-500">
              {stats.dueNext7DaysCount} (7 days)
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">
              {t('home.stats.overallProgress')}
            </span>
            <div className="text-2xl font-black text-slate-800">
              {stats.recentAccuracy !== null ? `${stats.recentAccuracy}%` : 'N/A'}
            </div>
            <p className="text-2xs text-slate-500">Recent Accuracy</p>
          </div>
        </div>
      )}

      {/* Maintenance / Reset Area */}
      {hasTrackedItems && (
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>{stats.totalTracked} {t('review.dashboard.totalTracked')}</span>

          {!showResetConfirm ? (
            <button
              id="open-reset-confirm-btn"
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-2xs font-semibold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Reset
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xs text-rose-600 font-bold">
                Reset review data?
              </span>
              <button
                id="confirm-reset-btn"
                type="button"
                onClick={handleConfirmReset}
                className="px-2 py-1 bg-rose-600 text-white rounded font-bold text-2xs cursor-pointer"
              >
                Yes
              </button>
              <button
                id="cancel-reset-btn"
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-bold text-2xs cursor-pointer"
              >
                {t('ui.common.cancel')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
