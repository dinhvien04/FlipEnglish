import React, { useState, useEffect } from 'react';
import { ExamQuestion } from '../../types/exam';

interface ExamQuestionViewProps {
  question: ExamQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string;
  isFlagged: boolean;
  onSelectAnswer: (answerText: string) => void;
  onToggleFlag: () => void;
  onPrev: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const ExamQuestionView: React.FC<ExamQuestionViewProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  isFlagged,
  onSelectAnswer,
  onToggleFlag,
  onPrev,
  onNext,
  isFirst,
  isLast,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image error state when question changes
  useEffect(() => {
    setImageError(false);
  }, [question.id]);

  const handlePlayAudio = (rate = 0.9) => {
    if (!question.audioPromptText || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.audioPromptText);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xs font-extrabold uppercase tracking-wider bg-slate-900 text-white px-2.5 py-0.5 rounded-md">
              {question.sectionTitle}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500">
            Question {questionNumber} of {totalQuestions}
          </p>
        </div>

        {/* Flag for review toggle */}
        <button
          type="button"
          id={`flag-question-btn-${question.id}`}
          onClick={onToggleFlag}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            isFlagged
              ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs font-extrabold'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title="Flag this question to review before final submission"
        >
          {isFlagged ? 'Flagged for Review' : 'Flag for Review'}
        </button>
      </div>

      {/* Main Content Area: Split layout if reading passage exists */}
      <div className="flex-1">
        {question.passage ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Reading Passage Left Column */}
            <div className="lg:col-span-6 bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200 max-h-[500px] overflow-y-auto space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h4 className="text-sm font-extrabold text-slate-900">{question.passage.title}</h4>
                <span className="text-2xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {question.passage.wordCount} words
                </span>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 font-serif">
                {question.passage.passage.split('\n\n').map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Reading Question Right Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {question.prompt}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((opt, idx) => {
                  const isSelected = selectedAnswer === opt.text;
                  const letter = optionLetters[idx] || String(idx + 1);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      id={`exam-opt-${question.id}-${idx}`}
                      onClick={() => onSelectAnswer(opt.text)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-600 shadow-xs ring-1 ring-indigo-600'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-slate-800 pt-0.5 leading-relaxed">
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Standard Full-width Question Layout */
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Listening audio controller if applicable */}
            {question.audioPromptText && (
              <div className="bg-indigo-50/60 rounded-2xl p-5 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    Listening Audio Track
                  </p>
                  <p className="text-2xs text-indigo-600 mt-0.5">
                    Click below to play the natural native pronunciation.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="exam-play-audio-btn"
                    onClick={() => handlePlayAudio(0.9)}
                    disabled={isPlayingAudio}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPlayingAudio ? 'Playing...' : 'Play Audio'}
                  </button>

                  <button
                    type="button"
                    id="exam-play-slow-audio-btn"
                    onClick={() => handlePlayAudio(0.65)}
                    disabled={isPlayingAudio}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    title="Play slow rate"
                  >
                    Slow 0.7x
                  </button>
                </div>
              </div>
            )}

            {/* Visual Frame for Picture-choice Questions */}
            {question.visualUrl && !imageError ? (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center space-y-3">
                <img
                  src={question.visualUrl}
                  alt="Visual question prompt"
                  onError={() => setImageError(true)}
                  className="w-full max-w-md h-56 sm:h-64 object-cover rounded-2xl border border-slate-200 shadow-2xs"
                />
                <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">
                  Select the English word matching the image above
                </p>
              </div>
            ) : imageError && question.targetMeaning ? (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-center space-y-1">
                <p className="text-2xs font-bold text-amber-800 uppercase tracking-wider">
                  Visual Item Unavailable — Meaning Provided
                </p>
                <p className="text-sm font-bold text-slate-900">
                  Target Vietnamese Meaning: &quot;{question.targetMeaning}&quot;
                </p>
              </div>
            ) : null}

            {/* Question Prompt */}
            <div className="space-y-3 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-base sm:text-xl font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                {question.prompt}
              </h3>
            </div>

            {/* Answer Choices */}
            <div className="space-y-3">
              {question.options.map((opt, idx) => {
                const isSelected = selectedAnswer === opt.text;
                const letter = optionLetters[idx] || String(idx + 1);

                return (
                  <button
                    key={opt.id}
                    type="button"
                    id={`exam-opt-${question.id}-${idx}`}
                    onClick={() => onSelectAnswer(opt.text)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-600 shadow-xs ring-1 ring-indigo-600'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {letter}
                    </span>

                    <div className="flex-1 pt-1">
                      <span className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed">
                        {opt.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-auto">
        <button
          type="button"
          id="exam-prev-btn"
          onClick={onPrev}
          disabled={isFirst}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <button
          type="button"
          id="exam-next-btn"
          onClick={onNext}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold shadow-2xs transition-all cursor-pointer active:scale-98"
        >
          {isLast ? 'Review Exam' : 'Next Question'}
        </button>
      </div>
    </div>
  );
};

