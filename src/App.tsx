import React, { useState, useEffect } from 'react';
import { AppView, Lesson, VocabWord, LessonProgress, CEFRLevel } from './types';
import { ExamMode, ExamResultReport, ExamSession } from './types/exam';
import { ConversationScenario, ConversationTurn, ConversationEvaluation } from './types/conversation';
import {
  PlacementSession,
  PlacementResultReport,
} from './features/placement/placementTypes';
import {
  loadActivePlacement,
  clearActivePlacement,
  getLatestPlacementResult,
} from './features/placement/placementStorage';
import { selectPlacementQuestionsForStage } from './data/placement/placementPool';
import { LESSONS, getLessonById } from './data/lessons';
import { getLessonProgress } from './utils/storage';
import { getActiveExam, clearActiveExam } from './utils/examStorage';
import { generateExamSession } from './data/exams/examGenerator';
import { saveConversationSummary } from './utils/conversationStorage';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { LessonIntro } from './pages/LessonIntro';
import { Learn } from './pages/Learn';
import { Exercise } from './pages/Exercise';
import { Result } from './pages/Result';
import { FlipLens } from './pages/FlipLens';
import { ExamCenter } from './pages/ExamCenter';
import { ExamIntro } from './pages/ExamIntro';
import { ExamSessionPage } from './pages/ExamSession';
import { ExamResultPage } from './pages/ExamResult';
import { ExamHistoryPage } from './pages/ExamHistory';
import { ResumeExamModal } from './components/exam/ResumeExamModal';
import { ReviewDashboard } from './features/review/ReviewDashboard';
import { ConversationHome } from './features/conversation/ConversationHome';
import { ConversationSetup } from './features/conversation/ConversationSetup';
import { ConversationSession } from './features/conversation/ConversationSession';
import { ConversationResult } from './features/conversation/ConversationResult';
import { PlacementIntro } from './features/placement/PlacementIntro';
import { PlacementSessionPage } from './features/placement/PlacementSession';
import { PlacementResultPage } from './features/placement/PlacementResult';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
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

  // Conversation States
  const [selectedScenario, setSelectedScenario] = useState<ConversationScenario | null>(null);
  const [conversationLevel, setConversationLevel] = useState<CEFRLevel>('A1');
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [conversationEvaluation, setConversationEvaluation] = useState<ConversationEvaluation | null>(null);
  const [isEvaluatingConversation, setIsEvaluatingConversation] = useState<boolean>(false);

  const selectedLesson: Lesson | null = selectedLessonId ? getLessonById(selectedLessonId) || null : null;
  const currentLessonProgress: LessonProgress | null = selectedLessonId ? getLessonProgress(selectedLessonId) : null;

  // Check for active unfinished exam or placement on initial load
  useEffect(() => {
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

  // Curriculum Handlers
  const handleNavigateHome = () => {
    setCurrentView('home');
    setSelectedLessonId(null);
    setIsReviewMistakesMode(false);
    setQuizResults(null);
  };

  const handleNavigateReview = () => {
    setSelectedLessonId(null);
    setIsReviewMistakesMode(false);
    setQuizResults(null);
    setCurrentView('review');
  };

  const handleNavigateConversation = () => {
    setSelectedLessonId(null);
    setIsReviewMistakesMode(false);
    setQuizResults(null);
    setCurrentView('conversation');
  };

  const handleOpenFlipLens = () => {
    setSelectedLessonId(null);
    setIsReviewMistakesMode(false);
    setCurrentView('flip-lens');
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLessonId(lesson.id);
    setIsReviewMistakesMode(false);
    setCurrentView('lesson-intro');
  };

  const handleStartLearning = () => {
    setIsReviewMistakesMode(false);
    setCurrentView('learn');
  };

  const handleFinishFlashcards = () => {
    setCurrentView('exercise');
  };

  const handleFinishQuiz = (results: {
    score: number;
    correctCount: number;
    incorrectCount: number;
    mistakeWords: VocabWord[];
    totalQuestions: number;
  }) => {
    setQuizResults(results);
    setMistakeWords(results.mistakeWords);
    setCurrentView('result');
  };

  const handleReviewMistakes = () => {
    if (mistakeWords.length > 0) {
      setIsReviewMistakesMode(true);
      setCurrentView('learn');
    }
  };

  const handleTryAgain = () => {
    setIsReviewMistakesMode(false);
    setCurrentView('exercise');
  };

  const handleBackToIntro = () => {
    setIsReviewMistakesMode(false);
    setCurrentView('lesson-intro');
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
    setIsEvaluatingConversation(true);

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

      setIsEvaluatingConversation(false);
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
    } finally {
      setIsEvaluatingConversation(false);
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
    setIsReviewMistakesMode(false);
    setCurrentView('exam-center');
  };

  // Placement Handlers
  const handleStartPlacementIntro = () => {
    setSelectedLessonId(null);
    setIsReviewMistakesMode(false);
    setCurrentView('placement-intro');
  };

  const handleStartPlacementSession = () => {
    const seed = Date.now() ^ Math.floor(Math.random() * 1000000);
    const initialStageQuestions = selectPlacementQuestionsForStage('B1', 0, seed);

    const initialSession: PlacementSession = {
      schemaVersion: 1,
      id: `placement-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'active',
      sessionSeed: seed,
      startedAt: Date.now(),
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
    setCurrentView('home');
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleViewPlacementResult = () => {
    if (placementResultReport) {
      setCurrentView('placement-result');
    } else {
      const latest = getLatestPlacementResult();
      if (latest) {
        // Navigate to intro which displays summary or start
        setCurrentView('placement-intro');
      }
    }
  };

  const handleStartExamFlow = (mode: ExamMode, level: CEFRLevel) => {
    setExamMode(mode);
    setExamLevel(level);
    setCurrentView('exam-intro');
  };

  const handleStartExamSession = () => {
    const session = generateExamSession(examMode, examLevel);
    setActiveExamSession(session);
    setCurrentView('exam-session');
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
                Incomplete Check Found
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Resume Placement Check?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                You have an unfinished Placement Check at Stage {pendingResumePlacement.currentStageIndex + 1} of 4 (Question {pendingResumePlacement.currentStageIndex * 6 + pendingResumePlacement.currentQuestionInStageIndex + 1} of 24).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                id="resume-placement-btn"
                onClick={handleResumeActivePlacement}
                className="flex-1 min-h-12 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer inline-flex items-center justify-center"
              >
                Resume
              </button>

              <button
                type="button"
                id="discard-placement-btn"
                onClick={handleDiscardActivePlacement}
                className="min-h-12 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Header */}
      {currentView !== 'exam-session' && currentView !== 'conversation-session' && currentView !== 'placement-session' && (
        <Header
          onNavigateHome={handleNavigateHome}
          onNavigateReview={handleNavigateReview}
          onNavigateConversation={handleNavigateConversation}
          onNavigateFlipLens={handleOpenFlipLens}
          onNavigateExamCenter={handleNavigateExamCenter}
          currentView={currentView}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {/* Curriculum Views */}
        {currentView === 'home' && (
          <Home
            onSelectLesson={handleSelectLesson}
            onOpenFlipLens={handleOpenFlipLens}
            onOpenExamCenter={handleNavigateExamCenter}
            onNavigateReview={handleNavigateReview}
            onStartPlacement={handleStartPlacementIntro}
            onViewPlacementResult={handleViewPlacementResult}
          />
        )}

        {/* Placement Test Views */}
        {currentView === 'placement-intro' && (
          <PlacementIntro
            onStartPlacement={handleStartPlacementSession}
            onBack={handleNavigateHome}
            latestHistoryItem={getLatestPlacementResult()}
            onViewPreviousResult={handleViewPlacementResult}
          />
        )}

        {currentView === 'placement-session' && activePlacementSession && (
          <PlacementSessionPage
            initialSession={activePlacementSession}
            onFinishPlacement={handleFinishPlacementSession}
            onExitPlacement={handleNavigateHome}
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
            onSelectLesson={handleSelectLesson}
            onBackToHome={handleNavigateHome}
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
            onFinishFlashcards={handleFinishFlashcards}
            onBackToIntro={handleBackToIntro}
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
      </main>

      {/* Clean minimal footer */}
      {currentView !== 'exam-session' && currentView !== 'conversation-session' && (
        <footer className="w-full border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-semibold text-slate-700">
              FlipEnglish — Master English vocabulary one flip card at a time.
            </p>
            <p className="text-slate-400">
              {LESSONS.length} Structured Lessons • CEFR A1—C2 • Practice Exams & AI Diagnostics
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

