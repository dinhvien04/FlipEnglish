import React, { useState } from 'react';
import { ResolvedReviewItem, ReviewRating, ReviewSessionSummary } from '../../types/review';
import { applyReviewRatingToItem } from '../../utils/reviewStorage';
import { normalizeRatingBreakdown } from '../../utils/sessionResume';
import { ReviewCard } from './ReviewCard';
import { ProgressBar } from '../../components/ProgressBar';
import { useI18n } from '../i18n';

interface ReviewSessionState {
  currentIndex: number;
  ratingBreakdown: Record<ReviewRating, number>;
}

interface ReviewSessionProps {
  queue: ResolvedReviewItem[];
  initialIndex?: number;
  initialRatingBreakdown?: Record<ReviewRating, number>;
  onFinishSession: (summary: ReviewSessionSummary) => void;
  onExit: () => void;
  onLookupWord?: (word: string, sessionState: ReviewSessionState) => void;
  onSessionStateChange?: (state: ReviewSessionState) => void;
}

export const ReviewSession: React.FC<ReviewSessionProps> = ({
  queue,
  initialIndex = 0,
  initialRatingBreakdown,
  onFinishSession,
  onExit,
  onLookupWord,
  onSessionStateChange,
}) => {
  const { t } = useI18n();
  const total = queue.length;

  const getSafeInitialIndex = () => {
    if (
      typeof initialIndex === 'number' &&
      Number.isFinite(initialIndex) &&
      Number.isInteger(initialIndex) &&
      initialIndex >= 0 &&
      initialIndex < total
    ) {
      return initialIndex;
    }
    return 0;
  };

  const getSafeInitialBreakdown = (): Record<ReviewRating, number> => {
    return normalizeRatingBreakdown(initialRatingBreakdown);
  };

  const [currentIndex, setCurrentIndex] = useState<number>(getSafeInitialIndex);
  const [ratingBreakdown, setRatingBreakdown] = useState<Record<ReviewRating, number>>(getSafeInitialBreakdown);
  const [isProcessing, setIsProcessing] = useState(false);
  const [persistenceError, setPersistenceError] = useState<{
    rating: ReviewRating;
    itemId: string;
  } | null>(null);

  // Publish live review session state continuously (pure observation only)
  React.useEffect(() => {
    onSessionStateChange?.({
      currentIndex,
      ratingBreakdown,
    });
  }, [currentIndex, ratingBreakdown, onSessionStateChange]);

  const currentItem = queue[currentIndex];

  const handleRate = (rating: ReviewRating) => {
    if (!currentItem || isProcessing) return;
    setIsProcessing(true);
    setPersistenceError(null);

    // Apply spaced repetition rating to persistent state - must commit before advance
    const updated = applyReviewRatingToItem(currentItem.word.id, rating);
    if (!updated) {
      setIsProcessing(false);
      setPersistenceError({ rating, itemId: currentItem.word.id });
      return;
    }

    const updatedBreakdown = {
      ...ratingBreakdown,
      [rating]: (ratingBreakdown[rating] || 0) + 1,
    };
    setRatingBreakdown(updatedBreakdown);

    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsProcessing(false);
    } else {
      // Session finished
      onFinishSession({
        totalReviewed: total,
        ratingBreakdown: updatedBreakdown,
        reviewedItems: queue,
        finishedAt: Date.now(),
      });
    }
  };

  const handleLookup = (word: string) => {
    if (onLookupWord) {
      onLookupWord(word, {
        currentIndex,
        ratingBreakdown,
      });
    }
  };

  if (!currentItem || total === 0) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <p className="text-slate-500">{t('review.dashboard.noDueDesc')}</p>
        <button
          onClick={onExit}
          className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer text-sm"
        >
          {t('ui.common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Session Navigation & Progress */}
      <div className="flex items-center justify-between gap-4">
        <button
          id="exit-review-btn"
          type="button"
          onClick={onExit}
          className="text-xs font-bold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
        >
          {t('ui.common.back')}
        </button>

        <div className="text-xs font-extrabold text-slate-700 font-mono tracking-wide">
          {currentIndex + 1} / {total}
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar
        current={currentIndex + 1}
        total={total}
        label={t('review.session.cardProgress', { current: currentIndex + 1, total })}
      />

      {/* Persistence Error Alert */}
      {persistenceError && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-amber-50 border border-amber-200 text-amber-900 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
        >
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-bold text-amber-950">
              {t('review.session.saveError')}
            </p>
            <p className="text-2xs sm:text-xs text-amber-800">
              {t('error.storageQuotaDesc')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleRate(persistenceError.rating)}
              className="min-h-11 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              {t('review.session.retryRating')}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="min-h-11 px-4 py-2 bg-white hover:bg-amber-100 text-amber-950 text-xs font-bold border border-amber-300 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              {t('review.session.exitSession')}
            </button>
          </div>
        </div>
      )}

      {/* Review Card */}
      <ReviewCard
        key={currentItem.word.id}
        item={currentItem}
        onRate={handleRate}
        onLookupWord={onLookupWord ? handleLookup : undefined}
        disabled={isProcessing}
      />
    </div>
  );
};
