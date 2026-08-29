import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../features/i18n';

interface ChunkRecoveryDetail {
  isOffline?: boolean;
  loopPrevented?: boolean;
}

export const GlobalChunkRecoveryController: React.FC = () => {
  const { t } = useI18n();
  const [chunkError, setChunkError] = useState<ChunkRecoveryDetail | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleChunkError = (event: Event) => {
      const customEvent = event as CustomEvent<ChunkRecoveryDetail>;
      setChunkError(customEvent.detail || { loopPrevented: true });
    };

    window.addEventListener('flipenglish_chunk_load_error', handleChunkError);
    return () => {
      window.removeEventListener('flipenglish_chunk_load_error', handleChunkError);
    };
  }, []);

  // Accessibility: Focus trapping and autofocus primary action on mount
  useEffect(() => {
    if (!chunkError) return;

    const timer = setTimeout(() => {
      primaryBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
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
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [chunkError]);

  if (!chunkError) {
    return null;
  }

  const isOffline = chunkError.isOffline;

  const handleRetry = () => {
    setChunkError(null);
    window.location.reload();
  };

  const handleGoHome = () => {
    setChunkError(null);
    window.location.href = '/';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chunk-recovery-title"
      aria-describedby="chunk-recovery-desc"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5"
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto text-xl font-black select-none">
          !
        </div>

        <div className="space-y-2">
          <h2 id="chunk-recovery-title" className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
            {isOffline ? t('error.chunkOfflineTitle') : t('error.chunkLoadTitle')}
          </h2>
          <p id="chunk-recovery-desc" className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isOffline ? t('error.chunkOfflineDesc') : t('error.chunkLoadDesc')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
          <button
            ref={primaryBtnRef}
            type="button"
            onClick={handleRetry}
            className="min-h-11 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer inline-flex items-center justify-center"
          >
            {isOffline ? t('error.tryAgain') : t('error.reloadApp')}
          </button>
          <button
            type="button"
            onClick={handleGoHome}
            className="min-h-11 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            {t('error.goToToday')}
          </button>
        </div>
      </div>
    </div>
  );
};
