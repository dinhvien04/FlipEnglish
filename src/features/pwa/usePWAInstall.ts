import { useState, useEffect, useCallback } from 'react';
import {
  safeGetLocalStorage,
  safeSetLocalStorage,
} from '../../utils/storageHealth';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWA_INSTALL_DISMISSED_KEY = 'flipenglish_pwa_install_dismissed_v1';
const DISMISSAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hook to manage PWA installation across Chromium browsers, Edge, Android, iOS Safari, etc.
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIosStandalone = (window.navigator as any).standalone === true;
    return isStandalone || isIosStandalone;
  });
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = safeGetLocalStorage(PWA_INSTALL_DISMISSED_KEY);
      if (!stored) return false;
      const parsed = parseInt(stored, 10);
      if (isNaN(parsed)) return false;
      return Date.now() - parsed < DISMISSAL_COOLDOWN_MS;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Listen for standalone display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Listen for Chromium beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    if (!deferredPrompt) {
      return 'unsupported';
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      return choiceResult.outcome;
    } catch (err) {
      console.warn('[PWA Install] Error invoking install prompt:', err);
      return 'unsupported';
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
    try {
      safeSetLocalStorage(PWA_INSTALL_DISMISSED_KEY, Date.now().toString());
    } catch {
      // Ignore storage errors
    }
  }, []);

  const isNativePromptAvailable = Boolean(deferredPrompt);
  const canShowPrompt = !isInstalled && !isDismissed;

  return {
    isInstalled,
    canShowPrompt,
    isNativePromptAvailable,
    installApp,
    dismissPrompt,
  };
}
