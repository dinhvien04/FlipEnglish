import { enCatalog, TranslationKey } from './locales/en';
import { viCatalog } from './locales/vi';
import { UiLanguageMode } from './i18nTypes';

export const i18nCatalogs: Record<'en' | 'vi', Record<TranslationKey, string>> = {
  en: enCatalog,
  vi: viCatalog,
};

export function getTranslation(
  mode: UiLanguageMode,
  key: string,
  params?: Record<string, string | number>
): string {
  const targetLang = mode === 'en' ? 'en' : 'vi';
  const catalog = i18nCatalogs[targetLang] || i18nCatalogs.en;
  let rawText = catalog[key as TranslationKey] || enCatalog[key as TranslationKey] || key;

  if (params && typeof params === 'object') {
    for (const [paramKey, paramVal] of Object.entries(params)) {
      rawText = rawText.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }
  }

  return rawText;
}

export function hasTranslationKey(key: string): boolean {
  return key in enCatalog || key in viCatalog;
}
