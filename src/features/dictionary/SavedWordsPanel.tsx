import React, { useState, useMemo } from 'react';
import { SavedDictionaryWord } from './dictionaryTypes';
import { removeSavedWordFromDb } from './dictionaryCache';
import { useI18n } from '../i18n';

interface SavedWordsPanelProps {
  savedWords: SavedDictionaryWord[];
  onSelectWord: (word: string) => void;
  onRefreshSaved: () => void;
}

export const SavedWordsPanel: React.FC<SavedWordsPanelProps> = ({
  savedWords,
  onSelectWord,
  onRefreshSaved,
}) => {
  const { t, formatDate } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'curriculum' | 'dictionary'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent');
  const [removeErrorMessage, setRemoveErrorMessage] = useState<string | null>(null);

  const handleRemove = async (e: React.MouseEvent, normalizedWord: string) => {
    e.stopPropagation();
    setRemoveErrorMessage(null);
    const ok = await removeSavedWordFromDb(normalizedWord);
    if (ok) {
      onRefreshSaved();
    } else {
      setRemoveErrorMessage(t('dictionary.unableRemoveOffline'));
    }
  };

  const filteredWords = useMemo(() => {
    return savedWords
      .filter((item) => {
        if (filterSource !== 'all' && item.source !== filterSource) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesWord = item.displayWord.toLowerCase().includes(q);
          const matchesDef = item.snapshot?.primaryDefinition?.toLowerCase().includes(q) || false;
          const matchesVi = item.snapshot?.primaryMeaningVi?.toLowerCase().includes(q) || false;
          return matchesWord || matchesDef || matchesVi;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'alphabetical') {
          return a.displayWord.localeCompare(b.displayWord);
        }
        return b.savedAt - a.savedAt;
      });
  }, [savedWords, searchQuery, filterSource, sortBy]);

  if (savedWords.length === 0) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
        <h3 className="text-base font-bold text-slate-800">{t('dictionary.savedEmptyTitle')}</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          {t('dictionary.savedEmptyDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">{t('dictionary.myVocabulary')}</h2>
          <p className="text-xs text-slate-500">
            {savedWords.length} {savedWords.length === 1 ? t('dictionary.wordSavedOffline') : t('dictionary.wordsSavedOffline')}
          </p>
        </div>

        {/* Filter / Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as any)}
            className="min-h-11 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">{t('dictionary.filterAll')}</option>
            <option value="curriculum">{t('dictionary.filterCurriculum')}</option>
            <option value="dictionary">{t('dictionary.filterDictionary')}</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="min-h-11 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="recent">{t('dictionary.sortRecent')}</option>
            <option value="alphabetical">{t('dictionary.sortAlpha')}</option>
          </select>
        </div>
      </div>

      {/* Filter Search Input */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('dictionary.searchSavedPlaceholder')}
          className="w-full min-h-11 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {removeErrorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
          {removeErrorMessage}
        </div>
      )}

      {/* Saved Words List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredWords.map((item) => {
          const snapshot = item.snapshot;
          const displayMeaning = snapshot?.primaryMeaningVi || snapshot?.primaryDefinition;

          return (
            <div
              key={item.id}
              onClick={() => onSelectWord(item.displayWord)}
              className="p-4 bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all cursor-pointer space-y-2 group shadow-2xs relative"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 lang="en" className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-indigo-600 truncate">
                      {item.displayWord}
                    </h3>
                    {item.source === 'curriculum' && (
                      <span className="text-3xs font-extrabold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                        {t('dictionary.curriculumBadge')}
                      </span>
                    )}
                  </div>
                  {snapshot?.phonetic && (
                    <p lang="en" className="text-xs font-mono text-slate-500 font-medium">
                      {snapshot.phonetic}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => handleRemove(e, item.normalizedWord)}
                  aria-label={t('dictionary.removeSavedAria', { word: item.displayWord })}
                  className="min-h-11 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 inline-flex items-center"
                >
                  {t('dictionary.removeSaved')}
                </button>
              </div>

              {displayMeaning && (
                <p
                  lang={snapshot?.primaryMeaningVi ? 'vi' : 'en'}
                  className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed"
                >
                  {displayMeaning}
                </p>
              )}

              <div className="pt-1 flex items-center justify-between text-3xs text-slate-400">
                <span>{formatDate(item.savedAt)}</span>
                <span className="font-bold text-indigo-600 group-hover:underline">
                  {t('curriculum.open')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredWords.length === 0 && searchQuery && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
          {t('dictionary.noMatchingSaved', { query: searchQuery })}
        </div>
      )}
    </div>
  );
};
