import React, { useState, useEffect } from 'react';
import {
  getStorageHealth,
  dismissStorageWarning,
  STORAGE_HEALTH_EVENT,
  StorageHealthState,
  safeSetLocalStorage,
} from '../utils/storageHealth';
import { useI18n } from '../features/i18n';

export const StorageWarningBanner: React.FC = () => {
  const { t } = useI18n();
  const [health, setHealth] = useState<StorageHealthState>(() => getStorageHealth());
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleHealthChanged = (e: Event) => {
      const detail = (e as CustomEvent<StorageHealthState>)?.detail;
      if (detail) {
        setHealth(detail);
      } else {
        setHealth(getStorageHealth());
      }
    };

    window.addEventListener(STORAGE_HEALTH_EVENT, handleHealthChanged);
    return () => {
      window.removeEventListener(STORAGE_HEALTH_EVENT, handleHealthChanged);
    };
  }, []);

  if (health.isHealthy) {
    return null;
  }

  const handleRetrySaving = () => {
    setIsRetrying(true);
    try {
      const testKey = 'flipenglish_storage_health_probe';
      const success = safeSetLocalStorage(testKey, String(Date.now()));
      if (success) {
        try {
          localStorage.removeItem(testKey);
        } catch {}
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    dismissStorageWarning();
  };

  const isQuota = health.lastFailureType === 'quota_exceeded';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-3 sm:py-3.5 transition-all"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-200/80 border border-amber-300 text-amber-900 flex items-center justify-center font-black text-sm shrink-0 mt-0.5 sm:mt-0 select-none">
            !
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs sm:text-sm font-bold text-amber-950">
              {t('error.storageWarningTitle')}
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              {isQuota ? t('error.storageQuotaDesc') : t('error.storageWarningDesc')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={handleRetrySaving}
            disabled={isRetrying}
            className="min-h-11 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
          >
            {isRetrying ? t('ui.common.loading') : t('error.storageRetry')}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-11 px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-900 text-xs font-bold border border-amber-300 transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            {t('error.storageDismiss')}
          </button>
        </div>
      </div>
    </div>
  );
};
