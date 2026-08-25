import React from 'react';
import { CEFRLevel } from '../types';
import { ExamMode } from '../types/exam';
import { LEVEL_EXAM_CONFIGS, QUICK_TEST_CONFIG, FULL_MOCK_CONFIG, EXAM_DISCLAIMER } from '../data/exams/config';
import { useI18n } from '../features/i18n';

interface ExamIntroProps {
  mode: ExamMode;
  level: CEFRLevel;
  onStartExam: () => void;
  onBackToExamCenter: () => void;
}

export const ExamIntro: React.FC<ExamIntroProps> = ({
  mode,
  level,
  onStartExam,
  onBackToExamCenter,
}) => {
  const { t } = useI18n();
  let title = `${level} Practice Exam`;
  let questionCount = 25;
  let durationMinutes = 20;
  let sections: { id: string; title: string; count?: number }[] = [];

  if (mode === 'quick') {
    title = `${level} — ${QUICK_TEST_CONFIG.title}`;
    questionCount = QUICK_TEST_CONFIG.questionCount;
    durationMinutes = QUICK_TEST_CONFIG.durationMinutes;
    sections = [
      { id: '1', title: '01 Vocabulary & Meaning' },
      { id: '2', title: '02 Use of English & Context' },
      { id: '3', title: '03 Listening Recognition' },
    ];
  } else if (mode === 'level') {
    const config = LEVEL_EXAM_CONFIGS[level];
    title = config.title;
    questionCount = config.questionCount;
    durationMinutes = config.durationMinutes;
    sections = config.sections.map((s) => ({ id: s.id, title: s.title, count: s.questionCount }));
  } else if (mode === 'mock') {
    title = `${level} — ${FULL_MOCK_CONFIG.title}`;
    questionCount = FULL_MOCK_CONFIG.questionCount;
    durationMinutes = FULL_MOCK_CONFIG.durationMinutes;
    sections = [
      { id: '1', title: '01 Core Vocabulary & Use of English' },
      { id: '2', title: '02 Sentence Context & Collocations' },
      { id: '3', title: '03 Reading Comprehension' },
      { id: '4', title: '04 Listening & Nuance' },
    ];
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Back Button */}
      <button
        type="button"
        id="back-to-exam-center-intro-btn"
        onClick={onBackToExamCenter}
        className="min-h-11 text-xs sm:text-sm font-bold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
      >
        {t('ui.common.back')}
      </button>

      {/* Main Info Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
        {/* Header Title */}
        <div className="space-y-3 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black uppercase px-3 py-1 rounded-lg bg-indigo-600 text-white shadow-2xs">
              {level}
            </span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              CEFR Practice Exam
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight" lang="en">
            {title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            This examination evaluates your proficiency through objective questions, authentic reading passages, and contextual sentence tasks.
          </p>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
              {questionCount} Questions
            </div>

            <div className="bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
              {durationMinutes} Minutes
            </div>

            <div className="bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
              {sections.length} Sections
            </div>
          </div>
        </div>

        {/* Section List Breakdown */}
        <div className="space-y-4">
          <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-800">
            Exam Sections
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sections.map((sec, idx) => (
              <div
                key={sec.id || idx}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shadow-2xs">
                    {idx + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900" lang="en">{sec.title}</span>
                </div>
                {sec.count && (
                  <span className="text-2xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {sec.count} Qs
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Exam Rules & Conduct */}
        <div className="bg-indigo-50/70 rounded-3xl p-6 border border-indigo-100 space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-indigo-950">
            Exam Rules & Interface Guidelines
          </h2>

          <ul className="space-y-2.5 text-xs sm:text-sm text-indigo-900 font-medium">
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span>
                <strong>No immediate feedback:</strong> Answers and explanations are hidden during the exam and revealed only after submission.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span>
                <strong>Free Navigation:</strong> You can move forward and backward between questions at any time.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span>
                <strong>Flag for Review:</strong> You can flag tricky questions to revisit before finalizing.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span>
                <strong>Auto-Submission:</strong> When the countdown timer reaches 00:00, all answered questions are automatically submitted and graded.
              </span>
            </li>
          </ul>
        </div>

        {/* Start Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onBackToExamCenter}
            className="w-full sm:w-auto min-h-12 px-6 py-3.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center"
          >
            {t('ui.common.cancel')}
          </button>

          <button
            type="button"
            id="start-exam-confirmed-btn"
            onClick={onStartExam}
            className="w-full sm:w-auto min-h-12 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-sm sm:text-base shadow-2xs transition-all cursor-pointer flex items-center justify-center"
          >
            {t('exam.start')}
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-2xs text-slate-400 text-center">{EXAM_DISCLAIMER}</p>
    </div>
  );
};
