import React from 'react';
import {
  CompactPlacementHistoryItem,
  PLACEMENT_STAGE_COUNT,
  PLACEMENT_STAGE_SIZE,
  PLACEMENT_TOTAL_QUESTIONS,
} from './placementTypes';

interface PlacementIntroProps {
  onStartPlacement: () => void;
  onBack: () => void;
  latestHistoryItem?: CompactPlacementHistoryItem | null;
  onViewPreviousResult?: () => void;
}

export const PlacementIntro: React.FC<PlacementIntroProps> = ({
  onStartPlacement,
  onBack,
  latestHistoryItem,
  onViewPreviousResult,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Back Button */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-2"
        >
          Back
        </button>
      </div>

      {/* Main Placement Intro Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-8">
        {/* Badge & Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            CEFR-Aligned Level Check
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Find your recommended starting level
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            Answer a short set of questions that adapts to your performance. We will estimate an appropriate starting point across the FlipEnglish A1–C2 curriculum.
          </p>
        </div>

        {/* Previous Result Notice (if any) */}
        {latestHistoryItem && (
          <div className="bg-indigo-50/70 rounded-2xl p-5 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-indigo-600">
                Latest Completed Check
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900">
                  Estimated Level: {latestHistoryItem.estimatedLevel}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200">
                  {latestHistoryItem.overallPercentage}%
                </span>
              </div>
              <p className="text-2xs text-slate-500">
                Completed on {latestHistoryItem.date} • {latestHistoryItem.confidence}
              </p>
            </div>

            {onViewPreviousResult && (
              <button
                type="button"
                onClick={onViewPreviousResult}
                className="min-h-11 px-4 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
              >
                View Latest Report
              </button>
            )}
          </div>
        )}

        {/* 4 Skill Dimensions Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Skills Tested During Placement Check
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">Vocabulary</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Word meaning, antonyms, and level-appropriate lexical depth.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">Use of English</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Grammar structures, collocations, phrasal verbs, and context.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">Reading</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Contextual comprehension of short authentic passages.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">Listening</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Speech recognition and listening comprehension with replay controls.
              </p>
            </div>
          </div>
        </div>

        {/* Key Structure Points */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2 text-xs sm:text-sm text-slate-700">
          <div className="flex items-start gap-2">
            <span className="font-bold text-indigo-600">•</span>
            <span><strong>Adaptive structure:</strong> {PLACEMENT_STAGE_COUNT} stages of {PLACEMENT_STAGE_SIZE} questions each ({PLACEMENT_TOTAL_QUESTIONS} questions total).</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-indigo-600">•</span>
            <span><strong>Estimated time:</strong> 10 to 15 minutes.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-indigo-600">•</span>
            <span><strong>Starting point:</strong> The check begins at Intermediate (B1) and routes up or down based on your performance.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-indigo-600">•</span>
            <span><strong>Assessment feedback:</strong> Your estimated starting level, skill performance and study recommendations are shown after completing all four stages.</span>
          </div>
        </div>

        {/* Primary CTA Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            id="start-placement-btn"
            onClick={onStartPlacement}
            className="min-h-12 sm:min-h-14 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-sm sm:text-base shadow-md transition-all cursor-pointer inline-flex items-center justify-center"
          >
            Start Placement Check
          </button>

          <button
            type="button"
            onClick={onBack}
            className="min-h-12 sm:min-h-14 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            Cancel
          </button>
        </div>

        {/* Unobtrusive Disclaimer */}
        <p className="text-2xs text-slate-400 border-t border-slate-100 pt-4 leading-relaxed">
          This short placement check is designed to recommend an appropriate starting point inside FlipEnglish. It is not an official CEFR certification or formal examination.
        </p>
      </div>
    </div>
  );
};
