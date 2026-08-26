import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { AppView, Lesson, VocabWord, LessonProgress, CEFRLevel } from './types';
import { ExamMode, ExamResultReport, ExamSession } from './types/exam';
import { ConversationScenario, ConversationTurn, ConversationEvaluation } from './types/conversation';
import {
  PlacementSession,
  PlacementResultReport,
  PLACEMENT_STAGE_SIZE,
} from './features/placement/placementTypes';
import {
  loadActivePlacement,
  clearActivePlacement,
  getLatestPlacementResult,
  loadLatestPlacementReport,
} from './features/placement/placementStorage';
import { getLessonById } from './data/lessons';
import { getLessonProgress } from './utils/storage';
import { getActiveExam, clearActiveExam } from './utils/examStorage';
import { saveConversationSummary } from './utils/conversationStorage';
import { Header } from './components/Header';
import { ResumeExamModal } from './components/exam/ResumeExamModal';
import { Home } from './pages/Home';
import { LessonIntro } from './pages/LessonIntro';
import { Learn } from './pages/Learn';
import { Exercise } from './pages/Exercise';
import { Result } from './pages/Result';
import { TodayPage } from './features/studyPlan/TodayPage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import {
  shouldShowOnboarding,
  saveOnboardingState,
  migrateOnboardingStateForExistingUser,
} from './features/onboarding/onboardingStorage';
import { OnboardingRoute } from './features/onboarding/onboardingTypes';
import {
  DictionaryReturnContext,
  LearnResumeContext,
  ReviewResumeContext,
} from './types/sessionResume';
import { OfflineBanner } from './features/pwa/OfflineBanner';
import { PWAUpdatePrompt } from './features/pwa/PWAUpdatePrompt';
import { useI18n } from './features/i18n';

// Feature-level code splitting for heavy/secondary views
const FlipLens = lazy(() => import('./pages/FlipLens').then((m) => ({ default: m.FlipLens })));
const ExamCenter = lazy(() => import('./pages/ExamCenter').then((m) => ({ default: m.ExamCenter })));
const ExamIntro = lazy(() => import('./pages/ExamIntro').then((m) => ({ default: m.ExamIntro })));
const ExamSessionPage = lazy(() => import('./pages/ExamSession').then((m) => ({ default: m.ExamSessionPage })));
const ExamResultPage = lazy(() => import('./pages/ExamResult').then((m) => ({ default: m.ExamResultPage })));
const ExamHistoryPage = lazy(() => import('./pages/ExamHistory').then((m) => ({ default: m.ExamHistoryPage })));
const ReviewDashboard = lazy(() => import('./features/review/ReviewDashboard').then((m) => ({ default: m.ReviewDashboard })));
const ConversationHome = lazy(() => import('./features/conversation/ConversationHome').then((m) => ({ default: m.ConversationHome })));
const ConversationSetup = lazy(() => import('./features/conversation/ConversationSetup').then((m) => ({ default: m.ConversationSetup })));
const ConversationSession = lazy(() => import('./features/conversation/ConversationSession').then((m) => ({ default: m.ConversationSession })));
const ConversationResult = lazy(() => import('./features/conversation/ConversationResult').then((m) => ({ default: m.ConversationResult })));
const PlacementIntro = lazy(() => import('./features/placement/PlacementIntro').then((m) => ({ default: m.PlacementIntro })));
const PlacementSessionPage = lazy(() => import('./features/placement/PlacementSession').then((m) => ({ default: m.PlacementSessionPage })));
const PlacementResultPage = lazy(() => import('./features/placement/PlacementResult').then((m) => ({ default: m.PlacementResultPage })));
const DictionaryPage = lazy(() => import('./features/dictionary/DictionaryPage').then((m) => ({ default: m.DictionaryPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));

function LazyViewFallback() {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin motion-reduce:animate-none mb-4" />
      <p className="text-sm font-semibold text-slate-600">{t('ui.common.loading')}</p>
    </div>
  );
}

export default function App() {
  const { t } = useI18n();
  const [currentView, setCurrentView] = useState<AppView>(() => {
    return shouldShowOnboarding() ? 'onboarding' : 'today';
  });
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isReviewMistakesMode, setIsReviewMistakesMode] = useState<boolean>(false);
  const [mistakeWords, setMistakeWords] = useState<VocabWord[]>([]);
  const [quizResults, setQuizResults] = useState<{
    score: number;
    correctCount: number;
    incorrectCount: number;
    totalQuestions: number;
    mistakeWords: VocabWord[];
  } | null>(null);

  // Exam States
  const [examMode, setExamMode] = useState<ExamMode>('level');
  const [examLevel, setExamLevel] = useState<CEFRLevel>('B2');
  const [activeExamSession, setActiveExamSession] = useState<ExamSession | null>(null);
  const [examResultReport, setExamResultReport] = useState<ExamResultReport | null>(null);
  const [pendingResumeSession, setPendingResumeSession] = useState<ExamSession | null>(null);

  // Placement States
  const [activePlacementSession, setActivePlacementSession] = useState<PlacementSession | null>(null);
  const [placementResultReport, setPlacementResultReport] = useState<PlacementResultReport | null>(null);
  const [pendingResumePlacement, setPendingResumePlacement] = useState<PlacementSession | null>(null);
  const [placementStartError, setPlacementStartError] = useState<string | null>(null);
  const [isStartingPlacement, setIsStartingPlacement] = useState<boolean>(false);
  const placementStartInFlightRef = useRef<boolean>(false);

  // Exam Loading & In-flight Double-Tap Protection
  const [isStartingExam, setIsStartingExam] = useState<boolean>(false);
  const [examStartError, setExamStartError] = useState<string | null>(null);
  const examStartInFlightRef = useRef<boolean>(false);

  // Curriculum Filter State
  const [homeLevelFilter, setHomeLevelFilter] = useState<CEFRLevel | 'ALL'>('ALL');

  // Dictionary Initial Word State & Navigation Context
  const [dictionarySearchWord, setDictionarySearchWord] = useState<string>('');
  const [dictionaryReturnContext, setDictionaryReturnContext] = useState<DictionaryReturnContext | null>(null);

  // Resumed Session States
  const [resumedLearnContext, setResumedLearnContext] = useState<LearnResumeContext | null>(null);
  const [resumedReviewContext, setResumedReviewContext] = useState<ReviewResumeContext | null>(null);
  const [activeLearnContext, setActiveLearnContext] = useState<LearnResumeContext | null>(null);
  const [activeReviewContext, setActiveReviewContext] = useState<ReviewResumeContext | null>(null);

  // Conversation States
  const [selectedScenario, setSelectedScenario] = useState<ConversationScenario | null>(null);
  const [conversationLevel, setConversationLevel] = useState<CEFRLevel>('A1');
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [conversationEvaluation, setConversationEvaluation] = useState<ConversationEvaluation | null>(null);

  // Temporary Lesson State (for Exam AI Practice and dynamically constructed lessons)
  const [temporaryLesson, setTemporaryLesson] = useState<Lesson | null>(null);

  const selectedLesson: Lesson | null = temporaryLesson && temporaryLesson.id === selectedLessonId
    ? temporaryLesson
    : selectedLessonId
    ? getLessonById(selectedLessonId) || null
    : null;
  const currentLessonProgress: LessonProgress | null = selectedLessonId ? getLessonProgress(selectedLessonId) : null;

  // Check for active unfinished exam or placement on initial load + idempotent onboarding migration
  useEffect(() => {
    migrateOnboardingStateForExistingUser();

    const active = getActiveExam();
    if (active && active.status === 'active' && active.endsAt > Date.now()) {
      setPendingResumeSession(active);
    } else if (active && active.endsAt <= Date.now()) {
      clearActiveExam();
    }

    const activePlacement = loadActivePlacement();
    if (activePlacement && activePlacement.status === 'active') {
      setPendingResumePlacement(activePlacement);
    }
  }, []);

  // Scroll to top on view transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // Curriculum & Main Navigation Handlers
  const handleNavigateToday = () => {
    setSelectedLessonId(null);
    setTemporaryLesson(null);
    setIsReviewMistakesMode(false);
    setQuizResults(null);
    setResumedLearnContext(null);
    setResumedReviewContext(null);
    setCurrentView('today');
  };

  const handleNavigateDictionary = (
    searchWord?: string,
    returnContextOverride?: DictionaryReturnContext
  ) => {
    setDictionarySearchWord(searchWord || '');
    if (returnContextOverride) {
      setDictionaryReturnContext(returnContextOverride);
    } else if (currentView === 'learn' && activeLearnContext) {
      setDictionaryReturnContext({
        source: 'learn',
        view: 'learn',
        learnContext: activeLearnContext,
      });
    } else if (currentView === 'review' && activeReviewContext) {
      setDictionaryReturnContext({
        source: 'review',
        view: 'review',
        reviewContext: activeReviewContext,
      });
    } else if (currentView !== 'dictionary') {
      setDictionaryReturnContext({
        source: 'view',
        view: currentView,
      });
    }
    setCurrentView('dictionary');
  };

  const handleReturnFromDictionary = () => {
    if (dictionaryReturnContext) {
      if (dictionaryReturnContext.source === 'learn') {
        setResumedLearnContext(dictionaryReturnContext.learnContext);
        setSelectedLessonId(dictionaryReturnContext.learnContext.lessonId);
        setIsReviewMistakesMode(dictionaryReturnContext.learnContext.isReviewMistakesMode);
        setCurrentView('learn');
      } else if (dictionaryReturnContext.source === 'review') {
        setResumedReviewContext(dictionaryReturnContext.reviewContext);
        setCurrentView('review');
      } else {
        setResumedLearnContext(null);
        setResumedReviewContext(null);
        setCurrentView(dictionaryReturnContext.view);
      }
      setDictionaryReturnContext(null);
    } else {
      setResumedLearnContext(null);
      setResumedReviewContext(null);
      setCurrentView('home');
    }
  };

  const handleNavigateHome = () => {
    setHomeLevelFilter('ALL');
    setCurrentView('home');
    setSelectedLessonId(null);
    setTemporaryLesson(null);
    setIsReviewMistakesMode(false);
    setQuizResults(null);
    setResumedLearnContext(null);
    setResumedReviewContext(null);
  };

  const handleNavigateReview = () => {
    setSelectedLessonId(null);
    setTemporaryLesson(null);
    setIsReviewMistakesMode(false);
    setQuizResults(null);
    setResumedLearnContext(null);
    setResumedReviewContext(null);
    setCurrentView('review');
  };

  const handleNavigateConversation = () => {
    setSelectedLessonId(null);
    setTemporaryLesson(null);
    setIsReviewMistakesMode(false);
    setQuizResults(null);
    setCurrentView('conversation');
  };

  const handleOpenFlipLens = () => {
    setSelectedLessonId(null);
    setTemporaryLesson(null);
    setIsReviewMistakesMode(false);
    setCurrentView('flip-lens');
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setTemporaryLesson(null);
    setSelectedLessonId(lesson.id);
    setIsReviewMistakesMode(false);
    setResumedLearnContext(null);
    setCurrentView('lesson-intro');
  };

  const handleSelectLessonById = (lessonId: string) => {
    setTemporaryLesson(null);
    setSelectedLessonId(lessonId);
    setIsReviewMistakesMode(false);
    setResumedLearnContext(null);
    setCurrentView('lesson-intro');
  };

  const handleStartLearning = () => {
    setIsReviewMistakesMode(false);
    setResumedLearnContext(null);
    setCurrentView('learn');
  };

  const handleFinishFlashcards = () => {
    setResumedLearnContext(null);
    setCurrentView('exercise');
  };

  const handleFinishQuiz = (results: {
    score: number;
    correctCount: number;
    incorrectCount: number;
    mistakeWords: VocabWord[];
    totalQuestions: number;
  }) => {
    setResumedLearnContext(null);
    setQuizResults(results);
    setMistakeWords(results.mistakeWords);
    setCurrentView('result');
  };

  const handleReviewMistakes = () => {
    if (mistakeWords.length > 0) {
      setResumedLearnContext(null);
      setIsReviewMistakesMode(true);
      setCurrentView('learn');
    }
  };

  const handleTryAgain = () => {
    setResumedLearnContext(null);
    setIsReviewMistakesMode(false);
    setCurrentView('exercise');
  };

  const handleBackToIntro = () => {
    setResumedLearnContext(null);
    setIsReviewMistakesMode(false);
    setCurrentView('lesson-intro');
  };

  const handleLearnResumeConsumed = () => {
    setResumedLearnContext(null);
  };

  const handleReviewResumeConsumed = () => {
    setResumedReviewContext(null);
  };

  const handleNavigateHelp = () => {
    setSelectedLessonId(null);
    setTemporaryLesson(null);
    setIsReviewMistakesMode(false);
    setQuizResults(null);
    setCurrentView('help');
  };

  const handleOpenOnboarding = () => {
    setCurrentView('onboarding');
  };

  const handleCompleteOnboarding = (route: OnboardingRoute, level?: CEFRLevel) => {
    if (route === 'know' && level) {
      handleStartCurriculumAtLevel(level);
    } else if (route === 'unknown') {
      handleStartPlacementIntro();
    } else if (route === 'explore') {
      handleNavigateHome();
    } else {
      handleNavigateToday();
    }
  };

  const handleSkipOnboarding = () => {
    handleNavigateToday();
  };

  // Conversation Handlers
  const handleSelectScenario = (scenario: ConversationScenario) => {
    setSelectedScenario(scenario);
    setConversationLevel(scenario.supportedLevels[0] || 'A1');
    setCurrentView('conversation-setup');
  };

  const handleStartConversation = (scenario: ConversationScenario, level: CEFRLevel) => {
    setSelectedScenario(scenario);
    setConversationLevel(level);
    setConversationTurns([]);
    setConversationEvaluation(null);
    setCurrentView('conversation-session');
  };

  const handleFinishConversation = async (turns: ConversationTurn[], interactionId?: string) => {
    if (!selectedScenario) return;

    setConversationTurns(turns);

    const learnerTurns = turns.filter((t) => t.role === 'user');
    const turnsCount = learnerTurns.length;

    // If fewer than 2 learner turns, do not call evaluation
    if (turnsCount < 2) {
      const shortSessionEval: ConversationEvaluation = {
        evaluationStatus: 'unavailable',
        summary: `Completed ${turnsCount} conversation turn in "${selectedScenario.title}". Complete at least 2 turns for performance evaluation.`,
        reviewItems: selectedScenario.usefulExpressions.slice(0, 3).map((e) => ({
          expression: e.expression,
          meaning: e.meaning,
          reason: 'Key target phrase for this scenario',
        })),
      };

      setConversationEvaluation(shortSessionEval);
      saveConversationSummary({
        scenarioId: selectedScenario.id,
        scenarioTitle: selectedScenario.title,
        category: selectedScenario.category,
        level: conversationLevel,
        evaluationStatus: 'unavailable',
        turnsCount,
        summary: shortSessionEval.summary,
      });

      setCurrentView('conversation-result');
      return;
    }

    const transcriptSummary = turns
      .map((t) => `${t.role === 'user' ? 'Learner' : selectedScenario.aiRole}: ${t.text}`)
      .join('\n');

    try {
      const response = await fetch('/api/conversation/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          level: conversationLevel,
          turnsCount: turnsCount,
          previousInteractionId: interactionId || null,
          transcriptSummary,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate conversation');
      }

      const evalData: ConversationEvaluation = await response.json();
      evalData.evaluationStatus = 'success';
      setConversationEvaluation(evalData);

      // Save summary in storage
      saveConversationSummary({
        scenarioId: selectedScenario.id,
        scenarioTitle: selectedScenario.title,
        category: selectedScenario.category,
        level: conversationLevel,
        overallScore: evalData.overallScore,
        evaluationStatus: 'success',
        turnsCount: learnerTurns.length,
        summary: evalData.summary,
      });

      setCurrentView('conversation-result');
    } catch (err) {
      // Explicit unavailable state - NEVER fabricate numeric AI scores
      const unavailableEval: ConversationEvaluation = {
        evaluationStatus: 'unavailable',
        summary: `Conversation completed with ${turnsCount} learner turns in "${selectedScenario.title}". AI performance feedback is temporarily unavailable, but your speaking practice was recorded.`,
        reviewItems: selectedScenario.usefulExpressions.slice(0, 3).map((e) => ({
          expression: e.expression,
          meaning: e.meaning,
          reason: 'Key target phrase for this scenario',
        })),
      };

      setConversationEvaluation(unavailableEval);
      saveConversationSummary({
        scenarioId: selectedScenario.id,
        scenarioTitle: selectedScenario.title,
        category: selectedScenario.category,
        level: conversationLevel,
        evaluationStatus: 'unavailable',
        turnsCount: learnerTurns.length,
        summary: unavailableEval.summary,
      });

      setCurrentView('conversation-result');
    }
  };

  const handlePracticeConversationAgain = () => {
    if (selectedScenario) {
      setCurrentView('conversation-setup');
    } else {
      setCurrentView('conversation');
    }
  };

  // Exam Center Handlers
  const handleNavigateExamCenter = () => {
    setSelectedLessonId(null);
    setTemporaryLesson(null);
    setIsReviewMistakesMode(false);
    setCurrentView('exam-center');
  };

  // Placement Handlers
  const handleStartPlacementIntro = () => {
    setSelectedLessonId(null);
    setTemporaryLesson(null);
    setIsReviewMistakesMode(false);
    setPlacementStartError(null);
    setCurrentView('placement-intro');
  };

  const handleStartPlacementSession = async () => {
    if (placementStartInFlightRef.current) return;
    placementStartInFlightRef.current = true;
    setIsStartingPlacement(true);
    setPlacementStartError(null);

    try {
      const now = Date.now();
      let randSuffix = 0;
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        randSuffix = buf[0] & 0x7fffffff;
      } else {
        randSuffix = Math.floor(Math.abs(Math.sin(now)) * 1000000);
      }
      const seed = (now ^ randSuffix) >>> 0;

      // Dynamic import to keep initial bundle lean
      const { selectPlacementQuestionsForStage } = await import('./data/placement/placementPool');
      const initialStageQuestions = selectPlacementQuestionsForStage('B1', 0, seed);

      // Requirement 7: Initial Stage Guard (must have exactly 6 valid questions)
      if (initialStageQuestions.length !== PLACEMENT_STAGE_SIZE) {
        setPlacementStartError(t('placement.intro.errorQuestions'));
        setCurrentView('placement-intro');
        return;
      }

      const secureIdSuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().slice(0, 8)
        : `${now.toString(36)}`;

      const initialSession: PlacementSession = {
        schemaVersion: 1,
        id: `placement-${now}-${secureIdSuffix}`,
        status: 'active',
        sessionSeed: seed,
        startedAt: now,
        currentStageIndex: 0,
        currentQuestionInStageIndex: 0,
        currentLevel: 'B1',
        stages: [
          {
            stageIndex: 0,
            level: 'B1',
            questions: initialStageQuestions,
            isLocked: false,
          },
        ],
        stageResults: [],
        answers: {},
      };

      setActivePlacementSession(initialSession);
      setPendingResumePlacement(null);
      setCurrentView('placement-session');
    } catch (err) {
      setPlacementStartError(t('placement.intro.errorLoad'));
      setCurrentView('placement-intro');
    } finally {
      placementStartInFlightRef.current = false;
      setIsStartingPlacement(false);
    }
  };

  const handleFinishPlacementSession = (report: PlacementResultReport) => {
    setPlacementResultReport(report);
    setActivePlacementSession(null);
    setPendingResumePlacement(null);
    setCurrentView('placement-result');
  };

  const handleResumeActivePlacement = () => {
    if (pendingResumePlacement) {
      setActivePlacementSession(pendingResumePlacement);
      setPendingResumePlacement(null);
      setCurrentView('placement-session');
    }
  };

  const handleDiscardActivePlacement = () => {
    clearActivePlacement();
    setPendingResumePlacement(null);
  };

  const handleStartCurriculumAtLevel = (level: CEFRLevel) => {
    setHomeLevelFilter(level);
    setCurrentView('home');
  };

  const handleViewPlacementResult = () => {
    // 1. Use in-memory result report if present
    if (placementResultReport) {
      setCurrentView('placement-result');
      return;
    }

    // 2. Otherwise load validated saved report from localStorage
    const savedReport = loadLatestPlacementReport();
    if (savedReport) {
      setPlacementResultReport(savedReport);
      setCurrentView('placement-result');
      return;
    }

    // 3. Fallback: if only compact history exists without full report, navigate to intro summary
    const latest = getLatestPlacementResult();
    if (latest) {
      setCurrentView('placement-intro');
    }
  };

  const handleStartExamFlow = (mode: ExamMode, level: CEFRLevel) => {
    setExamMode(mode);
    setExamLevel(level);
    setExamStartError(null);
    setCurrentView('exam-intro');
  };

  const handleStartQuickTestFromPlan = async (level: CEFRLevel) => {
    if (examStartInFlightRef.current) return;
    examStartInFlightRef.current = true;
    setIsStartingExam(true);
    setExamStartError(null);
    setExamMode('quick');
    setExamLevel(level);

    try {
      const { generateExamSession } = await import('./data/exams/examGenerator');
      const session = generateExamSession('quick', level);
      setActiveExamSession(session);
      setCurrentView('exam-session');
    } catch (err) {
      setExamStartError(t('exam.errorLoad'));
      setCurrentView('exam-intro');
    } finally {
      examStartInFlightRef.current = false;
      setIsStartingExam(false);
    }
  };

  const handleStartExamSession = async () => {
    if (examStartInFlightRef.current) return;
    examStartInFlightRef.current = true;
    setIsStartingExam(true);
    setExamStartError(null);

    try {
      const { generateExamSession } = await import('./data/exams/examGenerator');
      const session = generateExamSession(examMode, examLevel);
      setActiveExamSession(session);
      setCurrentView('exam-session');
    } catch (err) {
      setExamStartError(t('exam.errorLoad'));
      setCurrentView('exam-intro');
    } finally {
      examStartInFlightRef.current = false;
      setIsStartingExam(false);
    }
  };

  const handleFinishExamSession = (report: ExamResultReport) => {
    setExamResultReport(report);
    setActiveExamSession(null);
    setCurrentView('exam-result');
  };

  const handleRetakeExam = () => {
    if (examResultReport) {
      handleStartExamFlow(examResultReport.mode, examResultReport.level);
    } else {
      handleStartExamFlow(examMode, examLevel);
    }
  };

  const handleViewResultReport = (report: ExamResultReport) => {
    setExamResultReport(report);
    setCurrentView('exam-result');
  };

  const handleViewAllHistory = () => {
    setCurrentView('exam-history');
  };

  const handleResumeActiveExam = () => {
    if (pendingResumeSession) {
      setActiveExamSession(pendingResumeSession);
      setPendingResumeSession(null);
      setCurrentView('exam-session');
    }
  };

  const handleDiscardActiveExam = () => {
    clearActiveExam();
    setPendingResumeSession(null);
  };

  // Start AI Practice on missed words from exam
  const handleStartAIPracticeFromExam = (words: VocabWord[]) => {
    if (words.length > 0) {
      const tempLesson: Lesson = {
        id: 'exam-review-practice',
        title: `Exam Practice — ${examLevel}`,
        levelTitle: `${examLevel} Practice Reinforcement`,
        description: 'Targeted reinforcement for questions and vocabulary missed during your exam.',
        level: examLevel,
        category: 'Vocabulary',
        imageUrl: words[0]?.imageUrl || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
        words: words,
      };
      setTemporaryLesson(tempLesson);
      setSelectedLessonId(tempLesson.id);
      setMistakeWords(words);
      setIsReviewMistakesMode(false);
      setCurrentView('learn');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Resume Pending Active Exam Modal */}
      {pendingResumeSession && currentView !== 'exam-session' && currentView !== 'placement-session' && (
        <ResumeExamModal
          session={pendingResumeSession}
          onResume={handleResumeActiveExam}
          onDiscard={handleDiscardActiveExam}
        />
      )}

      {/* Resume Pending Active Placement Modal */}
      {pendingResumePlacement && currentView !== 'placement-session' && currentView !== 'exam-session' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="space-y-2">
              <span className="text-2xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {t('studyPlan.resumeModal.placementBadge')}
              </span>
              <h3 className="text-xl font-black text-slate-900">
                {t('studyPlan.resumeModal.placementTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t('studyPlan.resumeModal.placementDesc', {
                  stage: pendingResumePlacement.currentStageIndex + 1,
                  question:
                    pendingResumePlacement.currentStageIndex * 6 +
                    pendingResumePlacement.currentQuestionInStageIndex +
                    1,
                })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                id="resume-placement-btn"
                onClick={handleResumeActivePlacement}
                className="flex-1 min-h-12 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer inline-flex items-center justify-center"
              >
                {t('studyPlan.resumeModal.placementResume')}
              </button>

              <button
                type="button"
                id="discard-placement-btn"
                onClick={handleDiscardActivePlacement}
                className="min-h-12 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                {t('studyPlan.resumeModal.placementStartOver')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Header */}
      {currentView !== 'exam-session' && currentView !== 'conversation-session' && currentView !== 'placement-session' && currentView !== 'onboarding' && (
        <>
          <OfflineBanner />
          <Header
            onNavigateToday={handleNavigateToday}
            onNavigateDictionary={() => handleNavigateDictionary()}
            onNavigateHome={handleNavigateHome}
            onNavigateReview={handleNavigateReview}
            onNavigateConversation={handleNavigateConversation}
            onNavigateFlipLens={handleOpenFlipLens}
            onNavigateExamCenter={handleNavigateExamCenter}
            onNavigateHelp={handleNavigateHelp}
            currentView={currentView}
          />
        </>
      )}

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        <Suspense fallback={<LazyViewFallback />}>
          {/* Onboarding View */}
          {currentView === 'onboarding' && (
            <OnboardingPage
              onComplete={handleCompleteOnboarding}
              onSkip={handleSkipOnboarding}
            />
          )}

          {/* Feature Guide / Help View */}
          {currentView === 'help' && (
            <HelpPage
              onNavigateToday={handleNavigateToday}
              onNavigateDictionary={() => handleNavigateDictionary()}
              onNavigateCurriculum={handleNavigateHome}
              onNavigateReview={handleNavigateReview}
              onNavigatePlacement={handleStartPlacementIntro}
              onNavigateConversation={handleNavigateConversation}
              onNavigateExams={handleNavigateExamCenter}
              onNavigateFlipLens={handleOpenFlipLens}
              onReopenOnboarding={handleOpenOnboarding}
            />
          )}

          {/* Today's Study Plan View */}
          {currentView === 'today' && (
            <TodayPage
              onSelectLesson={handleSelectLesson}
              onNavigateReview={handleNavigateReview}
              onNavigatePlacement={handleStartPlacementIntro}
              onNavigateQuickTest={handleStartQuickTestFromPlan}
              onNavigateCurriculum={handleNavigateHome}
              onNavigateConversation={handleNavigateConversation}
              onNavigateFlipLens={handleOpenFlipLens}
              isStartingQuickTest={isStartingExam}
            />
          )}

          {/* Dictionary & Personal Wordbook View */}
          {currentView === 'dictionary' && (
            <DictionaryPage
              initialWord={dictionarySearchWord}
              returnContext={dictionaryReturnContext}
              onReturn={handleReturnFromDictionary}
              onNavigateLesson={handleSelectLessonById}
              onNavigateReview={handleNavigateReview}
            />
          )}

          {/* Curriculum Views */}
          {currentView === 'home' && (
            <Home
              onSelectLesson={handleSelectLesson}
              onOpenFlipLens={handleOpenFlipLens}
              onOpenExamCenter={handleNavigateExamCenter}
              onNavigateReview={handleNavigateReview}
              onNavigateToday={handleNavigateToday}
              onStartPlacement={handleStartPlacementIntro}
              onViewPlacementResult={handleViewPlacementResult}
              initialLevelTab={homeLevelFilter || 'ALL'}
            />
          )}

          {/* Placement Test Views */}
          {currentView === 'placement-intro' && (
            <PlacementIntro
              onStartPlacement={handleStartPlacementSession}
              onBack={handleNavigateHome}
              latestHistoryItem={getLatestPlacementResult()}
              onViewPreviousResult={handleViewPlacementResult}
              startError={placementStartError}
              isStartingPlacement={isStartingPlacement}
            />
          )}

          {currentView === 'placement-session' && activePlacementSession && (
            <PlacementSessionPage
              key={activePlacementSession.id}
              initialSession={activePlacementSession}
              onFinishPlacement={handleFinishPlacementSession}
              onExitPlacement={handleNavigateHome}
              onRestartPlacement={handleStartPlacementSession}
            />
          )}

          {currentView === 'placement-result' && placementResultReport && (
            <PlacementResultPage
              report={placementResultReport}
              onRetake={handleStartPlacementIntro}
              onStartCurriculum={handleStartCurriculumAtLevel}
              onSelectLesson={handleSelectLesson}
              onNavigateReview={handleNavigateReview}
            />
          )}

          {/* Smart Review (Spaced Repetition) View */}
          {currentView === 'review' && (
            <ReviewDashboard
              onNavigateToHome={handleNavigateHome}
              resumeContext={resumedReviewContext}
              onResumeConsumed={handleReviewResumeConsumed}
              onSessionContextChange={setActiveReviewContext}
              onLookupWord={(word, reviewContext) =>
                handleNavigateDictionary(word, {
                  source: 'review',
                  view: 'review',
                  reviewContext,
                })
              }
            />
          )}

          {/* AI Conversation Lab Views */}
          {currentView === 'conversation' && (
            <ConversationHome
              onSelectScenario={handleSelectScenario}
              onBackToHome={handleNavigateHome}
            />
          )}

          {currentView === 'conversation-setup' && selectedScenario && (
            <ConversationSetup
              scenario={selectedScenario}
              onStartSession={handleStartConversation}
              onBack={handleNavigateConversation}
            />
          )}

          {currentView === 'conversation-session' && selectedScenario && (
            <ConversationSession
              scenario={selectedScenario}
              level={conversationLevel}
              onFinishConversation={handleFinishConversation}
              onExitSession={handleNavigateConversation}
            />
          )}

          {currentView === 'conversation-result' && selectedScenario && conversationEvaluation && (
            <ConversationResult
              scenario={selectedScenario}
              level={conversationLevel}
              evaluation={conversationEvaluation}
              turns={conversationTurns}
              onPracticeAgain={handlePracticeConversationAgain}
              onBackToLab={handleNavigateConversation}
              onNavigateReview={handleNavigateReview}
            />
          )}

          {currentView === 'flip-lens' && (
            <FlipLens onBackToHome={handleNavigateHome} />
          )}

          {currentView === 'lesson-intro' && selectedLesson && (
            <LessonIntro
              lesson={selectedLesson}
              progress={currentLessonProgress}
              onStartLearning={handleStartLearning}
              onBackToHome={handleNavigateHome}
            />
          )}

          {currentView === 'learn' && selectedLesson && (
            <Learn
              lesson={selectedLesson}
              wordsToLearn={isReviewMistakesMode ? mistakeWords : selectedLesson.words}
              isReviewMistakesMode={isReviewMistakesMode}
              resumeState={resumedLearnContext}
              onResumeConsumed={handleLearnResumeConsumed}
              onFinishFlashcards={handleFinishFlashcards}
              onBackToIntro={handleBackToIntro}
              onSessionContextChange={setActiveLearnContext}
              onLookupWord={(word, learnContext) =>
                handleNavigateDictionary(word, {
                  source: 'learn',
                  view: 'learn',
                  learnContext,
                })
              }
            />
          )}

          {currentView === 'exercise' && selectedLesson && (
            <Exercise
              lesson={selectedLesson}
              onFinishQuiz={handleFinishQuiz}
              onExitQuiz={handleBackToIntro}
            />
          )}

          {currentView === 'result' && selectedLesson && quizResults && (
            <Result
              lesson={selectedLesson}
              score={quizResults.score}
              correctCount={quizResults.correctCount}
              incorrectCount={quizResults.incorrectCount}
              totalQuestions={quizResults.totalQuestions}
              mistakeWords={quizResults.mistakeWords}
              onReviewMistakes={handleReviewMistakes}
              onTryAgain={handleTryAgain}
              onBackToHome={handleNavigateHome}
            />
          )}

          {/* Practice Exam Views */}
          {currentView === 'exam-center' && (
            <ExamCenter
              onStartExamFlow={handleStartExamFlow}
              onViewResultReport={handleViewResultReport}
              onViewAllHistory={handleViewAllHistory}
              onStartPlacement={handleStartPlacementIntro}
            />
          )}

          {currentView === 'exam-intro' && (
            <ExamIntro
              mode={examMode}
              level={examLevel}
              onStartExam={handleStartExamSession}
              onBackToExamCenter={handleNavigateExamCenter}
              isStartingExam={isStartingExam}
              startError={examStartError}
            />
          )}

          {currentView === 'exam-session' && activeExamSession && (
            <ExamSessionPage
              initialSession={activeExamSession}
              onFinishExam={handleFinishExamSession}
            />
          )}

          {currentView === 'exam-result' && examResultReport && (
            <ExamResultPage
              report={examResultReport}
              onRetakeExam={handleRetakeExam}
              onReturnToExamCenter={handleNavigateExamCenter}
              onSelectLesson={handleSelectLesson}
              onStartAIPractice={handleStartAIPracticeFromExam}
            />
          )}

          {currentView === 'exam-history' && (
            <ExamHistoryPage
              onViewReport={handleViewResultReport}
              onBackToExamCenter={handleNavigateExamCenter}
            />
          )}
        </Suspense>
      </main>

      {/* Clean minimal footer */}
      {currentView !== 'exam-session' && currentView !== 'conversation-session' && (
        <footer className="w-full border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-semibold text-slate-700">
              FlipEnglish — Master English vocabulary one flip card at a time.
            </p>
            <p className="text-slate-400">
              72 Structured Lessons • CEFR A1—C2 • Practice Exams & AI Diagnostics
            </p>
          </div>
        </footer>
      )}

      {/* PWA Update & Offline Notification Prompt */}
      <PWAUpdatePrompt />
    </div>
  );
}

