import React from 'react';
import { ReviewSessionSummary } from '../../types/review';
import { getReviewDashboardStats } from '../../utils/reviewStorage';

interface ReviewResultProps {
  summary: ReviewSessionSummary;
  onBackToReviewDashboard: () => void;
  onContinueCurriculum: () => void;
  onReviewRemaining: () => void;
}

export const ReviewResult: React.FC<ReviewResultProps> = ({
  summary,
  onBackToReviewDashboard,
  onContinueCurriculum,
  onReviewRemaining,
}) => {
  const stats = getReviewDashboardStats();
  const { ratingBreakdown, totalReviewed } = summary;

  const successfulCount = (ratingBreakdown.good || 0) + (ratingBreakdown.easy || 0);
  const accuracyPct = totalReviewed > 0 ? Math.round((successfulCount / totalReviewed) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-3 shadow-xs">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-xl mb-1">
          ✓
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Review Session Complete
        </h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          You reviewed <strong className="text-slate-800">{totalReviewed} items</strong> in this session. Spaced repetition intervals have been updated.
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
              Items Practiced
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
              Again
            </div>
            <div className="text-2xl font-black text-rose-900 mt-1">
              {ratingBreakdown.again || 0}
            </div>
            <div className="text-2xs text-rose-600 mt-0.5">10 min retry</div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <div className="text-2xs font-extrabold uppercase tracking-wider text-amber-800">
              Hard
            </div>
            <div className="text-2xl font-black text-amber-950 mt-1">
              {ratingBreakdown.hard || 0}
            </div>
            <div className="text-2xs text-amber-700 mt-0.5">Short interval</div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-center">
            <div className="text-2xs font-extrabold uppercase tracking-wider text-sky-800">
              Good
            </div>
            <div className="text-2xl font-black text-sky-950 mt-1">
              {ratingBreakdown.good || 0}
            </div>
            <div className="text-2xs text-sky-700 mt-0.5">Standard interval</div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="text-2xs font-extrabold uppercase tracking-wider text-emerald-800">
              Easy
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-1">
              {ratingBreakdown.easy || 0}
            </div>
            <div className="text-2xs text-emerald-700 mt-0.5">Long interval</div>
          </div>
        </div>
      </div>

      {/* Spaced Forecast */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="space-y-1 text-center sm:text-left">
          <strong className="text-slate-800 block font-bold">Upcoming Scheduled Reviews</strong>
          <span className="text-slate-500">
            {stats.dueTomorrowCount} items tomorrow • {stats.dueNext7DaysCount} items over the next 7 days
          </span>
        </div>

        {stats.dueCount > 0 ? (
          <button
            id="review-remaining-btn"
            type="button"
            onClick={onReviewRemaining}
            className="w-full sm:w-auto min-h-11 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs shrink-0 flex items-center justify-center"
          >
            Review remaining ({stats.dueCount} due)
          </button>
        ) : (
          <span className="text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shrink-0">
            All caught up for today
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
          Return to Review
        </button>

        <button
          id="continue-curriculum-btn"
          type="button"
          onClick={onContinueCurriculum}
          className="w-full sm:w-auto min-h-12 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-sm flex items-center justify-center"
        >
          Continue Learning
        </button>
      </div>
    </div>
  );
};
