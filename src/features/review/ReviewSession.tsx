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

    // Apply spaced repetition rating to persistent state
    applyReviewRatingToItem(currentItem.word.id, rating);

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
