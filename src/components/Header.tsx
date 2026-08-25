import React, { useState, useEffect, useRef } from 'react';
import { getOverallStats } from '../utils/storage';
import { getReviewDashboardStats, REVIEW_UPDATED_EVENT } from '../utils/reviewStorage';
import { LESSONS } from '../data/lessons';
import { useI18n, UiLanguageMode, LanguageChoiceGroup } from '../features/i18n';

interface HeaderProps {
  onNavigateToday?: () => void;
  onNavigateDictionary?: () => void;
  onNavigateHome: () => void;
  onNavigateReview?: () => void;
  onNavigateConversation?: () => void;
  onNavigateFlipLens?: () => void;
  onNavigateExamCenter?: () => void;
  onNavigateHelp?: () => void;
  currentView: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateToday,
  onNavigateDictionary,
  onNavigateHome,
  onNavigateReview,
  onNavigateConversation,
  onNavigateFlipLens,
  onNavigateExamCenter,
  onNavigateHelp,
  currentView,
}) => {
  const { mode, setMode, t, isBilingual } = useI18n();
  const [stats, setStats] = useState(() => getOverallStats(LESSONS.length));
  const [reviewStats, setReviewStats] = useState(() => getReviewDashboardStats());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);
  const langButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
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

  // Close mobile & lang menu on view change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsLangMenuOpen(false);
  }, [currentView]);

  // Focus management when menu opens/closes
  useEffect(() => {
    if (isMobileMenuOpen) {
      firstMenuItemRef.current?.focus();
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLangMenuOpen) {
          setIsLangMenuOpen(false);
          langButtonRef.current?.focus();
        } else if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, isLangMenuOpen]);

  const handleNavClick = (callback?: () => void) => {
    setIsMobileMenuOpen(false);
    setIsLangMenuOpen(false);
    if (callback) callback();
    menuButtonRef.current?.focus();
  };

  const handleLanguageSelect = (newMode: UiLanguageMode) => {
    setMode(newMode, true);
    setIsLangMenuOpen(false);
    langButtonRef.current?.focus();
  };

  const getLanguageButtonLabel = () => {
    if (mode === 'vi') return 'Tiếng Việt';
    if (mode === 'bilingual') return 'Song ngữ';
    return 'English';
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo - Pure typography */}
        <button
          id="header-brand-logo"
          onClick={() => handleNavClick(onNavigateHome)}
          className="flex items-center text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1 transition-opacity hover:opacity-85 cursor-pointer"
          title={t('accessibility.returnToCurriculum')}
          aria-label={t('accessibility.returnToCurriculum')}
        >
          <span className="text-xl font-black tracking-tight text-slate-900">
            Flip<span className="text-indigo-600">English</span>
          </span>
        </button>

        {/* Desktop Navigation (xl and up: >= 1280px) */}
        <nav className="hidden xl:flex items-center gap-1.5 xl:gap-2" aria-label={t('accessibility.mainNavigation')}>
          {onNavigateToday && (
            <button
              id="header-nav-today"
              onClick={onNavigateToday}
              className={`min-h-11 px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                currentView === 'today'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t('ui.nav.today')}
            </button>
          )}

          {onNavigateDictionary && (
            <button
              id="header-nav-dictionary"
              onClick={onNavigateDictionary}
              className={`min-h-11 px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                currentView === 'dictionary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t('ui.nav.dictionary')}
            </button>
          )}

          <button
            id="header-nav-learning-path"
            onClick={onNavigateHome}
            className={`min-h-11 px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all cursor-pointer ${
              currentView === 'home' || currentView === 'lesson-intro'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {t('ui.nav.curriculum')}
          </button>

          {onNavigateReview && (
            <button
              id="header-nav-review"
              onClick={onNavigateReview}
              className={`min-h-11 px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'review'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{t('ui.nav.review')}</span>
              {reviewStats.dueCount > 0 && (
                <span
                  className={`text-2xs font-extrabold px-1.5 py-0.5 rounded-full ${
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
              className={`min-h-11 px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                currentView.startsWith('conversation')
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t('ui.nav.conversation')}
            </button>
          )}

          {onNavigateExamCenter && (
            <button
              id="header-nav-exam-center"
              onClick={onNavigateExamCenter}
              className={`min-h-11 px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                currentView.startsWith('exam-')
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t('ui.nav.exams')}
            </button>
          )}

          {onNavigateFlipLens && (
            <button
              id="header-nav-fliplens"
              onClick={onNavigateFlipLens}
              className={`min-h-11 px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                currentView === 'flip-lens'
                  ? 'bg-slate-900 text-white'
                  : 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50'
              }`}
            >
              {t('ui.nav.fliplens')}
            </button>
          )}

          {onNavigateHelp && (
            <button
              id="header-nav-help"
              onClick={onNavigateHelp}
              className={`min-h-11 px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                currentView === 'help'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t('ui.nav.help')}
            </button>
          )}

          {/* Desktop Language Selector Popover */}
          <div className="relative">
            <button
              ref={langButtonRef}
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="min-h-11 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-expanded={isLangMenuOpen}
              aria-controls="header-language-panel"
              aria-label={t('ui.language.title')}
            >
              <span className="uppercase text-2xs tracking-wider text-slate-500">
                {t('ui.language.badge')}:
              </span>
              <span>{getLanguageButtonLabel()}</span>
            </button>

            {isLangMenuOpen && (
              <div
                id="header-language-panel"
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 p-2 z-50 animate-fade-in"
              >
                <LanguageChoiceGroup
                  mode={mode}
                  name="flipenglish-ui-language-desktop"
                  autoFocusSelected={true}
                  onChange={(newMode) => handleLanguageSelect(newMode)}
                />
              </div>
            )}
          </div>

          {/* Progress Indicator - Pure text */}
          <div
            id="header-progress-indicator"
            className="flex items-center min-h-11 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs xl:text-sm font-bold ml-1"
            title={t('accessibility.progressCompleted', { completed: stats.completedCount, total: stats.totalLessonsCount })}
            aria-label={t('accessibility.progressCompleted', { completed: stats.completedCount, total: stats.totalLessonsCount })}
          >
            <span>
              {stats.completedCount}/{stats.totalLessonsCount}
            </span>
          </div>
        </nav>

        {/* Compact Navigation Controls for Phone & Tablet (< xl) */}
        <div className="flex xl:hidden items-center gap-2">
          <div
            className="flex items-center px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold shrink-0"
            title={t('accessibility.progressCompleted', { completed: stats.completedCount, total: stats.totalLessonsCount })}
            aria-label={t('accessibility.progressCompleted', { completed: stats.completedCount, total: stats.totalLessonsCount })}
          >
            {stats.completedCount}/{stats.totalLessonsCount}
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="min-h-11 min-w-16 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={isMobileMenuOpen ? t('ui.nav.close') : t('ui.nav.menu')}
          >
            {isMobileMenuOpen ? t('ui.nav.close') : t('ui.nav.menu')}
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Text-Only Navigation Drawer / Panel */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          className="xl:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
          onClick={() => {
            setIsMobileMenuOpen(false);
            menuButtonRef.current?.focus();
          }}
        >
          <div
            className="bg-white border-b border-slate-200 p-4 sm:p-6 shadow-xl space-y-3 max-h-[calc(100dvh-64px)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={t('accessibility.siteNavigation')}
          >
            {/* Language Switcher in Mobile Menu */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <LanguageChoiceGroup
                mode={mode}
                name="flipenglish-ui-language-mobile"
                onChange={(newMode) => setMode(newMode, true)}
                legendHidden={false}
                className="grid grid-cols-3 gap-2"
                itemClassName={(checked) =>
                  `min-h-11 px-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-center border ${
                    checked
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`
                }
              />
            </div>

            <div className="text-2xs font-bold uppercase tracking-wider text-slate-400 px-2 pt-1">
              {t('ui.nav.menu')}
            </div>

            {onNavigateToday && (
              <button
                ref={firstMenuItemRef}
                type="button"
                onClick={() => handleNavClick(onNavigateToday)}
                className={`w-full min-h-12 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  currentView === 'today'
                    ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="min-w-0 truncate">{t('ui.nav.today')}</span>
                <span className={`text-xs shrink-0 ${currentView === 'today' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {t('ui.nav.todayDesc')}
                </span>
              </button>
            )}

            {onNavigateDictionary && (
              <button
                type="button"
                onClick={() => handleNavClick(onNavigateDictionary)}
                className={`w-full min-h-12 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  currentView === 'dictionary'
                    ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="min-w-0 truncate">{t('ui.nav.dictionary')}</span>
                <span className={`text-xs shrink-0 ${currentView === 'dictionary' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {t('ui.nav.dictionaryDesc')}
                </span>
              </button>
            )}

            <button
              ref={!onNavigateToday && !onNavigateDictionary ? firstMenuItemRef : undefined}
              type="button"
              onClick={() => handleNavClick(onNavigateHome)}
              className={`w-full min-h-12 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                currentView === 'home' || currentView === 'lesson-intro'
                  ? 'bg-slate-100 text-slate-900 font-extrabold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="min-w-0 truncate">{t('ui.nav.curriculum')}</span>
              <span className="text-xs text-slate-400 shrink-0">{t('ui.nav.curriculumDesc')}</span>
            </button>

            {onNavigateReview && (
              <button
                type="button"
                onClick={() => handleNavClick(onNavigateReview)}
                className={`w-full min-h-12 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  currentView === 'review'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="min-w-0 truncate">{t('ui.nav.review')}</span>
                {reviewStats.dueCount > 0 ? (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      currentView === 'review'
                        ? 'bg-white text-indigo-700'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {reviewStats.dueCount}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 shrink-0">{t('ui.nav.reviewDesc')}</span>
                )}
              </button>
            )}

            {onNavigateConversation && (
              <button
                type="button"
                onClick={() => handleNavClick(onNavigateConversation)}
                className={`w-full min-h-12 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  currentView.startsWith('conversation')
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="min-w-0 truncate">{t('ui.nav.conversation')}</span>
                <span className="text-xs text-indigo-600 font-semibold shrink-0">
                  {t('ui.nav.conversationDesc')}
                </span>
              </button>
            )}

            {onNavigateExamCenter && (
              <button
                type="button"
                onClick={() => handleNavClick(onNavigateExamCenter)}
                className={`w-full min-h-12 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  currentView.startsWith('exam-')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="min-w-0 truncate">{t('ui.nav.exams')}</span>
                <span className="text-xs text-slate-400 shrink-0">{t('ui.nav.examsDesc')}</span>
              </button>
            )}

            {onNavigateFlipLens && (
              <button
                type="button"
                onClick={() => handleNavClick(onNavigateFlipLens)}
                className={`w-full min-h-12 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  currentView === 'flip-lens'
                    ? 'bg-slate-900 text-white'
                    : 'text-indigo-600 hover:bg-indigo-50/50'
                }`}
              >
                <span className="min-w-0 truncate">{t('ui.nav.fliplens')}</span>
                <span className="text-xs text-indigo-500 font-semibold shrink-0">
                  {t('ui.nav.fliplensDesc')}
                </span>
              </button>
            )}

            {onNavigateHelp && (
              <button
                type="button"
                onClick={() => handleNavClick(onNavigateHelp)}
                className={`w-full min-h-12 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  currentView === 'help'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="min-w-0 truncate">{t('ui.nav.help')}</span>
                <span className="text-xs text-slate-400 shrink-0">{t('ui.nav.helpDesc')}</span>
              </button>
            )}

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-2 text-xs text-slate-500">
              <span>{t('home.stats.overallProgress')}:</span>
              <span className="font-bold text-slate-800">
                {t('ui.nav.progress', {
                  completed: stats.completedCount,
                  total: stats.totalLessonsCount,
                  percent: Math.round((stats.completedCount / stats.totalLessonsCount) * 100),
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
