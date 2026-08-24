import React, { useState } from 'react';
import { ExamQuestion } from '../../types/exam';

interface ExamReviewModalProps {
  questions: ExamQuestion[];
  answers: Record<string, string>;
  flaggedQuestionIds: string[];
  onSelectQuestion: (index: number) => void;
  onConfirmSubmit: () => void;
  onClose: () => void;
}

export const ExamReviewModal: React.FC<ExamReviewModalProps> = ({
  questions,
  answers,
  flaggedQuestionIds,
  onSelectQuestion,
  onConfirmSubmit,
  onClose,
}) => {
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const flaggedSet = new Set(flaggedQuestionIds);

  const answeredIndices: number[] = [];
  const unansweredIndices: number[] = [];
  const flaggedIndices: number[] = [];

  questions.forEach((q, idx) => {
    const isAnswered = Boolean(answers[q.id]?.trim());
    if (isAnswered) {
      answeredIndices.push(idx);
    } else {
      unansweredIndices.push(idx);
    }
    if (flaggedSet.has(q.id)) {
      flaggedIndices.push(idx);
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        {showConfirmSubmit ? (
          /* Confirmation Prompt */
          <div className="space-y-6 text-center py-4">
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                {unansweredIndices.length > 0 ? 'Submit your exam?' : 'Ready to submit?'}
              </h3>

              {unansweredIndices.length > 0 ? (
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  You still have{' '}
                  <span className="font-bold text-rose-600">
                    {unansweredIndices.length} unanswered questions
                  </span>
                  {flaggedIndices.length > 0 && (
                    <>
                      {' '}
                      and{' '}
                      <span className="font-bold text-amber-600">
                        {flaggedIndices.length} flagged questions
                      </span>
                    </>
                  )}
                  . Once submitted, your answers will be graded immediately and cannot be changed.
                </p>
              ) : (
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Great job! You have answered all <span className="font-bold text-indigo-600">{questions.length} questions</span>.
                  Once submitted, your answers will be graded and detailed results will be displayed.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                id="cancel-submit-modal-btn"
                onClick={() => setShowConfirmSubmit(false)}
                className="w-full sm:w-auto min-h-12 px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all cursor-pointer flex items-center justify-center"
              >
                Keep Reviewing
              </button>

              <button
                type="button"
                id="confirm-submit-exam-btn"
                onClick={onConfirmSubmit}
                className="w-full sm:w-auto min-h-12 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-2xs transition-all cursor-pointer active:scale-98 flex items-center justify-center"
              >
                {unansweredIndices.length > 0 ? 'Submit Anyway' : 'Submit Final Answers'}
              </button>
            </div>
          </div>
        ) : (
          /* Main Review Overview */
          <>
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Review Your Exam</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check your answered questions and revisit flagged items before submitting.
                </p>
              </div>

              <button
                type="button"
                id="close-review-modal-btn"
                onClick={onClose}
                className="min-h-10 text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer flex items-center justify-center"
              >
                Close
              </button>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-center">
                <p className="text-2xs uppercase tracking-wider font-extrabold text-emerald-800">
                  Answered
                </p>
                <p className="text-2xl font-black text-emerald-700 mt-0.5">
                  {answeredIndices.length}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-center">
                <p className="text-2xs uppercase tracking-wider font-extrabold text-amber-800">
                  Flagged
                </p>
                <p className="text-2xl font-black text-amber-700 mt-0.5">
                  {flaggedIndices.length}
                </p>
              </div>

              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center">
                <p className="text-2xs uppercase tracking-wider font-extrabold text-slate-700">
                  Unanswered
                </p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">
                  {unansweredIndices.length}
                </p>
              </div>
            </div>

            {/* Grouped lists */}
            <div className="space-y-4">
              {/* Unanswered List */}
              {unansweredIndices.length > 0 && (
                <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4 space-y-2.5">
                  <div className="text-xs font-extrabold text-rose-800">
                    Unanswered Questions ({unansweredIndices.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unansweredIndices.map((idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onSelectQuestion(idx);
                          onClose();
                        }}
                        className="min-h-10 px-3.5 py-2 rounded-lg bg-white border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
                      >
                        Question {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Flagged List */}
              {flaggedIndices.length > 0 && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2.5">
                  <div className="text-xs font-extrabold text-amber-800">
                    Flagged for Review ({flaggedIndices.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {flaggedIndices.map((idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onSelectQuestion(idx);
                          onClose();
                        }}
                        className="min-h-10 px-3.5 py-2 rounded-lg bg-white border border-amber-300 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
                      >
                        Question {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                id="return-to-questions-btn"
                onClick={onClose}
                className="w-full sm:w-auto min-h-11 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
              >
                Return to Questions
              </button>

              <button
                type="button"
                id="proceed-to-submit-btn"
                onClick={() => setShowConfirmSubmit(true)}
                className="w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-2xs transition-all cursor-pointer active:scale-98 flex items-center justify-center"
              >
                Submit Final Answers
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
