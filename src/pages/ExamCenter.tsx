import React, { useState, useEffect, useMemo } from 'react';
import { CEFRLevel } from '../types';
import { ExamMode, ExamResultReport } from '../types/exam';
import { LEVEL_EXAM_CONFIGS } from '../data/exams/config';
import { getExamHistory, getLevelTrend } from '../utils/examStorage';
import { useI18n } from '../features/i18n';

interface ExamCenterProps {
  onStartExamFlow: (mode: ExamMode, level: CEFRLevel) => void;
  onViewResultReport: (report: ExamResultReport) => void;
  onViewAllHistory: () => void;
  onStartPlacement?: () => void;
}

const ALL_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const ExamCenter: React.FC<ExamCenterProps> = ({
  onStartExamFlow,
  onViewResultReport,
  onViewAllHistory,
  onStartPlacement,
}) => {
  const { t } = useI18n();
  const [examHistory, setExamHistory] = useState<ExamResultReport[]>(() => getExamHistory());
  const [selectedModalMode, setSelectedModalMode] = useState<ExamMode | null>(null);
  const [trendLevel, setTrendLevel] = useState<CEFRLevel>('B2');

  useEffect(() => {
    const handleUpdate = () => {
      setExamHistory(getExamHistory());
    };
    window.addEventListener('flipenglish_exam_history_updated', handleUpdate);
    return () => window.removeEventListener('flipenglish_exam_history_updated', handleUpdate);
  }, []);

  const levelTrend = useMemo(() => getLevelTrend(trendLevel), [trendLevel, examHistory]);

  const recentExams = useMemo(() => examHistory.slice(0, 4), [examHistory]);

  const handleSelectLevelAndStart = (level: CEFRLevel) => {
    if (!selectedModalMode) return;
    const mode = selectedModalMode;
    setSelectedModalMode(null);
    onStartExamFlow(mode, level);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 animate-fadeIn">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))]" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold tracking-wide">
            <span>FlipEnglish Assessment & Practice Center</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            {t('exam.title')}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            {t('exam.subtitle')}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              Realistic Timed Countdown
            </span>
            <span className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              Detailed Skill Breakdown & Gemini Analysis
            </span>
          </div>
        </div>
      </section>

      {/* 3 Main Exam Modes */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Choose Your Exam Mode</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select a mode below to begin your self-assessment.
            </p>
          </div>

          {/* Secondary Placement Entry Point */}
          {onStartPlacement && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 max-w-md">
              <div className="space-y-0.5">
                <span className="text-2xs font-extrabold uppercase tracking-wider text-indigo-700">
                  {t('placement.title')}
                </span>
                <p className="text-xs font-semibold text-slate-700">
                  Not sure which CEFR level fits you?
                </p>
              </div>
              <button
                type="button"
                id="exam-center-placement-btn"
                onClick={onStartPlacement}
                className="min-h-11 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-2xs transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
              >
                {t('home.hero.startPlacement')}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mode 1: Quick Test */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-6 group">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider">
                Fast Paced
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">Quick Test</h3>
                <p className="text-xs font-bold text-amber-600 mt-0.5">15 Questions • 10 Minutes</p>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t('exam.mode.quickDesc')}
              </p>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-2xs text-slate-500 font-semibold space-y-1">
                <p>• Fast, high-density practice</p>
                <p>• Immediate scoring after submission</p>
              </div>
            </div>

            <button
              type="button"
              id="start-quick-test-btn"
              onClick={() => setSelectedModalMode('quick')}
              className="w-full min-h-12 py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer active:scale-98 flex items-center justify-center"
            >
              {t('exam.start')} (Quick Test)
            </button>
          </div>

          {/* Mode 2: Level Exam (Primary) */}
          <div className="bg-gradient-to-b from-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-indigo-500/40 shadow-lg shadow-indigo-950/20 flex flex-col justify-between space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-2xs font-extrabold uppercase tracking-wider">
                  Primary Experience
                </div>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">Level Exam</h3>
                <p className="text-xs font-bold text-indigo-300 mt-0.5">20–40 Questions • 15–40 Minutes</p>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Take a structured practice exam focused on one specific CEFR level (A1 Beginner to C2 Proficiency) with realistic multi-section distribution.
              </p>

              <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700 text-2xs text-slate-300 font-semibold space-y-1">
                <p>• Multi-section: Vocab, Use of English, Reading, Listening</p>
                <p>• Authentic timer and question navigator</p>
              </div>
            </div>

            <button
              type="button"
              id="start-level-exam-btn"
              onClick={() => setSelectedModalMode('level')}
              className="relative z-10 w-full min-h-12 py-3.5 px-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-98 flex items-center justify-center"
            >
              {t('exam.start')} (Level Exam)
            </button>
          </div>

          {/* Mode 3: Full Mock Exam */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-6 group">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold uppercase tracking-wider">
                Full Simulation
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">Full Mock Exam</h3>
                <p className="text-xs font-bold text-purple-600 mt-0.5">50 Questions • 45 Minutes</p>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t('exam.mode.mockDesc')}
              </p>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-2xs text-slate-500 font-semibold space-y-1">
                <p>• Comprehensive endurance practice</p>
                <p>• Extended reading & collocations</p>
              </div>
            </div>

            <button
              type="button"
              id="start-full-mock-btn"
              onClick={() => setSelectedModalMode('mock')}
              className="w-full min-h-12 py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer active:scale-98 flex items-center justify-center"
            >
              {t('exam.start')} (Mock Exam)
            </button>
          </div>
        </div>
      </section>

      {/* Level Progress Trend Widget (if history exists) */}
      {levelTrend && (
        <section className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Level Progress Trend</h3>
              <p className="text-xs text-slate-500">Track score improvement over successive attempts.</p>
            </div>

            {/* Level Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {ALL_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setTrendLevel(lvl)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    trendLevel === lvl
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="sm:col-span-2 flex items-center gap-3 overflow-x-auto pb-2">
              {levelTrend.attempts.map((att) => (
                <div
                  key={att.attemptNumber}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs min-w-[130px] space-y-1"
                >
                  <p className="text-2xs font-extrabold uppercase text-slate-400">
                    Attempt {att.attemptNumber}
                  </p>
                  <p className="text-xl font-black text-indigo-600">{att.percentage}%</p>
                  <p className="text-2xs text-slate-400">{att.date}</p>
                </div>
              ))}
            </div>

            <div className="bg-indigo-600 text-white rounded-2xl p-5 shadow-2xs space-y-1">
              <p className="text-2xs font-extrabold uppercase tracking-wider text-indigo-200">
                {trendLevel} Score Delta
              </p>
              <p className="text-2xl font-black">
                {levelTrend.deltaPercentage >= 0 ? `+${levelTrend.deltaPercentage}%` : `${levelTrend.deltaPercentage}%`}
              </p>
              <p className="text-2xs text-indigo-200">
                Across {levelTrend.attempts.length} recorded attempts
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Recent Exams History */}
      {recentExams.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Recent Exam Results</h2>
              <p className="text-xs text-slate-500">Your recent test reports and diagnostics.</p>
            </div>

            <button
              type="button"
              id="view-all-exam-history-btn"
              onClick={onViewAllHistory}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
            >
              {t('exam.history', { count: examHistory.length })}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentExams.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                      {report.level}
                    </span>
                    <span className="text-2xs font-bold text-slate-400">{report.date}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1" lang="en">
                    {report.title}
                  </h4>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-indigo-600">
                      {report.overallPercentage}%
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      ({report.correctCount}/{report.totalQuestions})
                    </span>
                  </div>

                  <span className="inline-block text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {report.performanceLabel}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onViewResultReport(report)}
                  className="w-full min-h-10 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer text-center flex items-center justify-center"
                >
                  View Report
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Unobtrusive Disclaimer */}
      <div className="text-center pt-4 border-t border-slate-200/80">
        <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
          {t('exam.disclaimer')}
        </p>
      </div>

      {/* Level Selection Modal */}
      {selectedModalMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-2xs font-extrabold uppercase tracking-wider text-indigo-600">
                  {selectedModalMode === 'quick'
                    ? 'Quick Test'
                    : selectedModalMode === 'mock'
                    ? 'Full Mock Exam'
                    : 'Level Exam'}
                </span>
                <h3 className="text-xl font-black text-slate-900">Select Target CEFR Level</h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedModalMode(null)}
                className="min-h-9 text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer flex items-center justify-center"
              >
                {t('ui.common.cancel')}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_LEVELS.map((lvl) => {
                const config = LEVEL_EXAM_CONFIGS[lvl];
                return (
                  <button
                    key={lvl}
                    type="button"
                    id={`select-level-btn-${lvl.toLowerCase()}`}
                    onClick={() => handleSelectLevelAndStart(lvl)}
                    className="min-h-24 p-4 rounded-2xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 transition-all text-left space-y-1 cursor-pointer group shadow-2xs hover:shadow-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {lvl}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700" lang="en">{config.title.split('—')[1] || lvl}</p>
                    <p className="text-2xs text-slate-400">
                      {selectedModalMode === 'quick'
                        ? '15 questions • 10m'
                        : selectedModalMode === 'mock'
                        ? '50 questions • 45m'
                        : `${config.questionCount}q • ${config.durationMinutes}m`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

