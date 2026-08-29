import { runExamIntegrityAudit } from '../src/utils/validateExams';
import {
  saveActiveExam,
  clearActiveExam,
  saveExamResultToHistory,
  getExamHistory,
  getActiveExam,
} from '../src/utils/examStorage';
import { ExamResultReport, ExamSession } from '../src/types/exam';

// Mock localStorage and window for Node.js test runner if not present
const mockStorage: Record<string, string> = {};
if (typeof (global as any).localStorage === 'undefined') {
  (global as any).localStorage = {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = String(v);
    },
    removeItem: (k: string) => {
      delete mockStorage[k];
    },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
  };
}

if (typeof (global as any).window === 'undefined') {
  (global as any).window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (global as any).CustomEvent = class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
}

console.log('=== Running FlipEnglish Exam Integrity Audit ===');
const report = runExamIntegrityAudit();

console.log(`Total Level/Mode Test Suites: ${report.totalTests}`);
console.log(`Passed Suites: ${report.passedTests}`);

if (!report.passed) {
  console.error('\n❌ Exam Integrity Audit Failed with the following errors:');
  report.errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log('\n✅ All exam generation configurations and question quotas passed integrity audit.');
}

console.log('\n=== Running Exam Storage & Fault-Injection Tests ===');
let storageErrors = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    storageErrors++;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

const mockExamSession: ExamSession = {
  id: 'test-session-1',
  schemaVersion: 2,
  mode: 'quick',
  level: 'B1',
  title: 'Quick Test',
  durationMinutes: 15,
  startedAt: Date.now() - 5000,
  endsAt: Date.now() + 895000,
  status: 'active',
  questions: [
    {
      id: 'q1',
      sectionId: 'sec-1',
      sectionTitle: 'Vocabulary',
      sectionType: 'vocabulary',
      kind: 'multiple-choice',
      prompt: 'Select the synonym for resilient.',
      options: [
        { id: 'opt-1', text: 'strong' },
        { id: 'opt-2', text: 'weak' },
      ],
      correctAnswer: 'strong',
    },
  ],
  answers: { q1: 'strong' },
  flaggedQuestionIds: [],
  currentQuestionIndex: 0,
};

const mockExamReport: ExamResultReport = {
  id: 'test-report-1',
  sessionId: 'test-session-1',
  mode: 'quick',
  level: 'B1',
  title: 'Quick Test',
  date: '2026-08-29',
  startedAt: Date.now() - 60000,
  submittedAt: Date.now(),
  durationSpentSeconds: 60,
  totalQuestions: 1,
  correctCount: 1,
  overallPercentage: 100,
  performanceLabel: 'Excellent',
  sectionScores: [
    {
      sectionId: 'sec-1',
      sectionTitle: 'Vocabulary',
      sectionType: 'vocabulary',
      total: 1,
      correct: 1,
      percentage: 100,
    },
  ],
  strengths: ['Vocabulary'],
  weaknesses: [],
  missedTags: [],
  missedQuestions: [],
  recommendedLessonIds: [],
};

const originalSetItem = (global as any).localStorage.setItem;
const originalRemoveItem = (global as any).localStorage.removeItem;

// 1. Fault Injection: Active Exam save failure
(global as any).localStorage.setItem = () => {
  throw new Error('QuotaExceededError');
};
const activeSaveFail = saveActiveExam(mockExamSession);
assert(activeSaveFail === false, 'saveActiveExam returns false when storage write fails without throwing');

// 2. Fault Injection: Exam history save failure
const historySaveFail = saveExamResultToHistory(mockExamReport);
assert(historySaveFail === false, 'saveExamResultToHistory returns false when storage write fails without throwing');

// 3. Fault Injection: Active Exam clear failure
(global as any).localStorage.setItem = originalSetItem;
(global as any).localStorage.removeItem = () => {
  throw new Error('SecurityError');
};
const clearActiveFail = clearActiveExam();
assert(clearActiveFail === false, 'clearActiveExam returns false when storage removal fails without throwing');

// 4. Combined states: Success on write & removal
(global as any).localStorage.removeItem = originalRemoveItem;
const activeSaveOk = saveActiveExam(mockExamSession);
assert(activeSaveOk === true, 'saveActiveExam succeeds under normal storage conditions');
const retrievedActive = getActiveExam();
assert(retrievedActive?.id === mockExamSession.id, 'getActiveExam retrieves valid session');

const clearActiveOk = clearActiveExam();
assert(clearActiveOk === true, 'clearActiveExam succeeds and removes active session');
assert(getActiveExam() === null, 'Active session is null after clearing');

// 5. Idempotent Retry & Duplicate Submission Protection
const firstHistorySave = saveExamResultToHistory(mockExamReport);
assert(firstHistorySave === true, 'saveExamResultToHistory successfully records report');
const history1 = getExamHistory();
assert(history1.filter((h) => h.id === mockExamReport.id).length === 1, 'Report exists exactly once in history');

const retryHistorySave = saveExamResultToHistory(mockExamReport);
assert(retryHistorySave === true, 'Retry saveExamResultToHistory returns true');
const history2 = getExamHistory();
assert(history2.filter((h) => h.id === mockExamReport.id).length === 1, 'Retry did not generate duplicate history entries');

if (storageErrors > 0) {
  console.error(`\n❌ Storage Durability Tests Failed with ${storageErrors} errors.`);
  process.exit(1);
} else {
  console.log('\n✅ All Exam Storage & Fault-Injection Tests Passed.');
  process.exit(0);
}

