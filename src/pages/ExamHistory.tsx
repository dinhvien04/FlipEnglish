import React, { useState, useEffect } from 'react';
import { CEFRLevel } from '../types';
import { ExamResultReport } from '../types/exam';
import { getExamHistory } from '../utils/examStorage';

interface ExamHistoryProps {
  onViewReport: (report: ExamResultReport) => void;
  onBackToExamCenter: () => void;
}

const ALL_LEVEL_FILTERS: ('ALL' | CEFRLevel)[] = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const ExamHistoryPage: React.FC<ExamHistoryProps> = ({
  onViewReport,
  onBackToExamCenter,
}) => {
  const [history, setHistory] = useState<ExamResultReport[]>(() => getExamHistory());
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<'ALL' | CEFRLevel>('ALL');

  useEffect(() => {
    const handleUpdate = () => {
      setHistory(getExamHistory());
    };
    window.addEventListener('flipenglish_exam_history_updated', handleUpdate);
    return () => window.removeEventListener('flipenglish_exam_history_updated', handleUpdate);
  }, []);

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all exam history?')) {
      localStorage.removeItem('flipenglish_exam_history');
      setHistory([]);
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
            Back
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Exam History & Reports</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Review your past practice examinations, overall scores, and diagnostic reports.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            id="clear-exam-history-btn"
            onClick={handleClearHistory}
            className="min-h-10 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto flex items-center justify-center"
          >
            Clear History
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
            Go to Exam Center
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
                  <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1">
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
                View Full Report
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
