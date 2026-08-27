import React from 'react';
import { AllowedDailyMinutes, DEFAULT_DAILY_MINUTES } from '../studyPlan/studyPlanTypes';
import { useStreak } from '../streak/useStreak';
import { useActiveTime } from './useActiveTime';
import { useI18n } from '../i18n';

export interface ProgressSnapshotCardProps {
  estimatedLevel?: string;
  dailyGoalMinutes?: AllowedDailyMinutes;
  dueReviewCount?: number;
  totalMasteredWords?: number;
  totalWordsLearned?: number;
  className?: string;
  onNavigateToReview?: () => void;
  onNavigateToGoalSettings?: () => void;
}

const CEFR_BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  A1: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  A2: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  B1: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  B2: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  C1: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  C2: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
};

/**
 * ProgressSnapshotCard Component
 * Displays a clear, accessible, edtech-professional overview of:
 * - Current and longest daily streak
 * - Active study time today vs daily goal with visual progress
 * - Estimated CEFR proficiency level (A1-C2)
 * - Due spaced repetition reviews with quick action CTA
 * - Mastered vocabulary items
 *
 * Invariants:
 * - Zero decorative emojis. Uses clean SVG icons.
 * - Accessible touch targets (>= 44px) for interactive elements.
 * - Fully localized with useI18n().
 */
export const ProgressSnapshotCard: React.FC<ProgressSnapshotCardProps> = ({
  estimatedLevel,
  dailyGoalMinutes = DEFAULT_DAILY_MINUTES,
  dueReviewCount = 0,
  totalMasteredWords = 0,
  totalWordsLearned = 0,
  className = '',
  onNavigateToReview,
  onNavigateToGoalSettings,
}) => {
  const { t } = useI18n();
  const { streak } = useStreak();
  const { activeMinutesToday } = useActiveTime();

  const currentStreak = streak.currentStreak;
  const longestStreak = streak.longestStreak;

  const targetMinutes = dailyGoalMinutes > 0 ? dailyGoalMinutes : DEFAULT_DAILY_MINUTES;
  const goalPercentage = Math.min(100, Math.round((activeMinutesToday / targetMinutes) * 100));
  const isGoalCompleted = activeMinutesToday >= targetMinutes;

  const normalizedLevel = estimatedLevel?.trim().toUpperCase() || '';
  const levelStyle = CEFR_BADGE_STYLES[normalizedLevel] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  return (
    <div
      className={`bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 ${className}`}
      aria-label={t('progress.snapshot.title')}
    >
      {/* Header Row: Title & Optional Goal Settings Action */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            {/* Lucide Activity / Pulse Icon */}
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {t('progress.snapshot.title')}
          </h2>
        </div>

        {onNavigateToGoalSettings && (
          <button
            type="button"
            onClick={onNavigateToGoalSettings}
            className="min-h-11 px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={t('progress.snapshot.changeGoal')}
          >
            {/* Lucide Sliders / Settings Icon */}
            <svg
              className="w-3.5 h-3.5 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span>{t('progress.snapshot.changeGoal')}</span>
          </button>
        )}
      </div>

      {/* Grid of Key Habit & Progress Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Learning Streak */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-500">
              {t('progress.snapshot.streak')}
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center">
              {/* Lucide Flame Icon */}
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {t('progress.snapshot.streakDays', { count: currentStreak })}
            </div>
            <p className="text-2xs font-semibold text-slate-500 mt-0.5">
              {t('progress.snapshot.longestStreak', { count: longestStreak })}
            </p>
          </div>
        </div>

        {/* Metric 2: Today's Active Time vs Daily Goal */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-500">
              {t('progress.snapshot.activeToday')}
            </span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                isGoalCompleted
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-indigo-100/80 text-indigo-700'
              }`}
            >
              {/* Lucide Clock / Timer Icon */}
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {t('progress.snapshot.goalProgress', {
                  active: activeMinutesToday,
                  goal: targetMinutes,
                })}
              </span>
              {isGoalCompleted && (
                <span className="text-2xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  {t('progress.snapshot.goalComplete')}
                </span>
              )}
            </div>
            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isGoalCompleted
                    ? 'bg-emerald-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${goalPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 3: CEFR Level Badge */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-500">
              {t('progress.snapshot.level')}
            </span>
            <div className="w-6 h-6 rounded-lg bg-violet-100/80 text-violet-700 flex items-center justify-center">
              {/* Lucide Award / Badge Icon */}
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
            </div>
          </div>
          <div>
            {normalizedLevel ? (
              <div className="inline-flex items-center gap-2">
                <span
                  className={`text-lg font-black px-3 py-0.5 rounded-xl border ${levelStyle.bg} ${levelStyle.text} ${levelStyle.border}`}
                >
                  {normalizedLevel}
                </span>
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-500">
                {t('progress.snapshot.levelPlacementPending')}
              </p>
            )}
          </div>
        </div>

        {/* Metric 4: Due Reviews & Action */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-500">
              {t('progress.snapshot.dueReviews')}
            </span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                dueReviewCount > 0
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {/* Lucide Repeat / Refresh Icon */}
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {dueReviewCount}
            </div>
            {dueReviewCount > 0 && onNavigateToReview ? (
              <button
                type="button"
                onClick={onNavigateToReview}
                className="min-h-11 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span>{t('progress.snapshot.reviewNow')}</span>
              </button>
            ) : (
              <span className="text-2xs font-semibold text-emerald-700">
                {t('progress.snapshot.allCaughtUp')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Stat: Mastered Words Count */}
      <div className="bg-slate-50/50 rounded-2xl px-4 py-3 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-semibold text-slate-600">
            {t('progress.snapshot.masteredWords')}:
          </span>
          <span className="font-bold text-slate-900">
            {totalWordsLearned > 0
              ? t('progress.snapshot.wordsLearned', {
                  mastered: totalMasteredWords,
                  total: totalWordsLearned,
                })
              : `${totalMasteredWords}`}
          </span>
        </div>
      </div>
    </div>
  );
};
