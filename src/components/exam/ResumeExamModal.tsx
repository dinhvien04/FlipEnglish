import React, { useEffect, useRef } from 'react';
import { ExamSession } from '../../types/exam';
import { useI18n } from '../../features/i18n';

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
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const resumeBtnRef = useRef<HTMLButtonElement>(null);

  const answeredCount = Object.keys(session.answers).length;
  const totalQuestions = session.questions.length;
  const remainingMs = Math.max(0, session.endsAt - Date.now());
  const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
  const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);

  // Accessibility: Focus trapping, Escape key dismiss (discard/close), focus autofocus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDiscard();
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
    const timer = setTimeout(() => {
      resumeBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [onDiscard]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-exam-modal-title"
      aria-describedby="resume-exam-modal-desc"
    >
      <div
        ref={modalRef}
        className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6"
      >
        <div>
          <span className="text-2xs font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
            {t('studyPlan.resumeModal.examBadge')}
          </span>
          <h3 id="resume-exam-modal-title" className="text-xl font-black text-slate-900 mt-1">
            {t('studyPlan.resumeModal.examTitle')}
          </h3>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">{t('studyPlan.resumeModal.examLabel')}</span>
            <span className="font-bold text-slate-900">{session.title}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">{t('studyPlan.resumeModal.examProgress')}</span>
            <span className="font-bold text-indigo-600">
              {t('studyPlan.resumeModal.examAnswered', { answered: answeredCount, total: totalQuestions })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">{t('studyPlan.resumeModal.examTimeRemaining')}</span>
            <span className="font-bold font-mono text-slate-900">
              {String(remainingMinutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        <p id="resume-exam-modal-desc" className="text-xs text-slate-500 leading-relaxed">
          {t('studyPlan.resumeModal.examDesc')}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            id="discard-active-exam-btn"
            onClick={onDiscard}
            className="w-full sm:w-auto flex-1 min-h-12 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center"
          >
            {t('studyPlan.resumeModal.examDiscard')}
          </button>

          <button
            ref={resumeBtnRef}
            type="button"
            id="resume-active-exam-btn"
            onClick={onResume}
            className="w-full sm:w-auto flex-1 min-h-12 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-2xs transition-all cursor-pointer active:scale-98 flex items-center justify-center"
          >
            {t('studyPlan.resumeModal.examResume')}
          </button>
        </div>
      </div>
    </div>
  );
};
