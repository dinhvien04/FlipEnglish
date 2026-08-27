export const STORAGE_KEYS = {
  PROGRESS: 'flipenglish_progress_v1',
  REVIEW: 'flipenglish_review_v1',
  REVIEW_STATS: 'flipenglish_review_stats_v1',
  EXAM_HISTORY: 'flipenglish_exam_history_v1',
  EXAM_ACTIVE: 'flipenglish_exam_active',
  PLACEMENT_HISTORY: 'flipenglish_placement_history_v1',
  PLACEMENT_ACTIVE: 'flipenglish_placement_active_v1',
  ONBOARDING: 'flipenglish_onboarding_v1',
  STUDY_PLAN_TODAY: 'flipenglish_study_plan_today_v1',
  STUDY_PLAN_SETTINGS: 'flipenglish_study_plan_settings_v1',
  STUDY_PLAN_HISTORY: 'flipenglish_study_plan_history_v1',
  DICTIONARY_SAVED: 'flipenglish_dictionary_saved_v1',
  DICTIONARY_HISTORY: 'flipenglish_dictionary_history_v1',
  LOCALE: 'flipenglish_locale_v1',
  AI_FEATURES_ENABLED: 'flipenglish_ai_features_enabled',
  // Wave 0 new keys:
  LEARN_SESSION_ACTIVE: 'flipenglish_learn_session_v1',
  REVIEW_SESSION_ACTIVE: 'flipenglish_review_session_v1',
  STREAK: 'flipenglish_streak_v1',
  ACTIVE_TIME: 'flipenglish_active_time_v1',
  REMINDERS: 'flipenglish_reminders_v1',
} as const;

export const CONTINUITY_EVENTS = {
  STREAK_UPDATED: 'flipenglish_streak_updated',
  ACTIVE_TIME_UPDATED: 'flipenglish_active_time_updated',
  SESSION_UPDATED: 'flipenglish_session_updated',
  REMINDERS_UPDATED: 'flipenglish_reminders_updated',
} as const;
