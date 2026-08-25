import React, { useState, useEffect, useRef } from 'react';
import { getDictionaryRelated } from './dictionaryClient';

interface DictionaryRelationsProps {
  word: string;
  synonyms: string[];
  antonyms: string[];
  onWordClick: (word: string) => void;
}

// Module-level in-memory cache: "word:relationType" -> string[]
const relationsCache = new Map<string, string[]>();

export const DictionaryRelations: React.FC<DictionaryRelationsProps> = ({
  word,
  synonyms,
  antonyms,
  onWordClick,
}) => {
  const hasSynonyms = synonyms.length > 0;
  const hasAntonyms = antonyms.length > 0;

  // Determine initial default tab
  const defaultTab = hasSynonyms ? 'synonyms' : hasAntonyms ? 'antonyms' : 'similar';
  const [activeTab, setActiveTab] = useState<'synonyms' | 'antonyms' | 'similar' | 'sounds-like'>(defaultTab);

  const [similarWords, setSimilarWords] = useState<string[]>(() => relationsCache.get(`${word.toLowerCase()}:similar`) || []);
  const [soundsLikeWords, setSoundsLikeWords] = useState<string[]>(() => relationsCache.get(`${word.toLowerCase()}:sounds-like`) || []);

  const [isLoadingSimilar, setIsLoadingSimilar] = useState<boolean>(false);
  const [isLoadingSoundsLike, setIsLoadingSoundsLike] = useState<boolean>(false);

  const [similarError, setSimilarError] = useState<string | null>(null);
  const [soundsLikeError, setSoundsLikeError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset tab and state when word changes
  useEffect(() => {
    const norm = word.toLowerCase();
    const cachedSim = relationsCache.get(`${norm}:similar`);
    const cachedSnd = relationsCache.get(`${norm}:sounds-like`);

    setSimilarWords(cachedSim || []);
    setSoundsLikeWords(cachedSnd || []);
    setSimilarError(null);
    setSoundsLikeError(null);

    const initial: 'synonyms' | 'antonyms' | 'similar' | 'sounds-like' =
      synonyms.length > 0 ? 'synonyms' : antonyms.length > 0 ? 'antonyms' : 'similar';
    setActiveTab(initial);

    // If initial tab is 'similar' and not cached, load immediately
    if (initial === 'similar' && !cachedSim) {
      loadSimilarWords(word);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [word]);

  const loadSimilarWords = async (targetWord: string) => {
    const norm = targetWord.toLowerCase();
    const cacheKey = `${norm}:similar`;
    if (relationsCache.has(cacheKey)) {
      setSimilarWords(relationsCache.get(cacheKey)!);
      return;
    }

    setIsLoadingSimilar(true);
    setSimilarError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const results = await getDictionaryRelated(targetWord, 'similar', controller.signal);
      const bounded = results.slice(0, 20);
      relationsCache.set(cacheKey, bounded);
      setSimilarWords(bounded);
      if (bounded.length === 0) {
        setSimilarError('No similar conceptual ideas found.');
      }
    } catch {
      setSimilarError('Similar ideas require an internet connection.');
    } finally {
      setIsLoadingSimilar(false);
    }
  };

  const loadSoundsLikeWords = async (targetWord: string) => {
    const norm = targetWord.toLowerCase();
    const cacheKey = `${norm}:sounds-like`;
    if (relationsCache.has(cacheKey)) {
      setSoundsLikeWords(relationsCache.get(cacheKey)!);
      return;
    }

    setIsLoadingSoundsLike(true);
    setSoundsLikeError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const results = await getDictionaryRelated(targetWord, 'sounds-like', controller.signal);
      const bounded = results.slice(0, 20);
      relationsCache.set(cacheKey, bounded);
      setSoundsLikeWords(bounded);
      if (bounded.length === 0) {
        setSoundsLikeError('No phonetic sounds-like relations found.');
      }
    } catch {
      setSoundsLikeError('Sounds-like relations require an internet connection.');
    } finally {
      setIsLoadingSoundsLike(false);
    }
  };

  const handleTabClick = (tab: 'synonyms' | 'antonyms' | 'similar' | 'sounds-like') => {
    setActiveTab(tab);
    if (tab === 'similar') {
      loadSimilarWords(word);
    } else if (tab === 'sounds-like') {
      loadSoundsLikeWords(word);
    }
  };

  return (
    <section className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Word Relationships & Alternatives
        </h3>
        <span className="text-2xs text-slate-400">Contextual variations</span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Word relations">
        {hasSynonyms && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'synonyms'}
            onClick={() => handleTabClick('synonyms')}
            className={`min-h-11 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'synonyms'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Synonyms ({synonyms.length})
          </button>
        )}

        {hasAntonyms && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'antonyms'}
            onClick={() => handleTabClick('antonyms')}
            className={`min-h-11 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'antonyms'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Antonyms ({antonyms.length})
          </button>
        )}

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'similar'}
          onClick={() => handleTabClick('similar')}
          className={`min-h-11 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'similar'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Similar Ideas {similarWords.length > 0 ? `(${similarWords.length})` : ''}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'sounds-like'}
          onClick={() => handleTabClick('sounds-like')}
          className={`min-h-11 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'sounds-like'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Sounds Like {soundsLikeWords.length > 0 ? `(${soundsLikeWords.length})` : ''}
        </button>
      </div>

      {/* Relation Content Panels */}
      <div className="pt-2">
        {activeTab === 'synonyms' && (
          <div className="flex flex-wrap gap-2">
            {synonyms.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onWordClick(s)}
                className="min-h-11 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-indigo-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'antonyms' && (
          <div className="flex flex-wrap gap-2">
            {antonyms.map((a, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onWordClick(a)}
                className="min-h-11 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-rose-100"
              >
                {a}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'similar' && (
          <div className="space-y-3">
            {isLoadingSimilar && (
              <div className="p-4 text-center text-xs font-semibold text-slate-500">
                Finding conceptually related ideas for "{word}"...
              </div>
            )}

            {!isLoadingSimilar && similarError && similarWords.length === 0 && (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                {similarError}
              </p>
            )}

            {!isLoadingSimilar && similarWords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {similarWords.map((sim, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onWordClick(sim)}
                    className="min-h-11 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-slate-200"
                  >
                    {sim}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sounds-like' && (
          <div className="space-y-3">
            {isLoadingSoundsLike && (
              <div className="p-4 text-center text-xs font-semibold text-slate-500">
                Finding words that sound similar to "{word}"...
              </div>
            )}

            {!isLoadingSoundsLike && soundsLikeError && soundsLikeWords.length === 0 && (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                {soundsLikeError}
              </p>
            )}

            {!isLoadingSoundsLike && soundsLikeWords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {soundsLikeWords.map((snd, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onWordClick(snd)}
                    className="min-h-11 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-amber-200"
                  >
                    {snd}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
