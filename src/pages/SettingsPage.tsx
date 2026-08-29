import React, { useState, useEffect, useRef } from 'react';
import { useI18n, UiLanguageMode, LanguageChoiceGroup } from '../features/i18n';
import { useReminders } from '../features/reminders/useReminders';
import { StudyReminderModal } from '../features/reminders/StudyReminderModal';
import { StudyPlanSettingsModal } from '../features/studyPlan/StudyPlanSettings';
import { AllowedDailyMinutes } from '../features/studyPlan/studyPlanTypes';
import {
  loadStudyPlanSettings,
  updateDailyGoalAndRegeneratePlan,
  STUDY_PLAN_UPDATED_EVENT,
} from '../features/studyPlan/studyPlanStorage';
import { getStorageHealth, StorageHealthState, STORAGE_HEALTH_EVENT } from '../utils/storageHealth';
import {
  resetLearningProgress,
  clearSavedVocabulary,
  eraseAllFlipEnglishData,
  DataManagementResult,
} from '../features/settings/dataManagement';

interface SettingsPageProps {
  onNavigateToday: () => void;
  onNavigateCurriculum: () => void;
}

type ConfirmModalType = 'reset-learning' | 'clear-vocab' | 'erase-all' | null;

/**
 * Settings and Data Management Page
 * Provides:
 * 1. Language & Presentation preferences
 * 2. Daily Goal & Reminder schedules
 * 3. Local Storage Health & Diagnostics
 * 4. Safe, Scoped Data Management Actions with Accessible Confirmation Modals
 */
export const SettingsPage: React.FC<SettingsPageProps> = ({
  onNavigateToday,
  onNavigateCurriculum,
}) => {
  const { mode, setMode, t } = useI18n();
  const { preferences: reminderPrefs } = useReminders();
  const [dailyMinutes, setDailyMinutes] = useState<AllowedDailyMinutes>(
    () => loadStudyPlanSettings().dailyMinutes
  );

  const [storageHealth, setStorageHealth] = useState<StorageHealthState>(() => getStorageHealth());
  const [activeModal, setActiveModal] = useState<ConfirmModalType>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Danger zone typed input confirmation
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Sync study plan settings updates
  useEffect(() => {
    const handlePlanUpdate = () => {
      setDailyMinutes(loadStudyPlanSettings().dailyMinutes);
    };

    window.addEventListener(STUDY_PLAN_UPDATED_EVENT, handlePlanUpdate);
    return () => {
      window.removeEventListener(STUDY_PLAN_UPDATED_EVENT, handlePlanUpdate);
    };
  }, []);

  const handleSaveGoal = (newMinutes: AllowedDailyMinutes) => {
    updateDailyGoalAndRegeneratePlan(newMinutes);
    setDailyMinutes(newMinutes);
    setIsGoalModalOpen(false);
  };

  // Listen for storage health updates
  useEffect(() => {
    const handleHealthChange = (e: CustomEvent<StorageHealthState>) => {
      setStorageHealth(e.detail);
    };

    window.addEventListener(STORAGE_HEALTH_EVENT as any, handleHealthChange);
    return () => {
      window.removeEventListener(STORAGE_HEALTH_EVENT as any, handleHealthChange);
    };
  }, []);

  // Modal accessibility: Escape key dismiss, focus trapping, autofocus
  useEffect(() => {
    if (!activeModal) {
      setTypedConfirmation('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        setActiveModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const timer = setTimeout(() => {
      if (activeModal === 'erase-all') {
        textInputRef.current?.focus();
      } else {
        confirmBtnRef.current?.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [activeModal, isProcessing]);

  const handleResetLearning = () => {
    setIsProcessing(true);
    setStatusFeedback(null);
    try {
      const res: DataManagementResult = resetLearningProgress();
      if (res.success) {
        setStatusFeedback({
          type: 'success',
          message: t('settings.toast.resetProgressSuccess'),
        });
      } else {
        setStatusFeedback({
          type: 'error',
          message: t('settings.toast.actionFailed'),
        });
      }
    } catch {
      setStatusFeedback({
        type: 'error',
        message: t('settings.toast.actionFailed'),
      });
    } finally {
      setIsProcessing(false);
      setActiveModal(null);
    }
  };

  const handleClearVocab = async () => {
    setIsProcessing(true);
    setStatusFeedback(null);
    try {
      const res = await clearSavedVocabulary();
      if (res.success) {
        setStatusFeedback({
          type: 'success',
          message: t('settings.toast.clearVocabSuccess'),
        });
      } else {
        setStatusFeedback({
          type: 'error',
          message: t('settings.toast.actionFailed'),
        });
      }
    } catch {
      setStatusFeedback({
        type: 'error',
        message: t('settings.toast.actionFailed'),
      });
    } finally {
      setIsProcessing(false);
      setActiveModal(null);
    }
  };

  const handleEraseAll = async () => {
    if (typedConfirmation.trim().toUpperCase() !== 'RESET') {
      return;
    }

    setIsProcessing(true);
    setStatusFeedback(null);
    try {
      const res = await eraseAllFlipEnglishData();
      if (res.success) {
        setStatusFeedback({
          type: 'success',
          message: t('settings.toast.eraseAllSuccess'),
        });
      } else {
        setStatusFeedback({
          type: 'error',
          message: t('settings.toast.actionFailed'),
        });
      }
    } catch {
      setStatusFeedback({
        type: 'error',
        message: t('settings.toast.actionFailed'),
      });
    } finally {
      setIsProcessing(false);
      setActiveModal(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {t('settings.title')}
          </h1>
        </div>
        <p className="text-sm sm:text-base text-slate-600">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Global Status Feedback Banner */}
      {statusFeedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-fade-in ${
            statusFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                statusFeedback.type === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {statusFeedback.type === 'success' ? '✓' : '!'}
            </span>
            <p className="text-sm font-semibold">{statusFeedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusFeedback(null)}
            className="min-h-11 min-w-11 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
            aria-label={t('ui.common.dismiss')}
          >
            {t('ui.common.dismiss')}
          </button>
        </div>
      )}

      {/* Section 1: Language & Presentation */}
      <section
        aria-labelledby="section-language-heading"
        className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5"
      >
        <div className="border-b border-slate-100 pb-4">
          <h2
            id="section-language-heading"
            className="text-lg sm:text-xl font-bold text-slate-900"
          >
            {t('settings.section.language')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('settings.section.languageDesc')}
          </p>
        </div>

        <div>
          <LanguageChoiceGroup
            mode={mode}
            name="flipenglish-settings-language"
            onChange={(newMode) => setMode(newMode, true)}
            legendHidden={false}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            itemClassName={(checked) =>
              `min-h-12 p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                checked
                  ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 font-medium'
              }`
            }
          />
        </div>
      </section>

      {/* Section 2: Daily Study Goals & Reminders */}
      <section
        aria-labelledby="section-study-heading"
        className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5"
      >
        <div className="border-b border-slate-100 pb-4">
          <h2
            id="section-study-heading"
            className="text-lg sm:text-xl font-bold text-slate-900"
          >
            {t('settings.section.study')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('settings.section.studyDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Daily Goal Card */}
          <div className="border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                {t('studyPlan.settings.title')}
              </span>
              <div className="text-xl font-black text-slate-900">
                {dailyMinutes} {t('studyPlan.settings.unit')} / day
              </div>
              <p className="text-xs text-slate-500">
                {t('studyPlan.settings.hint')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGoalModalOpen(true)}
              className="min-h-11 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold border border-slate-200 transition-colors cursor-pointer text-center"
            >
              {t('progress.snapshot.changeGoal')}
            </button>
          </div>

          {/* Study Reminder Card */}
          <div className="border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                {t('reminders.modal.title')}
              </span>
              <div className="text-xl font-black text-slate-900">
                {reminderPrefs.enabled
                  ? `${String(reminderPrefs.preferredHour).padStart(2, '0')}:${String(
                      reminderPrefs.preferredMinute
                    ).padStart(2, '0')}`
                  : t('reminders.modal.enableToggle')}
              </div>
              <p className="text-xs text-slate-500">
                {reminderPrefs.enabled
                  ? t('reminders.modal.enableDesc')
                  : t('reminders.modal.subtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsReminderModalOpen(true)}
              className="min-h-11 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold border border-slate-200 transition-colors cursor-pointer text-center"
            >
              {t('ui.common.change')}
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Data & Progress Management */}
      <section
        aria-labelledby="section-data-heading"
        className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6"
      >
        <div className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2
                id="section-data-heading"
                className="text-lg sm:text-xl font-bold text-slate-900"
              >
                {t('settings.section.data')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {t('settings.section.dataDesc')}
              </p>
            </div>

            {/* Storage Health Status Pill */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto border ${
                storageHealth.isHealthy
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  storageHealth.isHealthy ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span>
                {storageHealth.isHealthy
                  ? t('settings.storage.statusHealthy')
                  : storageHealth.lastFailureType === 'quota_exceeded'
                  ? t('settings.storage.statusQuotaWarning')
                  : t('settings.storage.statusDegraded')}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          {t('settings.storage.devicePrivate')}
        </p>

        {/* Action 1: Reset Learning Progress */}
        <div className="border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {t('settings.data.resetProgressTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {t('settings.data.resetProgressDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal('reset-learning')}
            className="min-h-11 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0"
          >
            {t('settings.data.resetProgressBtn')}
          </button>
        </div>

        {/* Action 2: Clear Saved Vocabulary */}
        <div className="border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {t('settings.data.clearVocabTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {t('settings.data.clearVocabDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal('clear-vocab')}
            className="min-h-11 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0"
          >
            {t('settings.data.clearVocabBtn')}
          </button>
        </div>

        {/* Danger Zone: Erase All FlipEnglish Data */}
        <div className="border-2 border-rose-200 bg-rose-50/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xs font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
              {t('settings.data.dangerZone')}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <h3 className="text-sm sm:text-base font-bold text-rose-950">
                {t('settings.data.eraseAllTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">
                {t('settings.data.eraseAllDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal('erase-all')}
              className="min-h-11 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs sm:text-sm font-bold transition-colors shadow-xs cursor-pointer shrink-0"
            >
              {t('settings.data.eraseAllBtn')}
            </button>
          </div>
        </div>
      </section>

      {/* Confirmation Modal 1: Reset Learning Progress */}
      {activeModal === 'reset-learning' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => !isProcessing && setActiveModal(null)}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-reset-learning-title"
            aria-describedby="modal-reset-learning-desc"
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-black text-xl">
              !
            </div>
            <div className="space-y-2">
              <h3
                id="modal-reset-learning-title"
                className="text-lg sm:text-xl font-bold text-slate-900 leading-snug"
              >
                {t('settings.modal.resetProgressTitle')}
              </h3>
              <p
                id="modal-reset-learning-desc"
                className="text-xs sm:text-sm text-slate-600 leading-relaxed"
              >
                {t('settings.modal.resetProgressMessage')}
              </p>
              <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                {t('settings.modal.resetProgressPreserve')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={isProcessing}
                className="min-h-11 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition-colors cursor-pointer flex-1"
              >
                {t('settings.modal.cancel')}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleResetLearning}
                disabled={isProcessing}
                className="min-h-11 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer flex-1"
              >
                {isProcessing ? t('ui.common.loading') : t('settings.modal.resetProgressConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 2: Clear Saved Vocabulary */}
      {activeModal === 'clear-vocab' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => !isProcessing && setActiveModal(null)}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-clear-vocab-title"
            aria-describedby="modal-clear-vocab-desc"
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-black text-xl">
              !
            </div>
            <div className="space-y-2">
              <h3
                id="modal-clear-vocab-title"
                className="text-lg sm:text-xl font-bold text-slate-900 leading-snug"
              >
                {t('settings.modal.clearVocabTitle')}
              </h3>
              <p
                id="modal-clear-vocab-desc"
                className="text-xs sm:text-sm text-slate-600 leading-relaxed"
              >
                {t('settings.modal.clearVocabMessage')}
              </p>
              <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                {t('settings.modal.clearVocabPreserve')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={isProcessing}
                className="min-h-11 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition-colors cursor-pointer flex-1"
              >
                {t('settings.modal.cancel')}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleClearVocab}
                disabled={isProcessing}
                className="min-h-11 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer flex-1"
              >
                {isProcessing ? t('ui.common.loading') : t('settings.modal.clearVocabConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 3: Danger Zone Factory Reset */}
      {activeModal === 'erase-all' && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => !isProcessing && setActiveModal(null)}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-erase-all-title"
            aria-describedby="modal-erase-all-desc"
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-rose-300 space-y-5 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-black text-xl">
              !
            </div>
            <div className="space-y-2">
              <h3
                id="modal-erase-all-title"
                className="text-lg sm:text-xl font-bold text-rose-950 leading-snug"
              >
                {t('settings.modal.eraseAllTitle')}
              </h3>
              <p
                id="modal-erase-all-desc"
                className="text-xs sm:text-sm text-slate-600 leading-relaxed"
              >
                {t('settings.modal.eraseAllMessage')}
              </p>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label
                htmlFor="danger-zone-confirm-input"
                className="block text-xs font-bold text-slate-700"
              >
                {t('settings.modal.eraseAllTypePrompt', { keyword: 'RESET' })}
              </label>
              <input
                ref={textInputRef}
                id="danger-zone-confirm-input"
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="RESET"
                disabled={isProcessing}
                autoComplete="off"
                spellCheck="false"
                className="w-full min-h-11 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold uppercase tracking-widest text-slate-900 focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={isProcessing}
                className="min-h-11 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition-colors cursor-pointer flex-1"
              >
                {t('settings.modal.cancel')}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleEraseAll}
                disabled={
                  isProcessing ||
                  typedConfirmation.trim().toUpperCase() !== 'RESET'
                }
                className={`min-h-11 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs flex-1 ${
                  typedConfirmation.trim().toUpperCase() === 'RESET' && !isProcessing
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                {isProcessing ? t('ui.common.loading') : t('settings.modal.eraseAllConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modals */}
      <StudyReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
      />
      <StudyPlanSettingsModal
        currentMinutes={dailyMinutes}
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleSaveGoal}
      />
    </div>
  );
};
