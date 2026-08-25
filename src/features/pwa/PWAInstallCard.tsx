import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { useI18n } from '../i18n';

/**
 * Text-only PWA Installation Card / Banner for Today Page / Footer.
 * Handles both native beforeinstallprompt (Android / Chrome / Edge) and iOS Safari Add to Home Screen instructions.
 * Zero-icon design, >=44px touch targets, accessible dialog and dismissal handling.
 */
export const PWAInstallCard: React.FC = () => {
  const { t } = useI18n();
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
      aria-label={t('pwa.install.title')}
      className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4 animate-fadeIn"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-2xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
            {t('pwa.install.badge')}
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {t('pwa.install.title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
            {t('pwa.install.desc')}
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
                ? t('pwa.install.installing')
                : t('pwa.install.button')
              : showIosGuide
              ? t('pwa.install.hideGuide')
              : t('pwa.install.showGuide')}
          </button>

          <button
            type="button"
            onClick={dismissPrompt}
            className="min-h-11 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            {t('pwa.install.notNow')}
          </button>
        </div>
      </div>

      {showIosGuide && !isNativePromptAvailable && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 space-y-2 animate-fadeIn">
          <h3 className="font-bold text-slate-900">{t('pwa.install.guideTitle')}</h3>
          <ul className="space-y-1.5 list-disc list-inside text-slate-600">
            <li>
              <span className="font-semibold text-slate-800">{t('pwa.install.iosTitle')}</span>{' '}
              {t('pwa.install.iosInstructions')}
            </li>
            <li>
              <span className="font-semibold text-slate-800">{t('pwa.install.otherTitle')}</span>{' '}
              {t('pwa.install.otherInstructions')}
            </li>
          </ul>
        </div>
      )}
    </section>
  );
};
