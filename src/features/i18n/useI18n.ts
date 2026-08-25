import { createContext, useContext } from 'react';
import { I18nContextValue } from './i18nTypes';
import { enCatalog, TranslationKey } from './locales/en';

export const I18nContext = createContext<I18nContextValue>({
  mode: 'vi',
  setMode: () => {},
  t: (key: TranslationKey, params?: Record<string, string | number>) => {
    let text = enCatalog[key] || (key as string);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return text;
  },
  isBilingual: false,
  isVietnamese: true,
  isEnglish: false,
  formatNumber: (v) => String(v),
  formatDate: (d) => new Date(d).toLocaleDateString(),
  formatPercent: (v) => `${Math.round(v)}%`,
});

export const useI18n = (): I18nContextValue => {
  return useContext(I18nContext);
};
