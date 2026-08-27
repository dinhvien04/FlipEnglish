import React from 'react';
import { useReminders } from './useReminders';
import { useI18n } from '../i18n';

export interface InAppReminderBannerProps {
  onStudyNow: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Clean, non-intrusive alert/banner that displays when daily study reminder criteria are met:
 * - reminders enabled
 * - user hasn't met today's active study time goal
 * - current time >= preferred reminder time
 * - not dismissed for today
 *
 * Touch targets >=44px, zero decorative emojis.
 */
export const InAppReminderBanner: React.FC<InAppReminderBannerProps> = ({
  onStudyNow,
  onDismiss,
  className = '',
}) => {
  const { t } = useI18n();
  const { reminderStatus, dismissForToday } = useReminders();

  if (!reminderStatus.shouldShowReminder) {
    return null;
  }

  const handleDismiss = () => {
    dismissForToday();
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleStudy = () => {
    onStudyNow();
  };

  return (
    <aside
      role="region"
      aria-label={t('reminders.banner.badge')}
      className={`w-full bg-slate-900 border-b border-slate-800 text-white px-4 py-3 sm:py-3.5 transition-all duration-300 animate-fadeIn ${className}`}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-3xs font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
            {t('reminders.banner.badge')}
          </span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
              {t('reminders.banner.title')}
            </p>
            <p className="text-2xs sm:text-xs text-slate-400 truncate">
              {t('reminders.banner.desc', { time: reminderStatus.preferredTimeFormatted })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-11 min-w-11 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700/80 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            {t('reminders.banner.dismiss')}
          </button>
          <button
            type="button"
            onClick={handleStudy}
            className="min-h-11 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            {t('reminders.banner.studyNow')}
          </button>
        </div>
      </div>
    </aside>
  );
};
