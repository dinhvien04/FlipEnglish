import React from 'react';
import { ExamQuestion } from '../../types/exam';

interface QuestionNavigatorProps {
  questions: ExamQuestion[];
  answers: Record<string, string>;
  flaggedQuestionIds: string[];
  currentIndex: number;
  onSelectQuestion: (index: number) => void;
  onRequestReview: () => void;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  answers,
  flaggedQuestionIds,
  currentIndex,
  onSelectQuestion,
  onRequestReview,
}) => {
  const flaggedSet = new Set(flaggedQuestionIds);

  const answeredCount = questions.filter((q) => Boolean(answers[q.id]?.trim())).length;
  const flaggedCount = flaggedQuestionIds.length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
          Question Navigator
        </h3>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Question Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-2 max-h-[380px] overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const isAnswered = Boolean(answers[q.id]?.trim());
          const isFlagged = flaggedSet.has(q.id);
          const isCurrent = idx === currentIndex;

          let btnClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
          if (isAnswered) {
            btnClass = 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold';
          }
          if (isCurrent) {
            btnClass = 'bg-indigo-600 text-white border-indigo-700 font-black shadow-xs ring-2 ring-indigo-300';
          }

          return (
            <button
              key={q.id}
              type="button"
              id={`nav-question-${idx + 1}`}
              onClick={() => onSelectQuestion(idx)}
              aria-label={`Question ${idx + 1}, ${isAnswered ? 'Answered' : 'Unanswered'}, ${isFlagged ? 'Flagged for review' : ''}`}
              className={`relative min-h-11 h-11 rounded-xl flex items-center justify-center text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${btnClass}`}
            >
              <span>{String(idx + 1).padStart(2, '0')}</span>

              {/* Status Indicator Tag */}
              {isFlagged && (
                <span
                  title="Flagged for review"
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border border-white"
                />
              )}

              {isAnswered && !isCurrent && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend & Stats */}
      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-600 font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
            Answered:
          </span>
          <span className="font-bold text-slate-900">{answeredCount}</span>
        </div>

        <div className="flex items-center justify-between text-slate-600 font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Flagged:
          </span>
          <span className="font-bold text-slate-900">{flaggedCount}</span>
        </div>

        <div className="flex items-center justify-between text-slate-600 font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
            Unanswered:
          </span>
          <span className="font-bold text-slate-900">{unansweredCount}</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="button"
        id="exam-review-submit-btn"
        onClick={onRequestReview}
        className="w-full mt-auto py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-2xs transition-all cursor-pointer active:scale-98"
      >
        Review & Submit
      </button>
    </div>
  );
};
