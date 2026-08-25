import React from 'react';
import { RecentSearchItem } from './dictionaryTypes';
import { useI18n } from '../i18n';

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
  const { t, formatDate } = useI18n();

  if (history.length === 0) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
        <h3 className="text-base font-bold text-slate-800">{t('dictionary.emptyHistoryTitle')}</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          {t('dictionary.emptyHistoryDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">{t('dictionary.recentSearches')}</h2>
          <p className="text-xs text-slate-500">{t('dictionary.storedPrivately', { count: history.length })}</p>
        </div>

        <button
          type="button"
          onClick={onClearHistory}
          className="min-h-11 px-4 py-2 text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-200"
        >
          {t('dictionary.clearHistory')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {history.map((item, index) => (
          <button
            key={`${item.word}-${index}`}
            type="button"
            onClick={() => onSelectWord(item.word)}
            className="w-full min-h-12 p-3.5 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
          >
            <span lang="en" className="font-bold text-sm text-slate-800 group-hover:text-indigo-700">
              {item.word}
            </span>
            <span className="text-2xs text-slate-400 font-medium">
              {formatDate(item.searchedAt)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
