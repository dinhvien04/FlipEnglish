import React from 'react';
import { getOverallStats } from '../utils/storage';
import { LESSONS } from '../data/lessons';

interface HeaderProps {
  onNavigateHome: () => void;
  onNavigateFlipLens?: () => void;
  onNavigateExamCenter?: () => void;
  currentView: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  onNavigateFlipLens,
  onNavigateExamCenter,
  currentView,
}) => {
  const [stats, setStats] = React.useState(() => getOverallStats(LESSONS.length));

  React.useEffect(() => {
    const handleUpdate = () => {
      setStats(getOverallStats(LESSONS.length));
    };

    window.addEventListener('flipenglish_progress_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('flipenglish_progress_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo - Pure typography */}
        <button
          id="header-brand-logo"
          onClick={onNavigateHome}
          className="flex items-center text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1 transition-opacity hover:opacity-85"
          title="Return to Curriculum"
        >
          <span className="text-xl font-black tracking-tight text-slate-900">
            Flip<span className="text-indigo-600">English</span>
          </span>
        </button>

        {/* Navigation & Progress Indicator */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            id="header-nav-learning-path"
            onClick={onNavigateHome}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentView === 'home' || currentView === 'lesson-intro'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Curriculum
          </button>

          {onNavigateExamCenter && (
            <button
              id="header-nav-exam-center"
              onClick={onNavigateExamCenter}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentView.startsWith('exam-')
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Exams
            </button>
          )}

          {onNavigateFlipLens && (
            <button
              id="header-nav-fliplens"
              onClick={onNavigateFlipLens}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentView === 'flip-lens'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50'
              }`}
            >
              FlipLens
            </button>
          )}

          {/* Progress Indicator - Pure text */}
          <div
            id="header-progress-indicator"
            className="flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold"
            title={`${stats.completedCount} of ${stats.totalLessonsCount} lessons completed`}
          >
            <span>
              {stats.completedCount} / {stats.totalLessonsCount} Completed
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

