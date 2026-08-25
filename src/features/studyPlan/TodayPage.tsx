import React, { useState, useEffect, useCallback } from 'react';
import { TodayStudyPlan, StudyPlanTask, AllowedDailyMinutes } from './studyPlanTypes';
import {
  getOrGenerateTodayPlan,
  updateTaskStatus,
  updateDailyGoalAndRegeneratePlan,
  STUDY_PLAN_UPDATED_EVENT,
} from './studyPlanStorage';
import { StudyPlanTaskCard } from './StudyPlanTaskCard';
import { StudyPlanSettingsModal } from './StudyPlanSettings';
import { Lesson, CEFRLevel } from '../../types';
import { getLessonById } from '../../data/lessons';
import { REVIEW_UPDATED_EVENT } from '../../utils/reviewStorage';
import { PLACEMENT_UPDATED_EVENT } from '../placement/placementStorage';

interface TodayPageProps {
  onSelectLesson: (lesson: Lesson) => void;
  onNavigateReview: () => void;
  onNavigatePlacement: () => void;
  onNavigateQuickTest: (level: CEFRLevel) => void;
  onNavigateCurriculum: () => void;
  onNavigateConversation?: () => void;
  onNavigateFlipLens?: () => void;
}

export const TodayPage: React.FC<TodayPageProps> = ({
  onSelectLesson,
  onNavigateReview,
  onNavigatePlacement,
  onNavigateQuickTest,
  onNavigateCurriculum,
}) => {
  const [plan, setPlan] = useState<TodayStudyPlan>(() => getOrGenerateTodayPlan());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [goalFeedbackMessage, setGoalFeedbackMessage] = useState<string | null>(null);

  // Refresh and reconcile plan
  const refreshPlan = useCallback(() => {
    const fresh = getOrGenerateTodayPlan();
    setPlan(fresh);
  }, []);

  // Subscribe to storage update events across components and tabs
  useEffect(() => {
    refreshPlan();

    const handleUpdate = () => refreshPlan();
    window.addEventListener(STUDY_PLAN_UPDATED_EVENT, handleUpdate);
    window.addEventListener(REVIEW_UPDATED_EVENT, handleUpdate);
    window.addEventListener(PLACEMENT_UPDATED_EVENT, handleUpdate);
    window.addEventListener('flipenglish_progress_updated', handleUpdate);
    window.addEventListener('flipenglish_exam_history_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener(STUDY_PLAN_UPDATED_EVENT, handleUpdate);
      window.removeEventListener(REVIEW_UPDATED_EVENT, handleUpdate);
      window.removeEventListener(PLACEMENT_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('flipenglish_progress_updated', handleUpdate);
      window.removeEventListener('flipenglish_exam_history_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [refreshPlan]);

  // Handle task CTA navigation
  const handleStartTask = (task: StudyPlanTask) => {
    if (task.type === 'review') {
      onNavigateReview();
    } else if (task.type === 'placement') {
      onNavigatePlacement();
    } else if (task.type === 'quick-test') {
      onNavigateQuickTest(task.level || 'B1');
    } else if (task.type === 'lesson' && task.lessonId) {
      const lesson = getLessonById(task.lessonId);
      if (lesson) {
        onSelectLesson(lesson);
      } else {
        onNavigateCurriculum();
      }
    }
  };

  // Handle task skipping
  const handleSkipTask = (taskId: string) => {
    updateTaskStatus(taskId, 'skipped');
    refreshPlan();
  };

  // Handle saving new daily time goal
  const handleSaveGoal = (newMinutes: AllowedDailyMinutes) => {
    const result = updateDailyGoalAndRegeneratePlan(newMinutes);
    setPlan(result.plan);
    if (result.message) {
      setGoalFeedbackMessage(result.message);
    } else {
      setGoalFeedbackMessage(null);
    }
  };

  // Calculate task counts
  const totalTasks = plan.tasks.length;
  const completedTasks = plan.tasks.filter((t) => t.status === 'completed').length;
  const skippedTasks = plan.tasks.filter((t) => t.status === 'skipped').length;
  const resolvedTasks = completedTasks + skippedTasks;
  const isPlanFinished = resolvedTasks === totalTasks && totalTasks > 0;
  const allTasksSkipped = skippedTasks === totalTasks && totalTasks > 0;
  const allTasksCompleted = completedTasks === totalTasks && totalTasks > 0;

  // Format today's date nicely: e.g. "Tuesday, August 25"
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Header Summary Banner */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-indigo-600 block">
              {todayFormatted}
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Today's Study Plan
            </h1>
          </div>

          {/* Daily Goal Control */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="min-h-11 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <span>{plan.dailyMinutes} min goal</span>
            <span className="text-slate-400 font-normal">· Change</span>
          </button>
        </div>

        {/* Goal Feedback Notice (e.g. goal downgrade applied for tomorrow) */}
        {goalFeedbackMessage && (
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 flex items-start justify-between gap-3 animate-fadeIn">
            <p className="leading-relaxed font-medium">{goalFeedbackMessage}</p>
            <button
              type="button"
              onClick={() => setGoalFeedbackMessage(null)}
              className="text-indigo-400 hover:text-indigo-700 font-bold text-xs shrink-0 cursor-pointer p-1"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        {/* Progress Tracker Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700">
            <span>
              {completedTasks} of {totalTasks} activities completed
              {skippedTasks > 0 ? ` (${skippedTasks} skipped)` : ''}
            </span>
            <span className="text-slate-400 font-normal">
              {plan.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)} min planned
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
      </section>

      {/* Plan Completion / Resolution State Notice */}
      {isPlanFinished && (
        <section
          className={`rounded-3xl p-6 sm:p-8 border text-center space-y-4 animate-fadeIn ${
            allTasksSkipped
              ? 'bg-slate-50 border-slate-200'
              : 'bg-emerald-50/80 border-emerald-200'
          }`}
        >
          <div className="space-y-1">
            <span
              className={`text-2xs font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                allTasksSkipped
                  ? 'bg-slate-200/80 text-slate-700 border-slate-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {allTasksSkipped
                ? 'All Tasks Skipped'
                : allTasksCompleted
                ? 'Daily Target Reached'
                : 'Plan Resolved'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
              {allTasksSkipped
                ? "Today's plan is finished (all tasks skipped)"
                : allTasksCompleted
                ? "Today's study plan finished"
                : "Today's study plan finished"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              {allTasksSkipped
                ? 'You skipped all scheduled activities for today. You can still practice freely or explore any curriculum lesson.'
                : 'You finished your planned learning blocks for today. Feel free to explore additional curriculum lessons or practice freely.'}
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
              Continue Learning Curriculum
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
              Open Smart Review
            </button>
          </div>
        </section>
      )}

      {/* Task List */}
      <section className="space-y-4" aria-label="Today's scheduled learning activities">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Planned Activities
        </h2>

        <div className="space-y-3">
          {plan.tasks.map((task, idx) => (
            <StudyPlanTaskCard
              key={task.id}
              task={task}
              index={idx}
              onStartTask={handleStartTask}
              onSkipTask={handleSkipTask}
            />
          ))}
        </div>
      </section>

      {/* Daily Goal Settings Modal */}
      <StudyPlanSettingsModal
        currentMinutes={plan.dailyMinutes}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveGoal}
      />
    </div>
  );
};
