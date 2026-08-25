import React, { useState } from 'react';
import { DictionaryMeaning } from './dictionaryTypes';

interface DictionaryMeaningSectionProps {
  meanings: DictionaryMeaning[];
  onWordClick?: (word: string) => void;
}

export const DictionaryMeaningSection: React.FC<DictionaryMeaningSectionProps> = ({
  meanings,
  onWordClick,
}) => {
  // Track expanded state for each part of speech (initially show up to 3 definitions)
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  if (!meanings || meanings.length === 0) {
    return null;
  }

  const toggleExpand = (pos: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [pos]: !prev[pos],
    }));
  };

  return (
    <div className="space-y-6">
      {meanings.map((meaning, mIndex) => {
        const isExpanded = !!expandedMap[meaning.partOfSpeech];
        const displayDefinitions = isExpanded
          ? meaning.definitions
          : meaning.definitions.slice(0, 3);
        const hasMore = meaning.definitions.length > 3;

        return (
          <section
            key={`${meaning.partOfSpeech}-${mIndex}`}
            className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4"
          >
            {/* Part of Speech Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-black text-indigo-700 italic lowercase tracking-wide">
                {meaning.partOfSpeech}
              </h3>
              <span className="text-xs font-semibold text-slate-400">
                {meaning.definitions.length} {meaning.definitions.length === 1 ? 'sense' : 'senses'}
              </span>
            </div>

            {/* Ordered Definition List */}
            <ol className="space-y-4 list-decimal list-inside text-slate-800">
              {displayDefinitions.map((def, dIndex) => (
                <li key={dIndex} className="text-sm sm:text-base leading-relaxed pl-1 space-y-2">
                  <span className="font-normal text-slate-900">{def.definition}</span>

                  {/* Contextual Example */}
                  {def.example && (
                    <div className="mt-1.5 pl-3 border-l-2 border-indigo-200 text-slate-600 italic text-xs sm:text-sm">
                      "{def.example}"
                    </div>
                  )}

                  {/* Definition-specific Synonyms / Antonyms */}
                  {(def.synonyms?.length || def.antonyms?.length) ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {def.synonyms && def.synonyms.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-500">Synonyms:</span>
                          {def.synonyms.slice(0, 5).map((s, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => onWordClick && onWordClick(s)}
                              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-medium transition-colors cursor-pointer text-xs underline decoration-slate-300 underline-offset-2"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}

                      {def.antonyms && def.antonyms.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-500">Antonyms:</span>
                          {def.antonyms.slice(0, 5).map((a, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => onWordClick && onWordClick(a)}
                              className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors cursor-pointer text-xs underline decoration-rose-200 underline-offset-2"
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>

            {/* Show More / Show Less Button */}
            {hasMore && (
              <button
                type="button"
                onClick={() => toggleExpand(meaning.partOfSpeech)}
                className="min-h-10 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              >
                {isExpanded
                  ? 'Show fewer definitions'
                  : `Show all ${meaning.definitions.length} definitions`}
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
};
