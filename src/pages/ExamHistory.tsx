import React, { useState, useEffect, useRef } from 'react';
import { CEFRLevel } from '../types';
import { ExamResultReport } from '../types/exam';
import { getExamHistory, clearExamHistory } from '../utils/examStorage';
import { useI18n } from '../features/i18n';

interface ExamHistoryProps {
  onViewReport: (report: ExamResultReport) => void;
  onBackToExamCenter: () => void;
}

const ALL_LEVEL_FILTERS: ('ALL' | CEFRLevel)[] = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const ExamHistoryPage: React.FC<ExamHistoryProps> = ({
  onViewReport,
  onBackToExamCenter,
}) => {
  const { t } = useI18n();
  const [history, setHistory] = useState<ExamResultReport[]>(() => getExamHistory());
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<'ALL' | CEFRLevel>('ALL');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const clearTriggerBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setHistory(getExamHistory());
    };
    window.addEventListener('flipenglish_exam_history_updated', handleUpdate);
    return () => window.removeEventListener('flipenglish_exam_history_updated', handleUpdate);
  }, []);

  // Focus management for modal
  useEffect(() => {
    if (showClearConfirmModal) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (clearTriggerBtnRef.current) {
      clearTriggerBtnRef.current.focus();
    }
  }, [showClearConfirmModal]);

  // Accessibility: Focus trap & Escape key handling
  useEffect(() => {
    if (!showClearConfirmModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowClearConfirmModal(false);
        setClearError(null);
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showClearConfirmModal]);

  const handlePerformClearHistory = () => {
    setClearError(null);
    const success = clearExamHistory();
    if (success) {
      setHistory([]);
      setShowClearConfirmModal(false);
    } else {
      setClearError(t('exam.history.clearError'));
    }
  };

  const filteredHistory = history.filter((item) =>
    selectedLevelFilter === 'ALL' ? true : item.level === selectedLevelFilter
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            id="back-to-exam-center-from-history-btn"
            onClick={onBackToExamCenter}
            className="min-h-11 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
          >
            {t('ui.common.back')}
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{t('exam.history', { count: history.length })}</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Review your past practice examinations, overall scores, and diagnostic reports.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            ref={clearTriggerBtnRef}
            type="button"
            id="clear-exam-history-btn"
            onClick={() => {
              setClearError(null);
              setShowClearConfirmModal(true);
            }}
            className="min-h-11 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto flex items-center justify-center"
          >
            {t('exam.history.clear')}
          </button>
        )}
      </div>

      {/* Level Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {ALL_LEVEL_FILTERS.map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setSelectedLevelFilter(lvl)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedLevelFilter === lvl
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {lvl === 'ALL' ? 'All Levels' : lvl}
          </button>
        ))}
      </div>

      {/* History Grid */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-2xs">
          <div>
            <h3 className="text-lg font-bold text-slate-800">No Exam History Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Take your first practice exam from the Exam Center to track your progress and score trends.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToExamCenter}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            {t('exam.title')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHistory.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800">
                    {report.level}
                  </span>
                  <span className="text-2xs font-bold text-slate-400">{report.date}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1" lang="en">
                    {report.title}
                  </h3>
                  <p className="text-2xs text-slate-400 mt-0.5">
                    {Math.floor(report.durationSpentSeconds / 60)}m {report.durationSpentSeconds % 60}s duration
                  </p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-indigo-600">
                    {report.overallPercentage}%
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    ({report.correctCount}/{report.totalQuestions})
                  </span>
                </div>

                <span className="inline-block text-2xs font-extrabold uppercase px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                  {report.performanceLabel}
                </span>
              </div>

              <button
                type="button"
                id={`view-history-report-${report.id}`}
                onClick={() => onViewReport(report)}
                className="w-full min-h-11 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-2xs transition-colors cursor-pointer flex items-center justify-center"
              >
                View Report
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirmModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-history-modal-title"
          aria-describedby="clear-history-modal-desc"
        >
          <div
            ref={modalRef}
            className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6"
          >
            <div>
              <span className="text-2xs font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                {t('exam.history.clear')}
              </span>
              <h3 id="clear-history-modal-title" className="text-xl font-black text-slate-900 mt-1">
                {t('exam.history.clearConfirmTitle')}
              </h3>
            </div>

            <p id="clear-history-modal-desc" className="text-xs text-slate-500 leading-relaxed">
              {t('exam.history.clearConfirmDesc')}
            </p>

            {clearError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs font-bold text-rose-900" role="alert">
                {clearError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                ref={cancelBtnRef}
                type="button"
                id="cancel-clear-history-btn"
                onClick={() => {
                  setShowClearConfirmModal(false);
                  setClearError(null);
                }}
                className="w-full sm:w-auto flex-1 min-h-11 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center"
              >
                {t('exam.history.clearCancelBtn')}
              </button>

              <button
                type="button"
                id="confirm-clear-history-btn"
                onClick={handlePerformClearHistory}
                className="w-full sm:w-auto flex-1 min-h-11 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center"
              >
                {t('exam.history.clearConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
