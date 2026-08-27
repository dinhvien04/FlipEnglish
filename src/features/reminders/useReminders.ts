import { useState, useEffect, useCallback } from 'react';
import {
  NotificationPermissionState,
  ReminderPreferences,
  InAppReminderStatus,
} from '../../types/reminders';
import { CONTINUITY_EVENTS } from '../../constants/storageKeys';
import {
  loadReminderPreferences,
  updateReminderPreferences,
  dismissReminderForToday as dismissReminderStorage,
  DEFAULT_REMINDER_PREFERENCES,
} from './reminderStorage';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  evaluateInAppReminderStatus,
} from './reminderCapability';
import { getLocalDateKey } from '../studyPlan/studyPlanEngine';
import { loadStudyPlanSettings, STUDY_PLAN_UPDATED_EVENT } from '../studyPlan/studyPlanStorage';
import { getActiveMinutesToday } from '../progress/activeTimeEngine';

export interface UseRemindersResult {
  preferences: ReminderPreferences;
  permissionState: NotificationPermissionState;
  updatePreferences: (
    updates: Partial<Omit<ReminderPreferences, 'schemaVersion'>>
  ) => ReminderPreferences;
  requestPermission: () => Promise<NotificationPermissionState>;
  dismissForToday: () => void;
  reminderStatus: InAppReminderStatus;
}

/**
 * Custom React hook that encapsulates study reminder preferences, capability checks,
 * in-app reminder evaluation, and reactivity across tabs and storage events.
 */
export function useReminders(): UseRemindersResult {
  const [preferences, setPreferences] = useState<ReminderPreferences>(() => {
    return loadReminderPreferences();
  });

  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(() => {
    return getNotificationPermissionState();
  });

  const [activeMinutesToday, setActiveMinutesToday] = useState<number>(() => {
    return getActiveMinutesToday();
  });

  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(() => {
    return loadStudyPlanSettings().dailyMinutes;
  });

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Refresh all state from source of truth
  const refreshState = useCallback(() => {
    setPreferences(loadReminderPreferences());
    setPermissionState(getNotificationPermissionState());
    setActiveMinutesToday(getActiveMinutesToday());
    setDailyGoalMinutes(loadStudyPlanSettings().dailyMinutes);
    setCurrentDate(new Date());
  }, []);

  // Listen to continuity events, storage updates, window focus, and periodic timer
  useEffect(() => {
    const handleRemindersUpdated = () => {
      setPreferences(loadReminderPreferences());
    };

    const handleActiveTimeUpdated = () => {
      setActiveMinutesToday(getActiveMinutesToday());
    };

    const handleStudyPlanUpdated = () => {
      setDailyGoalMinutes(loadStudyPlanSettings().dailyMinutes);
    };

    const handleFocus = () => {
      refreshState();
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('flipenglish_')) {
        refreshState();
      }
    };

    window.addEventListener(CONTINUITY_EVENTS.REMINDERS_UPDATED, handleRemindersUpdated);
    window.addEventListener(CONTINUITY_EVENTS.ACTIVE_TIME_UPDATED, handleActiveTimeUpdated);
    window.addEventListener(STUDY_PLAN_UPDATED_EVENT, handleStudyPlanUpdated);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);

    // Periodic interval to keep reminder evaluation up-to-date across time passing
    const interval = setInterval(() => {
      setCurrentDate(new Date());
      setActiveMinutesToday(getActiveMinutesToday());
    }, 30000); // every 30 seconds

    return () => {
      window.removeEventListener(CONTINUITY_EVENTS.REMINDERS_UPDATED, handleRemindersUpdated);
      window.removeEventListener(CONTINUITY_EVENTS.ACTIVE_TIME_UPDATED, handleActiveTimeUpdated);
      window.removeEventListener(STUDY_PLAN_UPDATED_EVENT, handleStudyPlanUpdated);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [refreshState]);

  const handleUpdatePreferences = useCallback(
    (updates: Partial<Omit<ReminderPreferences, 'schemaVersion'>>) => {
      const updated = updateReminderPreferences(updates);
      setPreferences(updated);
      return updated;
    },
    []
  );

  const handleRequestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermissionState(result);
    return result;
  }, []);

  const handleDismissForToday = useCallback(() => {
    const todayKey = getLocalDateKey();
    dismissReminderStorage(todayKey);
    setPreferences(loadReminderPreferences());
  }, []);

  const todayDateKey = getLocalDateKey(currentDate);

  const reminderStatus: InAppReminderStatus = evaluateInAppReminderStatus(
    preferences || DEFAULT_REMINDER_PREFERENCES,
    activeMinutesToday,
    dailyGoalMinutes,
    todayDateKey,
    currentDate
  );

  return {
    preferences,
    permissionState,
    updatePreferences: handleUpdatePreferences,
    requestPermission: handleRequestPermission,
    dismissForToday: handleDismissForToday,
    reminderStatus,
  };
}
