import React, { useState, useEffect, useRef } from 'react';
import { PlacementSession } from '../../features/placement/placementTypes';
import { useI18n } from '../../features/i18n';

interface ResumePlacementModalProps {
  session: PlacementSession;
  onResume: () => void;
  onDismiss: () => void;
  onStartOver: () => boolean | void;
}

export const ResumePlacementModal: React.FC<ResumePlacementModalProps> = ({
  session,
  onResume,
  onDismiss,
  onStartOver,
}) => {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  const resumeBtnRef = useRef<HTMLButtonElement>(null);
  const startOverTriggerBtnRef = useRef<HTMLButtonElement>(null);
  const keepBtnRef = useRef<HTMLButtonElement>(null);
  const retryBtnRef = useRef<HTMLButtonElement>(null);
  const [showConfirmStartOver, setShowConfirmStartOver] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);

  // Focus management when transitioning into or out of start over confirmation state or error state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (discardError) {
        retryBtnRef.current?.focus();
      } else if (showConfirmStartOver) {
        keepBtnRef.current?.focus();
      } else {
        // If returning from confirmation, restore focus to trigger or resume button
        if (startOverTriggerBtnRef.current) {
          startOverTriggerBtnRef.current.focus();
        } else {
          resumeBtnRef.current?.focus();
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [showConfirmStartOver, discardError]);

  // Accessibility: Focus trapping, Escape key dismiss (safe close), autofocus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (discardError) {
          setDiscardError(null);
          setShowConfirmStartOver(false);
        } else if (showConfirmStartOver) {
          setShowConfirmStartOver(false);
        } else {
          onDismiss();
        }
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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDismiss, showConfirmStartOver, discardError]);

  const handleConfirmStartOver = () => {
    setDiscardError(null);
    const result = onStartOver();
    if (result === false) {
      setDiscardError(t('studyPlan.resumeModal.placementDiscardError'));
    }
  };

  const handleCancelDiscardFlow = () => {
    setDiscardError(null);
    setShowConfirmStartOver(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-placement-modal-title"
      aria-describedby="resume-placement-modal-desc"
    >
      <div
        ref={modalRef}
        className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6"
      >
        <div className="space-y-2">
          <span className="text-2xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {t('studyPlan.resumeModal.placementBadge')}
          </span>
          <h3 id="resume-placement-modal-title" className="text-xl font-black text-slate-900">
            {t('studyPlan.resumeModal.placementTitle')}
          </h3>
          <p id="resume-placement-modal-desc" className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t('studyPlan.resumeModal.placementDesc', {
              stage: session.currentStageIndex + 1,
              question:
                session.currentStageIndex * 6 +
                session.currentQuestionInStageIndex +
                1,
            })}
          </p>
        </div>

        {discardError ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3" role="alert">
            <p className="text-xs font-bold text-rose-900">
              {discardError}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelDiscardFlow}
                className="w-full sm:w-auto flex-1 min-h-11 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center"
              >
                {t('studyPlan.resumeModal.placementKeep')}
              </button>
              <button
                ref={retryBtnRef}
                type="button"
                id="retry-discard-placement-btn"
                onClick={handleConfirmStartOver}
                className="w-full sm:w-auto flex-1 min-h-11 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center"
              >
                {t('ui.common.retry')}
              </button>
            </div>
          </div>
        ) : showConfirmStartOver ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-rose-900">
              {t('studyPlan.resumeModal.placementDiscardConfirmPrompt')}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                ref={keepBtnRef}
                type="button"
                onClick={() => setShowConfirmStartOver(false)}
                className="w-full sm:w-auto flex-1 min-h-11 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center"
              >
                {t('studyPlan.resumeModal.placementKeep')}
              </button>
              <button
                type="button"
                id="confirm-discard-placement-btn"
                onClick={handleConfirmStartOver}
                className="w-full sm:w-auto flex-1 min-h-11 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center"
              >
                {t('studyPlan.resumeModal.placementConfirmDiscard')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              ref={startOverTriggerBtnRef}
              type="button"
              id="discard-placement-btn"
              onClick={() => {
                setDiscardError(null);
                setShowConfirmStartOver(true);
              }}
              className="min-h-11 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              {t('studyPlan.resumeModal.placementStartOver')}
            </button>

            <button
              ref={resumeBtnRef}
              type="button"
              id="resume-placement-btn"
              onClick={onResume}
              className="flex-1 min-h-11 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer inline-flex items-center justify-center"
            >
              {t('studyPlan.resumeModal.placementResume')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

