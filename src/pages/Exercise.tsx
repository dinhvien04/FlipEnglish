import React, { useState, useEffect } from 'react';
import { Lesson, QuizQuestion, VocabWord } from '../types';
import { generateQuiz } from '../utils/quizGenerator';
import { QuizQuestionCard } from '../components/QuizQuestionCard';
import { ProgressBar } from '../components/ProgressBar';

interface ExerciseProps {
  lesson: Lesson;
  onFinishQuiz: (results: {
    score: number;
    correctCount: number;
    incorrectCount: number;
    mistakeWords: VocabWord[];
    totalQuestions: number;
  }) => void;
  onExitQuiz: () => void;
}

export const Exercise: React.FC<ExerciseProps> = ({
  lesson,
  onFinishQuiz,
  onExitQuiz,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakeWords, setMistakeWords] = useState<VocabWord[]>([]);

  useEffect(() => {
    const generated = generateQuiz(lesson);
    setQuestions(generated);
    setCurrentIndex(0);
    setCorrectCount(0);
    setMistakeWords([]);
  }, [lesson.id]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleAnswerSubmit = (isCorrect: boolean) => {
    let nextCorrect = correctCount;
    let nextMistakes = [...mistakeWords];

    if (isCorrect) {
      nextCorrect += 1;
      setCorrectCount(nextCorrect);
    } else {
      // Add word to mistake list if not already present
      if (!nextMistakes.some((w) => w.id === currentQuestion.word.id)) {
        nextMistakes.push(currentQuestion.word);
        setMistakeWords(nextMistakes);
      }
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Finished all questions!
      const finalScore = totalQuestions > 0 ? Math.round((nextCorrect / totalQuestions) * 100) : 0;
      onFinishQuiz({
        score: finalScore,
        correctCount: nextCorrect,
        incorrectCount: totalQuestions - nextCorrect,
        mistakeWords: nextMistakes,
        totalQuestions,
      });
    }
  };

  if (!currentQuestion || totalQuestions === 0) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <p className="text-slate-500">Preparing exercise questions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          id="exercise-exit-btn"
          onClick={onExitQuiz}
          className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          Exit Quiz
        </button>

        <div className="text-center">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {lesson.title} Practice
          </h2>
        </div>

        <div className="w-16 text-right text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
          {currentIndex + 1} / {totalQuestions}
        </div>
      </div>

      {/* Progress */}
      <ProgressBar
        current={currentIndex + 1}
        total={totalQuestions}
        label={`Question ${currentIndex + 1} of ${totalQuestions}`}
      />

      {/* Question Card */}
      <div className="mt-4">
        <QuizQuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={totalQuestions}
          onAnswerSubmit={handleAnswerSubmit}
          lessonTitle={lesson.title}
          lessonLevel={lesson.level}
        />
      </div>
    </div>
  );
};
