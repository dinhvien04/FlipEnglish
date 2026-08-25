import React, { useState } from 'react';
import { AIPracticeQuestion, VocabWord } from '../types';
import { speakWord } from '../utils/speech';
import { useI18n } from '../features/i18n';

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
  const { t } = useI18n();
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
          <div className="space-y-0.5">
            <h3 className="text-base font-extrabold text-slate-900 leading-tight">
              {t('aiPractice.title')}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {t('aiPractice.subtitle', { lessonTitle })}
            </p>
          </div>

          <button
            onClick={onClose}
            className="min-h-10 px-3.5 py-1.5 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer flex items-center justify-center"
          >
            {t('ui.common.close')}
          </button>
        </div>

        {!isCompleted ? (
          <div className="mt-6 space-y-6">
            {/* Progress & Target Word */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span>{t('aiPractice.reinforcing')}</span>
                <strong lang="en" className="capitalize">{currentQuestion.targetWord}</strong>
              </span>
              <span className="font-semibold text-slate-400">
                {t('aiPractice.questionProgress', { current: currentIndex + 1, total: questions.length })}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Prompt */}
            <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <p lang="en" className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed">
                {currentQuestion.prompt}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrectAnswer = option === currentQuestion.correctAnswer;

                let optionStyle = 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50';

                if (isAnswerChecked) {
                  if (isCorrectAnswer) {
                    optionStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                  } else if (isSelected && !isCorrect) {
                    optionStyle = 'bg-rose-50 border-rose-500 text-rose-900 line-through opacity-75';
                  } else {
                    optionStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-50';
                  }
                } else if (isSelected) {
                  optionStyle = 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold';
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswerChecked}
                    onClick={() => setSelectedOption(option)}
                    className={`w-full min-h-12 p-3 sm:p-4 text-left text-sm font-semibold rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${optionStyle}`}
                  >
                    <span lang="en">{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback & Explanation */}
            {isAnswerChecked && (
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isCorrect
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs uppercase tracking-wider">
                    {isCorrect ? t('aiPractice.correct') : t('aiPractice.incorrect')}
                  </span>
                  {currentQuestion.targetWord && (
                    <button
                      onClick={() => speakWord(currentQuestion.targetWord)}
                      className="min-h-9 px-2.5 py-1 text-xs font-bold rounded-md bg-white/80 border border-slate-200 text-slate-700 hover:bg-white transition-colors cursor-pointer"
                    >
                      {t('aiPractice.listen')}
                    </button>
                  )}
                </div>
                <p lang="en" className="text-xs sm:text-sm leading-relaxed font-medium">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              {!isAnswerChecked ? (
                <button
                  disabled={!selectedOption}
                  onClick={handleCheckAnswer}
                  className="w-full min-h-12 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  {t('aiPractice.checkAnswer')}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="w-full min-h-12 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  {currentIndex + 1 < questions.length
                    ? t('aiPractice.nextQuestion')
                    : t('aiPractice.viewSummary')}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Completion Summary */
          <div className="mt-8 text-center space-y-6">
            <div className="space-y-2">
              <h4 className="text-xl sm:text-2xl font-black text-slate-900">
                {t('aiPractice.complete')}
              </h4>
              <p className="text-sm text-slate-500">
                {t('aiPractice.score', { correct: correctCount, total: questions.length })}
              </p>
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-left space-y-2">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-indigo-700 block">
                {t('aiPractice.reinforcing')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {questions.map((q, i) => (
                  <span
                    key={i}
                    lang="en"
                    className="px-2.5 py-1 bg-white text-indigo-900 border border-indigo-200 rounded-lg text-xs font-bold capitalize"
                  >
                    {q.targetWord}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleRestart}
                className="w-full min-h-12 py-3 px-5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
              >
                {t('aiPractice.retake')}
              </button>
              <button
                onClick={onClose}
                className="w-full min-h-12 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
              >
                {t('aiPractice.done')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
