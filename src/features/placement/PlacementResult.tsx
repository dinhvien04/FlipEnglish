import React, { useState } from 'react';
import { PlacementResultReport, PlacementPersistenceResult, RecommendedLessonItem } from './placementTypes';
import { CEFRLevel, Lesson } from '../../types';
import { LESSONS } from '../../data/lessons';
import { resolveCurriculumItem } from '../../utils/curriculumIndex';
import {
  isPlacementResultExportedToReview,
  exportPlacementMissedToReview,
  savePlacementResultToHistory,
  clearActivePlacement,
} from './placementStorage';
import { useI18n } from '../i18n';

interface PlacementResultProps {
  report: PlacementResultReport;
  initialPersistence?: PlacementPersistenceResult;
  onPersistenceChange?: (persistence: PlacementPersistenceResult) => void;
  onRetake: () => void;
  onStartCurriculum: (level: CEFRLevel) => void;
  onSelectLesson: (lesson: Lesson) => void;
  onNavigateReview?: () => void;
}

export const PlacementResultPage: React.FC<PlacementResultProps> = ({
  report,
  initialPersistence,
  onPersistenceChange,
  onRetake,
  onStartCurriculum,
  onSelectLesson,
  onNavigateReview,
}) => {
  const { t } = useI18n();
  const isAlreadyExported = isPlacementResultExportedToReview(report.id);
  const [addedWordsCount, setAddedWordsCount] = useState<number | null>(
    isAlreadyExported ? -1 : null
  );
  const [exportError, setExportError] = useState<boolean>(false);

  const [persistenceState, setPersistenceState] = useState<PlacementPersistenceResult>(() => {
    if (initialPersistence !== undefined) {
      return initialPersistence;
    }
    // Viewing existing/history report or default
    return {
      latestSaved: true,
      historySaved: true,
      terminalStateSaved: true,
      activeSessionCleared: true,
      resultSaved: true,
      resumeSafetyEstablished: true,
      fullyCleaned: true,
      success: true,
    };
  });
  const [retryAttempted, setRetryAttempted] = useState<boolean>(false);

  const isFullyPersisted = persistenceState.success;

  const levelBadgeClass: Record<CEFRLevel, { bg: string; text: string; border: string }> = {
    A1: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700' },
    A2: { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-700' },
    B1: { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-700' },
    B2: { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-700' },
    C1: { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
    C2: { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-700' },
  };

  const levelStyle = levelBadgeClass[report.estimatedLevel] || levelBadgeClass.B1;

  // Resolve canonical curriculum item IDs for missed placement questions
  const canonicalWeakIds: string[] = Array.from(
    new Set(
      report.missedTargetItems
        .map((m) => m.wordId)
        .filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
        .filter((id: string) => Boolean(resolveCurriculumItem(id)))
    )
  );

  // Add missed canonical items to Smart Review idempotently
  const handleAddMissedToReview = () => {
    setExportError(false);
    const result = exportPlacementMissedToReview(report.id, canonicalWeakIds);
    if (result.success) {
      setAddedWordsCount(result.persisted);
    } else {
      setExportError(true);
    }
  };

  const handleRetrySave = () => {
    const res = savePlacementResultToHistory(report);
    const cleared = clearActivePlacement();
    const resultSaved = res.latestSaved && res.historySaved;
    const terminalStateSaved = persistenceState.terminalStateSaved;
    const resumeSafetyEstablished = cleared || terminalStateSaved;
    const fullyCleaned = cleared;
    const success = resultSaved && resumeSafetyEstablished;

    const fullResult: PlacementPersistenceResult = {
      latestSaved: res.latestSaved,
      historySaved: res.historySaved,
      terminalStateSaved,
      activeSessionCleared: cleared,
      resultSaved,
      resumeSafetyEstablished,
      fullyCleaned,
      success,
    };

    setPersistenceState(fullResult);
    setRetryAttempted(true);
    onPersistenceChange?.(fullResult);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {!isFullyPersisted && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-50 border border-amber-200 text-amber-900 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
        >
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-bold text-amber-950">
              {t('placement.result.saveWarning')}
            </p>
            <p className="text-2xs sm:text-xs text-amber-800">
              {t('error.storageWarningDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetrySave}
            className="shrink-0 min-h-11 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            {t('placement.result.retrySave')}
          </button>
        </div>
      )}

      {retryAttempted && isFullyPersisted && (
        <div
          role="status"
          aria-live="polite"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-xs"
        >
          {t('placement.result.savedSuccess')}
        </div>
      )}

      {/* Top Banner: Estimated Starting Level */}
      <section className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
              {t('placement.result.title')}
            </div>
            <p className="text-2xs sm:text-xs text-slate-400">
              Completed on {report.date} • {t('placement.result.confidence', { confidence: report.confidence })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${levelStyle.bg} flex items-center justify-center shadow-lg`}
            >
              <span className="text-2xl sm:text-4xl font-black text-white">
                {report.estimatedLevel}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {t('placement.result.estimatedLevel', { level: report.estimatedLevel })}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {report.levelDescription}
          </p>
        </div>

        {/* Can-Do Descriptor Statement */}
        <div className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700 space-y-1.5 text-xs sm:text-sm text-slate-300">
          <span className="text-2xs font-extrabold uppercase tracking-wider text-indigo-400 block">
            {t('placement.result.canDoTitle', { level: report.estimatedLevel })}
          </span>
          <p className="leading-relaxed">{report.canDoSummary}</p>
        </div>

        {/* Confidence Statement */}
        <div className="text-2xs text-slate-400 border-t border-slate-800 pt-3">
          <span className="font-bold text-slate-300">Assessment evidence: </span>
          {report.confidenceReason}
        </div>
      </section>

      {/* Placement Check Performance Breakdown */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {t('placement.result.skillBreakdown')}
            </h2>
            <p className="text-xs text-slate-500">
              Overall score: {report.overallPercentage}% ({report.correctCount} of{' '}
              {report.totalQuestions} questions correct)
            </p>
          </div>

          <span className="text-2xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            4 Adaptive Stages Completed
          </span>
        </div>

        {/* 4 Skill Cards: 2x2 on Mobile/Tablet */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vocabulary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <span className="text-2xs font-extrabold uppercase text-slate-400 block">
              Vocabulary
            </span>
            <div className="text-2xl font-black text-slate-900">
              {report.skillScores.vocabulary.percentage}%
            </div>
            <p className="text-2xs text-slate-500">
              {report.skillScores.vocabulary.correct} /{' '}
              {report.skillScores.vocabulary.attempted} correct
            </p>
          </div>

          {/* Use of English */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <span className="text-2xs font-extrabold uppercase text-slate-400 block">
              Use of English
            </span>
            <div className="text-2xl font-black text-slate-900">
              {report.skillScores['use-of-english'].percentage}%
            </div>
            <p className="text-2xs text-slate-500">
              {report.skillScores['use-of-english'].correct} /{' '}
              {report.skillScores['use-of-english'].attempted} correct
            </p>
          </div>

          {/* Reading */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <span className="text-2xs font-extrabold uppercase text-slate-400 block">
              Reading
            </span>
            <div className="text-2xl font-black text-slate-900">
              {report.skillScores.reading.percentage}%
            </div>
            <p className="text-2xs text-slate-500">
              {report.skillScores.reading.correct} /{' '}
              {report.skillScores.reading.attempted} correct
            </p>
          </div>

          {/* Listening */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <span className="text-2xs font-extrabold uppercase text-slate-400 block">
              Listening
            </span>
            <div className="text-2xl font-black text-slate-900">
              {report.skillScores.listening.percentage}%
            </div>
            <p className="text-2xs text-slate-500">
              {report.skillScores.listening.correct} /{' '}
              {report.skillScores.listening.attempted} correct
            </p>
          </div>
        </div>

        {/* Stage Path Progression */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
          <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-400 block">
            Adaptive Stage Path
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
            {report.stagePath.map((stage, idx) => (
              <React.Fragment key={stage.stageIndex}>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  Stage {stage.stageIndex + 1}: {stage.level} ({stage.correctCount}/{stage.totalQuestions})
                </span>
                {idx < report.stagePath.length - 1 && (
                  <span className="text-slate-400 font-bold">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Missed Vocabulary -> Smart Review CTA (Optional) */}
      {canonicalWeakIds.length > 0 && (
        <section className="bg-indigo-50/80 rounded-3xl p-6 sm:p-7 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-indigo-950">
              {t('placement.result.exportToReview')}
            </h3>
            <p className="text-xs text-indigo-800 leading-relaxed max-w-xl">
              You answered {report.missedTargetItems.length} questions incorrectly ({canonicalWeakIds.length} curriculum items eligible for spaced repetition). Add them directly to your Smart Review queue for practice.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {addedWordsCount !== null ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3.5 py-2 rounded-xl">
                  {addedWordsCount === -1 ? t('placement.result.exported') : `${addedWordsCount} items added to Review`}
                </span>
                {onNavigateReview && (
                  <button
                    type="button"
                    onClick={onNavigateReview}
                    className="min-h-11 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer inline-flex items-center"
                  >
                    {t('ui.nav.review')}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  id="add-placement-missed-btn"
                  onClick={handleAddMissedToReview}
                  className="min-h-12 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer inline-flex items-center justify-center"
                >
                  {t('placement.result.exportToReview')} ({canonicalWeakIds.length})
                </button>
                {exportError && (
                  <span className="text-2xs font-bold text-rose-600">
                    {t('error.storageWarningDesc')}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Recommended Lessons */}
      {report.recommendedLessons.length > 0 && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {t('placement.result.recommendedLessons')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized lesson modules tailored to your starting level and skill priorities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.recommendedLessons.map((rec: RecommendedLessonItem) => {
              const fullLesson = LESSONS.find((l) => l.id === rec.lessonId);

              return (
                <div
                  key={rec.lessonId}
                  className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                        {rec.level}
                      </span>
                      <span className="text-2xs text-slate-400 font-semibold">
                        {rec.category}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug" lang="en">
                      {rec.lessonTitle}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {rec.reason}
                    </p>
                  </div>

                  {fullLesson && (
                    <button
                      type="button"
                      onClick={() => onSelectLesson(fullLesson)}
                      className="w-full min-h-11 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center"
                    >
                      {t('today.task.action.start')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Action Buttons */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          id="start-recommended-curriculum-btn"
          onClick={() => onStartCurriculum(report.estimatedLevel)}
          className="min-h-12 sm:min-h-14 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-sm sm:text-base shadow-md transition-all cursor-pointer inline-flex items-center justify-center text-center"
        >
          {t('placement.result.startCurriculum', { level: report.estimatedLevel })}
        </button>

        <button
          type="button"
          onClick={onRetake}
          className="min-h-12 sm:min-h-14 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer inline-flex items-center justify-center"
        >
          {t('result.retakeQuizBtn')}
        </button>
      </section>

      {/* Disclaimer */}
      <p className="text-2xs text-slate-400 text-center leading-relaxed">
        {t('placement.disclaimer')}
      </p>
    </div>
  );
};
