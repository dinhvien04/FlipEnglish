import React from 'react';
import { useI18n } from '../i18n';
import { OnboardingRoute } from './onboardingTypes';

interface StartingPointStepProps {
  onSelectRoute: (route: OnboardingRoute) => void;
  onBack: () => void;
  onSkip: () => void;
}

export const StartingPointStep: React.FC<StartingPointStepProps> = ({
  onSelectRoute,
  onBack,
  onSkip,
}) => {
  const { t, isBilingual } = useI18n();

  const routes: Array<{
    id: OnboardingRoute;
    title: string;
    titleEn?: string;
    desc: string;
    action: string;
    tag: string;
  }> = [
    {
      id: 'unknown',
      title: t('onboarding.route.unknown'),
      titleEn: 'Adaptive Placement Check',
      desc: t('onboarding.route.unknownDesc'),
      action: t('onboarding.route.unknownAction'),
      tag: 'Gợi ý cho người mới',
    },
    {
      id: 'know',
      title: t('onboarding.route.know'),
      titleEn: 'Choose CEFR Level (A1–C2)',
      desc: t('onboarding.route.knowDesc'),
      action: t('onboarding.route.knowAction'),
      tag: 'Lộ trình bài bản',
    },
    {
      id: 'explore',
      title: t('onboarding.route.explore'),
      titleEn: 'Browse Curriculum & Tools',
      desc: t('onboarding.route.exploreDesc'),
      action: t('onboarding.route.exploreAction'),
      tag: 'Khám phá tự do',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t('onboarding.step2.title')}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
          {t('onboarding.step2.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {routes.map((r) => (
          <div
            key={r.id}
            className="flex flex-col justify-between p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-500 hover:shadow-md transition-all space-y-5 text-left"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {r.tag}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {r.title}
                </h3>
                {isBilingual && r.titleEn && (
                  <p className="text-xs text-slate-400 font-medium mt-0.5" lang="en">
                    {r.titleEn}
                  </p>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {r.desc}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSelectRoute(r.id)}
              className="w-full min-h-11 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {r.action}
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between max-w-4xl mx-auto pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs sm:text-sm cursor-pointer"
        >
          {t('ui.common.back')}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="min-h-11 px-4 py-2 text-slate-500 hover:text-slate-800 font-semibold text-xs sm:text-sm cursor-pointer"
        >
          {t('onboarding.skip')}
        </button>
      </div>
    </div>
  );
};
