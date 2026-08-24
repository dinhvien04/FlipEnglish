import React, { useState, useEffect } from 'react';
import { AppView, Lesson, VocabWord, LessonProgress, CEFRLevel } from './types';
import { ExamMode, ExamResultReport, ExamSession } from './types/exam';
import { ConversationScenario, ConversationTurn, ConversationEvaluation } from './types/conversation';
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

  // Conversation States
  const [selectedScenario, setSelectedScenario] = useState<ConversationScenario | null>(null);
  const [conversationLevel, setConversationLevel] = useState<CEFRLevel>('A1');
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [conversationEvaluation, setConversationEvaluation] = useState<ConversationEvaluation | null>(null);
  const [isEvaluatingConversation, setIsEvaluatingConversation] = useState<boolean>(false);

  const selectedLesson: Lesson | null = selectedLessonId ? getLessonById(selectedLessonId) || null : null;
  const currentLessonProgress: LessonProgress | null = selectedLessonId ? getLessonProgress(selectedLessonId) : null;

  // Check for active unfinished exam on initial load
  useEffect(() => {
    const active = getActiveExam();
    if (active && active.status === 'active' && active.endsAt > Date.now()) {
      setPendingResumeSession(active);
    } else if (active && active.endsAt <= Date.now()) {
      clearActiveExam();
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
      {pendingResumeSession && currentView !== 'exam-session' && (
        <ResumeExamModal
          session={pendingResumeSession}
          onResume={handleResumeActiveExam}
          onDiscard={handleDiscardActiveExam}
        />
      )}

      {/* Sticky Header */}
      {currentView !== 'exam-session' && currentView !== 'conversation-session' && (
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

