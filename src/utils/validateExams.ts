import { CEFRLevel } from '../types';
import { ExamMode } from '../types/exam';
import { generateExamSession, isValidExamQuestion } from '../data/exams/examGenerator';
import { LEVEL_EXAM_CONFIGS, QUICK_TEST_CONFIG, FULL_MOCK_CONFIG } from '../data/exams/config';

export interface ValidationReport {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  errors: string[];
  summary: {
    mode: ExamMode;
    level: CEFRLevel;
    expectedCount: number;
    actualCount: number;
    validQuestionsCount: number;
  }[];
}

/**
 * Validates exam generation across all CEFR levels and all modes.
 * Ensures strict integrity: exact question count, valid options, no answer leaks.
 */
export function runExamIntegrityAudit(): ValidationReport {
  const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const modes: ExamMode[] = ['quick', 'level', 'mock'];

  const errors: string[] = [];
  const summary: ValidationReport['summary'] = [];
  let totalTests = 0;
  let passedTests = 0;

  for (const mode of modes) {
    for (const level of levels) {
      totalTests++;
      let expectedCount = 0;
      if (mode === 'quick') {
        expectedCount = QUICK_TEST_CONFIG.questionCount; // 15
      } else if (mode === 'level') {
        expectedCount = LEVEL_EXAM_CONFIGS[level].questionCount; // 20-40
      } else if (mode === 'mock') {
        expectedCount = FULL_MOCK_CONFIG.questionCount; // 50
      }

      // Generate session
      const session = generateExamSession(mode, level);
      const questions = session.questions;

      let modeErrors = 0;

      // 1. Verify exact question count
      if (questions.length !== expectedCount) {
        errors.push(
          `[${mode.toUpperCase()} - ${level}] Expected ${expectedCount} questions, but generated ${questions.length}.`
        );
        modeErrors++;
      }

      // 2. Verify all questions pass isValidExamQuestion
      const validCount = questions.filter(isValidExamQuestion).length;
      if (validCount !== questions.length) {
        errors.push(
          `[${mode.toUpperCase()} - ${level}] ${questions.length - validCount} questions failed integrity validation.`
        );
        modeErrors++;
      }

      // 3. Verify no duplicate IDs
      const ids = questions.map((q) => q.id);
      const uniqueIds = new Set(ids);
      if (uniqueIds.size !== ids.length) {
        errors.push(`[${mode.toUpperCase()} - ${level}] Contains duplicate question IDs.`);
        modeErrors++;
      }

      // 4. Verify no answer leaks in picture questions
      for (const q of questions) {
        if (q.kind === 'picture-choice') {
          if (!q.visualUrl) {
            errors.push(`[${mode.toUpperCase()} - ${level}] Picture-choice question ${q.id} missing visualUrl.`);
            modeErrors++;
          }
          if (q.prompt.toLowerCase().includes(`"${q.correctAnswer.toLowerCase()}"`)) {
            errors.push(`[${mode.toUpperCase()} - ${level}] Picture-choice question ${q.id} leaks correct answer in prompt!`);
            modeErrors++;
          }
          // Verify options don't have imageUrl
          for (const opt of q.options) {
            if ((opt as any).imageUrl) {
              errors.push(`[${mode.toUpperCase()} - ${level}] Option in question ${q.id} leaks imageUrl!`);
              modeErrors++;
            }
          }
        }

        // Verify correct answer is strictly in options
        const optionTexts = q.options.map((o) => o.text.trim().toLowerCase());
        if (!optionTexts.includes(q.correctAnswer.trim().toLowerCase())) {
          errors.push(`[${mode.toUpperCase()} - ${level}] Question ${q.id} correctAnswer not in options!`);
          modeErrors++;
        }
      }

      if (modeErrors === 0) {
        passedTests++;
      }

      summary.push({
        mode,
        level,
        expectedCount,
        actualCount: questions.length,
        validQuestionsCount: validCount,
      });
    }
  }

  return {
    passed: errors.length === 0,
    totalTests,
    passedTests,
    errors,
    summary,
  };
}
