import React from 'react';
import { getOverallStats } from '../utils/storage';
import { getReviewDashboardStats, REVIEW_UPDATED_EVENT } from '../utils/reviewStorage';
import { LESSONS } from '../data/lessons';

interface HeaderProps {
  onNavigateHome: () => void;
  onNavigateReview?: () => void;
  onNavigateConversation?: () => void;
  onNavigateFlipLens?: () => void;
  onNavigateExamCenter?: () => void;
  currentView: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  onNavigateReview,
  onNavigateConversation,
  onNavigateFlipLens,
  onNavigateExamCenter,
  currentView,
}) => {
  const [stats, setStats] = React.useState(() => getOverallStats(LESSONS.length));
  const [reviewStats, setReviewStats] = React.useState(() => getReviewDashboardStats());

  React.useEffect(() => {
    const handleUpdate = () => {
      setStats(getOverallStats(LESSONS.length));
    };

    const handleReviewUpdate = () => {
      setReviewStats(getReviewDashboardStats());
    };

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'flipenglish_progress_v1') {
        setStats(getOverallStats(LESSONS.length));
      }
      if (!e.key || e.key === 'flipenglish_review_v1') {
        setReviewStats(getReviewDashboardStats());
      }
    };

    window.addEventListener('flipenglish_progress_updated', handleUpdate);
    window.addEventListener('storage', handleStorage);
    window.addEventListener(REVIEW_UPDATED_EVENT, handleReviewUpdate);

    return () => {
      window.removeEventListener('flipenglish_progress_updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(REVIEW_UPDATED_EVENT, handleReviewUpdate);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo - Pure typography */}
        <button
          id="header-brand-logo"
          onClick={onNavigateHome}
          className="flex items-center text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1 transition-opacity hover:opacity-85 cursor-pointer"
          title="Return to Curriculum"
        >
          <span className="text-xl font-black tracking-tight text-slate-900">
            Flip<span className="text-indigo-600">English</span>
          </span>
        </button>

        {/* Navigation & Progress Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-3">
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

          {onNavigateReview && (
            <button
              id="header-nav-review"
              onClick={onNavigateReview}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'review'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Review</span>
              {reviewStats.dueCount > 0 && (
                <span
                  className={`text-2xs font-extrabold px-1.5 py-0.2 rounded-full ${
                    currentView === 'review'
                      ? 'bg-white text-indigo-700'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {reviewStats.dueCount}
                </span>
              )}
            </button>
          )}

          {onNavigateConversation && (
            <button
              id="header-nav-conversation"
              onClick={onNavigateConversation}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentView.startsWith('conversation')
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Conversation
            </button>
          )}

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
                  ? 'bg-slate-900 text-white'
                  : 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50'
              }`}
            >
              FlipLens
            </button>
          )}

          {/* Progress Indicator - Pure text */}
          <div
            id="header-progress-indicator"
            className="hidden sm:flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold"
            title={`${stats.completedCount} of ${stats.totalLessonsCount} lessons completed`}
          >
            <span>
              {stats.completedCount}/{stats.totalLessonsCount} Completed
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};


