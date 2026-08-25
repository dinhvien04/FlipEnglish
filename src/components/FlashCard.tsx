import React, { useState, useEffect } from 'react';
import { VocabWord } from '../types';
import { speakWord } from '../utils/speech';
import { SafeImage } from './SafeImage';
import { useI18n } from '../features/i18n';

interface FlashCardProps {
  word: VocabWord;
  currentIndex: number;
  totalWords: number;
  onNext: () => void;
  onPrev: () => void;
  onLookupWord?: (word: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

export const FlashCard: React.FC<FlashCardProps> = ({
  word,
  currentIndex,
  totalWords,
  onNext,
  onPrev,
  onLookupWord,
  isFirst,
  isLast,
}) => {
  const { t } = useI18n();
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when word changes
  useEffect(() => {
    setIsFlipped(false);
  }, [word.id]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev]);

  const handleCardClick = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    speakWord(text);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center select-none">
      {/* 3D Perspective Card Container */}
      <div
        id="flashcard-container"
        className="w-full aspect-[4/5] sm:aspect-[1/1] max-h-[540px] perspective-1000 cursor-pointer group"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        aria-label={`Flashcard for ${word.word}. Click or press space to flip.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
        }}
      >
        <div
          className={`relative w-full h-full duration-500 preserve-3d transition-transform ease-out rounded-3xl ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* ================= CARD FRONT ================= */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-3xl p-4 sm:p-6 flex flex-col justify-between border-2 border-slate-200 shadow-md hover:shadow-lg hover:border-indigo-300 transition-all text-center overflow-hidden">
            {/* Top row */}
            <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 mb-2 shrink-0 gap-2">
              <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold shrink-0">
                {t('learn.flashcard.progress', { current: currentIndex + 1, total: totalWords })}
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                {word.register && (
                  <span className="text-2xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                    {word.register}
                  </span>
                )}
                {word.type && word.type !== 'word' && (
                  <span className="text-2xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                    {word.type}
                  </span>
                )}
                {onLookupWord && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLookupWord(word.word);
                    }}
                    title={t('dictionary.title')}
                    className="min-h-11 px-3 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center border border-slate-200"
                  >
                    {t('learn.flashcard.lookupWord')}
                  </button>
                )}
                <button
                  id="speak-front-button"
                  onClick={(e) => handleSpeak(e, word.word)}
                  title={t('dictionary.audio.play')}
                  className="min-h-11 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center"
                >
                  {t('dictionary.audio.play')}
                </button>
              </div>
            </div>

            {/* Photographic Image or Typography-First Section */}
            {word.imageUrl ? (
              <div className="relative w-full flex-1 max-h-[52%] sm:max-h-[56%] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
                <SafeImage
                  src={word.imageUrl}
                  alt={word.imageAlt || word.word}
                  loading={currentIndex === 0 ? 'eager' : 'lazy'}
                  fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out"
                />
              </div>
            ) : (
              <div className="relative w-full flex-1 max-h-[52%] sm:max-h-[56%] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200/70 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
                <span className="text-2xs font-bold uppercase tracking-widest text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-2xs mb-2">
                  {word.type && word.type !== 'word' ? word.type.replace('_', ' ') : (word.partOfSpeech || 'Lexical item')}
                </span>
                <span className="text-base sm:text-lg font-extrabold text-slate-800 max-w-xs line-clamp-2 break-words" lang="en">
                  {word.word}
                </span>
                <span className="text-xs text-slate-500 font-medium mt-1">
                  Contextual Study Card
                </span>
              </div>
            )}

            {/* Word & IPA Typography (Always canonical English) */}
            <div className="flex flex-col items-center justify-center my-1.5 sm:my-2 space-y-1 min-w-0 px-2">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 break-words max-w-full" lang="en">
                {word.word}
              </h2>
              {word.pronunciation && (
                <p className="text-sm sm:text-base font-mono font-medium text-slate-500 break-words max-w-full">
                  {word.pronunciation}
                </p>
              )}
            </div>

            {/* Bottom Flip Indicator */}
            <div className="flex items-center justify-center text-xs font-semibold text-indigo-600 bg-indigo-50/80 px-4 py-1.5 rounded-lg shrink-0 mx-auto">
              <span>{t('learn.flashcard.flipHint')}</span>
            </div>
          </div>

          {/* ================= CARD BACK ================= */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-slate-900 text-white rounded-3xl p-5 sm:p-7 flex flex-col justify-between shadow-xl border-2 border-indigo-500/40 text-center overflow-y-auto">
            {/* Top row */}
            <div className="w-full flex items-center justify-between text-xs font-semibold text-indigo-300 shrink-0">
              <span className="px-3 py-1 rounded-lg bg-white/10 text-indigo-200 border border-white/15 uppercase tracking-wider font-bold">
                {word.partOfSpeech}
              </span>
              <button
                id="speak-back-button"
                onClick={(e) => handleSpeak(e, word.example || word.word)}
                title={t('dictionary.audio.play')}
                className="min-h-11 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                {t('dictionary.audio.play')}
              </button>
            </div>

            {/* Back Content */}
            <div className="flex flex-col items-center justify-center my-auto space-y-3 px-1 min-w-0">
              <div className="space-y-1 max-w-full">
                <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300 break-words" lang="en">
                  {word.word}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-amber-300 break-words" lang="vi">
                  {word.meaning}
                </h3>
              </div>

              {/* Example sentence (Canonical English) */}
              {word.example && (
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 max-w-md w-full">
                  <p className="text-xs font-semibold text-slate-300 mb-1">
                    {t('learn.flashcard.exampleSentence')}:
                  </p>
                  <p className="text-xs sm:text-sm text-slate-100 font-medium italic leading-relaxed" lang="en">
                    "{word.example}"
                  </p>
                </div>
              )}

              {/* English definition (if available) */}
              {word.definition && (
                <div className="p-3 bg-indigo-950/60 rounded-2xl border border-indigo-500/20 max-w-md w-full">
                  <p className="text-xs font-semibold text-indigo-300 mb-1">
                    {t('learn.flashcard.englishDefinition')}:
                  </p>
                  <p className="text-xs text-indigo-100 leading-relaxed" lang="en">
                    {word.definition}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="w-full flex items-center justify-between gap-3 pt-3 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                disabled={isFirst}
                className="flex-1 min-h-11 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs sm:text-sm text-white transition-colors cursor-pointer"
              >
                {t('learn.flashcard.prev')}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="flex-1 min-h-11 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs sm:text-sm text-white shadow-md transition-colors cursor-pointer"
              >
                {isLast ? t('learn.flashcard.finish') : t('learn.flashcard.next')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
