import React, { useState, useEffect } from 'react';
import { DictionaryRelationType } from './dictionaryTypes';
import { getDictionaryRelated } from './dictionaryClient';

interface DictionaryRelationsProps {
  word: string;
  synonyms: string[];
  antonyms: string[];
  onWordClick: (word: string) => void;
}

export const DictionaryRelations: React.FC<DictionaryRelationsProps> = ({
  word,
  synonyms,
  antonyms,
  onWordClick,
}) => {
  const [similarWords, setSimilarWords] = useState<string[]>([]);
  const [soundsLikeWords, setSoundsLikeWords] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'synonyms' | 'antonyms' | 'similar' | 'sounds-like'>('synonyms');
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  // Fetch Datamuse related words lazily
  useEffect(() => {
    let isMounted = true;
    async function fetchDatamuseRelations() {
      setIsLoadingRelated(true);
      try {
        const [sim, snd] = await Promise.all([
          getDictionaryRelated(word, 'similar'),
          getDictionaryRelated(word, 'sounds-like'),
        ]);
        if (isMounted) {
          setSimilarWords(sim.slice(0, 15));
          setSoundsLikeWords(snd.slice(0, 15));
        }
      } catch {
        // fail silently
      } finally {
        if (isMounted) setIsLoadingRelated(false);
      }
    }

    fetchDatamuseRelations();
    return () => {
      isMounted = false;
    };
  }, [word]);

  const hasSynonyms = synonyms.length > 0;
  const hasAntonyms = antonyms.length > 0;
  const hasSimilar = similarWords.length > 0;
  const hasSoundsLike = soundsLikeWords.length > 0;

  if (!hasSynonyms && !hasAntonyms && !hasSimilar && !hasSoundsLike && !isLoadingRelated) {
    return null;
  }

  return (
    <section className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Word Relationships & Alternatives
        </h3>
        <span className="text-2xs text-slate-400">Contextual variations</span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {hasSynonyms && (
          <button
            type="button"
            onClick={() => setActiveTab('synonyms')}
            className={`min-h-9 px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'synonyms'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Synonyms ({synonyms.length})
          </button>
        )}

        {hasAntonyms && (
          <button
            type="button"
            onClick={() => setActiveTab('antonyms')}
            className={`min-h-9 px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'antonyms'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Antonyms ({antonyms.length})
          </button>
        )}

        {hasSimilar && (
          <button
            type="button"
            onClick={() => setActiveTab('similar')}
            className={`min-h-9 px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'similar'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Similar Ideas ({similarWords.length})
          </button>
        )}

        {hasSoundsLike && (
          <button
            type="button"
            onClick={() => setActiveTab('sounds-like')}
            className={`min-h-9 px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'sounds-like'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Sounds Like ({soundsLikeWords.length})
          </button>
        )}
      </div>

      {/* Relation Chips */}
      <div className="pt-1">
        {activeTab === 'synonyms' && (
          <div className="flex flex-wrap gap-2">
            {synonyms.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onWordClick(s)}
                className="min-h-9 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-indigo-100"
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
                className="min-h-9 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-rose-100"
              >
                {a}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'similar' && (
          <div className="flex flex-wrap gap-2">
            {similarWords.map((sim, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onWordClick(sim)}
                className="min-h-9 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-slate-200"
              >
                {sim}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'sounds-like' && (
          <div className="flex flex-wrap gap-2">
            {soundsLikeWords.map((snd, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onWordClick(snd)}
                className="min-h-9 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-amber-200"
              >
                {snd}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
