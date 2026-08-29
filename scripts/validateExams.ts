import { runExamIntegrityAudit } from '../src/utils/validateExams';
import {
  saveActiveExam,
  clearActiveExam,
  saveExamResultToHistory,
  getExamHistory,
  clearExamHistory,
  getActiveExam,
  isValidSessionObject,
  isValidReportObject,
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

// 1. Fault Injection: Active Exam save failure during exam
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

// 5. Fault Injection: History success + clear failure -> verify reload does NOT resurrect completed exam
// When history save succeeds, but clearActiveExam fails, getActiveExam() must detect that the session has already been submitted to history and return null
const completedSession: ExamSession = {
  ...mockExamSession,
  id: 'test-session-completed',
  status: 'submitted',
};
const completedReport: ExamResultReport = {
  ...mockExamReport,
  id: 'test-report-completed',
  sessionId: 'test-session-completed',
};
saveExamResultToHistory(completedReport);
// Simulate clear failure by writing active key directly (or failing to remove it)
saveActiveExam(completedSession);
const resurrectedSession = getActiveExam();
assert(
  resurrectedSession === null,
  'getActiveExam() prevents completed/submitted session from resurrecting even if clearActiveExam failed'
);

// 6. Idempotent Retry & Duplicate Submission Protection
const firstHistorySave = saveExamResultToHistory(mockExamReport);
assert(firstHistorySave === true, 'saveExamResultToHistory successfully records report');
const history1 = getExamHistory();
assert(history1.filter((h) => h.id === mockExamReport.id).length === 1, 'Report exists exactly once in history');

const retryHistorySave = saveExamResultToHistory(mockExamReport);
assert(retryHistorySave === true, 'Retry saveExamResultToHistory returns true');
const history2 = getExamHistory();
assert(history2.filter((h) => h.id === mockExamReport.id).length === 1, 'Retry did not generate duplicate history entries');

// 7. Structural Bounds Validation (reject malicious, corrupted, or out-of-bounds payloads)
const corruptedSession1 = {
  ...mockExamSession,
  schemaVersion: 1, // Invalid schemaVersion
};
assert(isValidSessionObject(corruptedSession1) === false, 'Rejects session with invalid schemaVersion');

const corruptedSession2 = {
  ...mockExamSession,
  endsAt: mockExamSession.startedAt - 1000, // endsAt <= startedAt
};
assert(isValidSessionObject(corruptedSession2) === false, 'Rejects session with endsAt <= startedAt');

const corruptedSession3 = {
  ...mockExamSession,
  currentQuestionIndex: 99, // Out of bounds
};
assert(isValidSessionObject(corruptedSession3) === false, 'Rejects session with currentQuestionIndex out of bounds');

const corruptedSession4 = {
  ...mockExamSession,
  answers: { 'non-existent-q-id': 'some-answer' }, // Answer for unknown question ID
};
assert(isValidSessionObject(corruptedSession4) === false, 'Rejects session with answers for unknown question IDs');

const corruptedSession5 = {
  ...mockExamSession,
  flaggedQuestionIds: ['non-existent-q-id'], // Flag for unknown question ID
};
assert(isValidSessionObject(corruptedSession5) === false, 'Rejects session with flaggedQuestionIds for unknown question IDs');

const corruptedReport1 = {
  ...mockExamReport,
  correctCount: 5,
  totalQuestions: 2, // correctCount > totalQuestions
};
assert(isValidReportObject(corruptedReport1) === false, 'Rejects report with correctCount > totalQuestions');

const corruptedReport2 = {
  ...mockExamReport,
  overallPercentage: 150, // overallPercentage > 100
};
assert(isValidReportObject(corruptedReport2) === false, 'Rejects report with overallPercentage > 100');

const corruptedReport3 = {
  ...mockExamReport,
  sectionScores: [
    {
      sectionId: 'sec-1',
      sectionTitle: 'Vocabulary',
      sectionType: 'vocabulary',
      total: 5,
      correct: 10, // correct > total
      percentage: 200,
    },
  ],
};
assert(isValidReportObject(corruptedReport3) === false, 'Rejects report with invalid sectionScore totals');

// 8. Exam History Clear Durability & Fault-Injection Tests
const clearHistorySuccess = clearExamHistory();
assert(clearHistorySuccess === true, 'clearExamHistory returns true when removal succeeds');
assert(getExamHistory().length === 0, 'Exam history is empty after clearExamHistory');

// Simulate removal failure for clearExamHistory
(global as any).localStorage.removeItem = () => {
  throw new Error('SecurityError on remove history');
};
const clearHistoryFailure = clearExamHistory();
assert(clearHistoryFailure === false, 'clearExamHistory returns false when storage removal fails without throwing');
(global as any).localStorage.removeItem = originalRemoveItem;

if (storageErrors > 0) {
  console.error(`\n❌ Storage Durability Tests Failed with ${storageErrors} errors.`);
  process.exit(1);
} else {
  console.log('\n✅ All Exam Storage & Fault-Injection Tests Passed.');
  process.exit(0);
}

