import React, { useState, useEffect } from 'react';
import {
  DictionaryEntry,
  RecentSearchItem,
  SavedDictionaryWord,
  ReverseDictionaryResult,
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

interface DictionaryPageProps {
  initialWord?: string;
  returnView?: string | null;
  onReturn?: () => void;
  onNavigateLesson?: (lessonId: string) => void;
  onNavigateReview?: () => void;
}

export const DictionaryPage: React.FC<DictionaryPageProps> = ({
  initialWord = '',
  returnView = null,
  onReturn,
  onNavigateLesson,
  onNavigateReview,
}) => {
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
  }, []);

  // Perform initial search if initialWord is provided
  useEffect(() => {
    if (initialWord && initialWord.trim()) {
      handleSearch(initialWord.trim());
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
          setErrorMessage(`No matching words found for "${trimmed}". Try phrasing your description differently.`);
        } else {
          setReverseResults(results);
        }
      } catch {
        setErrorMessage('Reverse dictionary lookup requires an internet connection.');
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
        setErrorMessage(result.error || `Word "${trimmed}" not found in dictionary.`);
        if (result.spellingSuggestions && result.spellingSuggestions.length > 0) {
          setSpellingSuggestions(result.spellingSuggestions);
        }
      }
    } catch {
      setErrorMessage('An unexpected error occurred during dictionary lookup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleSelectReverseWord = (word: string) => {
    setSearchMode('dictionary');
    setReverseResults([]);
    handleSearch(word, 'dictionary');
  };

  const returnLabel = returnView === 'learn' || returnView === 'exercise'
    ? 'Back to Lesson'
    : returnView === 'review'
    ? 'Back to Smart Review'
    : returnView === 'today'
    ? 'Back to Today'
    : 'Back';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <header className="space-y-3">
        {onReturn && returnView && (
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
            FlipEnglish Dictionary
          </h1>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Learner Lexicon & Wordbook
          </span>
        </div>
        <p className="text-sm sm:text-base text-slate-600">
          Search English vocabulary, pronunciations, parts of speech, CEFR learning alignments, and personal offline saved words.
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
          Search
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
          <span>My Vocabulary</span>
          {savedWords.length > 0 && (
            <span
              className={`text-2xs font-extrabold px-1.5 py-0.5 rounded-full ${
                activeTab === 'saved' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {savedWords.length}
            </span>
          )}
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
          History
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
                Looking up "{currentQuery}"...
              </p>
              <p className="text-xs text-slate-400">
                Querying FlipEnglish curriculum and dictionary providers
              </p>
            </div>
          )}

          {/* Error / Word Not Found State */}
          {!isLoading && errorMessage && (
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Word Not Found</h3>
                <p className="text-sm text-slate-600">{errorMessage}</p>
              </div>

              {/* Spelling Suggestions (Did you mean?) */}
              {spellingSuggestions.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Did you mean:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {spellingSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSearch(sug)}
                        className="min-h-11 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer border border-indigo-200"
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
                  Concept Matches ({reverseResults.length})
                </h2>
                <span className="text-2xs text-slate-400">Click any word to inspect full definition</span>
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
                      <span className="text-base font-black text-slate-900 group-hover:text-indigo-600">
                        {item.word}
                      </span>
                    </div>
                    {item.definitionPreview && (
                      <p className="text-xs text-slate-600 line-clamp-2">
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
              onWordClick={handleSearch}
              onNavigateLesson={onNavigateLesson}
              onNavigateReview={onNavigateReview}
            />
          )}

          {/* Empty Initial Search State */}
          {!isLoading && !entry && !errorMessage && reverseResults.length === 0 && (
            <div className="space-y-6 pt-4">
              <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-2 shadow-2xs">
                <h3 className="text-base font-bold text-slate-800">
                  Explore English Vocabulary
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Type any English word or phrase above to view full lexical definitions, pronunciation, synonyms, and CEFR curriculum connections.
                </p>
              </div>

              {/* Recent Searches Preview */}
              {recentSearches.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Recent Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.slice(0, 8).map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSearch(item.word)}
                        className="min-h-11 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
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
            handleSearch(word);
          }}
          onRefreshSaved={refreshSavedWords}
        />
      )}

      {activeTab === 'history' && (
        <DictionaryHistory
          history={recentSearches}
          onSelectWord={(word) => {
            setActiveTab('search');
            handleSearch(word);
          }}
          onClearHistory={handleClearHistory}
        />
      )}

      {/* Provider Attribution Footer */}
      <footer className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400 space-y-1">
        <p>
          Dictionary data provided by FlipEnglish Curriculum and Free Dictionary API.
        </p>
        <p>
          Word suggestions and relations powered in part by Datamuse.
        </p>
      </footer>
    </div>
  );
};
