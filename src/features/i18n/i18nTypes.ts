export type UiLanguageMode = 'vi' | 'bilingual' | 'en';

export interface StoredLanguagePreference {
  mode: UiLanguageMode;
  explicit: boolean;
  savedAt?: number;
}

export interface I18nContextValue {
  mode: UiLanguageMode;
  setMode: (mode: UiLanguageMode, explicit?: boolean) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isBilingual: boolean;
  isVietnamese: boolean;
  isEnglish: boolean;
  formatNumber: (value: number) => string;
  formatDate: (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatPercent: (value: number) => string;
}
