import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  X,
  ArrowRight,
  HelpCircle,
  Volume2,
  Image as ImageIcon,
  Headphones,
  Sparkles,
  Loader2,
  Lightbulb,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { QuizQuestion, MistakeExplanation } from '../types';
import { speakWord, stopSpeech } from '../utils/speech';
import { SafeImage } from './SafeImage';

interface QuizQuestionCardProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswerSubmit: (isCorrect: boolean) => void;
  lessonTitle?: string;
  lessonLevel?: string;
}

// Module-level in-memory cache to avoid repeated Gemini API requests during the session
const sessionMistakeCache = new Map<string, MistakeExplanation>();

export const QuizQuestionCard: React.FC<QuizQuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onAnswerSubmit,
  lessonTitle = 'Vocabulary',
  lessonLevel = 'A1-A2',
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState<boolean>(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(0.9);

  // Gemini Explain My Mistake state
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<MistakeExplanation | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when question changes
  useEffect(() => {
    stopSpeech();
    setSelectedOption(null);
    setTypedAnswer('');
    setIsAnswerChecked(false);
    setIsCorrect(false);
    setHasPlayedAudio(false);
    setIsExplaining(false);
    setExplanation(null);
    setExplanationError(null);

    // Focus input on fill-in-the-blank
    if (question.type === 'fill-in-the-blank') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }

    // Auto-play audio once for Listening Challenge
    if (question.type === 'listening-challenge') {
      const timer = setTimeout(() => {
        speakWord(question.word.word, 0.9);
        setHasPlayedAudio(true);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [question.id]);

  const handlePlayListeningAudio = (speed: number = 0.9) => {
    setAudioSpeed(speed);
    speakWord(question.word.word, speed);
    setHasPlayedAudio(true);
  };

  const handleCheckAnswer = () => {
    if (isAnswerChecked) return;

    let correct = false;

    if (question.type === 'fill-in-the-blank') {
      const normalizedTyped = typedAnswer.trim().toLowerCase();
      const normalizedTarget = question.correctAnswer.trim().toLowerCase();
      correct = normalizedTyped === normalizedTarget;
    } else {
      correct = selectedOption === question.correctAnswer;
    }

    setIsCorrect(correct);
    setIsAnswerChecked(true);

    // Auto-pronounce word for learning audio reinforcement
    if (question.word?.word) {
      speakWord(question.word.word, 0.9);
    }
  };

  const handleExplainMistake = async () => {
    if (isExplaining) return;

    const selectedAnswerText =
      question.type === 'fill-in-the-blank'
        ? typedAnswer.trim()
        : question.type === 'picture-quiz'
        ? question.imageOptions?.find((img) => img.id === selectedOption)?.word || 'Selected photo'
        : selectedOption || 'Unanswered';

    const correctAnswerText =
      question.type === 'picture-quiz'
        ? `${question.word.word} (${question.word.meaning})`
        : question.correctAnswer;

    const cacheKey = `${question.id}-${selectedAnswerText}`;

    // Check session cache first
    if (sessionMistakeCache.has(cacheKey)) {
      setExplanation(sessionMistakeCache.get(cacheKey)!);
      setExplanationError(null);
      return;
    }

    setIsExplaining(true);
    setExplanationError(null);

    try {
      const response = await fetch('/api/explain-mistake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: lessonLevel,
          lesson: lessonTitle,
          question: question.prompt + (question.sentence ? ` ${question.sentence}` : ''),
          selectedAnswer: selectedAnswerText,
          correctAnswer: correctAnswerText,
          targetWord: question.word.word,
          meaning: question.word.meaning,
          example: question.word.example,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "We couldn't generate an explanation right now.");
      }

      if (data.explanation && data.correctExample && data.tip) {
        const result: MistakeExplanation = {
          title: data.title || 'Why this answer is incorrect',
          explanation: data.explanation,
          correctExample: data.correctExample,
          tip: data.tip,
        };
        sessionMistakeCache.set(cacheKey, result);
        setExplanation(result);
      } else {
        throw new Error('Incomplete explanation data received.');
      }
    } catch (err: any) {
      console.error('Error fetching mistake explanation:', err);
      setExplanationError(
        "We couldn't generate an explanation right now. You can continue with the lesson normally."
      );
    } finally {
      setIsExplaining(false);
    }
  };

  const handleContinue = () => {
    stopSpeech();
    onAnswerSubmit(isCorrect);
  };

  const canCheck =
    question.type === 'fill-in-the-blank'
      ? typedAnswer.trim().length > 0
      : selectedOption !== null;

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md">
      {/* Top Question Header */}
      <div className="flex items-center justify-between gap-2 mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1.5">
          {question.type === 'listening-challenge' && <Headphones className="w-3.5 h-3.5" />}
          {question.type === 'picture-quiz' && <ImageIcon className="w-3.5 h-3.5" />}
          {question.type === 'en-to-vi' && 'English → Vietnamese'}
          {question.type === 'vi-to-en' && 'Vietnamese → English'}
          {question.type === 'fill-in-the-blank' && 'Fill in the Blank'}
          {question.type === 'picture-quiz' && 'Picture Quiz'}
          {question.type === 'listening-challenge' && 'Listening Challenge'}
        </span>
        <span className="text-xs font-semibold text-slate-400">
          Question {questionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Main Prompt */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
            {question.prompt}
          </h3>
          {question.type === 'picture-quiz' && (
            <button
              type="button"
              onClick={() => speakWord(question.word.word)}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shrink-0"
              title="Hear word pronunciation"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Listening Challenge Audio Control Area */}
        {question.type === 'listening-challenge' && (
          <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                id="listening-play-main-btn"
                onClick={() => handlePlayListeningAudio(audioSpeed)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-base shadow-md shadow-indigo-200 transition-all focus:outline-hidden"
              >
                <Volume2 className="w-5 h-5 animate-pulse" />
                <span>{hasPlayedAudio ? 'Listen again' : 'Listen'}</span>
              </button>
            </div>

            {/* Speed selection buttons: Normal and Slow */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end text-xs font-semibold">
              <span className="text-slate-500 mr-1">Speed:</span>
              <button
                type="button"
                onClick={() => handlePlayListeningAudio(0.9)}
                className={`px-3 py-1.5 rounded-xl border transition-all ${
                  audioSpeed === 0.9
                    ? 'bg-white border-indigo-300 text-indigo-700 shadow-xs font-bold'
                    : 'bg-transparent border-slate-200 text-slate-600 hover:bg-white/80'
                }`}
                title="Normal speed"
              >
                🔊 Normal
              </button>
              <button
                type="button"
                onClick={() => handlePlayListeningAudio(0.65)}
                className={`px-3 py-1.5 rounded-xl border transition-all ${
                  audioSpeed === 0.65
                    ? 'bg-white border-indigo-300 text-indigo-700 shadow-xs font-bold'
                    : 'bg-transparent border-slate-200 text-slate-600 hover:bg-white/80'
                }`}
                title="Slow speed for clarity"
              >
                🐢 Slow
              </button>
            </div>
          </div>
        )}

        {/* Fill in the blank sentence */}
        {question.sentence && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 text-base sm:text-lg font-medium leading-relaxed">
            {question.sentence.split('_______').map((part, idx, arr) => (
              <React.Fragment key={idx}>
                <span>{part}</span>
                {idx < arr.length - 1 && (
                  <span className="inline-block px-3 py-0.5 mx-1 font-mono font-bold bg-indigo-100 text-indigo-900 rounded-md border border-indigo-200">
                    {isAnswerChecked ? question.correctAnswer : '_______'}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Hint if present (and not listening challenge where hint could spoil) */}
        {question.hint && question.type !== 'listening-challenge' && (
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/60 w-fit">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Hint: {question.hint}</span>
          </div>
        )}
      </div>

      {/* Options or Input Field */}
      <div className="mb-6">
        {question.type === 'fill-in-the-blank' ? (
          <div className="space-y-2">
            <label htmlFor="quiz-text-input" className="block text-xs font-semibold text-slate-600">
              Type the missing English word:
            </label>
            <input
              id="quiz-text-input"
              ref={inputRef}
              type="text"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!isAnswerChecked && canCheck) {
                    handleCheckAnswer();
                  } else if (isAnswerChecked) {
                    handleContinue();
                  }
                }
              }}
              disabled={isAnswerChecked}
              placeholder="e.g. apple"
              autoComplete="off"
              className={`w-full px-4 py-3.5 text-lg font-semibold rounded-2xl border-2 transition-all outline-hidden ${
                isAnswerChecked
                  ? isCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                    : 'border-rose-500 bg-rose-50 text-rose-950'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-white text-slate-900'
              }`}
            />
          </div>
        ) : question.type === 'picture-quiz' ? (
          /* Picture Quiz 2x2 Image Grid */
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {question.imageOptions?.map((imgOption, index) => {
              const isSelected = selectedOption === imgOption.id;
              const isOptionCorrect = imgOption.id === question.correctAnswer;

              let cardBorder = 'border-slate-200 hover:border-slate-300 hover:shadow-md';
              let overlay = null;

              if (isAnswerChecked) {
                if (isOptionCorrect) {
                  cardBorder = 'border-emerald-500 ring-4 ring-emerald-500/25 shadow-md';
                  overlay = (
                    <div className="absolute inset-0 bg-emerald-500/15 flex items-center justify-center pointer-events-none">
                      <span className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </span>
                    </div>
                  );
                } else if (isSelected && !isCorrect) {
                  cardBorder = 'border-rose-500 ring-4 ring-rose-500/25 shadow-md';
                  overlay = (
                    <div className="absolute inset-0 bg-rose-500/15 flex items-center justify-center pointer-events-none">
                      <span className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg">
                        <X className="w-6 h-6 stroke-[3]" />
                      </span>
                    </div>
                  );
                } else {
                  cardBorder = 'border-slate-200 opacity-40';
                }
              } else if (isSelected) {
                cardBorder = 'border-indigo-600 ring-4 ring-indigo-500/25 shadow-md scale-[1.02]';
              }

              return (
                <button
                  key={imgOption.id || index}
                  id={`quiz-image-option-${index}`}
                  type="button"
                  onClick={() => {
                    if (!isAnswerChecked) {
                      setSelectedOption(imgOption.id);
                    }
                  }}
                  disabled={isAnswerChecked}
                  className={`relative group aspect-4/3 rounded-2xl overflow-hidden border-2 bg-slate-100 transition-all duration-200 cursor-pointer focus:outline-hidden ${cardBorder}`}
                >
                  <SafeImage
                    src={imgOption.imageUrl}
                    alt={imgOption.imageAlt || imgOption.word}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {overlay}
                  {!isAnswerChecked && !isSelected && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Multiple Choice (EN-to-VI, VI-to-EN, Listening Challenge) */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options?.map((option, index) => {
              const isSelected = selectedOption === option;
              const isOptionCorrect = option === question.correctAnswer;

              let buttonStyle =
                'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 text-slate-800';

              if (isAnswerChecked) {
                if (isOptionCorrect) {
                  buttonStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                } else if (isSelected && !isCorrect) {
                  buttonStyle = 'border-rose-500 bg-rose-50 text-rose-900';
                } else {
                  buttonStyle = 'border-slate-200 opacity-40 text-slate-400';
                }
              } else if (isSelected) {
                buttonStyle =
                  'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-2 ring-indigo-500/20';
              }

              return (
                <button
                  key={index}
                  id={`quiz-option-${index}`}
                  onClick={() => {
                    if (!isAnswerChecked) {
                      setSelectedOption(option);
                    }
                  }}
                  disabled={isAnswerChecked}
                  className={`p-4 rounded-2xl border-2 text-left font-medium transition-all duration-150 flex items-center justify-between gap-2 focus:outline-hidden ${buttonStyle}`}
                >
                  <span className="text-sm sm:text-base leading-snug">{option}</span>
                  {isAnswerChecked && isOptionCorrect && (
                    <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  {isAnswerChecked && isSelected && !isCorrect && (
                    <X className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Answer Feedback Banner (when checked) */}
      {isAnswerChecked && (
        <div className="space-y-4 mb-6 animate-in fade-in duration-200">
          <div
            id="quiz-feedback-banner"
            className={`p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 transition-all ${
              isCorrect
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {isCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </div>

            <div className="flex-1 space-y-1">
              <h4 className="font-extrabold text-base sm:text-lg leading-tight">
                {isCorrect ? '✓ Correct!' : '✕ Not quite'}
              </h4>

              {/* Detail message customized per question type */}
              {question.type === 'listening-challenge' ? (
                <div className="text-sm font-medium opacity-90 space-y-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span>
                      You heard: <strong>{question.word.word}</strong>{' '}
                      <span className="text-xs opacity-75 font-mono">
                        {question.word.pronunciation}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => speakWord(question.word.word)}
                      className="inline-flex items-center p-1 rounded hover:bg-black/10 transition-colors"
                      title="Replay word"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  {!isCorrect && (
                    <div>
                      Correct answer:{' '}
                      <strong>
                        {question.correctAnswer}
                      </strong>{' '}
                      — {question.word.meaning}
                    </div>
                  )}
                  {isCorrect && (
                    <div>
                      Meaning: <strong>{question.word.meaning}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm mt-0.5 font-medium opacity-90 flex items-center gap-2 flex-wrap">
                  <span>
                    {isCorrect ? (
                      <span>
                        <strong>{question.word.word}</strong> = {question.word.meaning}
                      </span>
                    ) : (
                      <span>
                        Correct answer for <strong>{question.word.word}</strong>:{' '}
                        {question.type === 'picture-quiz'
                          ? `[Matching photo]`
                          : question.correctAnswer}{' '}
                        ({question.word.meaning})
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakWord(question.word.word)}
                    className="inline-flex items-center p-1 rounded hover:bg-black/10 transition-colors"
                    title="Hear word"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </p>
              )}

              {/* Gemini Explain My Mistake Trigger Button (Only for incorrect answers) */}
              {!isCorrect && !explanation && (
                <div className="pt-2">
                  <button
                    type="button"
                    id="explain-mistake-btn"
                    onClick={handleExplainMistake}
                    disabled={isExplaining}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-900 bg-white border border-indigo-200 hover:bg-indigo-50 shadow-xs transition-all active:scale-98 disabled:opacity-60"
                  >
                    {isExplaining ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span>Understanding your mistake...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Explain My Mistake</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Gemini Explanation Box */}
          {explanation && (
            <div
              id="gemini-mistake-explanation-box"
              className="p-4 sm:p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-slate-800 space-y-3.5 animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Why?</span>
              </div>

              <p className="text-sm font-medium text-slate-700 leading-relaxed">
                {explanation.explanation}
              </p>

              <div className="pt-2 border-t border-indigo-100 space-y-2.5 text-xs sm:text-sm">
                <div>
                  <span className="font-bold text-indigo-950 block text-xs uppercase tracking-wider mb-1">
                    Example
                  </span>
                  <div className="text-slate-800 bg-white/90 px-3 py-2 rounded-xl border border-indigo-100 font-medium italic">
                    "{explanation.correctExample}"
                  </div>
                </div>

                <div className="flex items-start gap-2 text-slate-800 bg-amber-50/80 border border-amber-200/70 p-3 rounded-xl">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <strong className="text-amber-950">Tip: </strong>
                    <span>{explanation.tip}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explanation Error Fallback */}
          {explanationError && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-medium">{explanationError}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExplainMistake}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-amber-300 rounded-lg text-amber-950 font-bold hover:bg-amber-100 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Try Again</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end">
        {!isAnswerChecked ? (
          <button
            id="quiz-check-btn"
            onClick={handleCheckAnswer}
            disabled={!canCheck}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              canCheck
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 active:scale-98 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Check Answer
          </button>
        ) : (
          <button
            id="quiz-continue-btn"
            onClick={handleContinue}
            autoFocus
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-md transition-all active:scale-98 focus:outline-hidden cursor-pointer ${
              isCorrect
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                : 'bg-slate-800 hover:bg-slate-900 shadow-slate-300'
            }`}
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
