import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TodayStudyPlan, StudyPlanTask, AllowedDailyMinutes } from './studyPlanTypes';
import {
  getOrGenerateTodayPlan,
  loadStudyPlanSettings,
  updateTaskStatus,
  updateDailyGoalAndRegeneratePlan,
  STUDY_PLAN_UPDATED_EVENT,
} from './studyPlanStorage';
import { StudyPlanTaskCard } from './StudyPlanTaskCard';
import { StudyPlanSettingsModal } from './StudyPlanSettings';
import { Lesson, CEFRLevel } from '../../types';
import { NextActionRecommendation } from '../../types/continuity';
import { getLessonById } from '../../data/lessons';
import { REVIEW_UPDATED_EVENT } from '../../utils/reviewStorage';
import { PLACEMENT_UPDATED_EVENT, getLatestPlacementResult } from '../placement/placementStorage';
import { PWAInstallCard } from '../pwa/PWAInstallCard';
import { ContinueLearningCard } from '../continuity/ContinueLearningCard';
import { ProgressSnapshotCard } from '../progress/ProgressSnapshotCard';
import { InAppReminderBanner } from '../reminders/InAppReminderBanner';
import { StudyReminderModal } from '../reminders/StudyReminderModal';
import { useI18n } from '../i18n';

interface TodayPageProps {
  onSelectLesson: (lesson: Lesson) => void;
  onNavigateReview: () => void;
  onNavigatePlacement: () => void;
  onNavigateQuickTest: (level: CEFRLevel) => void;
  onNavigateCurriculum: () => void;
  onNavigateConversation?: () => void;
  onNavigateFlipLens?: () => void;
  onNavigateContinueAction?: (recommendation: NextActionRecommendation) => void;
  isStartingQuickTest?: boolean;
}

export const TodayPage: React.FC<TodayPageProps> = ({
  onSelectLesson,
  onNavigateReview,
  onNavigatePlacement,
  onNavigateQuickTest,
  onNavigateCurriculum,
  onNavigateConversation,
  onNavigateFlipLens,
  onNavigateContinueAction,
  isStartingQuickTest = false,
}) => {
  const { t, formatDate } = useI18n();
  const [plan, setPlan] = useState<TodayStudyPlan>(() => getOrGenerateTodayPlan());
  const [preferredDailyMinutes, setPreferredDailyMinutes] = useState<AllowedDailyMinutes>(
    () => loadStudyPlanSettings().dailyMinutes
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [goalFeedbackMessage, setGoalFeedbackMessage] = useState<string | null>(null);

  const changeGoalButtonRef = useRef<HTMLButtonElement>(null);

  // Refresh and reconcile plan & preferred settings
  const refreshPlanAndSettings = useCallback(() => {
    const freshPlan = getOrGenerateTodayPlan();
    const freshSettings = loadStudyPlanSettings();
    setPlan(freshPlan);
    setPreferredDailyMinutes(freshSettings.dailyMinutes);
  }, []);

  // Subscribe to storage update events across components and tabs
  useEffect(() => {
    const handleUpdate = () => refreshPlanAndSettings();

    const handleStorageEvent = (event: StorageEvent) => {
      // Only refresh when relevant FlipEnglish keys changed or storage was cleared
      if (
        !event.key ||
        event.key.startsWith('flipenglish_') ||
        event.key === 'flipenglish_study_plan_settings_v1' ||
        event.key === 'flipenglish_today_plan_v1'
      ) {
        refreshPlanAndSettings();
      }
    };

    window.addEventListener(STUDY_PLAN_UPDATED_EVENT, handleUpdate);
    window.addEventListener(REVIEW_UPDATED_EVENT, handleUpdate);
    window.addEventListener(PLACEMENT_UPDATED_EVENT, handleUpdate);
    window.addEventListener('flipenglish_progress_updated', handleUpdate);
    window.addEventListener('flipenglish_exam_history_updated', handleUpdate);
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener(STUDY_PLAN_UPDATED_EVENT, handleUpdate);
      window.removeEventListener(REVIEW_UPDATED_EVENT, handleUpdate);
      window.removeEventListener(PLACEMENT_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('flipenglish_progress_updated', handleUpdate);
      window.removeEventListener('flipenglish_exam_history_updated', handleUpdate);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [refreshPlanAndSettings]);

  // Handle task CTA navigation
  const handleStartTask = (task: StudyPlanTask) => {
    if (task.type === 'review') {
      onNavigateReview();
    } else if (task.type === 'placement') {
      onNavigatePlacement();
    } else if (task.type === 'quick-test') {
      if (task.level) {
        onNavigateQuickTest(task.level);
      }
    } else if (task.type === 'lesson' && task.lessonId) {
      const lesson = getLessonById(task.lessonId);
      if (lesson) {
        onSelectLesson(lesson);
      } else {
        onNavigateCurriculum();
      }
    }
  };

  // Handle primary Continue Learning CTA
  const handleContinueLearning = (recommendation: NextActionRecommendation) => {
    if (onNavigateContinueAction) {
      onNavigateContinueAction(recommendation);
    } else {
      // Fallback local resolution
      if (recommendation.targetView === 'review') {
        onNavigateReview();
      } else if (recommendation.targetView === 'placement-session' || recommendation.targetView === 'placement-intro') {
        onNavigatePlacement();
      } else if (recommendation.actionPayload?.lessonId) {
        const lesson = getLessonById(recommendation.actionPayload.lessonId);
        if (lesson) {
          onSelectLesson(lesson);
        } else {
          onNavigateCurriculum();
        }
      } else {
        onNavigateCurriculum();
      }
    }
  };

  // Handle task skipping
  const handleSkipTask = (taskId: string) => {
    updateTaskStatus(taskId, 'skipped');
    refreshPlanAndSettings();
  };

  // Handle saving new daily time goal
  const handleSaveGoal = (newMinutes: AllowedDailyMinutes) => {
    const result = updateDailyGoalAndRegeneratePlan(newMinutes);
    setPlan(result.plan);
    setPreferredDailyMinutes(newMinutes);
    if (result.message) {
      setGoalFeedbackMessage(result.message);
    } else {
      setGoalFeedbackMessage(null);
    }
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    setTimeout(() => {
      changeGoalButtonRef.current?.focus();
    }, 50);
  };

  // State checks
  const isCurriculumCompleteState = plan.state === 'curriculum-complete' && plan.tasks.length === 0;

  // Calculate task counts
  const totalTasks = plan.tasks.length;
  const completedTasks = plan.tasks.filter((t) => t.status === 'completed').length;
  const skippedTasks = plan.tasks.filter((t) => t.status === 'skipped').length;
  const resolvedTasks = completedTasks + skippedTasks;
  const isPlanFinished = resolvedTasks === totalTasks && totalTasks > 0;
  const allTasksSkipped = skippedTasks === totalTasks && totalTasks > 0;
  const allTasksCompleted = completedTasks === totalTasks && totalTasks > 0;

  const todayFormatted = formatDate(new Date(), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const latestPlacement = getLatestPlacementResult();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* In-App Study Reminder Banner */}
      <InAppReminderBanner onStudyNow={() => {
        if (plan.tasks.length > 0) {
          const firstPending = plan.tasks.find((t) => t.status === 'pending');
          if (firstPending) {
            handleStartTask(firstPending);
            return;
          }
        }
        onNavigateCurriculum();
      }} />

      {/* Header Summary Banner */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-indigo-600 block">
              {todayFormatted}
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {t('today.title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {t('today.subtitle')}
            </p>
          </div>

          {/* Daily Goal & Reminder Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              ref={changeGoalButtonRef}
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="min-h-11 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              {plan.dailyMinutes === preferredDailyMinutes ? (
                <>
                  <span>{plan.dailyMinutes} min goal</span>
                  <span className="text-slate-400 font-normal">· {t('ui.common.change')}</span>
                </>
              ) : (
                <>
                  <span>{plan.dailyMinutes} min</span>
                  <span className="text-slate-400 font-normal">· {t('ui.common.change')}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsRemindersOpen(true)}
              className="min-h-11 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
              title={t('reminders.modal.title')}
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="hidden sm:inline">{t('reminders.banner.badge')}</span>
            </button>
          </div>
        </div>

        {/* Goal Feedback Notice */}
        {goalFeedbackMessage && (
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 flex items-start justify-between gap-3 animate-fadeIn">
            <p className="leading-relaxed font-medium">{goalFeedbackMessage}</p>
            <button
              type="button"
              onClick={() => setGoalFeedbackMessage(null)}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs shrink-0 cursor-pointer px-2 py-1 rounded-md bg-indigo-100/70 hover:bg-indigo-200 transition-colors"
              aria-label="Dismiss feedback message"
            >
              {t('ui.common.dismiss')}
            </button>
          </div>
        )}

        {/* Progress Tracker Bar */}
        {!isCurriculumCompleteState && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700">
              <span>
                {t('today.target.completed', { completed: completedTasks, target: totalTasks })}
                {skippedTasks > 0 ? ` (${skippedTasks} skipped)` : ''}
              </span>
              <span className="text-slate-400 font-normal">
                {plan.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)} min
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  allTasksSkipped ? 'bg-slate-400' : 'bg-indigo-600'
                }`}
                style={{
                  width: `${totalTasks > 0 ? Math.round((resolvedTasks / totalTasks) * 100) : 0}%`,
                }}
                role="progressbar"
                aria-valuenow={resolvedTasks}
                aria-valuemin={0}
                aria-valuemax={totalTasks}
                aria-valuetext={`${completedTasks} completed, ${skippedTasks} skipped of ${totalTasks} total tasks`}
              />
            </div>
          </div>
        )}
      </section>

      {/* Continuity Hero: One-Tap Continue Learning Card */}
      <ContinueLearningCard onContinue={handleContinueLearning} />

      {/* Progress & Habit Snapshot Card */}
      <ProgressSnapshotCard
        estimatedLevel={latestPlacement?.estimatedLevel}
        dailyGoalMinutes={preferredDailyMinutes}
        onNavigateToReview={onNavigateReview}
        onNavigateToGoalSettings={() => setIsSettingsOpen(true)}
      />

      {/* State A: Curriculum Complete & No Required Tasks State */}
      {isCurriculumCompleteState ? (
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-2xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
              {t('today.target.allDone')}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {t('learn.flashcard.completedTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              {t('today.subtitle')}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              {t('ui.common.practice')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onNavigateReview}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors cursor-pointer space-y-1"
              >
                <span className="block text-sm font-bold text-slate-900">{t('ui.nav.review')}</span>
                <span className="block text-2xs text-slate-500">{t('review.subtitle')}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateQuickTest('B2')}
                disabled={isStartingQuickTest}
                aria-busy={isStartingQuickTest}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors cursor-pointer space-y-1 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <span className="block text-sm font-bold text-slate-900">
                  {isStartingQuickTest ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                      <span>{t('exam.starting')}</span>
                    </span>
                  ) : (
                    t('exam.title')
                  )}
                </span>
                <span className="block text-2xs text-slate-500">{t('exam.mode.quickDesc')}</span>
              </button>

              {onNavigateConversation && (
                <button
                  type="button"
                  onClick={onNavigateConversation}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors cursor-pointer space-y-1"
                >
                  <span className="block text-sm font-bold text-slate-900">{t('ui.nav.conversation')}</span>
                  <span className="block text-2xs text-slate-500">{t('conversation.subtitle')}</span>
                </button>
              )}

              {onNavigateFlipLens && (
                <button
                  type="button"
                  onClick={onNavigateFlipLens}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors cursor-pointer space-y-1"
                >
                  <span className="block text-sm font-bold text-slate-900">{t('ui.nav.fliplens')}</span>
                  <span className="block text-2xs text-slate-500">{t('fliplens.subtitle')}</span>
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* State B: Plan Completion / Resolution State Notice */}
          {isPlanFinished && (
            <section
              className={`rounded-3xl p-6 sm:p-8 border text-center space-y-4 animate-fadeIn ${
                allTasksSkipped
                  ? 'bg-slate-50 border-slate-200'
                  : allTasksCompleted
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : 'bg-indigo-50/70 border-indigo-200'
              }`}
            >
              <div className="space-y-1">
                <span
                  className={`text-2xs font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                    allTasksSkipped
                      ? 'bg-slate-200/80 text-slate-700 border-slate-300'
                      : allTasksCompleted
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                  }`}
                >
                  {allTasksSkipped
                    ? t('today.task.action.done')
                    : allTasksCompleted
                    ? t('today.target.allDone')
                    : t('today.task.action.done')}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
                  {allTasksSkipped
                    ? t('today.target.allDone')
                    : allTasksCompleted
                    ? t('today.target.allDone')
                    : t('today.task.action.done')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  {t('today.target.completed', { completed: completedTasks, target: totalTasks })}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={onNavigateCurriculum}
                  className={`min-h-12 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer inline-flex items-center justify-center ${
                    allTasksSkipped
                      ? 'bg-slate-800 hover:bg-slate-900 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {t('home.hero.startCurriculum')}
                </button>
                <button
                  type="button"
                  onClick={onNavigateReview}
                  className={`min-h-12 px-6 py-2.5 rounded-xl border font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center ${
                    allTasksSkipped
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                      : 'bg-white hover:bg-emerald-50 text-emerald-900 border-emerald-200'
                  }`}
                >
                  {t('ui.nav.review')}
                </button>
              </div>
            </section>
          )}

          {/* Task List */}
          <section className="space-y-4" aria-label="Today's scheduled learning activities">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              {t('today.tasks.title')}
            </h2>

            <div className="space-y-3">
              {plan.tasks.map((task, idx) => {
                const isThisTaskStarting = task.type === 'quick-test' && isStartingQuickTest;
                return (
                  <StudyPlanTaskCard
                    key={task.id}
                    task={task}
                    index={idx}
                    onStartTask={handleStartTask}
                    onSkipTask={handleSkipTask}
                    isStarting={isThisTaskStarting}
                    startingLabel={t('exam.starting')}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* PWA Install Promotion Card */}
      <PWAInstallCard />

      {/* Daily Goal Settings Modal */}
      <StudyPlanSettingsModal
        currentMinutes={preferredDailyMinutes}
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        onSave={handleSaveGoal}
      />

      {/* Study Reminders Preferences Modal */}
      <StudyReminderModal
        isOpen={isRemindersOpen}
        onClose={() => setIsRemindersOpen(false)}
      />
    </div>
  );
};

