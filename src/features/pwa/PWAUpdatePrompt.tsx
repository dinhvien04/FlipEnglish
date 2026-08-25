import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * PWA Update and Offline-Ready Notification Component.
 * - Prompts users when a new version is downloaded and ready to activate.
 * - NEVER force-reloads the page or clears session state unexpectedly.
 * - Provides "Update now" and "Later" options.
 * - Displays a quiet one-time "Ready for offline learning" notice when SW precaching is complete.
 */
export const PWAUpdatePrompt: React.FC = () => {
  const [offlineNoticeDismissed, setOfflineNoticeDismissed] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // Periodically check for updates (every 60 minutes) when running in production
      if (registration) {
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('[PWA Register Error]', error);
    },
  });

  const handleUpdate = () => {
    // Activates the waiting service worker and reloads
    updateServiceWorker(true);
  };

  const handleDismissUpdate = () => {
    setNeedRefresh(false);
  };

  const handleDismissOfflineReady = () => {
    setOfflineReady(false);
    setOfflineNoticeDismissed(true);
  };

  // Auto dismiss offlineReady notice after 6 seconds
  useEffect(() => {
    if (offlineReady && !offlineNoticeDismissed) {
      const timer = setTimeout(() => {
        setOfflineReady(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [offlineReady, offlineNoticeDismissed, setOfflineReady]);

  // 1. New version available banner (priority over offline-ready)
  if (needRefresh) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-700 space-y-3 animate-slideUp"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-500 text-white">
              Update Available
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-200">
            A new version of FlipEnglish is available. Update to load the latest improvements.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleDismissUpdate}
            className="min-h-11 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            className="min-h-11 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-md transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            Update Now
          </button>
        </div>
      </div>
    );
  }

  // 2. Offline ready notice
  if (offlineReady && !offlineNoticeDismissed) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-700 space-y-2 animate-slideUp"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white inline-block">
              Offline Ready
            </span>
            <p className="text-xs sm:text-sm font-medium text-slate-200 pt-1">
              FlipEnglish is ready for offline learning. Saved lessons, flashcards, and review items can be accessed without internet.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismissOfflineReady}
            className="min-h-9 px-3 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer shrink-0 inline-flex items-center"
            aria-label="Dismiss offline ready notice"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return null;
};
