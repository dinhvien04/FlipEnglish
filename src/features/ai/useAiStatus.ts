import { useState, useEffect, useCallback } from 'react';

export interface AiStatus {
  aiConfigured: boolean;
  aiEnabled: boolean;
  isLoading: boolean;
  checkAiStatus: () => Promise<boolean>;
}

interface CachedAiState {
  aiConfigured: boolean;
  aiEnabled: boolean;
}

/**
 * Global cache and subscriber set across component mounts to prevent redundant /api/health queries
 * and synchronize state updates immediately.
 */
let cachedAiState: CachedAiState | null = null;
let inFlightCheck: Promise<boolean> | null = null;
const subscribers = new Set<(state: CachedAiState) => void>();

function notifySubscribers(state: CachedAiState) {
  subscribers.forEach((cb) => {
    try {
      cb(state);
    } catch {
      // Ignore listener error
    }
  });
}

export function useAiStatus(): AiStatus {
  const [statusState, setStatusState] = useState<CachedAiState>(
    () => cachedAiState ?? { aiConfigured: false, aiEnabled: false }
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => cachedAiState === null);

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
          const fallbackState: CachedAiState = { aiConfigured: false, aiEnabled: false };
          cachedAiState = fallbackState;
          notifySubscribers(fallbackState);
          return false;
        }

        const data = await response.json();
        const isConfigured = Boolean(data && data.aiConfigured === true);
        const isEnabled = Boolean(data && data.aiEnabled === true);
        const newState: CachedAiState = { aiConfigured: isConfigured, aiEnabled: isEnabled };

        cachedAiState = newState;
        notifySubscribers(newState);
        return isEnabled;
      } catch {
        // Offline / network failure -> treat AI as unavailable safely
        const fallbackState: CachedAiState = { aiConfigured: false, aiEnabled: false };
        cachedAiState = fallbackState;
        notifySubscribers(fallbackState);
        return false;
      } finally {
        inFlightCheck = null;
      }
    })();

    return inFlightCheck;
  }, []);

  useEffect(() => {
    const subscriber = (state: CachedAiState) => {
      setStatusState(state);
      setIsLoading(false);
    };

    subscribers.add(subscriber);

    // Initial check or populate from cache
    if (cachedAiState === null) {
      checkAiStatus();
    } else {
      setStatusState(cachedAiState);
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
    aiConfigured: statusState.aiConfigured,
    aiEnabled: statusState.aiEnabled,
    isLoading,
    checkAiStatus,
  };
}

