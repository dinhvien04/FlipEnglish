import React from 'react';
import { useI18n } from '../features/i18n';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  subLabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  subLabel,
}) => {
  const { t } = useI18n();
  const percentage = Math.min(100, Math.max(0, Math.round((current / total) * 100)));

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">
          {label || t('accessibility.progressBar', { current, total })}
        </span>
        {subLabel ? (
          <span className="text-xs font-medium text-slate-500">{subLabel}</span>
        ) : (
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            {percentage}%
          </span>
        )}
      </div>

      <div className="h-2.5 w-full bg-slate-200/80 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
