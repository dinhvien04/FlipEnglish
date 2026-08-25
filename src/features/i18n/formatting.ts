import { UiLanguageMode } from './i18nTypes';

export function getFormattingLocale(mode: UiLanguageMode): 'vi-VN' | 'en-US' {
  return mode === 'en' ? 'en-US' : 'vi-VN';
}

export function formatNumberWithLocale(value: number, mode: UiLanguageMode): string {
  if (!Number.isFinite(value)) return '0';
  const locale = getFormattingLocale(mode);
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

export function formatPercentWithLocale(value: number, mode: UiLanguageMode): string {
  if (!Number.isFinite(value)) return '0%';
  const locale = getFormattingLocale(mode);
  try {
    return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value / 100);
  } catch {
    return `${Math.round(value)}%`;
  }
}

export function formatDateWithLocale(
  date: Date | number | string,
  mode: UiLanguageMode,
  options?: Intl.DateTimeFormatOptions
): string {
  const targetDate = typeof date === 'number' || typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return '';
  const locale = getFormattingLocale(mode);
  try {
    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Intl.DateTimeFormat(locale, defaultOptions).format(targetDate);
  } catch {
    return targetDate.toISOString().slice(0, 10);
  }
}
