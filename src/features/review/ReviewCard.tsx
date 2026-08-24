import React, { useEffect, useState } from 'react';
import { ResolvedReviewItem, ReviewRating } from '../../types/review';
import { formatIntervalHuman } from '../../utils/reviewScheduler';
import { speakWord } from '../../utils/speech';
import { SafeImage } from '../../components/SafeImage';

interface ReviewCardProps {
  item: ResolvedReviewItem;
  onRate: (rating: ReviewRating) => void;
  disabled?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ item, onRate, disabled = false }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const { word, lesson, level, nextIntervals } = item;

  // Reset revealed state when item changes
  useEffect(() => {
    setIsRevealed(false);
  }, [item.word.id]);

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      // Ignore when typing inside an input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (!isRevealed) {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          setIsRevealed(true);
        }
      } else {
        if (e.key === '1') {
          e.preventDefault();
          onRate('again');
        } else if (e.key === '2') {
          e.preventDefault();
          onRate('hard');
        } else if (e.key === '3') {
          e.preventDefault();
          onRate('good');
        } else if (e.key === '4') {
          e.preventDefault();
          onRate('easy');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, disabled, onRate]);

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    speakWord(text);
  };

  // Descriptive prompt based on item type
  const getPromptText = () => {
    switch (word.type) {
      case 'collocation':
        return 'What does this collocation mean? Recall its natural usage.';
      case 'phrasal_verb':
        return 'Recall the meaning and grammatical pattern of this phrasal verb.';
      case 'idiom':
        return 'What figurative meaning does this idiom convey?';
      case 'nuance':
        return 'Recall the specific nuance and context distinguishing this expression.';
      default:
        return 'Try to recall the Vietnamese meaning and how to use it in a sentence.';
    }
  };

  const levelBadgeClass: Record<string, string> = {
    A1: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    A2: 'bg-sky-100 text-sky-800 border-sky-200',
    B1: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    B2: 'bg-purple-100 text-purple-800 border-purple-200',
    C1: 'bg-rose-100 text-rose-800 border-rose-200',
    C2: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  return (
    <div
      id={`review-card-${word.id}`}
      className="w-full max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
    >
      {/* Top Meta Bar */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-2xs font-extrabold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
              levelBadgeClass[level] || 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {level}
          </span>
          <span className="text-xs font-medium text-slate-500 truncate max-w-[200px]">
            {lesson.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {item.state.status === 'learning' && (
            <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              Learning ({item.state.lapseCount > 0 ? `${item.state.lapseCount} lapse` : 'New'})
            </span>
          )}
          {item.state.status === 'review' && (
            <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
              Review (Streak {item.state.correctStreak})
            </span>
          )}
          {item.state.status === 'mastered' && (
            <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Mastered
            </span>
          )}
        </div>
      </div>

      {/* Main Card Body */}
      <div className="p-6 sm:p-8 flex-1 flex flex-col items-center text-center space-y-6">
        {/* Optional Visual Image if available */}
        {word.imageUrl && (
          <div className="w-full max-w-sm h-44 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative">
            <SafeImage
              src={word.imageUrl}
              alt={word.word}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Word / Expression Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
              {word.word}
            </h2>
            <button
              id={`speak-btn-${word.id}`}
              type="button"
              onClick={(e) => handleSpeak(e, word.word)}
              aria-label={`Listen to pronunciation for ${word.word}`}
              className="min-h-11 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200 cursor-pointer transition-colors inline-flex items-center justify-center"
            >
              Play Audio
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 font-mono">
            <span>{word.pronunciation}</span>
            <span>•</span>
            <span className="capitalize font-sans font-medium text-slate-600">
              {word.partOfSpeech || word.type}
            </span>
          </div>
        </div>

        {/* Dynamic Prompt */}
        {!isRevealed ? (
          <div className="w-full pt-4 space-y-6">
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {getPromptText()}
            </p>

            <button
              id="reveal-answer-btn"
              type="button"
              onClick={() => setIsRevealed(true)}
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer text-sm"
            >
              Reveal answer
              <span className="ml-2 text-xs opacity-75 font-normal hidden sm:inline">
                [Space or Enter]
              </span>
            </button>
          </div>
        ) : (
          /* Revealed Content */
          <div className="w-full pt-2 space-y-5 text-left border-t border-slate-100 animate-fadeIn">
            {/* Vietnamese Meaning */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-400 block mb-1">
                Meaning
              </span>
              <p className="text-lg font-bold text-slate-900">{word.meaning}</p>
            </div>

            {/* Example Sentence */}
            {word.example && (
              <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs uppercase tracking-wider font-bold text-indigo-600">
                    Example Sentence
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleSpeak(e, word.example)}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white/80 hover:bg-white active:bg-white/60 min-h-11 px-3 rounded-lg border border-indigo-100 cursor-pointer inline-flex items-center justify-center transition-colors"
                  >
                    Listen
                  </button>
                </div>
                <p className="text-sm text-slate-800 italic leading-relaxed">
                  "{word.example}"
                </p>
                {word.exampleTranslation && (
                  <p className="text-xs text-slate-500">{word.exampleTranslation}</p>
                )}
              </div>
            )}

            {/* Advanced Context / Synonyms / Nuances */}
            {(word.context || word.nuance || word.synonyms?.length || word.collocations?.length) && (
              <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                {word.context && (
                  <p>
                    <strong className="text-slate-700">Usage context:</strong> {word.context}
                  </p>
                )}
                {word.nuance && (
                  <p>
                    <strong className="text-slate-700">Nuance:</strong> {word.nuance}
                  </p>
                )}
                {word.collocations && word.collocations.length > 0 && (
                  <p>
                    <strong className="text-slate-700">Collocations:</strong>{' '}
                    {word.collocations.join(', ')}
                  </p>
                )}
                {word.synonyms && word.synonyms.length > 0 && (
                  <p>
                    <strong className="text-slate-700">Synonyms:</strong>{' '}
                    {word.synonyms.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Rating Bar (Active only when answer is revealed) */}
      {isRevealed && (
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3">
          <div className="text-center text-xs font-bold text-slate-600">
            How well did you remember this?
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. AGAIN */}
            <button
              id="rate-again-btn"
              type="button"
              disabled={disabled}
              onClick={() => onRate('again')}
              className="min-h-14 flex flex-col items-center justify-center p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 active:bg-rose-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold">Again</span>
                <span className="text-2xs opacity-60 font-mono hidden sm:inline">[1]</span>
              </div>
              <span className="text-2xs font-semibold text-rose-600 mt-0.5">
                {formatIntervalHuman(nextIntervals.again)}
              </span>
            </button>

            {/* 2. HARD */}
            <button
              id="rate-hard-btn"
              type="button"
              disabled={disabled}
              onClick={() => onRate('hard')}
              className="min-h-14 flex flex-col items-center justify-center p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 active:bg-amber-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold">Hard</span>
                <span className="text-2xs opacity-60 font-mono hidden sm:inline">[2]</span>
              </div>
              <span className="text-2xs font-semibold text-amber-700 mt-0.5">
                {formatIntervalHuman(nextIntervals.hard)}
              </span>
            </button>

            {/* 3. GOOD */}
            <button
              id="rate-good-btn"
              type="button"
              disabled={disabled}
              onClick={() => onRate('good')}
              className="min-h-14 flex flex-col items-center justify-center p-3 rounded-xl border border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 active:bg-sky-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold">Good</span>
                <span className="text-2xs opacity-60 font-mono hidden sm:inline">[3]</span>
              </div>
              <span className="text-2xs font-semibold text-sky-700 mt-0.5">
                {formatIntervalHuman(nextIntervals.good)}
              </span>
            </button>

            {/* 4. EASY */}
            <button
              id="rate-easy-btn"
              type="button"
              disabled={disabled}
              onClick={() => onRate('easy')}
              className="min-h-14 flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 active:bg-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold">Easy</span>
                <span className="text-2xs opacity-60 font-mono hidden sm:inline">[4]</span>
              </div>
              <span className="text-2xs font-semibold text-emerald-700 mt-0.5">
                {formatIntervalHuman(nextIntervals.easy)}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
