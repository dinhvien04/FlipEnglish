import React, { useEffect, useState } from 'react';
import {
  ReviewDashboardStats,
  ResolvedReviewItem,
  ReviewSessionSummary,
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

interface ReviewDashboardProps {
  onNavigateToHome: () => void;
  onLookupWord?: (word: string) => void;
}

export const ReviewDashboard: React.FC<ReviewDashboardProps> = ({ onNavigateToHome, onLookupWord }) => {
  const [stats, setStats] = useState<ReviewDashboardStats>(getReviewDashboardStats());
  const [activeQueue, setActiveQueue] = useState<ResolvedReviewItem[] | null>(null);
  const [sessionSummary, setSessionSummary] = useState<ReviewSessionSummary | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
        onFinishSession={handleFinishSession}
        onExit={handleExitSession}
        onLookupWord={onLookupWord}
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
            Smart Review
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Review vocabulary at increasing intervals based on your recall history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="review-back-home-btn"
            type="button"
            onClick={onNavigateToHome}
            className="min-h-11 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
          >
            Curriculum
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
            Due for Review
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
              ? `${Math.min(stats.dueCount, DEFAULT_SESSION_MAX_DUE)} in next batch`
              : 'All up to date'}
          </div>
        </div>

        {/* Card 2: In Learning */}
        <div id="stat-learning" className="p-5 bg-white rounded-2xl border border-slate-200">
          <div className="text-2xs font-extrabold uppercase tracking-wider text-slate-600">
            Learning Stage
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-600 mt-2">
            {stats.learningCount}
          </div>
          <div className="text-2xs text-slate-500 mt-1">Short intervals (10m - 1d)</div>
        </div>

        {/* Card 3: In Review */}
        <div id="stat-reviewing" className="p-5 bg-white rounded-2xl border border-slate-200">
          <div className="text-2xs font-extrabold uppercase tracking-wider text-slate-600">
            Solidifying
          </div>
          <div className="text-3xl sm:text-4xl font-black text-sky-600 mt-2">
            {stats.reviewCount}
          </div>
          <div className="text-2xs text-slate-500 mt-1">Medium intervals (3d - 30d)</div>
        </div>

        {/* Card 4: Mastered */}
        <div id="stat-mastered" className="p-5 bg-white rounded-2xl border border-slate-200">
          <div className="text-2xs font-extrabold uppercase tracking-wider text-slate-600">
            Mastered
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 mt-2">
            {stats.masteredCount}
          </div>
          <div className="text-2xs text-slate-500 mt-1">Long-term memory (30d+)</div>
        </div>
      </div>

      {/* Primary Action Area */}
      {hasDueItems ? (
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-2xs font-black uppercase tracking-wider text-indigo-300 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-700">
              Ready for recall
            </span>
            <h2 className="text-xl sm:text-2xl font-bold">
              {stats.dueCount} {stats.dueCount === 1 ? 'item is' : 'items are'} ready for review
            </h2>
            <p className="text-xs text-indigo-200 max-w-md">
              Complete a quick 5-minute session to strengthen memory traces before they fade.
            </p>
          </div>

          <button
            id="start-due-review-btn"
            type="button"
            onClick={handleStartDueReview}
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-indigo-900 font-extrabold rounded-2xl shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer text-sm shrink-0"
          >
            Start Review ({Math.min(stats.dueCount, DEFAULT_SESSION_MAX_DUE)} items)
          </button>
        </div>
      ) : hasTrackedItems ? (
        /* Up to date state */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider">
            All Caught Up
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            No items are due for review right now
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Next review items are scheduled for {stats.dueTomorrowCount > 0 ? 'tomorrow' : 'the coming days'}.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="practice-all-tracked-btn"
              type="button"
              onClick={handleStartAllReview}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              Practice tracked ({Math.min(stats.totalTracked, DEFAULT_SESSION_MAX_DUE)} of {stats.totalTracked} items)
            </button>

            <button
              id="goto-curriculum-btn"
              type="button"
              onClick={onNavigateToHome}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              Learn new lessons
            </button>
          </div>
        </div>
      ) : (
        /* Empty state: No tracked items */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-5 shadow-xs">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider">
            Smart Review Queue
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">
              No Vocabulary in Review Yet
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Words are added to Smart Review automatically when you study lesson flashcards or make mistakes in quizzes and exams.
            </p>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="seed-a1-review-btn"
              type="button"
              onClick={handleAddA1Essentials}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
            >
              Add A1 Starter Pack to Review
            </button>

            <button
              id="browse-curriculum-empty-btn"
              type="button"
              onClick={onNavigateToHome}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              Browse Curriculum
            </button>
          </div>
        </div>
      )}

      {/* Secondary Metrics / Spaced Repetition Schedule Details */}
      {hasTrackedItems && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">
              Activity Today
            </span>
            <div className="text-2xl font-black text-slate-800">
              {stats.reviewedTodayCount} items
            </div>
            <p className="text-2xs text-slate-500">Reviewed since midnight</p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">
              Upcoming Forecast
            </span>
            <div className="text-2xl font-black text-slate-800">
              {stats.dueTomorrowCount} tomorrow
            </div>
            <p className="text-2xs text-slate-500">
              {stats.dueNext7DaysCount} items in next 7 days
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">
              Recent Recall Accuracy
            </span>
            <div className="text-2xl font-black text-slate-800">
              {stats.recentAccuracy !== null ? `${stats.recentAccuracy}%` : 'N/A'}
            </div>
            <p className="text-2xs text-slate-500">Successful recalls (Hard, Good, Easy) in last 50 reviews</p>
          </div>
        </div>
      )}

      {/* Maintenance / Reset Area */}
      {hasTrackedItems && (
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>{stats.totalTracked} total vocabulary items tracked in local spaced repetition</span>

          {!showResetConfirm ? (
            <button
              id="open-reset-confirm-btn"
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-2xs font-semibold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Reset Review Data
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xs text-rose-600 font-bold">
                Reset review data? (Preserves lesson scores)
              </span>
              <button
                id="confirm-reset-btn"
                type="button"
                onClick={handleConfirmReset}
                className="px-2 py-1 bg-rose-600 text-white rounded font-bold text-2xs cursor-pointer"
              >
                Yes, Reset
              </button>
              <button
                id="cancel-reset-btn"
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-bold text-2xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
