import React from 'react';
import { CEFRLevel } from '../../types';
import { useI18n } from '../i18n';
import { CEFR_LEVELS_INFO } from '../../data/curriculum/curriculumMeta';

interface LevelChoiceStepProps {
  onSelectLevel: (level: CEFRLevel) => void;
  onBack: () => void;
}

const ALL_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const LevelChoiceStep: React.FC<LevelChoiceStepProps> = ({
  onSelectLevel,
  onBack,
}) => {
  const { t, isBilingual } = useI18n();

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t('ui.common.level')} CEFR (A1–C2)
        </h2>
        <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
          Chọn cấp độ phù hợp để bắt đầu học bài học đầu tiên trong lộ trình.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {ALL_LEVELS.map((lvl) => {
          const info = CEFR_LEVELS_INFO[lvl];
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => onSelectLevel(lvl)}
              className="flex flex-col text-left p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-12"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xl font-black text-indigo-600 group-hover:scale-105 transition-transform">
                  {lvl}
                </span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {info.title}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {info.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-start max-w-4xl mx-auto pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs sm:text-sm cursor-pointer"
        >
          {t('ui.common.back')}
        </button>
      </div>
    </div>
  );
};
