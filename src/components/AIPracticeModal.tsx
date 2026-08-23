import React, { useState } from 'react';
import { Sparkles, Check, X, ArrowRight, RotateCcw, Volume2, HelpCircle } from 'lucide-react';
import { AIPracticeQuestion, VocabWord } from '../types';
import { speakWord } from '../utils/speech';

interface AIPracticeModalProps {
  lessonTitle: string;
  mistakeWords: VocabWord[];
  questions: AIPracticeQuestion[];
  onClose: () => void;
}

export const AIPracticeModal: React.FC<AIPracticeModalProps> = ({
  lessonTitle,
  questions,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleCheckAnswer = () => {
    if (!selectedOption || isAnswerChecked) return;

    const correct = selectedOption.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    setIsCorrect(correct);
    setIsAnswerChecked(true);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
    }

    if (currentQuestion.targetWord) {
      speakWord(currentQuestion.targetWord);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
      setIsCorrect(false);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setIsCorrect(false);
    setCorrectCount(0);
    setIsCompleted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Gemini AI Targeted Practice
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Tailored for {lessonTitle} mistakes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isCompleted ? (
          <div className="mt-6 space-y-6">
            {/* Progress & Target Word */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span>Reinforcing:</span>
                <strong className="capitalize">{currentQuestion.targetWord}</strong>
              </span>
              <span className="font-semibold text-slate-400">
                Question {currentIndex + 1} of {questions.length}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex + (isAnswerChecked ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <h4 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {currentQuestion.prompt}
              </h4>
            </div>

            {/* Multiple Choice Options */}
            <div className="grid grid-cols-1 gap-2.5">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isOptionCorrect = option.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();

                let style = 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 text-slate-800';

                if (isAnswerChecked) {
                  if (isOptionCorrect) {
                    style = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                  } else if (isSelected && !isCorrect) {
                    style = 'border-rose-500 bg-rose-50 text-rose-900';
                  } else {
                    style = 'border-slate-200 opacity-40 text-slate-400';
                  }
                } else if (isSelected) {
                  style = 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-2 ring-indigo-500/20';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!isAnswerChecked) {
                        setSelectedOption(option);
                      }
                    }}
                    disabled={isAnswerChecked}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left font-medium transition-all duration-150 flex items-center justify-between gap-3 focus:outline-hidden ${style}`}
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

            {/* Explanation & Audio Banner */}
            {isAnswerChecked && (
              <div
                className={`p-4 rounded-2xl flex items-start gap-3 transition-all ${
                  isCorrect
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isCorrect ? '✓ Well Done!' : '✕ Explanation'}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakWord(currentQuestion.targetWord)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-white/70 hover:bg-white transition-colors"
                      title="Hear word"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{currentQuestion.targetWord}</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-95">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {!isAnswerChecked ? (
                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  disabled={!selectedOption}
                  className={`w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm transition-all focus:outline-hidden ${
                    selectedOption
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Check Answer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  autoFocus
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-98"
                >
                  <span>{currentIndex + 1 < questions.length ? 'Next Question' : 'View AI Summary'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Completion Summary */
          <div className="mt-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
              <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>

            <div className="space-y-2">
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                AI Practice Complete!
              </h4>
              <p className="text-sm text-slate-600 max-w-sm mx-auto">
                You successfully practiced your mistake words with Gemini AI.
              </p>
            </div>

            <div className="py-4 px-6 rounded-2xl bg-indigo-50/80 border border-indigo-100 max-w-xs mx-auto text-indigo-950 font-bold text-xl">
              {correctCount} / {questions.length} Correct ({Math.round((correctCount / questions.length) * 100)}%)
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRestart}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake AI Practice</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
              >
                <span>Done</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
