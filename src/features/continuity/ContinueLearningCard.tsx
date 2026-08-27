import React from 'react';
import { NextActionRecommendation } from '../../types/continuity';
import { useContinuity } from './useContinuity';
import { useI18n } from '../i18n';
import { TranslationKey } from '../i18n/locales/en';

export interface ContinueLearningCardProps {
  onContinue: (recommendation: NextActionRecommendation) => void;
  className?: string;
}

/**
 * Clean SVG Icons with consistent viewBox="0 0 24 24" and stroke widths
 */
const IconPlay: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M8 5v14l11-7z" />
  </svg>
);

const IconArrowRight: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const IconClock: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const IconBookOpen: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const IconRotateCcw: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const IconCheckCircle2: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

/**
 * Returns contextual icon for the priority type
 */
function getPriorityIcon(priority: NextActionRecommendation['priority']) {
  switch (priority) {
    case 'active-exam':
    case 'active-placement':
      return <IconClock className="w-4 h-4 text-amber-600" />;
    case 'active-learn':
    case 'next-curriculum-lesson':
      return <IconBookOpen className="w-4 h-4 text-indigo-600" />;
    case 'active-review':
    case 'due-review':
      return <IconRotateCcw className="w-4 h-4 text-teal-600" />;
    case 'study-plan-task':
    default:
      return <IconCheckCircle2 className="w-4 h-4 text-indigo-600" />;
  }
}

/**
 * Returns semantic badge styling based on priority
 */
function getBadgeStyles(priority: NextActionRecommendation['priority']): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  switch (priority) {
    case 'active-exam':
      return {
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-800',
        badgeBorder: 'border-amber-200',
      };
    case 'active-placement':
      return {
        badgeBg: 'bg-violet-50',
        badgeText: 'text-violet-800',
        badgeBorder: 'border-violet-200',
      };
    case 'active-learn':
      return {
        badgeBg: 'bg-indigo-50',
        badgeText: 'text-indigo-800',
        badgeBorder: 'border-indigo-200',
      };
    case 'active-review':
    case 'due-review':
      return {
        badgeBg: 'bg-teal-50',
        badgeText: 'text-teal-800',
        badgeBorder: 'border-teal-200',
      };
    case 'study-plan-task':
    case 'next-curriculum-lesson':
    default:
      return {
        badgeBg: 'bg-indigo-50',
        badgeText: 'text-indigo-800',
        badgeBorder: 'border-indigo-200',
      };
  }
}

/**
 * ContinueLearningCard UI Component
 *
 * Prominently presents the single most relevant next learning action to the learner.
 * Features:
 * - Localized text via useI18n() (titleKey, subtitleKey, badgeKey, actionTextKey)
 * - Clean EdTech professional aesthetic with Tailwind CSS v4
 * - Semantic badges & SVGs, zero decorative emojis
 * - Accessible touch target >= 44px on primary CTA
 * - Deterministic progress bar when progressPercentage is defined
 * - Mobile & iPad-first responsive styling
 */
export const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({
  onContinue,
  className = '',
}) => {
  const { recommendation } = useContinuity();
  const { t } = useI18n();

  const badgeStyle = getBadgeStyles(recommendation.priority);
  const priorityIcon = getPriorityIcon(recommendation.priority);

  const titleText = t(recommendation.titleKey as TranslationKey);
  const subtitleText = t(recommendation.subtitleKey as TranslationKey);
  const badgeText = t(recommendation.badgeKey as TranslationKey);
  const actionText = t(recommendation.actionTextKey as TranslationKey);

  const hasProgress = typeof recommendation.progressPercentage === 'number';
  const progressClamped = hasProgress
    ? Math.min(100, Math.max(0, Math.round(recommendation.progressPercentage!)))
    : 0;

  return (
    <section
      aria-label={titleText}
      className={`bg-white rounded-3xl p-5 sm:p-7 lg:p-8 border border-slate-200 shadow-xs hover:border-slate-300 transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        {/* Left Column: Context Badge + Title + Subtitle + Progress */}
        <div className="space-y-3 flex-1 min-w-0">
          {/* Badge & Metadata Header */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-2xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.badgeBorder}`}
            >
              {priorityIcon}
              <span>{badgeText}</span>
            </span>

            {recommendation.actionPayload?.level && (
              <span className="text-2xs font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {recommendation.actionPayload.level}
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-2xs font-bold text-slate-500 ml-auto sm:ml-0">
              <IconClock className="w-3 h-3 text-slate-400" />
              <span>{t('studyPlan.card.aboutMinutes', { minutes: recommendation.estimatedMinutes })}</span>
            </span>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
              {titleText}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {subtitleText}
            </p>
          </div>

          {/* Progress Indicator (if active session has progress) */}
          {hasProgress && (
            <div className="space-y-1.5 pt-1 max-w-md">
              <div className="flex items-center justify-between text-2xs font-bold text-slate-600">
                <span>{t('studyPlan.resumeModal.examProgress')}</span>
                <span className="text-indigo-600 font-extrabold">{progressClamped}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressClamped}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right CTA Button Column */}
        <div className="shrink-0 flex items-center justify-start sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <button
            type="button"
            onClick={() => onContinue(recommendation)}
            className="w-full sm:w-auto min-h-11 sm:min-h-12 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <IconPlay className="w-3.5 h-3.5 shrink-0" />
            <span>{actionText}</span>
            <IconArrowRight className="w-4 h-4 shrink-0 opacity-80" />
          </button>
        </div>
      </div>
    </section>
  );
};
