import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ExamResultReport, ExamSession } from '../types/exam';
import { ExamTimer } from '../components/exam/ExamTimer';
import { QuestionNavigator } from '../components/exam/QuestionNavigator';
import { ExamQuestionView } from '../components/exam/ExamQuestionView';
import { ExamReviewModal } from '../components/exam/ExamReviewModal';
import { saveActiveExam, clearActiveExam, saveExamResultToHistory } from '../utils/examStorage';
import { calculateExamResult } from '../utils/examScoring';
import { recordQuizMistake } from '../utils/reviewStorage';
import { resolveCurriculumItem, resolveCurriculumItemByText } from '../utils/curriculumIndex';

interface ExamSessionProps {
  initialSession: ExamSession;
  onFinishExam: (resultReport: ExamResultReport) => void;
}

export const ExamSessionPage: React.FC<ExamSessionProps> = ({
  initialSession,
  onFinishExam,
}) => {
  const [session, setSession] = useState<ExamSession>(initialSession);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const drawerCloseBtnRef = useRef<HTMLButtonElement>(null);
  const drawerTriggerBtnRef = useRef<HTMLButtonElement>(null);

  // Sync to localStorage on every state change
  useEffect(() => {
    saveActiveExam(session);
  }, [session]);

  // Focus management & Escape listener for mobile Questions drawer
  useEffect(() => {
    if (!isMobileDrawerOpen) return;

    // Focus close button on open
    drawerCloseBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMobileDrawerOpen(false);
        drawerTriggerBtnRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawerOpen]);

  const handleCloseDrawer = () => {
    setIsMobileDrawerOpen(false);
    drawerTriggerBtnRef.current?.focus();
  };

  const currentQuestion = session.questions[session.currentQuestionIndex] || session.questions[0];
  const totalQuestions = session.questions.length;
  const isFirstQuestion = session.currentQuestionIndex === 0;
  const isLastQuestion = session.currentQuestionIndex === totalQuestions - 1;

  // Handle finalizing and grading the exam
  const handleFinalizeExam = useCallback(() => {
    const finalSession: ExamSession = {
      ...session,
      status: 'submitted',
      submittedAt: Date.now(),
    };

    const report = calculateExamResult(finalSession);
    saveExamResultToHistory(report);
    clearActiveExam();

    // Auto-feed missed vocabulary items into Smart Review
    for (const missed of report.missedQuestions) {
      const target = missed.question?.targetItem;
      if (target) {
        const match =
          resolveCurriculumItem(target) ||
          resolveCurriculumItemByText(target);
        if (match) {
          recordQuizMistake(match.word.id);
        }
      }
    }

    onFinishExam(report);
  }, [session, onFinishExam]);

  // Handle timer expiry (auto-submit)
  const handleTimerExpired = useCallback(() => {
    handleFinalizeExam();
  }, [handleFinalizeExam]);

  // Handlers for question interaction
  const handleSelectAnswer = (answerText: string) => {
    setSession((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [currentQuestion.id]: answerText,
      },
    }));
  };

  const handleToggleFlag = () => {
    setSession((prev) => {
      const qId = currentQuestion.id;
      const isAlreadyFlagged = prev.flaggedQuestionIds.includes(qId);
      return {
        ...prev,
        flaggedQuestionIds: isAlreadyFlagged
          ? prev.flaggedQuestionIds.filter((id) => id !== qId)
          : [...prev.flaggedQuestionIds, qId],
      };
    });
  };

  const handleNavigateQuestion = (index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setSession((prev) => ({
        ...prev,
        currentQuestionIndex: index,
      }));
      setIsMobileDrawerOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    handleNavigateQuestion(session.currentQuestionIndex - 1);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setShowReviewModal(true);
    } else {
      handleNavigateQuestion(session.currentQuestionIndex + 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col justify-between">
      {/* Exam Sticky Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Title & Level (Priority: Level > Title on narrow phones) */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden min-w-0">
            <span className="text-xs font-black px-2 sm:px-2.5 py-1 rounded-md bg-indigo-600 text-white shrink-0">
              {session.level}
            </span>
            <h2 className="text-xs sm:text-sm font-bold text-slate-200 truncate hidden xs:block sm:block">
              {session.title}
            </h2>
          </div>

          {/* Right: Timer & Mobile Questions Toggle */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Absolute Timer */}
            <ExamTimer endsAt={session.endsAt} onExpire={handleTimerExpired} />

            {/* Mobile Question Navigator Toggle */}
            <button
              ref={drawerTriggerBtnRef}
              type="button"
              id="mobile-questions-drawer-btn"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isMobileDrawerOpen}
              aria-label="Open question navigator drawer"
              className="lg:hidden min-h-11 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer flex items-center justify-center"
            >
              Questions
            </button>
          </div>
        </div>
      </header>

      {/* Main Examination Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Question Area (8 cols on desktop) */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs min-h-[550px] flex flex-col justify-between">
            {currentQuestion ? (
              <ExamQuestionView
                question={currentQuestion}
                questionNumber={session.currentQuestionIndex + 1}
                totalQuestions={totalQuestions}
                selectedAnswer={session.answers[currentQuestion.id] || ''}
                isFlagged={session.flaggedQuestionIds.includes(currentQuestion.id)}
                onSelectAnswer={handleSelectAnswer}
                onToggleFlag={handleToggleFlag}
                onPrev={handlePrev}
                onNext={handleNext}
                isFirst={isFirstQuestion}
                isLast={isLastQuestion}
              />
            ) : (
              <div className="text-center py-12">
                <p>No questions found in this session.</p>
              </div>
            )}
          </div>

          {/* Right Column: Question Navigator Sidebar (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs sticky top-24">
            <QuestionNavigator
              questions={session.questions}
              answers={session.answers}
              flaggedQuestionIds={session.flaggedQuestionIds}
              currentIndex={session.currentQuestionIndex}
              onSelectQuestion={handleNavigateQuestion}
              onRequestReview={() => setShowReviewModal(true)}
            />
          </div>
        </div>
      </main>

      {/* Mobile Navigator Drawer / Bottom Sheet */}
      {isMobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Question Navigator"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseDrawer();
            }
          }}
          className="lg:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end animate-fadeIn"
        >
          <div className="bg-white w-full max-w-sm h-full p-6 flex flex-col justify-between space-y-4 shadow-2xl animate-slideLeft">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Questions</h3>
              <button
                ref={drawerCloseBtnRef}
                type="button"
                onClick={handleCloseDrawer}
                className="min-h-11 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold cursor-pointer inline-flex items-center justify-center"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <QuestionNavigator
                questions={session.questions}
                answers={session.answers}
                flaggedQuestionIds={session.flaggedQuestionIds}
                currentIndex={session.currentQuestionIndex}
                onSelectQuestion={handleNavigateQuestion}
                onRequestReview={() => {
                  setIsMobileDrawerOpen(false);
                  setShowReviewModal(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <ExamReviewModal
          questions={session.questions}
          answers={session.answers}
          flaggedQuestionIds={session.flaggedQuestionIds}
          onSelectQuestion={(idx) => {
            handleNavigateQuestion(idx);
            setShowReviewModal(false);
          }}
          onConfirmSubmit={handleFinalizeExam}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
};
