import { useState, useEffect, useCallback } from 'react';
import { getStoredActiveTime } from './activeTimeStorage';
import { CONTINUITY_EVENTS, STORAGE_KEYS } from '../../constants/storageKeys';

export interface UseActiveTimeReturn {
  activeMinutesToday: number;
  activeSecondsToday: number;
}

/**
 * React hook to track learner active study time for today.
 * Loads the stored active time record, calculates accumulated minutes and seconds,
 * and subscribes to ACTIVE_TIME_UPDATED events and storage sync.
 */
export function useActiveTime(): UseActiveTimeReturn {
  const [activeSecondsToday, setActiveSecondsToday] = useState<number>(() => {
    const record = getStoredActiveTime();
    return record.activeSeconds;
  });

  const refreshActiveTime = useCallback(() => {
    const record = getStoredActiveTime();
    setActiveSecondsToday(record.activeSeconds);
  }, []);

  useEffect(() => {
    const handleActiveTimeUpdate = () => {
      refreshActiveTime();
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (!event.key || event.key === STORAGE_KEYS.ACTIVE_TIME) {
        refreshActiveTime();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(CONTINUITY_EVENTS.ACTIVE_TIME_UPDATED, handleActiveTimeUpdate);
      window.addEventListener('storage', handleStorageEvent);
      window.addEventListener('focus', handleActiveTimeUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(CONTINUITY_EVENTS.ACTIVE_TIME_UPDATED, handleActiveTimeUpdate);
        window.removeEventListener('storage', handleStorageEvent);
        window.removeEventListener('focus', handleActiveTimeUpdate);
      }
    };
  }, [refreshActiveTime]);

  const activeMinutesToday = Math.floor(activeSecondsToday / 60);

  return {
    activeMinutesToday,
    activeSecondsToday,
  };
}
