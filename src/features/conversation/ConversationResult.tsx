import React, { useState } from 'react';
import { ConversationScenario, ConversationEvaluation, ConversationTurn } from '../../types/conversation';
import { CEFRLevel } from '../../types';
import { resolveCurriculumItemByText } from '../../utils/curriculumIndex';
import { batchAddItemsToReview, ensureReviewItem } from '../../utils/reviewStorage';

interface ConversationResultProps {
  scenario: ConversationScenario;
  level: CEFRLevel;
  evaluation: ConversationEvaluation;
  turns: ConversationTurn[];
  onPracticeAgain: () => void;
  onBackToLab: () => void;
  onNavigateReview?: () => void;
}

export const ConversationResult: React.FC<ConversationResultProps> = ({
  scenario,
  level,
  evaluation,
  turns,
  onPracticeAgain,
  onBackToLab,
  onNavigateReview,
}) => {
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  // Attempt matching expressions against canonical curriculum
  const matchedReviewItems = (evaluation.reviewItems || []).map((item) => {
    const resolved = resolveCurriculumItemByText(item.expression);
    return {
      ...item,
      matchedCurriculumId: resolved ? resolved.word.id : undefined,
    };
  });

  const handleAddMatchedToReview = () => {
    const canonicalIds: string[] = [];
    matchedReviewItems.forEach((item) => {
      if (item.matchedCurriculumId) {
        canonicalIds.push(item.matchedCurriculumId);
      }
    });

    if (canonicalIds.length > 0) {
      batchAddItemsToReview(canonicalIds);
      setAddedItems(new Set(canonicalIds));
    }
  };

  const handleAddSingleItem = (canonicalId: string) => {
    ensureReviewItem(canonicalId);
    setAddedItems((prev) => new Set([...prev, canonicalId]));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {scenario.category}
              </span>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                CEFR {level}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Conversation Complete
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {scenario.title} • {turns.filter((t) => t.role === 'user').length} learner turns completed
            </p>
          </div>

          <div className="text-right sm:text-right flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <span className="text-3xl sm:text-4xl font-black text-indigo-600">
              {evaluation.overallScore}%
            </span>
            <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold">
              Overall Performance
            </span>
          </div>
        </div>

        {/* Diagnostic Score Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Communication
            </span>
            <span className="text-lg font-black text-slate-900">
              {evaluation.scores?.communication ?? 0}%
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Vocabulary
            </span>
            <span className="text-lg font-black text-slate-900">
              {evaluation.scores?.vocabulary ?? 0}%
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Grammar
            </span>
            <span className="text-lg font-black text-slate-900">
              {evaluation.scores?.grammar ?? 0}%
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Natural Expression
            </span>
            <span className="text-lg font-black text-slate-900">
              {evaluation.scores?.naturalExpression ?? 0}%
            </span>
          </div>
        </div>

        {/* Summary */}
        {evaluation.summary && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Performance Summary
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {evaluation.summary}
            </p>
          </div>
        )}
      </div>

      {/* Strengths & Areas to Improve */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Strengths */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            What Went Well
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
            {evaluation.strengths?.map((str, idx) => (
              <li key={idx} className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 text-emerald-950">
                {str}
              </li>
            ))}
          </ul>
        </div>

        {/* Areas to Improve */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Focus Next
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
            {evaluation.improvements?.map((imp, idx) => (
              <li key={idx} className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 text-amber-950">
                {imp}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommended Expressions & Smart Review Integration */}
      {matchedReviewItems.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Expressions From This Conversation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Key expressions identified during your practice to reinforce in Smart Review.
              </p>
            </div>

            {matchedReviewItems.some((item) => item.matchedCurriculumId) && (
              <button
                type="button"
                onClick={handleAddMatchedToReview}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer"
              >
                Add matched items to Review
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {matchedReviewItems.map((item, idx) => {
              const isMatched = Boolean(item.matchedCurriculumId);
              const isAdded = item.matchedCurriculumId ? addedItems.has(item.matchedCurriculumId) : false;

              return (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      "{item.expression}"
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      {item.meaning}
                    </div>
                    {item.reason && (
                      <div className="text-2xs text-slate-400 mt-1 italic">
                        {item.reason}
                      </div>
                    )}
                  </div>

                  {isMatched && item.matchedCurriculumId && (
                    <div className="shrink-0">
                      {isAdded ? (
                        <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-2xs">
                          In Smart Review
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddSingleItem(item.matchedCurriculumId!)}
                          className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-bold text-2xs transition-colors cursor-pointer"
                        >
                          + Add to Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onPracticeAgain}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide shadow-xs transition-all cursor-pointer"
        >
          Practice Again
        </button>

        {onNavigateReview && (
          <button
            onClick={onNavigateReview}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            Go to Smart Review
          </button>
        )}

        <button
          onClick={onBackToLab}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer"
        >
          Back to Conversation Lab
        </button>
      </div>
    </div>
  );
};
