import React, { useState, useEffect, useRef } from 'react';
import { DictionarySuggestion } from './dictionaryTypes';
import { getDictionarySuggestions } from './dictionaryClient';

interface DictionarySearchProps {
  initialQuery?: string;
  searchMode: 'dictionary' | 'reverse';
  onSearchModeChange: (mode: 'dictionary' | 'reverse') => void;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export const DictionarySearch: React.FC<DictionarySearchProps> = ({
  initialQuery = '',
  searchMode,
  onSearchModeChange,
  onSearch,
  isLoading = false,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<DictionarySuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const requestTokenRef = useRef<number>(0);

  // Sync initial query if passed externally
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Debounced autocomplete suggestions with AbortController and monotonic token guard
  useEffect(() => {
    if (searchMode !== 'dictionary') {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      // Increment token for this specific request
      const currentToken = ++requestTokenRef.current;

      // Abort prior inflight request
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
      const controller = new AbortController();
      activeAbortControllerRef.current = controller;

      try {
        const results = await getDictionarySuggestions(trimmed, controller.signal);
        // Only apply if this response corresponds to the newest request token
        if (currentToken === requestTokenRef.current) {
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setHighlightedIndex(-1);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError' && currentToken === requestTokenRef.current) {
          setSuggestions([]);
          setIsOpen(false);
        }
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, searchMode]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const trimmed = query.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const handleSelectSuggestion = (word: string) => {
    setQuery(word);
    setIsOpen(false);
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    onSearch(word);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex].word);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full space-y-3">
      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => {
            onSearchModeChange('dictionary');
            setSuggestions([]);
            setIsOpen(false);
          }}
          className={`min-h-11 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            searchMode === 'dictionary'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Dictionary Lookup
        </button>

        <button
          type="button"
          onClick={() => {
            onSearchModeChange('reverse');
            setSuggestions([]);
            setIsOpen(false);
          }}
          className={`min-h-11 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            searchMode === 'reverse'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Reverse Dictionary
        </button>
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSubmit} className="relative w-full" role="search">
        <label htmlFor="dictionary-search-input" className="sr-only">
          {searchMode === 'dictionary'
            ? 'Search English word or phrase'
            : 'Describe the word or concept'}
        </label>

        <div className="relative flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              id="dictionary-search-input"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0 && searchMode === 'dictionary') {
                  setIsOpen(true);
                }
              }}
              placeholder={
                searchMode === 'dictionary'
                  ? 'Search a word or phrase (e.g. meticulous, hydrate, take responsibility)...'
                  : 'Describe a concept (e.g. a device to see tiny objects)...'
              }
              aria-autocomplete="list"
              aria-controls="dictionary-suggestions-list"
              aria-expanded={isOpen}
              aria-activedescendant={
                highlightedIndex >= 0 ? `suggestion-item-${highlightedIndex}` : undefined
              }
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full min-h-12 px-4 py-3 text-base text-slate-900 bg-white border border-slate-300 rounded-xl shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 p-2 text-slate-400 hover:text-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer flex items-center justify-center text-xs font-bold"
                aria-label="Clear search input"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="min-h-12 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-base rounded-xl shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center shrink-0"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Accessible Suggestions Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <ul
            id="dictionary-suggestions-list"
            role="listbox"
            className="absolute z-30 left-0 right-0 mt-1.5 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 py-1"
          >
            {suggestions.map((item, index) => {
              const isHighlighted = highlightedIndex === index;
              return (
                <li
                  key={`${item.word}-${index}`}
                  id={`suggestion-item-${index}`}
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click
                    handleSelectSuggestion(item.word);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`min-h-11 px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isHighlighted ? 'bg-indigo-50 text-indigo-900' : 'text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-medium text-sm sm:text-base">{item.word}</span>
                  {item.isCurriculum && (
                    <span className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Curriculum
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </form>
    </div>
  );
};
