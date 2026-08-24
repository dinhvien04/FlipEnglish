import React, { useState } from 'react';
import { ConversationScenario, ConversationCategory } from '../../types/conversation';
import { CONVERSATION_SCENARIOS } from '../../data/conversations/scenarios';
import { loadConversationStorage } from '../../utils/conversationStorage';

interface ConversationHomeProps {
  onSelectScenario: (scenario: ConversationScenario) => void;
  onBackToHome: () => void;
}

const CATEGORIES: ConversationCategory[] = ['Everyday', 'Travel', 'Study', 'Work', 'Advanced'];

export const ConversationHome: React.FC<ConversationHomeProps> = ({
  onSelectScenario,
  onBackToHome,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ConversationCategory | 'All'>('All');
  const historyData = loadConversationStorage();

  const filteredScenarios = selectedCategory === 'All'
    ? CONVERSATION_SCENARIOS
    : CONVERSATION_SCENARIOS.filter((s) => s.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header Banner */}
      <div className="mb-8 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
              AI Conversation Lab
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Conversation Practice
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl">
              Practice English in realistic situations with an AI conversation partner. Choose a scenario, get instant feedback on phrasing, and build speaking confidence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Curriculum
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
            }`}
          >
            All Scenarios ({CONVERSATION_SCENARIOS.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = CONVERSATION_SCENARIOS.filter((s) => s.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredScenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="bg-white border border-slate-200/80 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-2xs font-black uppercase tracking-wider text-slate-400">
                  {scenario.category}
                </span>
                <div className="flex items-center gap-1">
                  {scenario.supportedLevels.map((lvl) => (
                    <span
                      key={lvl}
                      className="px-1.5 py-0.5 rounded text-2xs font-extrabold bg-slate-100 text-slate-700"
                    >
                      {lvl}
                    </span>
                  ))}
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                {scenario.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {scenario.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-2xs text-slate-500 font-semibold">
                Up to {scenario.maxTurns} turns
              </span>
              <button
                onClick={() => onSelectScenario(scenario)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Start Practice
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Conversation History Shelf */}
      {historyData.history.length > 0 && (
        <div className="mt-10 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Recent Practice Sessions
          </h2>
          <div className="divide-y divide-slate-100">
            {historyData.history.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-900">
                      {item.scenarioTitle}
                    </span>
                    <span className="text-2xs px-1.5 py-0.2 rounded bg-slate-100 font-bold text-slate-600">
                      {item.level}
                    </span>
                    <span className="text-2xs text-slate-400 font-medium">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {item.summary || `Completed ${item.turnsCount} conversation turns.`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-indigo-600">
                    {item.overallScore}%
                  </span>
                  <div className="text-2xs text-slate-400 font-semibold">
                    {item.turnsCount} turns
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
