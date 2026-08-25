import React, { useState, useEffect } from 'react';
import { DictionaryEntry, CurriculumDictionaryMatch } from './dictionaryTypes';
import { speakWord } from '../../utils/speech';
import { ensureReviewItem } from '../../utils/reviewStorage';
import {
  isWordSavedInDb,
  saveWordToDb,
  removeSavedWordFromDb,
  createEntrySnapshot,
} from './dictionaryCache';
import { DictionaryMeaningSection } from './DictionaryMeaningSection';
import { DictionaryRelations } from './DictionaryRelations';

interface DictionaryEntryViewProps {
  entry: DictionaryEntry;
  isOfflineCached?: boolean;
  onWordClick: (word: string) => void;
  onNavigateLesson?: (lessonId: string) => void;
  onNavigateReview?: () => void;
}

export const DictionaryEntryView: React.FC<DictionaryEntryViewProps> = ({
  entry,
  isOfflineCached = false,
  onWordClick,
  onNavigateLesson,
  onNavigateReview,
}) => {
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [addedReviewWordId, setAddedReviewWordId] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Check saved state in IndexedDB on entry change
  useEffect(() => {
    let isMounted = true;
    isWordSavedInDb(entry.normalizedWord).then((saved) => {
      if (isMounted) setIsSaved(saved);
    });
    setAudioError(null);
    setAddedReviewWordId(null);
    setSaveFeedback(null);

    return () => {
      isMounted = false;
    };
  }, [entry.normalizedWord]);

  // Audio Playback Priority:
  // 1. First provider audio URL if available and valid https
  // 2. Web Speech API fallback (speakWord)
  const handlePlayAudio = (rate: number = 0.9) => {
    setAudioError(null);
    const providerAudio = entry.pronunciations.find((p) => p.audioUrl)?.audioUrl;

    if (providerAudio && providerAudio.startsWith('https://')) {
      try {
        setIsPlayingAudio(true);
        const audio = new Audio(providerAudio);
        audio.playbackRate = rate;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          setIsPlayingAudio(false);
          // Fallback to SpeechSynthesis
          const speechOk = speakWord(entry.word, rate);
          if (!speechOk) {
            setAudioError('Audio playback is unavailable on this device right now.');
          }
        };
        audio.play().catch(() => {
          setIsPlayingAudio(false);
          const speechOk = speakWord(entry.word, rate);
          if (!speechOk) {
            setAudioError('Audio playback is unavailable on this device right now.');
          }
        });
        return;
      } catch {
        setIsPlayingAudio(false);
      }
    }

    // Web Speech API fallback
    const speechOk = speakWord(entry.word, rate);
    if (!speechOk) {
      setAudioError('Audio playback is unavailable on this device right now.');
    }
  };

  const handleToggleSave = async () => {
    setSaveFeedback(null);
    if (isSaved) {
      const ok = await removeSavedWordFromDb(entry.normalizedWord);
      if (ok) {
        setIsSaved(false);
      } else {
        setSaveFeedback('Unable to remove word offline. Local storage may be restricted.');
      }
    } else {
      const primaryMatch = entry.curriculumMatches?.[0];
      const snapshot = createEntrySnapshot(entry);
      const ok = await saveWordToDb({
        schemaVersion: 1,
        id: `saved_${entry.normalizedWord.replace(/[^a-z0-9]/g, '_')}`,
        normalizedWord: entry.normalizedWord,
        displayWord: entry.word,
        savedAt: Date.now(),
        source: primaryMatch ? 'curriculum' : 'dictionary',
        curriculumWordId: primaryMatch?.wordId,
        lessonId: primaryMatch?.lessonId,
        snapshot,
      });
      if (ok) {
        setIsSaved(true);
      } else {
        setSaveFeedback('Unable to save word offline. Local storage quota exceeded or disabled.');
      }
    }
  };

  const handleAddToReview = (match: CurriculumDictionaryMatch) => {
    if (!match.wordId) return;
    ensureReviewItem(match.wordId);
    setAddedReviewWordId(match.wordId);
  };

  const hasCurriculumMatches = Array.isArray(entry.curriculumMatches) && entry.curriculumMatches.length > 0;
  const phoneticsText = entry.phonetic || entry.pronunciations.find((p) => p.text)?.text;

  return (
    <article className="w-full space-y-6">
      {/* Offline Cached Notice */}
      {isOfflineCached && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center justify-between">
          <span>Showing offline cached dictionary entry.</span>
          <span className="text-2xs uppercase tracking-wider font-bold bg-amber-200/70 px-2 py-0.5 rounded">
            Cached
          </span>
        </div>
      )}

      {/* Main Word Header Card */}
      <header className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                {entry.word}
              </h1>

              {hasCurriculumMatches && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  FlipEnglish Curriculum
                </span>
              )}
            </div>

            {phoneticsText && (
              <p className="text-base sm:text-lg font-mono text-slate-600 font-medium">
                {phoneticsText}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSave}
              className={`min-h-11 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                isSaved
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
              }`}
            >
              {isSaved ? 'Saved to Vocabulary' : 'Save Word'}
            </button>

            {saveFeedback && (
              <span className="text-xs text-rose-600 font-medium">{saveFeedback}</span>
            )}
          </div>
        </div>

        {/* Audio Pronunciation Controls */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
            Pronunciation:
          </span>

          <button
            type="button"
            onClick={() => handlePlayAudio(0.9)}
            disabled={isPlayingAudio}
            className="min-h-11 px-4 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-800 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            Play Normal (0.9x)
          </button>

          <button
            type="button"
            onClick={() => handlePlayAudio(0.65)}
            disabled={isPlayingAudio}
            className="min-h-11 px-4 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-800 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            Play Slow (0.65x)
          </button>

          {audioError && <span className="text-xs text-rose-600 font-medium">{audioError}</span>}
        </div>
      </header>

      {/* FlipEnglish Curriculum Match Cards */}
      {hasCurriculumMatches && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              FlipEnglish Learning Alignment
            </h2>
            <span className="text-xs text-slate-400">
              {entry.curriculumMatches!.length} {entry.curriculumMatches!.length === 1 ? 'lesson match' : 'lesson matches'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {entry.curriculumMatches!.map((match, idx) => (
              <div
                key={`${match.wordId}-${idx}`}
                className="p-5 bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-200/80 rounded-2xl shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-indigo-600 text-white">
                      {match.level}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{match.lessonTitle}</span>
                  </div>

                  {/* Actions for this curriculum word */}
                  <div className="flex items-center gap-2">
                    {onNavigateLesson && (
                      <button
                        type="button"
                        onClick={() => onNavigateLesson(match.lessonId)}
                        className="min-h-11 px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                      >
                        Open Lesson
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAddToReview(match)}
                      className={`min-h-11 px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                        addedReviewWordId === match.wordId
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                      }`}
                    >
                      {addedReviewWordId === match.wordId ? 'Added to Review' : 'Add to Smart Review'}
                    </button>
                  </div>
                </div>

                {/* Vietnamese Meaning & Example from canonical curriculum */}
                {match.meaning && (
                  <div className="text-sm">
                    <span className="font-bold text-slate-500 mr-2">Meaning (Tiếng Việt):</span>
                    <span className="font-semibold text-slate-900">{match.meaning}</span>
                  </div>
                )}

                {match.example && (
                  <div className="text-xs sm:text-sm text-slate-600 italic pl-3 border-l-2 border-indigo-300">
                    "{match.example}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dictionary Meanings & Definitions */}
      {entry.meanings.length > 0 ? (
        <DictionaryMeaningSection meanings={entry.meanings} onWordClick={onWordClick} />
      ) : (
        <section className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Saved Vocabulary Entry
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            English dictionary definition is not available in this saved snapshot. Connect to the internet for full definitions.
          </p>
        </section>
      )}

      {/* Synonyms, Antonyms, and Relations */}
      <DictionaryRelations
        word={entry.word}
        synonyms={entry.synonyms}
        antonyms={entry.antonyms}
        onWordClick={onWordClick}
      />
    </article>
  );
};
