import React from 'react';
import { UiLanguageMode, useI18n } from '../i18n';

interface LanguageStepProps {
  selectedLanguage: UiLanguageMode;
  onSelectLanguage: (lang: UiLanguageMode) => void;
  onContinue: () => void;
}

export const LanguageStep: React.FC<LanguageStepProps> = ({
  selectedLanguage,
  onSelectLanguage,
  onContinue,
}) => {
  const { t } = useI18n();

  const options: Array<{ mode: UiLanguageMode; title: string; desc: string; badge: string }> = [
    {
      mode: 'vi',
      title: 'Tiếng Việt',
      desc: t('ui.language.viDesc'),
      badge: t('ui.language.viBadge'),
    },
    {
      mode: 'bilingual',
      title: 'Song ngữ / Bilingual',
      desc: t('ui.language.bilingualDesc'),
      badge: t('ui.language.bilingualBadge'),
    },
    {
      mode: 'en',
      title: 'English',
      desc: t('ui.language.enDesc'),
      badge: t('ui.language.enBadge'),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t('onboarding.step1.title')}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
          {t('onboarding.step1.subtitle')}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label={t('accessibility.languageRadioGroup')}
        className="grid grid-cols-1 gap-4 max-w-xl mx-auto"
      >
        {options.map((opt) => {
          const isSelected = selectedLanguage === opt.mode;
          return (
            <label
              key={opt.mode}
              className={`relative flex items-start gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="ui-language-preference"
                value={opt.mode}
                checked={isSelected}
                onChange={() => onSelectLanguage(opt.mode)}
                className="mt-1 h-5 w-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base sm:text-lg font-bold text-slate-900">
                    {opt.title}
                  </span>
                  <span
                    className={`text-2xs font-semibold px-2.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  {opt.desc}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onContinue}
          className="min-h-12 min-w-44 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm sm:text-base shadow-sm transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {t('onboarding.continue')}
        </button>
      </div>
    </div>
  );
};
