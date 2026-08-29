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
import { ErrorBoundary } from './components/ErrorBoundary';
import { StorageWarningBanner } from './components/StorageWarningBanner';
import { ResumeExamModal } from './components/exam/ResumeExamModal';
import { ResumePlacementModal } from './components/placement/ResumePlacementModal';
import { Home } from './pages/Home';
import { LessonIntro } from './pages/LessonIntro';
import { Learn } from './pages/Learn';
import { Exercise } from './pages/Exercise';
import { Result } from './pages/Result';
import { TodayPage } from './features/studyPlan/TodayPage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import {
  shouldShowOnboarding,
  migrateOnboardingStateForExistingUser,
} from './features/onboarding/onboardingStorage';
import { OnboardingRoute } from './features/onboarding/onboardingTypes';
import {
  DictionaryReturnContext,
  LearnResumeContext,
  ReviewResumeContext,
} from './types/sessionResume';
import { NextActionRecommendation } from './types/continuity';
import {
  saveActiveLearnSession,
  clearActiveLearnSession,
  saveActiveReviewSession,
  clearActiveReviewSession,
  getActiveLearnSession,
  getActiveReviewSession,
} from './features/continuity/sessionPersistence';
import { recordMeaningfulLearningEvent } from './features/streak/streakEngine';
import { recordActiveStudySeconds, recordUserInteraction } from './features/progress/activeTimeEngine';
import { DATA_MANAGEMENT_EVENTS } from './constants/storageKeys';
import { DataResetScope } from './features/settings/dataManagement';
import { OfflineBanner } from './features/pwa/OfflineBanner';
import { PWAUpdatePrompt } from './features/pwa/PWAUpdatePrompt';
import { useI18n } from './features/i18n';
import { useAiStatus } from './features/ai/useAiStatus';

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
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
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
  const { aiEnabled, isLoading: isAiStatusLoading } = useAiStatus();
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
  const [examPersistenceState, setExamPersistenceState] = useState<{
    resultSaved: boolean;
    activeSessionCleared: boolean;
  } | null>(null);
  const [pendingResumeSession, setPendingResumeSession] = useState<ExamSession | null>(null);

  // Placement States
  const [activePlacementSession, setActivePlacementSession] = useState<PlacementSession | null>(null);
  const [placementResultReport, setPlacementResultReport] = useState<PlacementResultReport | null>(null);
  const [placementPersistenceState, setPlacementPersistenceState] = useState<{
    latestSaved: boolean;
    historySaved: boolean;
    success: boolean;
  } | null>(null);
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

    // Listen for data resets to purge in-memory transient sessions immediately with scope awareness
    const handleDataReset = (event: Event) => {
      const customEvent = event as CustomEvent<{ scope?: DataResetScope }>;
      const scope = customEvent.detail?.scope;

      if (scope === 'vocabulary') {
        setDictionarySearchWord('');
        setDictionaryReturnContext(null);
        return;
      }

      if (scope === 'learning' || scope === 'all' || !scope) {
        setPendingResumeSession(null);
        setPendingResumePlacement(null);
        setActiveExamSession(null);
        setActivePlacementSession(null);
        setQuizResults(null);
        setMistakeWords([]);
        setIsReviewMistakesMode(false);
        setResumedLearnContext(null);
        setResumedReviewContext(null);
        setActiveLearnContext(null);
        setActiveReviewContext(null);
        setSelectedLessonId(null);
        setTemporaryLesson(null);
        setExamResultReport(null);
        setExamPersistenceState(null);
        setPlacementResultReport(null);
        setSelectedScenario(null);
        setConversationTurns([]);
        setConversationEvaluation(null);
      }

      if (scope === 'all') {
        setDictionarySearchWord('');
        setDictionaryReturnContext(null);
        setHomeLevelFilter('ALL');
        setCurrentView('onboarding');
      }
    };

    window.addEventListener(DATA_MANAGEMENT_EVENTS.USER_DATA_RESET, handleDataReset);
    return () => {
      window.removeEventListener(DATA_MANAGEMENT_EVENTS.USER_DATA_RESET, handleDataReset);
    };
  }, []);

  // Guard against navigating into AI views when AI features are disabled/unavailable
  useEffect(() => {
    if (!isAiStatusLoading && !aiEnabled && (currentView === 'flip-lens' || currentView.startsWith('conversation'))) {
      setCurrentView('today');
    }
  }, [aiEnabled, isAiStatusLoading, currentView]);

  // User Interaction Tracking for Active Study Time Gating
  useEffect(() => {
    const handleActivity = () => {
      recordUserInteraction();
    };

    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

  // Active Study Time Heartbeat (accumulates active seconds when learning or practicing)
  useEffect(() => {
    const ACTIVE_STUDY_VIEWS: AppView[] = [
      'learn',
      'exercise',
      'review',
      'exam-session',
      'placement-session',
      'conversation-session',
      'flip-lens',
    ];

    if (!ACTIVE_STUDY_VIEWS.includes(currentView)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      recordActiveStudySeconds(5);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
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
    recordMeaningfulLearningEvent({
      type: 'lesson_flashcards_completed',
      timestamp: Date.now(),
      metadata: {
        lessonId: selectedLessonId || undefined,
      },
    });
    clearActiveLearnSession();
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
    recordMeaningfulLearningEvent({
      type: 'quiz_completed',
      timestamp: Date.now(),
      metadata: {
        lessonId: selectedLessonId || undefined,
        score: results.score,
        itemsCount: results.totalQuestions,
      },
    });
    clearActiveLearnSession();
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

  const handleNavigateSettings = () => {
    setSelectedLessonId(null);
    setTemporaryLesson(null);
    setIsReviewMistakesMode(false);
    setQuizResults(null);
    setCurrentView('settings');
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

  const handleFinishPlacementSession = (
    report: PlacementResultReport,
    persistenceResult?: { latestSaved: boolean; historySaved: boolean; success: boolean }
  ) => {
    setPlacementResultReport(report);
    if (persistenceResult) {
      setPlacementPersistenceState(persistenceResult);
    } else {
      setPlacementPersistenceState(null);
    }
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

  const handleDismissActivePlacement = () => {
    setPendingResumePlacement(null);
  };

  const handleDiscardActivePlacement = (): boolean => {
    const cleared = clearActivePlacement();
    if (cleared) {
      setPendingResumePlacement(null);
      return true;
    }
    return false;
  };

  const handleStartCurriculumAtLevel = (level: CEFRLevel) => {
    setHomeLevelFilter(level);
    setCurrentView('home');
  };

  const handleViewPlacementResult = () => {
    // Reset any transient failure state from previous attempts when viewing saved report
    setPlacementPersistenceState(null);

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

  const handleFinishExamSession = (
    report: ExamResultReport,
    persistenceStatus?: { resultSaved: boolean; activeSessionCleared: boolean }
  ) => {
    setExamResultReport(report);
    if (persistenceStatus) {
      setExamPersistenceState(persistenceStatus);
    } else {
      setExamPersistenceState(null);
    }
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
    setExamPersistenceState(null);
    setCurrentView('exam-result');
  };

  const handleViewAllHistory = () => {
    setCurrentView('exam-history');
  };

  const handleResumeActiveExam = () => {
    if (pendingResumeSession) {
      if (pendingResumeSession.endsAt <= Date.now()) {
        // Exam has already expired at action time
        clearActiveExam();
        setPendingResumeSession(null);
        handleNavigateExamCenter();
        return;
      }
      setActiveExamSession(pendingResumeSession);
      setPendingResumeSession(null);
      setCurrentView('exam-session');
    }
  };

  const handleDismissActiveExam = () => {
    setPendingResumeSession(null);
  };

  const handleDiscardActiveExam = (): boolean => {
    const cleared = clearActiveExam();
    if (cleared) {
      setPendingResumeSession(null);
      return true;
    }
    return false;
  };

  // Start AI Practice on missed words from exam
  const handleStartAIPracticeFromExam = (words: VocabWord[], level?: CEFRLevel) => {
    if (words.length > 0) {
      const targetLevel = level || examLevel;
      const tempLesson: Lesson = {
        id: 'exam-review-practice',
        title: `Exam Practice — ${targetLevel}`,
        levelTitle: `${targetLevel} Practice Reinforcement`,
        description: 'Targeted reinforcement for questions and vocabulary missed during your exam.',
        level: targetLevel,
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

  // Continuity Action Handler: routes directly to target view and restores appropriate session context
  const handleNavigateContinueAction = (recommendation: NextActionRecommendation) => {
    switch (recommendation.priority) {
      case 'active-exam': {
        const active = getActiveExam();
        if (active && active.status === 'active' && active.endsAt > Date.now()) {
          setActiveExamSession(active);
          setPendingResumeSession(null);
          setCurrentView('exam-session');
        } else {
          handleNavigateExamCenter();
        }
        break;
      }
      case 'active-placement': {
        const activePlacement = loadActivePlacement();
        if (activePlacement && activePlacement.status === 'active') {
          setActivePlacementSession(activePlacement);
          setPendingResumePlacement(null);
          setCurrentView('placement-session');
        } else {
          handleStartPlacementIntro();
        }
        break;
      }
      case 'active-learn': {
        const savedSession = getActiveLearnSession();
        if (savedSession && savedSession.lessonId) {
          const lesson = getLessonById(savedSession.lessonId);
          if (lesson) {
            setSelectedLessonId(lesson.id);
            setTemporaryLesson(null);
            setIsReviewMistakesMode(savedSession.isReviewMistakesMode);
            setResumedLearnContext(savedSession);
            setCurrentView('learn');
            break;
          }
        }

        if (recommendation.actionPayload?.lessonId) {
          const lesson = getLessonById(recommendation.actionPayload.lessonId);
          if (lesson) {
            setSelectedLessonId(lesson.id);
            setTemporaryLesson(null);
            setIsReviewMistakesMode(false);
            setResumedLearnContext(null);
            setCurrentView('learn');
          } else {
            handleNavigateToday();
          }
        } else {
          handleNavigateToday();
        }
        break;
      }
      case 'active-review': {
        const savedSession = getActiveReviewSession();
        if (savedSession && savedSession.activeQueue && savedSession.activeQueue.length > 0) {
          setSelectedLessonId(null);
          setTemporaryLesson(null);
          setIsReviewMistakesMode(false);
          setQuizResults(null);
          setResumedLearnContext(null);
          setResumedReviewContext(savedSession);
          setCurrentView('review');
          break;
        }
        handleNavigateReview();
        break;
      }
      case 'due-review': {
        handleNavigateReview();
        break;
      }
      case 'study-plan-task': {
        if (recommendation.targetView === 'review') {
          handleNavigateReview();
        } else if (recommendation.targetView === 'placement-intro' || recommendation.targetView === 'placement-session') {
          handleStartPlacementIntro();
        } else if (recommendation.targetView === 'exam-intro' && recommendation.actionPayload?.level) {
          handleStartQuickTestFromPlan(recommendation.actionPayload.level);
        } else if (recommendation.actionPayload?.lessonId) {
          const lesson = getLessonById(recommendation.actionPayload.lessonId);
          if (lesson) {
            handleSelectLesson(lesson);
          } else {
            handleNavigateHome();
          }
        } else {
          handleNavigateToday();
        }
        break;
      }
      case 'next-curriculum-lesson':
      default: {
        if (recommendation.actionPayload?.lessonId) {
          const lesson = getLessonById(recommendation.actionPayload.lessonId);
          if (lesson) {
            handleSelectLesson(lesson);
          } else {
            handleNavigateHome();
          }
        } else {
          handleNavigateHome();
        }
        break;
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Resume Pending Active Exam Modal */}
      {pendingResumeSession && currentView !== 'exam-session' && currentView !== 'placement-session' && (
        <ResumeExamModal
          session={pendingResumeSession}
          onResume={handleResumeActiveExam}
          onDismiss={handleDismissActiveExam}
          onDiscard={handleDiscardActiveExam}
        />
      )}

      {/* Resume Pending Active Placement Modal */}
      {pendingResumePlacement && currentView !== 'placement-session' && currentView !== 'exam-session' && (
        <ResumePlacementModal
          session={pendingResumePlacement}
          onResume={handleResumeActivePlacement}
          onDismiss={handleDismissActivePlacement}
          onStartOver={handleDiscardActivePlacement}
        />
      )}

      {/* Sticky Header */}
      {currentView !== 'exam-session' && currentView !== 'conversation-session' && currentView !== 'placement-session' && currentView !== 'onboarding' && (
        <>
          <StorageWarningBanner />
          <OfflineBanner />
          <Header
            onNavigateToday={handleNavigateToday}
            onNavigateDictionary={() => handleNavigateDictionary()}
            onNavigateHome={handleNavigateHome}
            onNavigateReview={handleNavigateReview}
            onNavigateConversation={aiEnabled ? handleNavigateConversation : undefined}
            onNavigateFlipLens={aiEnabled ? handleOpenFlipLens : undefined}
            onNavigateExamCenter={handleNavigateExamCenter}
            onNavigateSettings={handleNavigateSettings}
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
              onNavigateConversation={aiEnabled ? handleNavigateConversation : undefined}
              onNavigateExams={handleNavigateExamCenter}
              onNavigateFlipLens={aiEnabled ? handleOpenFlipLens : undefined}
              onNavigateSettings={handleNavigateSettings}
              onReopenOnboarding={handleOpenOnboarding}
            />
          )}

          {/* Settings & Preferences View */}
          {currentView === 'settings' && (
            <ErrorBoundary featureName="Settings" showHomeButton onGoHome={handleNavigateToday}>
              <SettingsPage
                onNavigateToday={handleNavigateToday}
                onNavigateCurriculum={handleNavigateHome}
              />
            </ErrorBoundary>
          )}

          {/* Today's Study Plan View */}
          {currentView === 'today' && (
            <TodayPage
              onSelectLesson={handleSelectLesson}
              onNavigateReview={handleNavigateReview}
              onNavigatePlacement={handleStartPlacementIntro}
              onNavigateQuickTest={handleStartQuickTestFromPlan}
              onNavigateCurriculum={handleNavigateHome}
              onNavigateConversation={aiEnabled ? handleNavigateConversation : undefined}
              onNavigateFlipLens={aiEnabled ? handleOpenFlipLens : undefined}
              onNavigateContinueAction={handleNavigateContinueAction}
              isStartingQuickTest={isStartingExam}
            />
          )}

          {/* Dictionary & Personal Wordbook View */}
          {currentView === 'dictionary' && (
            <ErrorBoundary featureName="Dictionary" showHomeButton onGoHome={handleNavigateToday}>
              <DictionaryPage
                initialWord={dictionarySearchWord}
                returnContext={dictionaryReturnContext}
                onReturn={handleReturnFromDictionary}
                onNavigateLesson={handleSelectLessonById}
                onNavigateReview={handleNavigateReview}
              />
            </ErrorBoundary>
          )}

          {/* Curriculum Views */}
          {currentView === 'home' && (
            <Home
              onSelectLesson={handleSelectLesson}
              onOpenFlipLens={aiEnabled ? handleOpenFlipLens : undefined}
              onOpenExamCenter={handleNavigateExamCenter}
              onNavigateReview={handleNavigateReview}
              onNavigateToday={handleNavigateToday}
              onNavigateHelp={handleNavigateHelp}
              onStartPlacement={handleStartPlacementIntro}
              onViewPlacementResult={handleViewPlacementResult}
              onNavigateContinueAction={handleNavigateContinueAction}
              initialLevelTab={homeLevelFilter || 'ALL'}
            />
          )}

          {/* Placement Test Views */}
          {currentView === 'placement-intro' && (
            <ErrorBoundary featureName="Placement" showHomeButton onGoHome={handleNavigateToday}>
              <PlacementIntro
                onStartPlacement={handleStartPlacementSession}
                onBack={handleNavigateHome}
                latestHistoryItem={getLatestPlacementResult()}
                onViewPreviousResult={handleViewPlacementResult}
                startError={placementStartError}
                isStartingPlacement={isStartingPlacement}
              />
            </ErrorBoundary>
          )}

          {currentView === 'placement-session' && activePlacementSession && (
            <ErrorBoundary featureName="PlacementSession" showHomeButton onGoHome={handleNavigateToday}>
              <PlacementSessionPage
                key={activePlacementSession.id}
                initialSession={activePlacementSession}
                onFinishPlacement={handleFinishPlacementSession}
                onExitPlacement={handleNavigateHome}
                onRestartPlacement={handleStartPlacementSession}
              />
            </ErrorBoundary>
          )}

          {currentView === 'placement-result' && placementResultReport && (
            <ErrorBoundary featureName="PlacementResult" showHomeButton onGoHome={handleNavigateToday}>
              <PlacementResultPage
                report={placementResultReport}
                initialPersistence={placementPersistenceState || undefined}
                onPersistenceChange={setPlacementPersistenceState}
                onRetake={handleStartPlacementIntro}
                onStartCurriculum={handleStartCurriculumAtLevel}
                onSelectLesson={handleSelectLesson}
                onNavigateReview={handleNavigateReview}
              />
            </ErrorBoundary>
          )}

          {/* Smart Review (Spaced Repetition) View */}
          {currentView === 'review' && (
            <ErrorBoundary featureName="SmartReview" showHomeButton onGoHome={handleNavigateToday}>
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
            </ErrorBoundary>
          )}

          {/* AI Conversation Lab Views */}
          {currentView === 'conversation' && (
            <ErrorBoundary featureName="ConversationHome" showHomeButton onGoHome={handleNavigateToday}>
              <ConversationHome
                onSelectScenario={handleSelectScenario}
                onBackToHome={handleNavigateHome}
              />
            </ErrorBoundary>
          )}

          {currentView === 'conversation-setup' && selectedScenario && (
            <ErrorBoundary featureName="ConversationSetup" showHomeButton onGoHome={handleNavigateToday}>
              <ConversationSetup
                scenario={selectedScenario}
                onStartSession={handleStartConversation}
                onBack={handleNavigateConversation}
              />
            </ErrorBoundary>
          )}

          {currentView === 'conversation-session' && selectedScenario && (
            <ErrorBoundary featureName="ConversationSession" showHomeButton onGoHome={handleNavigateToday}>
              <ConversationSession
                scenario={selectedScenario}
                level={conversationLevel}
                onFinishConversation={handleFinishConversation}
                onExitSession={handleNavigateConversation}
              />
            </ErrorBoundary>
          )}

          {currentView === 'conversation-result' && selectedScenario && conversationEvaluation && (
            <ErrorBoundary featureName="ConversationResult" showHomeButton onGoHome={handleNavigateToday}>
              <ConversationResult
                scenario={selectedScenario}
                level={conversationLevel}
                evaluation={conversationEvaluation}
                turns={conversationTurns}
                onPracticeAgain={handlePracticeConversationAgain}
                onBackToLab={handleNavigateConversation}
                onNavigateReview={handleNavigateReview}
              />
            </ErrorBoundary>
          )}

          {currentView === 'flip-lens' && (
            <ErrorBoundary featureName="FlipLens" showHomeButton onGoHome={handleNavigateToday}>
              <FlipLens onBackToHome={handleNavigateHome} />
            </ErrorBoundary>
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
            <ErrorBoundary featureName="Learn" showHomeButton onGoHome={handleNavigateToday}>
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
            </ErrorBoundary>
          )}

          {currentView === 'exercise' && selectedLesson && (
            <ErrorBoundary featureName="Exercise" showHomeButton onGoHome={handleNavigateToday}>
              <Exercise
                lesson={selectedLesson}
                onFinishQuiz={handleFinishQuiz}
                onExitQuiz={handleBackToIntro}
              />
            </ErrorBoundary>
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
            <ErrorBoundary featureName="ExamCenter" showHomeButton onGoHome={handleNavigateToday}>
              <ExamCenter
                onStartExamFlow={handleStartExamFlow}
                onViewResultReport={handleViewResultReport}
                onViewAllHistory={handleViewAllHistory}
                onStartPlacement={handleStartPlacementIntro}
              />
            </ErrorBoundary>
          )}

          {currentView === 'exam-intro' && (
            <ErrorBoundary featureName="ExamIntro" showHomeButton onGoHome={handleNavigateToday}>
              <ExamIntro
                mode={examMode}
                level={examLevel}
                onStartExam={handleStartExamSession}
                onBackToExamCenter={handleNavigateExamCenter}
                isStartingExam={isStartingExam}
                startError={examStartError}
              />
            </ErrorBoundary>
          )}

          {currentView === 'exam-session' && activeExamSession && (
            <ErrorBoundary featureName="ExamSession" showHomeButton onGoHome={handleNavigateToday}>
              <ExamSessionPage
                initialSession={activeExamSession}
                onFinishExam={handleFinishExamSession}
              />
            </ErrorBoundary>
          )}

          {currentView === 'exam-result' && examResultReport && (
            <ErrorBoundary featureName="ExamResult" showHomeButton onGoHome={handleNavigateToday}>
              <ExamResultPage
                report={examResultReport}
                initialPersistence={examPersistenceState || undefined}
                onRetakeExam={handleRetakeExam}
                onReturnToExamCenter={handleNavigateExamCenter}
                onSelectLesson={handleSelectLesson}
                onStartAIPractice={handleStartAIPracticeFromExam}
              />
            </ErrorBoundary>
          )}

          {currentView === 'exam-history' && (
            <ErrorBoundary featureName="ExamHistory" showHomeButton onGoHome={handleNavigateToday}>
              <ExamHistoryPage
                onViewReport={handleViewResultReport}
                onBackToExamCenter={handleNavigateExamCenter}
              />
            </ErrorBoundary>
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
              {aiEnabled
                ? '72 Structured Lessons • CEFR A1—C2 • Practice Exams & AI Diagnostics'
                : '72 Structured Lessons • CEFR A1—C2 • Practice Exams & Smart Review'}
            </p>
          </div>
        </footer>
      )}

      {/* PWA Update & Offline Notification Prompt */}
      <PWAUpdatePrompt />
    </div>
  );
}

