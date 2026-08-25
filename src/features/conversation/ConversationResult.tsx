import React, { useState } from 'react';
import { ConversationScenario, ConversationEvaluation, ConversationTurn } from '../../types/conversation';
import { CEFRLevel } from '../../types';
import { resolveCurriculumItemByText } from '../../utils/curriculumIndex';
import { batchAddItemsToReview, ensureReviewItem } from '../../utils/reviewStorage';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const isEvaluated = evaluation.evaluationStatus === 'success' && typeof evaluation.overallScore === 'number';
  const learnerTurnsCount = turns.filter((t) => t.role === 'user').length;

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-8 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-2xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {scenario.category}
              </span>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                CEFR {level}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Conversation Complete
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {scenario.title} • {learnerTurnsCount} learner {learnerTurnsCount === 1 ? 'turn' : 'turns'} completed
            </p>
          </div>

          {isEvaluated && (
            <div className="text-left sm:text-right flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              <span className="text-3xl sm:text-4xl font-black text-indigo-600">
                {evaluation.overallScore}%
              </span>
              <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold">
                Overall Performance
              </span>
            </div>
          )}
        </div>

        {/* Diagnostic Score Breakdown if evaluated */}
        {isEvaluated && evaluation.scores && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-5 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Communication
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900">
                {evaluation.scores.communication}%
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Vocabulary
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900">
                {evaluation.scores.vocabulary}%
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Grammar
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900">
                {evaluation.scores.grammar}%
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Natural Expression
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900">
                {evaluation.scores.naturalExpression}%
              </span>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            {isEvaluated ? 'Performance Summary' : 'Session Note'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {evaluation.summary}
          </p>
        </div>
      </div>

      {/* Strengths & Areas to Improve (when available) */}
      {isEvaluated && ((evaluation.strengths && evaluation.strengths.length > 0) || (evaluation.improvements && evaluation.improvements.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Strengths */}
          {evaluation.strengths && evaluation.strengths.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                What Went Well
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                {evaluation.strengths.map((str, idx) => (
                  <li key={idx} className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 text-emerald-950">
                    {str}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas to Improve */}
          {evaluation.improvements && evaluation.improvements.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Focus Next
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                {evaluation.improvements.map((imp, idx) => (
                  <li key={idx} className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 text-amber-950">
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recommended Expressions & Smart Review Integration */}
      {matchedReviewItems.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs mb-8">
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
                className="w-full sm:w-auto min-h-11 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
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
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-sm break-words">
                      "{item.expression}"
                    </div>
                    <div className="text-slate-600 mt-0.5 break-words">
                      {item.meaning}
                    </div>
                    {item.reason && (
                      <div className="text-2xs text-slate-400 mt-1 italic break-words">
                        {item.reason}
                      </div>
                    )}
                  </div>

                  {isMatched && item.matchedCurriculumId && (
                    <div className="shrink-0 mt-2 sm:mt-0">
                      {isAdded ? (
                        <span className="inline-block px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-2xs">
                          In Smart Review
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddSingleItem(item.matchedCurriculumId!)}
                          className="min-h-10 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 font-bold text-2xs transition-colors cursor-pointer"
                        >
                          Add to Review
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <button
          onClick={onPracticeAgain}
          className="w-full sm:w-auto min-h-12 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide shadow-xs transition-all cursor-pointer flex items-center justify-center"
        >
          Practice Again
        </button>

        {onNavigateReview && (
          <button
            onClick={onNavigateReview}
            className="w-full sm:w-auto min-h-12 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center"
          >
            Go to Smart Review
          </button>
        )}

        <button
          onClick={onBackToLab}
          className="w-full sm:w-auto min-h-12 px-6 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center"
        >
          Back to Conversation Lab
        </button>
      </div>
    </div>
  );
};
