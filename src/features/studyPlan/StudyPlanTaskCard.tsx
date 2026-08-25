import React from 'react';
import { StudyPlanTask } from './studyPlanTypes';

interface StudyPlanTaskCardProps {
  task: StudyPlanTask;
  index: number;
  onStartTask: (task: StudyPlanTask) => void;
  onSkipTask: (taskId: string) => void;
}

export const StudyPlanTaskCard: React.FC<StudyPlanTaskCardProps> = ({
  task,
  index,
  onStartTask,
  onSkipTask,
}) => {
  const isCompleted = task.status === 'completed';
  const isSkipped = task.status === 'skipped';
  const isPending = task.status === 'pending';

  const typeLabels: Record<string, { label: string; bg: string; text: string; border: string }> = {
    review: { label: 'Smart Review', bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
    lesson: { label: 'Curriculum', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
    placement: { label: 'Level Check', bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200' },
    'quick-test': { label: 'Quick Test', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  };

  const badgeStyle = typeLabels[task.type] || typeLabels.lesson;

  // Determine CTA text based on task type
  let ctaText = 'Start Activity';
  if (task.type === 'review') {
    ctaText = 'Start Review';
  } else if (task.type === 'lesson') {
    ctaText = 'Start Lesson';
  } else if (task.type === 'placement') {
    ctaText = 'Find My Level';
  } else if (task.type === 'quick-test') {
    ctaText = 'Take Quick Test';
  }

  return (
    <article
      className={`rounded-3xl p-5 sm:p-7 border transition-all ${
        isCompleted
          ? 'bg-white border-emerald-200 shadow-xs'
          : isSkipped
          ? 'bg-slate-50/70 border-slate-200 opacity-75'
          : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
      }`}
      aria-label={`Task ${index + 1}: ${task.title}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left info column */}
        <div className="space-y-3 flex-1 min-w-0">
          {/* Header Row: Task Number + Type Badge + Time */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
              {index + 1}
            </span>

            <span
              className={`text-2xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
            >
              {badgeStyle.label}
            </span>

            {task.level && (
              <span className="text-2xs font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {task.level}
              </span>
            )}

            <span className="text-2xs font-bold text-slate-400 ml-auto sm:ml-0">
              About {task.estimatedMinutes} min
            </span>
          </div>

          {/* Title & Description */}
          <div className="space-y-1">
            <h3
              className={`text-base sm:text-lg font-bold tracking-tight leading-snug ${
                isCompleted ? 'text-slate-900' : isSkipped ? 'text-slate-500 line-through' : 'text-slate-900'
              }`}
            >
              {task.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {task.description}
            </p>
          </div>

          {/* Explanation / Reason */}
          <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 text-2xs text-slate-500 flex items-start gap-1.5">
            <span className="font-bold text-slate-400 shrink-0">Reason:</span>
            <span className="leading-normal">{task.reason}</span>
          </div>
        </div>

        {/* Right CTA / Status column */}
        <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {isCompleted && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Completed</span>
            </div>
          )}

          {isSkipped && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">
              <span>Skipped</span>
            </div>
          )}

          {isPending && (
            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStartTask(task)}
                className="flex-1 sm:flex-initial min-h-11 sm:min-h-12 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer inline-flex items-center justify-center text-center"
              >
                {ctaText}
              </button>

              <button
                type="button"
                onClick={() => onSkipTask(task.id)}
                title="Skip this task for today"
                className="min-h-11 px-3 py-2 rounded-xl text-2xs font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
              >
                Skip
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
