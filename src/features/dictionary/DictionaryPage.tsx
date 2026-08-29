import React, { useState, useEffect } from 'react';
import {
  DictionaryEntry,
  RecentSearchItem,
  SavedDictionaryWord,
  ReverseDictionaryResult,
  DictionaryReturnContext,
} from './dictionaryTypes';
import {
  lookupDictionary,
  lookupReverseDictionary,
} from './dictionaryClient';
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from './dictionaryStorage';
import { getSavedWordsFromDb } from './dictionaryCache';
import { DictionarySearch } from './DictionarySearch';
import { DictionaryEntryView } from './DictionaryEntryView';
import { DictionaryHistory } from './DictionaryHistory';
import { SavedWordsPanel } from './SavedWordsPanel';
import { useI18n } from '../i18n';
import { DATA_MANAGEMENT_EVENTS } from '../../constants/storageKeys';

interface DictionaryPageProps {
  initialWord?: string;
  returnContext?: DictionaryReturnContext | null;
  onReturn?: () => void;
  onNavigateLesson?: (lessonId: string) => void;
  onNavigateReview?: () => void;
}

export const DictionaryPage: React.FC<DictionaryPageProps> = ({
  initialWord = '',
  returnContext = null,
  onReturn,
  onNavigateLesson,
  onNavigateReview,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'search' | 'saved' | 'history'>('search');
  const [searchMode, setSearchMode] = useState<'dictionary' | 'reverse'>('dictionary');
  const [currentQuery, setCurrentQuery] = useState<string>(initialWord);

  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);
  const [spellingSuggestions, setSpellingSuggestions] = useState<string[]>([]);
  const [reverseResults, setReverseResults] = useState<ReverseDictionaryResult[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() => getRecentSearches());
  const [savedWords, setSavedWords] = useState<SavedDictionaryWord[]>([]);

  // Load saved words from IndexedDB on mount
  const refreshSavedWords = () => {
    getSavedWordsFromDb().then(setSavedWords);
  };

  useEffect(() => {
    refreshSavedWords();

    const handleDictionaryUpdate = () => {
      refreshSavedWords();
      setRecentSearches(getRecentSearches());
    };

    const handleDataReset = (e: Event) => {
      const detail = (e as CustomEvent<{ scope?: string }>)?.detail;
      if (detail?.scope === 'vocabulary' || detail?.scope === 'all' || !detail?.scope) {
        refreshSavedWords();
        setRecentSearches([]);
        setEntry(null);
        setReverseResults([]);
        setSpellingSuggestions([]);
        setErrorMessage(null);
      }
    };

    window.addEventListener('flipenglish_dictionary_updated', handleDictionaryUpdate);
    window.addEventListener(DATA_MANAGEMENT_EVENTS.USER_DATA_RESET, handleDataReset);

    return () => {
      window.removeEventListener('flipenglish_dictionary_updated', handleDictionaryUpdate);
      window.removeEventListener(DATA_MANAGEMENT_EVENTS.USER_DATA_RESET, handleDataReset);
    };
  }, []);

  // Canonical word-open helper: ALWAYS executes standard Dictionary Lookup
  const openDictionaryWord = (word: string) => {
    const clean = word.trim();
    if (!clean) return;

    setSearchMode('dictionary');
    setReverseResults([]);
    handleSearch(clean, 'dictionary');
  };

  // Perform initial search if initialWord is provided
  useEffect(() => {
    if (initialWord && initialWord.trim()) {
      openDictionaryWord(initialWord.trim());
    }
  }, [initialWord]);

  const handleSearch = async (
    word: string,
    requestedMode: 'dictionary' | 'reverse' = searchMode
  ) => {
    const trimmed = word.trim();
    if (!trimmed) return;

    setCurrentQuery(trimmed);
    setActiveTab('search');
    setIsLoading(true);
    setErrorMessage(null);
    setEntry(null);
    setSpellingSuggestions([]);
    setReverseResults([]);

    if (requestedMode === 'reverse') {
      // Reverse Dictionary Search (Means-like)
      try {
        const results = await lookupReverseDictionary(trimmed);
        if (results.length === 0) {
          setErrorMessage(t('dictionary.notFound', { word: trimmed }));
        } else {
          setReverseResults(results);
        }
      } catch {
        setErrorMessage(t('error.network'));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Standard Dictionary Lookup
    try {
      const result = await lookupDictionary(trimmed);

      if (result.entry) {
        setEntry(result.entry);
        setIsOfflineCached(Boolean(result.isOfflineCached));
        addRecentSearch(result.entry.word);
        setRecentSearches(getRecentSearches());
      } else {
        setErrorMessage(result.error || t('dictionary.notFound', { word: trimmed }));
        if (result.spellingSuggestions && result.spellingSuggestions.length > 0) {
          setSpellingSuggestions(result.spellingSuggestions);
        }
      }
    } catch {
      setErrorMessage(t('error.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleSelectReverseWord = (word: string) => {
    openDictionaryWord(word);
  };

  const returnLabel = returnContext?.view === 'learn'
    ? t('ui.common.back')
    : returnContext?.view === 'review'
    ? t('ui.common.back')
    : returnContext?.view === 'today'
    ? t('ui.common.back')
    : t('ui.common.back');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <header className="space-y-3">
        {onReturn && returnContext && (
          <div>
            <button
              type="button"
              onClick={onReturn}
              className="min-h-11 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer inline-flex items-center"
            >
              {returnLabel}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {t('dictionary.title')}
          </h1>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {t('ui.common.offlineAvailable')}
          </span>
        </div>
        <p className="text-sm sm:text-base text-slate-600">
          {t('dictionary.subtitle')}
        </p>
      </header>

      {/* Top Level Subsections Navigation */}
      <nav className="flex items-center gap-2 border-b border-slate-200 pb-3" aria-label="Dictionary Subsections">
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`min-h-11 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'search'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          {t('dictionary.tab.lookup')}
        </button>

        <button
          type="button"
          onClick={() => {
            refreshSavedWords();
            setActiveTab('saved');
          }}
          className={`min-h-11 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'saved'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>{t('dictionary.tab.saved', { count: savedWords.length })}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`min-h-11 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          {t('dictionary.tab.history')}
        </button>
      </nav>

      {/* Main Content Area */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Box */}
          <DictionarySearch
            initialQuery={currentQuery}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            onSearch={handleSearch}
            isLoading={isLoading}
          />

          {/* Loading State */}
          {isLoading && (
            <div className="p-8 text-center space-y-2">
              <p className="text-base font-bold text-slate-700">
                {t('ui.common.loading')}
              </p>
            </div>
          )}

          {/* Error / Word Not Found State */}
          {!isLoading && errorMessage && (
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">{t('dictionary.notFound', { word: currentQuery })}</h3>
                <p className="text-sm text-slate-600">{errorMessage}</p>
              </div>

              {/* Spelling Suggestions (Did you mean?) */}
              {spellingSuggestions.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {t('dictionary.spellingSuggestion', { word: '' })}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {spellingSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => openDictionaryWord(sug)}
                        className="min-h-11 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer border border-indigo-200"
                        lang="en"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reverse Dictionary Results */}
          {!isLoading && reverseResults.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  {t('dictionary.reverseTitle')} ({reverseResults.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reverseResults.map((item, idx) => (
                  <button
                    key={`${item.word}-${idx}`}
                    type="button"
                    onClick={() => handleSelectReverseWord(item.word)}
                    className="w-full min-h-14 p-4 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-2xl text-left transition-all cursor-pointer shadow-2xs space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-slate-900 group-hover:text-indigo-600" lang="en">
                        {item.word}
                      </span>
                    </div>
                    {item.definitionPreview && (
                      <p className="text-xs text-slate-600 line-clamp-2" lang="en">
                        {item.definitionPreview}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Dictionary Entry View */}
          {!isLoading && entry && (
            <DictionaryEntryView
              entry={entry}
              isOfflineCached={isOfflineCached}
              onWordClick={openDictionaryWord}
              onNavigateLesson={onNavigateLesson}
              onNavigateReview={onNavigateReview}
            />
          )}

          {/* Empty Initial Search State */}
          {!isLoading && !entry && !errorMessage && reverseResults.length === 0 && (
            <div className="space-y-6 pt-4">
              <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-2 shadow-2xs">
                <h3 className="text-base font-bold text-slate-800">
                  {t('dictionary.title')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  {t('dictionary.subtitle')}
                </p>
              </div>

              {/* Recent Searches Preview */}
              {recentSearches.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('dictionary.recentSearches')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.slice(0, 8).map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => openDictionaryWord(item.word)}
                        className="min-h-11 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                        lang="en"
                      >
                        {item.word}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <SavedWordsPanel
          savedWords={savedWords}
          onSelectWord={(word) => {
            setActiveTab('search');
            openDictionaryWord(word);
          }}
          onRefreshSaved={refreshSavedWords}
        />
      )}

      {activeTab === 'history' && (
        <DictionaryHistory
          history={recentSearches}
          onSelectWord={(word) => {
            setActiveTab('search');
            openDictionaryWord(word);
          }}
          onClearHistory={handleClearHistory}
        />
      )}

      {/* Provider Attribution Footer */}
      <footer className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400 space-y-1">
        <p>
          {t('ui.common.disclaimerCefr')}
        </p>
      </footer>
    </div>
  );
};
