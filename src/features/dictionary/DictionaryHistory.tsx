import React from 'react';
import { RecentSearchItem } from './dictionaryTypes';

interface DictionaryHistoryProps {
  history: RecentSearchItem[];
  onSelectWord: (word: string) => void;
  onClearHistory: () => void;
}

export const DictionaryHistory: React.FC<DictionaryHistoryProps> = ({
  history,
  onSelectWord,
  onClearHistory,
}) => {
  if (history.length === 0) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
        <h3 className="text-base font-bold text-slate-800">No Search History</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          Words and phrases you look up in FlipEnglish will appear here for quick reference.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">Recent Searches</h2>
          <p className="text-xs text-slate-500">Stored privately in your browser ({history.length} items)</p>
        </div>

        <button
          type="button"
          onClick={onClearHistory}
          className="min-h-9 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
        >
          Clear History
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {history.map((item, index) => (
          <button
            key={`${item.word}-${index}`}
            type="button"
            onClick={() => onSelectWord(item.word)}
            className="min-h-12 p-3.5 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
          >
            <span className="font-bold text-sm text-slate-800 group-hover:text-indigo-700">
              {item.word}
            </span>
            <span className="text-2xs text-slate-400 font-medium">
              {new Date(item.searchedAt).toLocaleDateString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
