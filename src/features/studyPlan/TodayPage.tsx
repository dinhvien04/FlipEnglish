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
  onNavigateConversation,
  onNavigateFlipLens,
}) => {
  const [plan, setPlan] = useState<TodayStudyPlan>(() => getOrGenerateTodayPlan());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    const updated = updateDailyGoalAndRegeneratePlan(newMinutes);
    setPlan(updated);
  };

  // Calculate task counts
  const totalTasks = plan.tasks.length;
  const completedTasks = plan.tasks.filter((t) => t.status === 'completed').length;
  const skippedTasks = plan.tasks.filter((t) => t.status === 'skipped').length;
  const isPlanFinished = completedTasks + skippedTasks === totalTasks && totalTasks > 0;

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
              className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${totalTasks > 0 ? Math.round(((completedTasks + skippedTasks) / totalTasks) * 100) : 0}%`,
              }}
              role="progressbar"
              aria-valuenow={completedTasks}
              aria-valuemin={0}
              aria-valuemax={totalTasks}
            />
          </div>
        </div>
      </section>

      {/* Plan Completion State Notice */}
      {isPlanFinished && (
        <section className="bg-emerald-50/80 rounded-3xl p-6 sm:p-8 border border-emerald-200 text-center space-y-4 animate-fadeIn">
          <div className="space-y-1">
            <span className="text-2xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Daily Target Reached
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
              Today's study plan finished
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              You completed your planned learning blocks for today. Feel free to explore additional curriculum lessons or practice freely.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={onNavigateCurriculum}
              className="min-h-12 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer inline-flex items-center justify-center"
            >
              Continue Learning Curriculum
            </button>
            <button
              type="button"
              onClick={onNavigateReview}
              className="min-h-12 px-6 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center"
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

        <div className="space-y-4">
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

      {/* Optional Independent Practice Section (AI & Lens) */}
      {(onNavigateConversation || onNavigateFlipLens) && (
        <section className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
          <div className="space-y-1">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-400">
              Optional Practice
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Explore freely outside your daily plan
            </h3>
            <p className="text-xs text-slate-500">
              Additional speaking and visual exploration modules (optional, not counted toward planned time).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {onNavigateConversation && (
              <button
                type="button"
                onClick={onNavigateConversation}
                className="p-4 rounded-2xl bg-white hover:bg-slate-100/80 border border-slate-200 text-left space-y-1.5 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">AI Conversation Lab</span>
                  <span className="text-2xs font-bold text-indigo-600">Open →</span>
                </div>
                <p className="text-2xs text-slate-500 leading-relaxed">
                  Interactive dialogue practice across 20 realistic English scenarios.
                </p>
              </button>
            )}

            {onNavigateFlipLens && (
              <button
                type="button"
                onClick={onNavigateFlipLens}
                className="p-4 rounded-2xl bg-white hover:bg-slate-100/80 border border-slate-200 text-left space-y-1.5 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">FlipLens Visual Scanner</span>
                  <span className="text-2xs font-bold text-indigo-600">Open →</span>
                </div>
                <p className="text-2xs text-slate-500 leading-relaxed">
                  Scan objects in your environment to discover English vocabulary.
                </p>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Honest Methodology Note */}
      <footer className="text-center pt-2">
        <p className="text-2xs text-slate-400 max-w-xl mx-auto leading-relaxed">
          Today's plan is built deterministically from your spaced repetition schedule, active curriculum progress, and latest placement results.
        </p>
      </footer>

      {/* Goal Settings Modal */}
      <StudyPlanSettingsModal
        currentMinutes={plan.dailyMinutes}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveGoal}
      />
    </div>
  );
};
