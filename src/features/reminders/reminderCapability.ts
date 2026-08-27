import {
  NotificationPermissionState,
  ReminderPreferences,
  InAppReminderStatus,
} from '../../types/reminders';

/**
 * Checks if the browser supports Notification API and returns current permission state.
 * Returns 'unsupported' if window or Notification is undefined.
 */
export function getNotificationPermissionState(): NotificationPermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests web notification permission.
 * MUST only be called upon explicit user action (e.g. click/tap toggle).
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return getNotificationPermissionState();
  }
}

/**
 * Formats hour and minute into "HH:MM" 24-hour time representation.
 */
export function formatReminderTime(hour: number, minute: number): string {
  const safeHour = Math.max(0, Math.min(23, Math.floor(hour || 0)));
  const safeMinute = Math.max(0, Math.min(59, Math.floor(minute || 0)));
  return `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`;
}

/**
 * Evaluates whether an in-app study reminder should be displayed.
 *
 * Rules:
 * 1. prefs.enabled must be true
 * 2. prefs.lastDismissedDateKey !== todayDateKey
 * 3. activeMinutesToday < dailyGoalMinutes (has not completed daily goal)
 * 4. current local hour/minute >= preferredHour/preferredMinute
 *
 * @param prefs User's reminder preferences
 * @param activeMinutesToday Number of active study minutes completed today
 * @param dailyGoalMinutes User's daily study goal in minutes
 * @param todayDateKey Today's local date key (YYYY-MM-DD)
 * @param now Optional Date object for testing/evaluation (defaults to current Date)
 */
export function evaluateInAppReminderStatus(
  prefs: ReminderPreferences,
  activeMinutesToday: number,
  dailyGoalMinutes: number,
  todayDateKey: string,
  now: Date = new Date()
): InAppReminderStatus {
  const preferredTimeFormatted = formatReminderTime(prefs.preferredHour, prefs.preferredMinute);

  if (!prefs.enabled) {
    return {
      shouldShowReminder: false,
      preferredTimeFormatted,
    };
  }

  if (prefs.lastDismissedDateKey === todayDateKey) {
    return {
      shouldShowReminder: false,
      preferredTimeFormatted,
    };
  }

  const safeActiveMinutes = Math.max(0, Number(activeMinutesToday) || 0);
  const safeDailyGoal = Math.max(0, Number(dailyGoalMinutes) || 0);

  if (safeActiveMinutes >= safeDailyGoal) {
    return {
      shouldShowReminder: false,
      preferredTimeFormatted,
    };
  }

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const preferredTimeInMinutes = prefs.preferredHour * 60 + prefs.preferredMinute;

  if (currentTimeInMinutes >= preferredTimeInMinutes) {
    return {
      shouldShowReminder: true,
      reason: 'time_passed_unstudied',
      preferredTimeFormatted,
    };
  }

  return {
    shouldShowReminder: false,
    preferredTimeFormatted,
  };
}
