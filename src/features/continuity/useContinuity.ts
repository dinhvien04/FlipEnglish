import { useState, useEffect, useCallback } from 'react';
import { NextActionRecommendation, ActiveSessionSummary } from '../../types/continuity';
import { resolveNextAction, getActiveSessionSummary } from './smartNextActionEngine';
import { CONTINUITY_EVENTS } from '../../constants/storageKeys';
import { STUDY_PLAN_UPDATED_EVENT } from '../studyPlan/studyPlanStorage';
import { REVIEW_UPDATED_EVENT } from '../../utils/reviewStorage';
import { PLACEMENT_UPDATED_EVENT } from '../placement/placementStorage';

export interface UseContinuityResult {
  recommendation: NextActionRecommendation;
  sessionSummary: ActiveSessionSummary;
  refreshContinuity: () => void;
}

/**
 * Custom React hook that subscribes to session, storage, and continuity events,
 * evaluates resolveNextAction(), and provides the current recommendation, active session summary,
 * and a manual refresh trigger.
 */
export function useContinuity(): UseContinuityResult {
  const [recommendation, setRecommendation] = useState<NextActionRecommendation>(() =>
    resolveNextAction()
  );
  const [sessionSummary, setSessionSummary] = useState<ActiveSessionSummary>(() =>
    getActiveSessionSummary()
  );

  const refreshContinuity = useCallback(() => {
    setRecommendation(resolveNextAction());
    setSessionSummary(getActiveSessionSummary());
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Refresh on any storage event that touches FlipEnglish keys or storage clear
      if (!event.key || event.key.startsWith('flipenglish_')) {
        refreshContinuity();
      }
    };

    const handleCustomUpdate = () => {
      refreshContinuity();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(CONTINUITY_EVENTS.SESSION_UPDATED, handleCustomUpdate);
      window.addEventListener(CONTINUITY_EVENTS.STREAK_UPDATED, handleCustomUpdate);
      window.addEventListener(CONTINUITY_EVENTS.ACTIVE_TIME_UPDATED, handleCustomUpdate);
      window.addEventListener(CONTINUITY_EVENTS.REMINDERS_UPDATED, handleCustomUpdate);
      window.addEventListener(STUDY_PLAN_UPDATED_EVENT, handleCustomUpdate);
      window.addEventListener(REVIEW_UPDATED_EVENT, handleCustomUpdate);
      window.addEventListener(PLACEMENT_UPDATED_EVENT, handleCustomUpdate);
      window.addEventListener('flipenglish_progress_updated', handleCustomUpdate);
      window.addEventListener('flipenglish_exam_history_updated', handleCustomUpdate);
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('focus', handleCustomUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(CONTINUITY_EVENTS.SESSION_UPDATED, handleCustomUpdate);
        window.removeEventListener(CONTINUITY_EVENTS.STREAK_UPDATED, handleCustomUpdate);
        window.removeEventListener(CONTINUITY_EVENTS.ACTIVE_TIME_UPDATED, handleCustomUpdate);
        window.removeEventListener(CONTINUITY_EVENTS.REMINDERS_UPDATED, handleCustomUpdate);
        window.removeEventListener(STUDY_PLAN_UPDATED_EVENT, handleCustomUpdate);
        window.removeEventListener(REVIEW_UPDATED_EVENT, handleCustomUpdate);
        window.removeEventListener(PLACEMENT_UPDATED_EVENT, handleCustomUpdate);
        window.removeEventListener('flipenglish_progress_updated', handleCustomUpdate);
        window.removeEventListener('flipenglish_exam_history_updated', handleCustomUpdate);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('focus', handleCustomUpdate);
      }
    };
  }, [refreshContinuity]);

  return {
    recommendation,
    sessionSummary,
    refreshContinuity,
  };
}
