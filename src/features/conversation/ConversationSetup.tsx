import React, { useState } from 'react';
import { ConversationScenario } from '../../types/conversation';
import { CEFRLevel } from '../../types';
import { useI18n } from '../i18n';

interface ConversationSetupProps {
  scenario: ConversationScenario;
  onStartSession: (scenario: ConversationScenario, level: CEFRLevel) => void;
  onBack: () => void;
}

export const ConversationSetup: React.FC<ConversationSetupProps> = ({
  scenario,
  onStartSession,
  onBack,
}) => {
  const { t } = useI18n();
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>(
    scenario.supportedLevels[0] || 'A1'
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <button
        onClick={onBack}
        className="mb-6 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
      >
        {t('ui.common.back')}
      </button>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
        {/* Scenario Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
            {scenario.category}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {scenario.maxTurns} Turns Maximum
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2" lang="en">
          {scenario.title}
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed mb-6" lang="en">
          {scenario.description}
        </p>

        {/* Roles & Goals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Your Goal
            </span>
            <p className="text-xs text-slate-800 font-medium" lang="en">
              {scenario.learnerGoal}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              AI Partner Role
            </span>
            <p className="text-xs text-slate-800 font-medium" lang="en">
              {scenario.aiRole}
            </p>
          </div>
        </div>

        {/* Useful Expressions Preview */}
        {scenario.usefulExpressions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Useful Expressions for this Situation
            </h3>
            <div className="space-y-2">
              {scenario.usefulExpressions.map((exp, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                >
                  <span className="font-semibold text-slate-900" lang="en">
                    "{exp.expression}"
                  </span>
                  <span className="text-slate-500 font-normal">
                    {exp.meaning}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Choose CEFR Level */}
        <div className="mb-8 pt-6 border-t border-slate-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Select Your Target CEFR Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {scenario.supportedLevels.map((lvl) => {
              const isSelected = selectedLevel === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`text-base font-black ${isSelected ? 'text-indigo-700' : 'text-slate-900'}`}>
                    {lvl}
                  </div>
                  <div className="text-2xs text-slate-500 mt-0.5">
                    {lvl === 'A1' && 'Beginner'}
                    {lvl === 'A2' && 'Elementary'}
                    {lvl === 'B1' && 'Intermediate'}
                    {lvl === 'B2' && 'Upper-Int'}
                    {lvl === 'C1' && 'Advanced'}
                    {lvl === 'C2' && 'Proficiency'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStartSession(scenario, selectedLevel)}
          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm tracking-wide shadow-xs transition-all cursor-pointer"
        >
          {t('conversation.startChat')}
        </button>
      </div>
    </div>
  );
};
