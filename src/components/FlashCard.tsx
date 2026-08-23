import React, { useState, useEffect } from 'react';
import { VocabWord } from '../types';
import { speakWord } from '../utils/speech';
import { SafeImage } from './SafeImage';

interface FlashCardProps {
  word: VocabWord;
  currentIndex: number;
  totalWords: number;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const FlashCard: React.FC<FlashCardProps> = ({
  word,
  currentIndex,
  totalWords,
  onNext,
  onPrev,
  isFirst,
  isLast,
}) => {
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
          <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-3xl p-5 sm:p-6 flex flex-col justify-between border-2 border-slate-200 shadow-md hover:shadow-lg hover:border-indigo-300 transition-all text-center overflow-hidden">
            {/* Top row */}
            <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 mb-2 shrink-0">
              <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                Card {currentIndex + 1} of {totalWords}
              </span>
              <div className="flex items-center gap-2">
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
                <button
                  id="speak-front-button"
                  onClick={(e) => handleSpeak(e, word.word)}
                  title="Listen to pronunciation"
                  className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                >
                  Play Audio
                </button>
              </div>
            </div>

            {/* Photographic Image Section */}
            {word.imageUrl ? (
              <div className="relative w-full flex-1 max-h-[56%] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
                <SafeImage
                  src={word.imageUrl}
                  alt={word.imageAlt || word.word}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out"
                />
              </div>
            ) : (
              <div className="relative w-full flex-1 max-h-[56%] rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center p-6 text-indigo-200">
                <span className="text-sm font-semibold tracking-wider">{word.partOfSpeech || 'Lexical item'}</span>
              </div>
            )}

            {/* Word & IPA Typography */}
            <div className="flex flex-col items-center justify-center my-2 space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {word.word}
              </h2>
              {word.pronunciation && (
                <p className="text-sm sm:text-base font-mono font-medium text-slate-500">
                  {word.pronunciation}
                </p>
              )}
            </div>

            {/* Bottom Flip Indicator */}
            <div className="flex items-center justify-center text-xs font-semibold text-indigo-600 bg-indigo-50/80 px-4 py-1.5 rounded-lg shrink-0 mx-auto">
              <span>Tap card to see meaning</span>
            </div>
          </div>

          {/* ================= CARD BACK ================= */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-slate-900 text-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xl border-2 border-indigo-500/40 text-center overflow-y-auto">
            {/* Top row */}
            <div className="w-full flex items-center justify-between text-xs font-semibold text-indigo-300 shrink-0">
              <span className="px-3 py-1 rounded-lg bg-white/10 text-indigo-200 border border-white/15 uppercase tracking-wider font-bold">
                {word.partOfSpeech}
              </span>
              <button
                id="speak-back-button"
                onClick={(e) => handleSpeak(e, word.example || word.word)}
                title="Listen to sentence"
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
              >
                Play Audio
              </button>
            </div>

            {/* Back Content */}
            <div className="flex flex-col items-center justify-center my-auto space-y-3 px-1">
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
                  {word.word}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-amber-300">
                  {word.meaning}
                </h3>
              </div>

              {/* Example sentence */}
              {word.example && (
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 w-full text-left backdrop-blur-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xs text-indigo-300 font-bold uppercase tracking-wider">Example Sentence</span>
                    <button
                      onClick={(e) => handleSpeak(e, word.example)}
                      className="text-2xs text-indigo-200 hover:text-white font-bold"
                    >
                      Listen
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm font-normal italic text-white leading-relaxed">
                    "{word.example}"
                  </p>
                </div>
              )}

              {/* Advanced Nuance / Collocations / Synonyms (if present) */}
              {(word.nuance || (word.collocations && word.collocations.length > 0) || (word.synonyms && word.synonyms.length > 0)) && (
                <div className="w-full space-y-1.5 text-left text-2xs">
                  {word.nuance && (
                    <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-400/20 text-slate-200">
                      <span className="font-bold text-amber-300">Nuance: </span>
                      <span>{word.nuance}</span>
                    </div>
                  )}

                  {word.collocations && word.collocations.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-indigo-300 font-semibold mr-1">Collocations:</span>
                      {word.collocations.map((c, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono text-2xs">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {word.synonyms && word.synonyms.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-indigo-300 font-semibold mr-1">Synonyms:</span>
                      {word.synonyms.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 font-mono text-2xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Flip Back Prompt */}
            <div className="flex items-center justify-center text-xs font-medium text-indigo-200 bg-white/10 px-4 py-1 rounded-lg hover:bg-white/20 transition-colors shrink-0 mx-auto mt-2">
              <span>Tap to flip back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls Below Card */}
      <div className="w-full mt-6 flex items-center justify-between gap-4">
        <button
          id="flashcard-prev-btn"
          onClick={onPrev}
          disabled={isFirst}
          className={`flex-1 sm:flex-initial px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            isFirst
              ? 'opacity-40 bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs active:scale-98 cursor-pointer'
          }`}
        >
          Previous
        </button>

        {/* Spacebar Flip shortcut button */}
        <button
          id="flashcard-flip-btn"
          onClick={handleCardClick}
          className="hidden sm:inline-block px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          title="Shortcut: Spacebar"
        >
          Flip Card (Space)
        </button>

        <button
          id="flashcard-next-btn"
          onClick={onNext}
          className="flex-1 sm:flex-initial px-7 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all active:scale-98 cursor-pointer"
        >
          {isLast ? 'Complete Flashcards' : 'Next Word'}
        </button>
      </div>
    </div>
  );
};

