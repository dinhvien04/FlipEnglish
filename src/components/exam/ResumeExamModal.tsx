import React from 'react';
import { Play, RotateCcw, AlertCircle, Clock } from 'lucide-react';
import { ExamSession } from '../../types/exam';

interface ResumeExamModalProps {
  session: ExamSession;
  onResume: () => void;
  onDiscard: () => void;
}

export const ResumeExamModal: React.FC<ResumeExamModalProps> = ({
  session,
  onResume,
  onDiscard,
}) => {
  const answeredCount = Object.keys(session.answers).length;
  const totalQuestions = session.questions.length;
  const remainingMs = Math.max(0, session.endsAt - Date.now());
  const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
  const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xs font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
              Active Exam Found
            </span>
            <h3 className="text-xl font-black text-slate-900 mt-1">Resume Exam?</h3>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Exam:</span>
            <span className="font-bold text-slate-900">{session.title}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Progress:</span>
            <span className="font-bold text-indigo-600">
              {answeredCount} / {totalQuestions} answered
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Time Remaining:</span>
            <span className="font-bold font-mono text-slate-900">
              {String(remainingMinutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          You have an unfinished examination in progress. You can pick up where you left off with your exact saved answers and remaining time.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            id="discard-active-exam-btn"
            onClick={onDiscard}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard & Start Over</span>
          </button>

          <button
            type="button"
            id="resume-active-exam-btn"
            onClick={onResume}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-98"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Resume Exam</span>
          </button>
        </div>
      </div>
    </div>
  );
};
