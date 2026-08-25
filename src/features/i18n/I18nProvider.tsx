import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UiLanguageMode, I18nContextValue } from './i18nTypes';
import { TranslationKey } from './locales/en';
import { I18nContext } from './useI18n';
import { getTranslation } from './i18nCatalog';
import {
  loadStoredLanguagePreference,
  saveStoredLanguagePreference,
  parseStoredLanguagePreference,
  LANGUAGE_STORAGE_KEY,
  isValidUiLanguageMode,
} from './localeStorage';
import { resolveInitialUiLanguage } from './resolveInitialLanguage';
import { updateDocumentLanguageMetadata } from './documentLanguage';
import { hasMeaningfulExistingLearnerData } from '../onboarding/onboardingStorage';
import {
  formatNumberWithLocale,
  formatDateWithLocale,
  formatPercentWithLocale,
} from './formatting';

interface I18nProviderProps {
  children: React.ReactNode;
  initialMode?: UiLanguageMode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, initialMode }) => {
  const [mode, setModeState] = useState<UiLanguageMode>(() => {
    if (initialMode && isValidUiLanguageMode(initialMode)) {
      return initialMode;
    }
    const stored = loadStoredLanguagePreference();
    const hasData = hasMeaningfulExistingLearnerData();
    return resolveInitialUiLanguage({
      storedPreference: stored,
      hasExistingLearnerData: hasData,
    });
  });

  const setMode = useCallback((newMode: UiLanguageMode, explicit = true) => {
    if (!isValidUiLanguageMode(newMode)) return;
    setModeState(newMode);
    saveStoredLanguagePreference(newMode, explicit);
    updateDocumentLanguageMetadata(newMode);
  }, []);

  // Update HTML metadata whenever mode changes
  useEffect(() => {
    updateDocumentLanguageMetadata(mode);
  }, [mode]);

  // Cross-tab sync via storage event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage) {
        return;
      }
      if (e.key === LANGUAGE_STORAGE_KEY && e.newValue) {
        const preference = parseStoredLanguagePreference(e.newValue);
        if (!preference) return;

        setModeState(preference.mode);
        updateDocumentLanguageMetadata(preference.mode);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return getTranslation(mode, key, params);
    },
    [mode]
  );

  const formatNumber = useCallback(
    (val: number) => formatNumberWithLocale(val, mode),
    [mode]
  );

  const formatDate = useCallback(
    (date: Date | number | string, options?: Intl.DateTimeFormatOptions) =>
      formatDateWithLocale(date, mode, options),
    [mode]
  );

  const formatPercent = useCallback(
    (val: number) => formatPercentWithLocale(val, mode),
    [mode]
  );

  const value: I18nContextValue = useMemo(
    () => ({
      mode,
      setMode,
      t,
      isBilingual: mode === 'bilingual',
      isVietnamese: mode === 'vi',
      isEnglish: mode === 'en',
      formatNumber,
      formatDate,
      formatPercent,
    }),
    [mode, setMode, t, formatNumber, formatDate, formatPercent]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
