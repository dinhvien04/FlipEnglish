import { CEFRLevel, ExamLevelConfig, ExamMode } from '../../types/exam';

export const LEVEL_EXAM_CONFIGS: Record<CEFRLevel, ExamLevelConfig> = {
  A1: {
    level: 'A1',
    title: 'A1 — Beginner Level Exam',
    questionCount: 20,
    durationMinutes: 15,
    sections: [
      { id: 'sec-a1-1', type: 'visual-vocabulary', title: '01 Visual Vocabulary', questionCount: 5 },
      { id: 'sec-a1-2', type: 'word-meaning', title: '02 Word Meaning & Translation', questionCount: 5 },
      { id: 'sec-a1-3', type: 'listening', title: '03 Listening Recognition', questionCount: 5 },
      { id: 'sec-a1-4', type: 'basic-context', title: '04 Basic Sentence Context', questionCount: 5 },
    ],
  },
  A2: {
    level: 'A2',
    title: 'A2 — Elementary Level Exam',
    questionCount: 25,
    durationMinutes: 20,
    sections: [
      { id: 'sec-a2-1', type: 'vocabulary', title: '01 Core Vocabulary', questionCount: 7 },
      { id: 'sec-a2-2', type: 'everyday-english', title: '02 Everyday English & Situations', questionCount: 6 },
      { id: 'sec-a2-3', type: 'fill-in-blank', title: '03 Fill in the Blank', questionCount: 6 },
      { id: 'sec-a2-4', type: 'listening', title: '04 Listening & Comprehension', questionCount: 6 },
    ],
  },
  B1: {
    level: 'B1',
    title: 'B1 — Intermediate Level Exam',
    questionCount: 30,
    durationMinutes: 25,
    sections: [
      { id: 'sec-b1-1', type: 'vocabulary', title: '01 Intermediate Vocabulary', questionCount: 6 },
      { id: 'sec-b1-2', type: 'use-of-english', title: '02 Use of English & Cloze', questionCount: 6 },
      { id: 'sec-b1-3', type: 'basic-context', title: '03 Contextual Sentences', questionCount: 6 },
      { id: 'sec-b1-4', type: 'reading', title: '04 Reading Comprehension', questionCount: 6 },
      { id: 'sec-b1-5', type: 'listening', title: '05 Listening in Context', questionCount: 6 },
    ],
  },
  B2: {
    level: 'B2',
    title: 'B2 — Upper Intermediate Level Exam',
    questionCount: 35,
    durationMinutes: 30,
    sections: [
      { id: 'sec-b2-1', type: 'use-of-english', title: '01 Use of English & Cloze', questionCount: 7 },
      { id: 'sec-b2-2', type: 'context-vocabulary', title: '02 Context & Academic Vocabulary', questionCount: 7 },
      { id: 'sec-b2-3', type: 'collocations', title: '03 Natural Collocations & Phrases', questionCount: 7 },
      { id: 'sec-b2-4', type: 'reading', title: '04 Reading Comprehension', questionCount: 7 },
      { id: 'sec-b2-5', type: 'listening', title: '05 Sentence Listening', questionCount: 7 },
    ],
  },
  C1: {
    level: 'C1',
    title: 'C1 — Advanced Level Exam',
    questionCount: 40,
    durationMinutes: 35,
    sections: [
      { id: 'sec-c1-1', type: 'use-of-english', title: '01 Advanced Use of English', questionCount: 8 },
      { id: 'sec-c1-2', type: 'word-formation', title: '02 Word Formation & Morphology', questionCount: 8 },
      { id: 'sec-c1-3', type: 'collocations-phrasal', title: '03 Collocations & Phrasal Verbs', questionCount: 8 },
      { id: 'sec-c1-4', type: 'reading', title: '04 Analytical Reading', questionCount: 8 },
      { id: 'sec-c1-5', type: 'listening', title: '05 Advanced Listening & Idioms', questionCount: 8 },
    ],
  },
  C2: {
    level: 'C2',
    title: 'C2 — Proficiency Level Exam',
    questionCount: 40,
    durationMinutes: 40,
    sections: [
      { id: 'sec-c2-1', type: 'precision-nuance', title: '01 Semantic Precision & Nuance', questionCount: 8 },
      { id: 'sec-c2-2', type: 'register-usage', title: '02 Register & Formal Stylistics', questionCount: 8 },
      { id: 'sec-c2-3', type: 'advanced-use-of-english', title: '03 Advanced Use of English', questionCount: 8 },
      { id: 'sec-c2-4', type: 'reading', title: '04 Complex Analytical Reading', questionCount: 8 },
      { id: 'sec-c2-5', type: 'listening', title: '05 Advanced Listening Comprehension', questionCount: 8 },
    ],
  },
};

export const QUICK_TEST_CONFIG = {
  questionCount: 15,
  totalQuestions: 15,
  durationMinutes: 10,
  title: 'Quick Test',
};

export const FULL_MOCK_CONFIG = {
  questionCount: 50,
  totalQuestions: 50,
  durationMinutes: 45,
  title: 'Full Mock Exam',
};

export const EXAM_DISCLAIMER =
  'FlipEnglish practice exams are designed for learning and self-assessment and are not official CEFR or Cambridge examinations.';
