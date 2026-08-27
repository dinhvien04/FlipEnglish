import { useState, useEffect, useCallback } from 'react';
import { LearnerStreak, MeaningfulLearningEvent, StreakEvaluationResult } from '../../types/streak';
import { getStreakStatus, recordMeaningfulLearningEvent } from './streakEngine';
import { CONTINUITY_EVENTS, STORAGE_KEYS } from '../../constants/storageKeys';

export interface UseStreakReturn {
  streak: LearnerStreak;
  recordLearningEvent: (
    event: MeaningfulLearningEvent,
    overrideDate?: Date
  ) => StreakEvaluationResult;
}

/**
 * React hook to manage learner streak state.
 * Loads current streak status from storage, subscribes to continuous streak update events
 * and multi-tab storage synchronization, and provides a method to record meaningful learning events.
 */
export function useStreak(): UseStreakReturn {
  const [streak, setStreak] = useState<LearnerStreak>(() => getStreakStatus());

  const refreshStreak = useCallback(() => {
    setStreak(getStreakStatus());
  }, []);

  useEffect(() => {
    const handleStreakUpdate = () => {
      refreshStreak();
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (!event.key || event.key === STORAGE_KEYS.STREAK) {
        refreshStreak();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(CONTINUITY_EVENTS.STREAK_UPDATED, handleStreakUpdate);
      window.addEventListener('storage', handleStorageEvent);
      window.addEventListener('focus', handleStreakUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(CONTINUITY_EVENTS.STREAK_UPDATED, handleStreakUpdate);
        window.removeEventListener('storage', handleStorageEvent);
        window.removeEventListener('focus', handleStreakUpdate);
      }
    };
  }, [refreshStreak]);

  const handleRecordLearningEvent = useCallback(
    (event: MeaningfulLearningEvent, overrideDate?: Date): StreakEvaluationResult => {
      const result = recordMeaningfulLearningEvent(event, overrideDate);
      setStreak(result.streak);
      return result;
    },
    []
  );

  return {
    streak,
    recordLearningEvent: handleRecordLearningEvent,
  };
}
