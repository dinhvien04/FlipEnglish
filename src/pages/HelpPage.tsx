import React from 'react';
import { useI18n, UiLanguageMode } from '../features/i18n';

interface HelpPageProps {
  onNavigateToday: () => void;
  onNavigateDictionary: () => void;
  onNavigateCurriculum: () => void;
  onNavigateReview: () => void;
  onNavigatePlacement: () => void;
  onNavigateConversation: () => void;
  onNavigateExams: () => void;
  onNavigateFlipLens: () => void;
  onReopenOnboarding: () => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  onNavigateToday,
  onNavigateDictionary,
  onNavigateCurriculum,
  onNavigateReview,
  onNavigatePlacement,
  onNavigateConversation,
  onNavigateExams,
  onNavigateFlipLens,
  onReopenOnboarding,
}) => {
  const { mode, setMode, t, isBilingual } = useI18n();

  const languageOptions: Array<{ mode: UiLanguageMode; title: string; desc: string }> = [
    {
      mode: 'vi',
      title: 'Tiếng Việt',
      desc: 'Giao diện tiếng Việt hoàn toàn. Dễ hiểu nhất cho người mới bắt đầu.',
    },
    {
      mode: 'bilingual',
      title: 'Song ngữ / Bilingual',
      desc: 'Tiếng Việt là chính, kèm thuật ngữ tiếng Anh quan trọng.',
    },
    {
      mode: 'en',
      title: 'English',
      desc: 'Complete English interface for full immersion.',
    },
  ];

  const features = [
    {
      id: 'today',
      title: t('help.today.title'),
      titleEn: "Today's Study Plan",
      desc: t('help.today.desc'),
      action: t('help.today.action'),
      badge: 'Offline Ready',
      onClick: onNavigateToday,
    },
    {
      id: 'dictionary',
      title: t('help.dictionary.title'),
      titleEn: 'Dictionary & Lexicon',
      desc: t('help.dictionary.desc'),
      action: t('help.dictionary.action'),
      badge: 'Offline Ready',
      onClick: onNavigateDictionary,
    },
    {
      id: 'curriculum',
      title: t('help.curriculum.title'),
      titleEn: 'Curriculum A1–C2',
      desc: t('help.curriculum.desc'),
      action: t('help.curriculum.action'),
      badge: 'Offline Ready',
      onClick: onNavigateCurriculum,
    },
    {
      id: 'review',
      title: t('help.review.title'),
      titleEn: 'Smart Review (SRS)',
      desc: t('help.review.desc'),
      action: t('help.review.action'),
      badge: 'Offline Ready',
      onClick: onNavigateReview,
    },
    {
      id: 'placement',
      title: t('help.placement.title'),
      titleEn: 'Adaptive Placement Check',
      desc: t('help.placement.desc'),
      action: t('help.placement.action'),
      badge: 'Offline Ready',
      onClick: onNavigatePlacement,
    },
    {
      id: 'exams',
      title: t('help.exams.title'),
      titleEn: 'Practice Exams',
      desc: t('help.exams.desc'),
      action: t('help.exams.action'),
      badge: 'Offline Ready',
      onClick: onNavigateExams,
    },
    {
      id: 'conversation',
      title: t('help.conversation.title'),
      titleEn: 'AI Conversation Lab',
      desc: t('help.conversation.desc'),
      action: t('help.conversation.action'),
      badge: 'Cần Internet',
      isAi: true,
      onClick: onNavigateConversation,
    },
    {
      id: 'fliplens',
      title: t('help.fliplens.title'),
      titleEn: 'FlipLens Visual Scanner',
      desc: t('help.fliplens.desc'),
      action: t('help.fliplens.action'),
      badge: 'Cần Internet',
      isAi: true,
      onClick: onNavigateFlipLens,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Page Header */}
      <div className="space-y-2 border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t('help.title')}
            </h1>
            {isBilingual && (
              <p className="text-xs text-slate-400 font-medium mt-0.5" lang="en">
                How FlipEnglish works & feature guide
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onReopenOnboarding}
            className="min-h-11 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            {t('help.reopenOnboarding')}
          </button>
        </div>
        <p className="text-sm text-slate-600">
          {t('help.subtitle')}
        </p>
      </div>

      {/* Language Preference Section */}
      <section className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          {t('help.languageSettings')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {languageOptions.map((opt) => {
            const isSelected = mode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => setMode(opt.mode)}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer min-h-12 ${
                  isSelected
                    ? 'border-indigo-600 bg-white shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {opt.title}
                  </span>
                  {isSelected && (
                    <span className="text-2xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Offline Capabilities Card */}
      <section className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            {t('ui.common.offlineAvailable')}
          </span>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-emerald-950">
          {t('help.offline.title')}
        </h2>
        <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
          {t('help.offline.desc')}
        </p>
      </section>

      {/* Feature Breakdown Grid */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((f) => (
            <div
              key={f.id}
              className="flex flex-col justify-between p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-2xs font-bold px-2 py-0.5 rounded-md ${
                      f.isAi
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {f.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {f.title}
                  </h3>
                  {isBilingual && f.titleEn && (
                    <p className="text-xs text-slate-400 font-medium" lang="en">
                      {f.titleEn}
                    </p>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {f.desc}
                </p>
              </div>

              <button
                type="button"
                onClick={f.onClick}
                className="w-full min-h-11 px-4 py-2 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white active:bg-indigo-700 text-slate-800 font-bold text-xs sm:text-sm transition-all cursor-pointer text-center"
              >
                {f.action}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Mandatory CEFR Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-100 text-slate-500 text-xs leading-relaxed text-center">
        {t('ui.common.disclaimerCefr')}
      </div>
    </div>
  );
};
