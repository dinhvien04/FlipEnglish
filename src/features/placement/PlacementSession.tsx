import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  PlacementSession,
  PlacementResultReport,
  PlacementStage,
  PlacementStageResult,
  PlacementQuestion,
} from './placementTypes';
import { selectPlacementQuestionsForStage } from '../../data/placement/placementPool';
import { routeNextLevel, calculatePlacementResult } from './placementEngine';
import {
  saveActivePlacement,
  clearActivePlacement,
  savePlacementResultToHistory,
} from './placementStorage';
import { speakWord } from '../../utils/speech';

interface PlacementSessionProps {
  initialSession: PlacementSession;
  onFinishPlacement: (report: PlacementResultReport) => void;
  onExitPlacement: () => void;
}

export const PlacementSessionPage: React.FC<PlacementSessionProps> = ({
  initialSession,
  onFinishPlacement,
  onExitPlacement,
}) => {
  const [session, setSession] = useState<PlacementSession>(initialSession);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [, startTransition] = useTransition();

  // Save session state to localStorage on every update
  useEffect(() => {
    saveActivePlacement(session);
  }, [session]);

  const currentStage: PlacementStage = session.stages[session.currentStageIndex];
  const currentQuestion: PlacementQuestion | undefined =
    currentStage?.questions[session.currentQuestionInStageIndex];

  // Overall question numbering (1 to 24)
  const currentGlobalQuestionNumber =
    session.currentStageIndex * 6 + session.currentQuestionInStageIndex + 1;
  const totalGlobalQuestions = 24;

  const currentSelectedAnswer = currentQuestion ? session.answers[currentQuestion.id] || '' : '';

  // Audio Playback for listening questions
  const handlePlayAudio = (slow = false) => {
    if (!currentQuestion?.audioPromptText || isPlayingAudio) return;
    setIsPlayingAudio(true);
    speakWord(currentQuestion.audioPromptText, slow ? 0.65 : 0.9);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 1200);
  };

  // Select option handler
  const handleSelectOption = (optionText: string) => {
    if (!currentQuestion) return;
    setSession((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [currentQuestion.id]: optionText,
      },
    }));
  };

  // Previous Question handler (within the CURRENT stage only)
  const handlePrevQuestion = () => {
    if (session.currentQuestionInStageIndex > 0) {
      setSession((prev) => ({
        ...prev,
        currentQuestionInStageIndex: prev.currentQuestionInStageIndex - 1,
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Next Question / Stage Routing handler
  const handleNextOrSubmitStage = useCallback(() => {
    if (!currentQuestion) return;

    // Check if we are still within the current stage (questions 0 to 4)
    if (session.currentQuestionInStageIndex < 5) {
      setSession((prev) => ({
        ...prev,
        currentQuestionInStageIndex: prev.currentQuestionInStageIndex + 1,
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // We reached the 6th question of the stage -> finalize stage routing!
    const stageQuestions = currentStage.questions;
    let correctCount = 0;
    for (const q of stageQuestions) {
      const userAns = session.answers[q.id];
      if (userAns && userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        correctCount++;
      }
    }

    const { nextLevel, decision } = routeNextLevel(currentStage.level, correctCount, 6);

    const stageResult: PlacementStageResult = {
      stageIndex: session.currentStageIndex,
      level: currentStage.level,
      questionIds: stageQuestions.map((q) => q.id),
      totalQuestions: 6,
      correctCount,
      scorePercentage: Math.round((correctCount / 6) * 100),
      routingDecision: decision,
      nextLevel,
    };

    const updatedStageResults = [...session.stageResults, stageResult];

    // Check if this was the final stage (Stage 4, index 3)
    if (session.currentStageIndex >= 3) {
      // Gather all 24 questions across all 4 stages
      const allQuestions = session.stages.flatMap((s) => s.questions);
      const completedAt = Date.now();

      const finalReport = calculatePlacementResult(
        session.id,
        session.startedAt,
        completedAt,
        allQuestions,
        session.answers,
        updatedStageResults
      );

      // Save to history & clear active
      savePlacementResultToHistory(finalReport);
      clearActivePlacement();

      startTransition(() => {
        onFinishPlacement(finalReport);
      });
      return;
    }

    // Otherwise, generate the next stage (Stage index + 1) at nextLevel
    const nextStageIndex = session.currentStageIndex + 1;
    const existingQuestionIds = new Set<string>(session.stages.flatMap((s) => s.questions.map((q) => q.id)));
    const existingTargets = new Set<string>(
      session.stages
        .flatMap((s) => s.questions.map((q) => q.targetItem?.toLowerCase()))
        .filter((t): t is string => Boolean(t))
    );

    const nextStageQuestions = selectPlacementQuestionsForStage(
      nextLevel,
      nextStageIndex,
      session.sessionSeed,
      existingQuestionIds,
      existingTargets
    );

    const nextStage: PlacementStage = {
      stageIndex: nextStageIndex,
      level: nextLevel,
      questions: nextStageQuestions,
      isLocked: false,
    };

    // Lock current stage to prevent cross-stage back navigation
    const updatedStages = session.stages.map((s, idx) =>
      idx === session.currentStageIndex ? { ...s, isLocked: true } : s
    );

    setSession((prev) => ({
      ...prev,
      currentStageIndex: nextStageIndex,
      currentQuestionInStageIndex: 0,
      currentLevel: nextLevel,
      stages: [...updatedStages, nextStage],
      stageResults: updatedStageResults,
    }));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    currentQuestion,
    session,
    currentStage,
    onFinishPlacement,
  ]);

  if (!currentQuestion) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-base font-bold text-slate-800">Placement session data could not be loaded.</p>
        <button
          type="button"
          onClick={onExitPlacement}
          className="min-h-12 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-bold cursor-pointer inline-flex items-center justify-center"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const isFirstInStage = session.currentQuestionInStageIndex === 0;
  const isAnswerSelected = Boolean(currentSelectedAnswer);
  const progressPercentage = Math.round((currentGlobalQuestionNumber / totalGlobalQuestions) * 100);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col justify-between">
      {/* Placement Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-600 text-white">
              Placement Check
            </span>
            <span className="text-xs sm:text-sm text-slate-300 font-semibold hidden xs:inline">
              Stage {session.currentStageIndex + 1} of 4
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-extrabold text-indigo-300">
              Question {currentGlobalQuestionNumber} of {totalGlobalQuestions}
            </span>

            <button
              type="button"
              onClick={onExitPlacement}
              className="min-h-10 px-3 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={currentGlobalQuestionNumber}
            aria-valuemin={1}
            aria-valuemax={totalGlobalQuestions}
          />
        </div>
      </header>

      {/* Main Placement Question Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-between">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 flex-1 flex flex-col justify-between min-h-[480px]">
          <div className="space-y-6">
            {/* Skill Badge */}
            <div className="flex items-center justify-between">
              <span className="text-2xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {currentQuestion.skill === 'use-of-english'
                  ? 'Use of English'
                  : currentQuestion.skill.charAt(0).toUpperCase() + currentQuestion.skill.slice(1)}
              </span>

              <span className="text-2xs text-slate-400 font-semibold">
                Single choice
              </span>
            </div>

            {/* Reading Passage (if reading question) */}
            {currentQuestion.skill === 'reading' && currentQuestion.passage && (
              <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200 space-y-2">
                {currentQuestion.passageTitle && (
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                    Reading: {currentQuestion.passageTitle}
                  </h3>
                )}
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-serif">
                  {currentQuestion.passage}
                </p>
              </div>
            )}

            {/* Listening Audio Control (if listening question) */}
            {currentQuestion.skill === 'listening' && (
              <div className="bg-indigo-50/60 rounded-2xl p-5 border border-indigo-100 space-y-3">
                <p className="text-xs font-bold text-indigo-900">
                  Listen to the audio recording to answer the question:
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handlePlayAudio(false)}
                    disabled={isPlayingAudio}
                    className="min-h-12 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>Play Audio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlayAudio(true)}
                    disabled={isPlayingAudio}
                    className="min-h-12 px-4 py-2.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>Slow (0.65x)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Question Prompt */}
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug whitespace-pre-line">
                {currentQuestion.prompt}
              </h2>
            </div>

            {/* 4 Full-Width Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = currentSelectedAnswer === opt.text;
                const letter = String.fromCharCode(65 + idx);

                return (
                  <button
                    key={opt.id || idx}
                    type="button"
                    onClick={() => handleSelectOption(opt.text)}
                    className={`w-full min-h-12 sm:min-h-14 p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-2xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-xs sm:text-sm leading-snug break-words">
                        {opt.text}
                      </span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrevQuestion}
              disabled={isFirstInStage}
              className="min-h-12 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center"
            >
              Previous
            </button>

            <button
              type="button"
              id="placement-continue-btn"
              onClick={handleNextOrSubmitStage}
              disabled={!isAnswerSelected}
              className="min-h-12 sm:min-h-14 px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center"
            >
              {session.currentStageIndex === 3 && session.currentQuestionInStageIndex === 5
                ? 'Finish Placement Check'
                : 'Continue'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
