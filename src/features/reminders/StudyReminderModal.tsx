import React, { useState, useEffect, useRef } from 'react';
import { useReminders } from './useReminders';
import { useI18n } from '../i18n';
import { formatReminderTime } from './reminderCapability';

export interface StudyReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Accessible Modal dialog for managing study reminder preferences:
 * - Toggle enable/disable reminders
 * - 24-hour time picker (Hour 00-23, Minute 00-59)
 * - Browser notification permission request action with status display
 * - Transparent explanation of local in-app vs web notification boundaries
 * - Accessible keyboard navigation, focus management, and role="dialog" / aria-modal="true"
 * - Zero decorative emojis, >=44px touch targets
 */
export const StudyReminderModal: React.FC<StudyReminderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useI18n();
  const {
    preferences,
    permissionState,
    updatePreferences,
    requestPermission,
  } = useReminders();

  const [enabled, setEnabled] = useState<boolean>(preferences.enabled);
  const [hour, setHour] = useState<number>(preferences.preferredHour);
  const [minute, setMinute] = useState<number>(preferences.preferredMinute);
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const toggleInputRef = useRef<HTMLInputElement>(null);

  // Sync state with incoming preferences when modal opens or preferences change
  useEffect(() => {
    if (isOpen) {
      setEnabled(preferences.enabled);
      setHour(preferences.preferredHour);
      setMinute(preferences.preferredMinute);
    }
  }, [isOpen, preferences]);

  // Accessibility: Esc key listener and auto focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      toggleInputRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    updatePreferences({
      enabled,
      preferredHour: hour,
      preferredMinute: minute,
    });
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handlePermissionRequest = async () => {
    setIsRequestingPermission(true);
    try {
      await requestPermission();
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const formattedPreviewTime = formatReminderTime(hour, minute);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-reminder-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-scaleUp my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 mb-1">
            {t('reminders.banner.badge')}
          </div>
          <h2
            id="study-reminder-modal-title"
            className="text-xl font-black text-slate-900 tracking-tight"
          >
            {t('reminders.modal.title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {t('reminders.modal.subtitle')}
          </p>
        </div>

        {/* Toggle Enable Reminders */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <label className="flex items-center justify-between cursor-pointer gap-4 min-h-11">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-slate-900">
                {t('reminders.modal.enableToggle')}
              </span>
              <p className="text-2xs text-slate-500 leading-relaxed">
                {t('reminders.modal.enableDesc')}
              </p>
            </div>
            <input
              ref={toggleInputRef}
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
              aria-label={t('reminders.modal.enableToggle')}
            />
            <div className="relative w-12 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-5.5 after:transition-all peer-checked:bg-indigo-600 shrink-0"></div>
          </label>
        </div>

        {/* Time Selector */}
        {enabled && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('reminders.modal.timeLabel')}
              </span>
              <span className="text-sm font-black font-mono px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                {formattedPreviewTime}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="reminder-hour-select"
                  className="block text-2xs font-semibold text-slate-500 mb-1"
                >
                  {t('reminders.modal.hourLabel')} (00 - 23)
                </label>
                <select
                  id="reminder-hour-select"
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="w-full min-h-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors cursor-pointer"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')} : 00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reminder-minute-select"
                  className="block text-2xs font-semibold text-slate-500 mb-1"
                >
                  {t('reminders.modal.minuteLabel')} (00 - 59)
                </label>
                <select
                  id="reminder-minute-select"
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                  className="w-full min-h-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors cursor-pointer"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>
                      : {String(i).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Browser Notification Capability Section */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              {t('reminders.modal.permissionTitle')}
            </span>
            <span
              className={`text-3xs font-black uppercase px-2 py-0.5 rounded ${
                permissionState === 'granted'
                  ? 'bg-emerald-100 text-emerald-800'
                  : permissionState === 'denied'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {permissionState}
            </span>
          </div>

          <p className="text-2xs text-slate-500 leading-relaxed">
            {permissionState === 'granted' && t('reminders.modal.permissionDescGranted')}
            {permissionState === 'default' && t('reminders.modal.permissionDescDefault')}
            {permissionState === 'denied' && t('reminders.modal.permissionDescDenied')}
            {permissionState === 'unsupported' && t('reminders.modal.permissionDescUnsupported')}
          </p>

          {permissionState === 'default' && (
            <button
              type="button"
              onClick={handlePermissionRequest}
              disabled={isRequestingPermission}
              className="w-full min-h-11 px-4 py-2 bg-white hover:bg-slate-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors cursor-pointer inline-flex items-center justify-center disabled:opacity-50"
            >
              {t('reminders.modal.requestPermission')}
            </button>
          )}
        </div>

        {/* Informative capability footnote */}
        <p className="text-3xs text-slate-400 leading-relaxed">
          {t('reminders.modal.capabilityNote')}
        </p>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-11 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center"
          >
            {t('reminders.modal.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all cursor-pointer inline-flex items-center justify-center"
          >
            {t('reminders.modal.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
