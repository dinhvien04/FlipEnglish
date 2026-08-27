import { useState, useEffect, useCallback } from 'react';

export interface AiStatus {
  aiConfigured: boolean;
  isLoading: boolean;
  checkAiStatus: () => Promise<boolean>;
}

/**
 * Global cache and subscriber set across component mounts to prevent redundant /api/health queries
 * and synchronize state updates immediately.
 */
let cachedAiConfigured: boolean | null = null;
let inFlightCheck: Promise<boolean> | null = null;
const subscribers = new Set<(isConfigured: boolean) => void>();

function notifySubscribers(isConfigured: boolean) {
  subscribers.forEach((cb) => {
    try {
      cb(isConfigured);
    } catch {
      // Ignore listener error
    }
  });
}

export function useAiStatus(): AiStatus {
  const [aiConfigured, setAiConfigured] = useState<boolean>(() => cachedAiConfigured ?? false);
  const [isLoading, setIsLoading] = useState<boolean>(() => cachedAiConfigured === null);

  const checkAiStatus = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    // Single-flight in-flight deduplication
    if (inFlightCheck) {
      return inFlightCheck;
    }

    inFlightCheck = (async () => {
      try {
        const response = await fetch('/api/health', {
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          cachedAiConfigured = false;
          notifySubscribers(false);
          return false;
        }

        const data = await response.json();
        const isConfigured = Boolean(data && data.aiConfigured === true);
        cachedAiConfigured = isConfigured;
        notifySubscribers(isConfigured);
        return isConfigured;
      } catch {
        // Offline / network failure -> treat AI as unconfigured safely
        cachedAiConfigured = false;
        notifySubscribers(false);
        return false;
      } finally {
        inFlightCheck = null;
      }
    })();

    return inFlightCheck;
  }, []);

  useEffect(() => {
    const subscriber = (isConfigured: boolean) => {
      setAiConfigured(isConfigured);
      setIsLoading(false);
    };

    subscribers.add(subscriber);

    // Initial check or populate from cache
    if (cachedAiConfigured === null) {
      checkAiStatus();
    } else {
      setAiConfigured(cachedAiConfigured);
      setIsLoading(false);
    }

    // Re-check automatically when browser regains internet connectivity
    const handleOnline = () => {
      checkAiStatus();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      subscribers.delete(subscriber);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkAiStatus]);

  return {
    aiConfigured,
    isLoading,
    checkAiStatus,
  };
}

