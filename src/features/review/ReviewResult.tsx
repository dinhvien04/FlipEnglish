import React, { useState } from 'react';
import { ReviewSessionSummary } from '../../types/review';
import { ReviewCompletionPersistenceState } from '../../types/sessionResume';
import { getReviewDashboardStats } from '../../utils/reviewStorage';
import { useI18n } from '../i18n';

interface ReviewResultProps {
  summary: ReviewSessionSummary;
  persistenceState?: ReviewCompletionPersistenceState | null;
  onRetryCleanup?: () => void;
  onBackToReviewDashboard: () => void;
  onContinueCurriculum: () => void;
  onReviewRemaining: () => void;
}

export const ReviewResult: React.FC<ReviewResultProps> = ({
  summary,
  persistenceState,
  onRetryCleanup,
  onBackToReviewDashboard,
  onContinueCurriculum,
  onReviewRemaining,
}) => {
  const { t } = useI18n();
  const [isRetrying, setIsRetrying] = useState(false);
  const stats = getReviewDashboardStats();
  const { ratingBreakdown, totalReviewed } = summary;

  const isDegraded = persistenceState !== undefined && persistenceState !== null && !persistenceState.resumeSafetyEstablished;

  const handleRetry = () => {
    if (!onRetryCleanup || isRetrying) return;
    setIsRetrying(true);
    try {
      onRetryCleanup();
    } finally {
      setIsRetrying(false);
    }
  };

  const successfulCount = (ratingBreakdown.good || 0) + (ratingBreakdown.easy || 0);
  const accuracyPct = totalReviewed > 0 ? Math.round((successfulCount / totalReviewed) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Degraded Persistence Warning */}
      {isDegraded && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-amber-50 border border-amber-200 text-amber-900 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
        >
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-bold text-amber-950">
              {t('review.result.cleanupWarning')}
            </p>
            <p className="text-2xs sm:text-xs text-amber-800">
              {t('error.storageQuotaDesc')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onRetryCleanup && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="min-h-11 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center disabled:opacity-50"
              >
                {t('review.result.retryCleanup')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-3 shadow-xs">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-xl mb-1">
          ✓
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t('review.result.completedTitle')}
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {t('review.result.reviewedCount', { count: totalReviewed })}
        </p>

        {/* Big Key Metric */}
        <div className="pt-4 flex items-center justify-center gap-6 sm:gap-12">
          <div>
            <div className="text-3xl sm:text-4xl font-black text-indigo-600">
              {accuracyPct}%
            </div>
            <div className="text-2xs sm:text-xs font-bold uppercase tracking-wider text-slate-600 mt-1">
              Recall Rate
            </div>
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div>
            <div className="text-3xl sm:text-4xl font-black text-slate-800">
              {totalReviewed}
            </div>
            <div className="text-2xs sm:text-xs font-bold uppercase tracking-wider text-slate-600 mt-1">
              {t('review.dashboard.totalTracked')}
            </div>
          </div>
        </div>
      </div>

      {/* Ratings Breakdown Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Rating Breakdown
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
            <div className="text-2xs font-extrabold uppercase tracking-wider text-rose-700">
              {t('review.session.ratingAgain')}
            </div>
            <div className="text-2xl font-black text-rose-900 mt-1">
              {ratingBreakdown.again || 0}
            </div>
            <div className="text-2xs text-rose-600 mt-0.5">10m</div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <div className="text-2xs font-extrabold uppercase tracking-wider text-amber-800">
              {t('review.session.ratingHard')}
            </div>
            <div className="text-2xl font-black text-amber-950 mt-1">
              {ratingBreakdown.hard || 0}
            </div>
            <div className="text-2xs text-amber-700 mt-0.5">1d</div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-center">
            <div className="text-2xs font-extrabold uppercase tracking-wider text-sky-800">
              {t('review.session.ratingGood')}
            </div>
            <div className="text-2xl font-black text-sky-950 mt-1">
              {ratingBreakdown.good || 0}
            </div>
            <div className="text-2xs text-sky-700 mt-0.5">3d</div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="text-2xs font-extrabold uppercase tracking-wider text-emerald-800">
              {t('review.session.ratingEasy')}
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-1">
              {ratingBreakdown.easy || 0}
            </div>
            <div className="text-2xs text-emerald-700 mt-0.5">7d</div>
          </div>
        </div>
      </div>

      {/* Spaced Forecast */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="space-y-1 text-center sm:text-left">
          <strong className="text-slate-800 block font-bold">{t('today.title')}</strong>
          <span className="text-slate-500">
            {stats.dueTomorrowCount} {t('home.stats.dueReviews')}
          </span>
        </div>

        {stats.dueCount > 0 ? (
          <button
            id="review-remaining-btn"
            type="button"
            onClick={onReviewRemaining}
            className="w-full sm:w-auto min-h-11 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs shrink-0 flex items-center justify-center"
          >
            {t('review.dashboard.startReview', { count: stats.dueCount })}
          </button>
        ) : (
          <span className="text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shrink-0">
            {t('review.dashboard.noDueTitle')}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          id="back-to-review-btn"
          type="button"
          onClick={onBackToReviewDashboard}
          className="w-full sm:w-auto min-h-12 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer text-sm flex items-center justify-center"
        >
          {t('review.result.backToDashboard')}
        </button>

        <button
          id="continue-curriculum-btn"
          type="button"
          onClick={onContinueCurriculum}
          className="w-full sm:w-auto min-h-12 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-sm flex items-center justify-center"
        >
          {t('home.hero.startCurriculum')}
        </button>
      </div>
    </div>
  );
};
