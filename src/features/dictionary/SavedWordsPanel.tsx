import React, { useState, useMemo } from 'react';
import { SavedDictionaryWord } from './dictionaryTypes';
import { removeSavedWordFromDb } from './dictionaryCache';

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
      setRemoveErrorMessage('Could not remove this word from this device. Local storage may be restricted.');
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
        <h3 className="text-base font-bold text-slate-800">My Vocabulary is Empty</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Save any word or curriculum item from the Dictionary to create your personal offline wordbook.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">My Vocabulary</h2>
          <p className="text-xs text-slate-500">
            {savedWords.length} {savedWords.length === 1 ? 'word saved offline' : 'words saved offline'}
          </p>
        </div>

        {/* Filter / Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as any)}
            className="min-h-11 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Sources</option>
            <option value="curriculum">Curriculum Only</option>
            <option value="dictionary">External Dictionary</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="min-h-11 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="recent">Recently Saved</option>
            <option value="alphabetical">A–Z</option>
          </select>
        </div>
      </div>

      {removeErrorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
          {removeErrorMessage}
        </div>
      )}

      {/* Filter Input */}
      <div>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter saved words or meanings..."
          className="w-full min-h-12 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Saved Words List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredWords.map((item) => {
          const snap = item.snapshot;
          return (
            <article
              key={item.id}
              className="p-4 sm:p-5 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onSelectWord(item.displayWord)}
                        className="text-base font-black text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer focus:outline-hidden focus:underline"
                        aria-label={`Open "${item.displayWord}"`}
                      >
                        {item.displayWord}
                      </button>
                      {snap?.cefrLevel && (
                        <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {snap.cefrLevel}
                        </span>
                      )}
                      {snap?.primaryPartOfSpeech && (
                        <span className="text-xs font-medium text-slate-500 italic">
                          {snap.primaryPartOfSpeech}
                        </span>
                      )}
                    </div>

                    {snap?.phonetic && (
                      <p className="text-xs font-mono text-slate-500">{snap.phonetic}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, item.normalizedWord)}
                    className="min-h-11 px-3 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-xs font-bold flex items-center justify-center border border-transparent hover:border-rose-200 shrink-0"
                    title={`Remove "${item.displayWord}" from My Vocabulary`}
                    aria-label={`Remove "${item.displayWord}" from My Vocabulary`}
                  >
                    Remove
                  </button>
                </div>

                {/* Definition Snapshot */}
                {snap?.primaryMeaningVi ? (
                  <p className="text-xs sm:text-sm font-medium text-slate-800">
                    <span className="text-slate-400 font-bold mr-1">VI:</span>
                    {snap.primaryMeaningVi}
                  </p>
                ) : snap?.primaryDefinition ? (
                  <p className="text-xs text-slate-600 line-clamp-2">{snap.primaryDefinition}</p>
                ) : null}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-400">
                <button
                  type="button"
                  onClick={() => onSelectWord(item.displayWord)}
                  className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer min-h-11 py-2"
                >
                  View Details
                </button>
                <span>{new Date(item.savedAt).toLocaleDateString()}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
