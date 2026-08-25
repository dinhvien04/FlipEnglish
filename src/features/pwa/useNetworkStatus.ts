import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track online/offline network status using browser events.
 * Provides `isOnline` hint along with `wasOffline` transient flag for reconnection notice.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });
  const [showBackOnlineNotice, setShowBackOnlineNotice] = useState<boolean>(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setShowBackOnlineNotice(true);
    const timer = setTimeout(() => {
      setShowBackOnlineNotice(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setShowBackOnlineNotice(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    showBackOnlineNotice,
    dismissBackOnlineNotice: () => setShowBackOnlineNotice(false),
  };
}
