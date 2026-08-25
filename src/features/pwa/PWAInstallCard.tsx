import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';

/**
 * Text-only PWA Installation Card / Banner for Today Page / Footer.
 * Handles both native beforeinstallprompt (Android / Chrome / Edge) and iOS Safari Add to Home Screen instructions.
 * Zero-icon design, >=44px touch targets, accessible dialog and dismissal handling.
 */
export const PWAInstallCard: React.FC = () => {
  const { isInstalled, canShowPrompt, isNativePromptAvailable, installApp, dismissPrompt } =
    usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (isInstalled || !canShowPrompt) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isNativePromptAvailable) {
      setIsInstalling(true);
      await installApp();
      setIsInstalling(false);
    } else {
      setShowIosGuide(!showIosGuide);
    }
  };

  return (
    <section
      aria-label="Install FlipEnglish Application"
      className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4 animate-fadeIn"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-2xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
            App Experience
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Install FlipEnglish
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
            Install FlipEnglish to your Home Screen for faster access, a clean full-screen view, and offline-ready vocabulary learning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="min-h-11 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center disabled:opacity-50"
          >
            {isNativePromptAvailable
              ? isInstalling
                ? 'Installing...'
                : 'Install'
              : showIosGuide
              ? 'Hide Guide'
              : 'Installation Guide'}
          </button>

          <button
            type="button"
            onClick={dismissPrompt}
            className="min-h-11 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            Not Now
          </button>
        </div>
      </div>

      {showIosGuide && !isNativePromptAvailable && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 space-y-2 animate-fadeIn">
          <h3 className="font-bold text-slate-900">How to install on your device:</h3>
          <ul className="space-y-1.5 list-disc list-inside text-slate-600">
            <li>
              <span className="font-semibold text-slate-800">On iPhone or iPad:</span> Open this page in Safari, tap the <span className="font-bold text-slate-900">Share</span> menu at the bottom, and select <span className="font-bold text-indigo-700">Add to Home Screen</span>.
            </li>
            <li>
              <span className="font-semibold text-slate-800">On Android or Desktop:</span> Use your browser menu and choose <span className="font-bold text-indigo-700">Install FlipEnglish</span> or <span className="font-bold text-indigo-700">Add to Home Screen</span>.
            </li>
          </ul>
        </div>
      )}
    </section>
  );
};
