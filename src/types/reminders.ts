export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface ReminderPreferences {
  schemaVersion: 1;
  enabled: boolean;
  preferredHour: number; // 0 - 23
  preferredMinute: number; // 0 - 59
  lastDismissedDateKey?: string | null; // YYYY-MM-DD
  updatedAt: number;
}

export interface InAppReminderStatus {
  shouldShowReminder: boolean;
  reason?: 'time_passed_unstudied' | 'daily_goal_pending';
  preferredTimeFormatted: string;
}
