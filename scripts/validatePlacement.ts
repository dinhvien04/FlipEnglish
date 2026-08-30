import {
  buildPlacementPool,
  selectPlacementQuestionsForStage,
  isValidPlacementQuestion,
  getIntelligentMeaningDistractors,
  normalizeText,
} from '../src/data/placement/placementPool';
import {
  routeNextLevel,
  calculatePlacementResult,
  calculateSkillPerformance,
  evaluatePlacementEvidence,
} from '../src/features/placement/placementEngine';
import {
  validatePlacementSession,
  validatePlacementResultReport,
  isPlacementResultExportedToReview,
  exportPlacementMissedToReview,
} from '../src/features/placement/placementStorage';
import {
  ORDERED_CEFR_LEVELS,
  CEFRLevel,
  PlacementStageResult,
  PlacementQuestion,
  PLACEMENT_STAGE_SIZE,
  PLACEMENT_TOTAL_QUESTIONS,
} from '../src/features/placement/placementTypes';
import { resolveCurriculumItem } from '../src/utils/curriculumIndex';

// Mock localStorage and window for Node.js test runner
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
  (global as any).Event = class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
}

console.log('--- STARTING COMPREHENSIVE PLACEMENT TEST SUITE & ATTACK CASE VALIDATION ---\n');

let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failedTests++;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

// 1. Audit Question Pool Coverage by Level and Skill
console.log('\n--- 1. AUDITING PLACEMENT QUESTION POOL ---');
const pool = buildPlacementPool();

for (const level of ORDERED_CEFR_LEVELS) {
  const questions = pool[level];
  const vocabCount = questions.filter((q) => q.skill === 'vocabulary').length;
  const uoeCount = questions.filter((q) => q.skill === 'use-of-english').length;
  const readCount = questions.filter((q) => q.skill === 'reading').length;
  const listenCount = questions.filter((q) => q.skill === 'listening').length;

  console.log(
    `Level ${level}: Total ${questions.length} | Vocab: ${vocabCount}, UoE: ${uoeCount}, Reading: ${readCount}, Listening: ${listenCount}`
  );

  assert(questions.length >= 8, `Level ${level} has at least 8 placement-eligible questions (got ${questions.length})`);
  assert(vocabCount >= 4, `Level ${level} has at least 4 vocabulary questions (got ${vocabCount})`);
  assert(listenCount >= 1, `Level ${level} has at least 1 listening question (got ${listenCount})`);

  let invalidCount = 0;
  for (const q of questions) {
    if (!isValidPlacementQuestion(q)) {
      invalidCount++;
      console.error(`Invalid question: ${q.id}`);
    }
  }
  assert(invalidCount === 0, `All ${questions.length} questions in ${level} satisfy strict quality criteria`);
}

// 2. Multistage Adaptive Routing Unit Tests
console.log('\n--- 2. MULTISTAGE ADAPTIVE ROUTING TESTS ---');

assert(routeNextLevel('B1', 6, 6).nextLevel === 'B2' && routeNextLevel('B1', 6, 6).decision === 'up', 'B1 + 6/6 routes UP to B2');
assert(routeNextLevel('B1', 5, 6).nextLevel === 'B2' && routeNextLevel('B1', 5, 6).decision === 'up', 'B1 + 5/6 routes UP to B2');
assert(routeNextLevel('B1', 4, 6).nextLevel === 'B1' && routeNextLevel('B1', 4, 6).decision === 'same', 'B1 + 4/6 STAYS at B1');
assert(routeNextLevel('B1', 3, 6).nextLevel === 'B1' && routeNextLevel('B1', 3, 6).decision === 'same', 'B1 + 3/6 STAYS at B1');
assert(routeNextLevel('B1', 2, 6).nextLevel === 'A2' && routeNextLevel('B1', 2, 6).decision === 'down', 'B1 + 2/6 routes DOWN to A2');
assert(routeNextLevel('B1', 0, 6).nextLevel === 'A2' && routeNextLevel('B1', 0, 6).decision === 'down', 'B1 + 0/6 routes DOWN to A2');
assert(routeNextLevel('A1', 0, 6).nextLevel === 'A1' && routeNextLevel('A1', 0, 6).decision === 'down', 'A1 + 0/6 clamps at A1');
assert(routeNextLevel('C2', 6, 6).nextLevel === 'C2' && routeNextLevel('C2', 6, 6).decision === 'up', 'C2 + 6/6 clamps at C2');

// 3. Multi-Stage Path Simulation Tests
console.log('\n--- 3. MULTI-STAGE PATH SIMULATION TESTS ---');

// Strong Learner: B1 -> B2 -> C1 -> C2
{
  const seed = 12345;
  const stage0Questions = selectPlacementQuestionsForStage('B1', 0, seed);
  assert(stage0Questions.length === PLACEMENT_STAGE_SIZE, 'Stage 0 selected exactly 6 questions');

  const s0: PlacementStageResult = {
    stageIndex: 0,
    level: 'B1',
    questionIds: stage0Questions.map((q) => q.id),
    totalQuestions: PLACEMENT_STAGE_SIZE,
    correctCount: 6,
    scorePercentage: 100,
    routingDecision: 'up',
    nextLevel: 'B2',
  };

  const stage1Questions = selectPlacementQuestionsForStage('B2', 1, seed, new Set(s0.questionIds));
  assert(stage1Questions.length === PLACEMENT_STAGE_SIZE, 'Stage 1 selected exactly 6 questions');

  const s1: PlacementStageResult = {
    stageIndex: 1,
    level: 'B2',
    questionIds: stage1Questions.map((q) => q.id),
    totalQuestions: PLACEMENT_STAGE_SIZE,
    correctCount: 5,
    scorePercentage: 83,
    routingDecision: 'up',
    nextLevel: 'C1',
  };

  const stage2Questions = selectPlacementQuestionsForStage('C1', 2, seed, new Set([...s0.questionIds, ...s1.questionIds]));
  assert(stage2Questions.length === PLACEMENT_STAGE_SIZE, 'Stage 2 selected exactly 6 questions');

  const s2: PlacementStageResult = {
    stageIndex: 2,
    level: 'C1',
    questionIds: stage2Questions.map((q) => q.id),
    totalQuestions: PLACEMENT_STAGE_SIZE,
    correctCount: 5,
    scorePercentage: 83,
    routingDecision: 'up',
    nextLevel: 'C2',
  };

  const stage3Questions = selectPlacementQuestionsForStage(
    'C2',
    3,
    seed,
    new Set([...s0.questionIds, ...s1.questionIds, ...s2.questionIds])
  );
  assert(stage3Questions.length === PLACEMENT_STAGE_SIZE, 'Stage 3 selected exactly 6 questions');

  const s3: PlacementStageResult = {
    stageIndex: 3,
    level: 'C2',
    questionIds: stage3Questions.map((q) => q.id),
    totalQuestions: PLACEMENT_STAGE_SIZE,
    correctCount: 4,
    scorePercentage: 67,
    routingDecision: 'same',
    nextLevel: 'C2',
  };

  const allQuestions = [...stage0Questions, ...stage1Questions, ...stage2Questions, ...stage3Questions];
  assert(allQuestions.length === PLACEMENT_TOTAL_QUESTIONS, `Total completed session has exactly ${PLACEMENT_TOTAL_QUESTIONS} questions`);

  const uniqueIds = new Set(allQuestions.map((q) => q.id));
  assert(uniqueIds.size === PLACEMENT_TOTAL_QUESTIONS, `All ${PLACEMENT_TOTAL_QUESTIONS} selected questions have unique IDs`);

  const answers: Record<string, string> = {};
  for (const q of allQuestions) {
    answers[q.id] = q.correctAnswer;
  }

  const result = calculatePlacementResult('strong-session', Date.now() - 600000, Date.now(), allQuestions, answers, [
    s0,
    s1,
    s2,
    s3,
  ]);

  assert(result.estimatedLevel === 'C2', `Strong path correctly estimates C2 level (got ${result.estimatedLevel})`);
  assert(result.overallPercentage === 100, 'Overall percentage calculated accurately');
  assert(result.recommendedLessons.length >= 1 && result.recommendedLessons.length <= 4, 'Recommendations bounded 1-4');
  assert(result.confidence === 'Strong evidence', 'Directly tested C2 results in Strong evidence');
}

// Beginner Learner: B1 -> A2 -> A1 -> A1
{
  const seed = 67890;
  const stage0Questions = selectPlacementQuestionsForStage('B1', 0, seed);
  const s0: PlacementStageResult = {
    stageIndex: 0,
    level: 'B1',
    questionIds: stage0Questions.map((q) => q.id),
    totalQuestions: 6,
    correctCount: 1,
    scorePercentage: 17,
    routingDecision: 'down',
    nextLevel: 'A2',
  };

  const stage1Questions = selectPlacementQuestionsForStage('A2', 1, seed, new Set(s0.questionIds));
  const s1: PlacementStageResult = {
    stageIndex: 1,
    level: 'A2',
    questionIds: stage1Questions.map((q) => q.id),
    totalQuestions: 6,
    correctCount: 1,
    scorePercentage: 17,
    routingDecision: 'down',
    nextLevel: 'A1',
  };

  const stage2Questions = selectPlacementQuestionsForStage('A1', 2, seed, new Set([...s0.questionIds, ...s1.questionIds]));
  const s2: PlacementStageResult = {
    stageIndex: 2,
    level: 'A1',
    questionIds: stage2Questions.map((q) => q.id),
    totalQuestions: 6,
    correctCount: 4,
    scorePercentage: 67,
    routingDecision: 'same',
    nextLevel: 'A1',
  };

  const stage3Questions = selectPlacementQuestionsForStage(
    'A1',
    3,
    seed,
    new Set([...s0.questionIds, ...s1.questionIds, ...s2.questionIds])
  );
  const s3: PlacementStageResult = {
    stageIndex: 3,
    level: 'A1',
    questionIds: stage3Questions.map((q) => q.id),
    totalQuestions: 6,
    correctCount: 4,
    scorePercentage: 67,
    routingDecision: 'same',
    nextLevel: 'A1',
  };

  const allQuestions = [...stage0Questions, ...stage1Questions, ...stage2Questions, ...stage3Questions];
  const answers: Record<string, string> = {};
  for (const q of allQuestions) {
    // 50% wrong
    answers[q.id] = q.options[0].text;
  }

  const result = calculatePlacementResult('beginner-session', Date.now() - 600000, Date.now(), allQuestions, answers, [
    s0,
    s1,
    s2,
    s3,
  ]);

  assert(result.estimatedLevel === 'A1', `Beginner path correctly estimates A1 level (got ${result.estimatedLevel})`);
  assert(ORDERED_CEFR_LEVELS.includes(result.estimatedLevel), 'Result level is valid CEFR');
  assert(!isNaN(result.overallPercentage), 'No NaN in percentage calculation');
}

// 4. Distractor Scoring & Normalization Tests
console.log('\n--- 4. DISTRACTOR SCORING & NORMALIZATION TESTS ---');
{
  assert(normalizeText('  Hello, WORLD!  ') === 'hello world', 'normalizeText strips punctuation and trims casing');
  assert(normalizeText('run...') === 'run', 'normalizeText strips trailing periods');

  // Test Intelligent Meaning Distractors
  const sampleWord = {
    word: {
      id: 'test-word-1',
      word: 'resilient',
      meaning: 'có khả năng phục hồi nhanh',
      vietnamese: 'kiên cường',
      pronunciation: '/rɪˈzɪl.jənt/',
      partOfSpeech: 'adjective' as const,
      level: 'B2' as CEFRLevel,
      example: 'She is resilient.',
      exampleMeaning: 'Cô ấy kiên cường.',
      tags: ['personality', 'psychology'],
    },
    lessonId: 'lesson-1',
    lessonCategory: 'personality',
    lessonTags: ['personality'],
  };

  const poolWords = [
    {
      word: {
        id: 'pool-1',
        word: 'vulnerable',
        meaning: 'dễ bị tổn thương',
        vietnamese: 'dễ tổn thương',
        pronunciation: '/ˈvʌl.nər.ə.bəl/',
        partOfSpeech: 'adjective' as const,
        level: 'B2' as CEFRLevel,
        example: 'He feels vulnerable.',
        exampleMeaning: 'Anh ấy cảm thấy dễ bị tổn thương.',
        tags: ['personality'],
      },
      lessonId: 'lesson-1',
      lessonCategory: 'personality',
      lessonTags: ['personality'],
    },
    {
      word: {
        id: 'pool-2',
        word: 'persist',
        meaning: 'kiên trì tiếp tục',
        vietnamese: 'kiên trì',
        pronunciation: '/pəˈsɪst/',
        partOfSpeech: 'verb' as const,
        level: 'B2' as CEFRLevel,
        example: 'Persist in your efforts.',
        exampleMeaning: 'Hãy kiên trì nỗ lực.',
        tags: ['action'],
      },
      lessonId: 'lesson-2',
      lessonCategory: 'workplace',
      lessonTags: ['action'],
    },
    {
      word: {
        id: 'pool-3',
        word: 'adaptable',
        meaning: 'có khả năng thích nghi',
        vietnamese: 'thích nghi',
        pronunciation: '/əˈdæp.tə.bəl/',
        partOfSpeech: 'adjective' as const,
        level: 'B2' as CEFRLevel,
        example: 'Adaptable to change.',
        exampleMeaning: 'Thích nghi với thay đổi.',
        tags: ['personality', 'psychology'],
      },
      lessonId: 'lesson-1',
      lessonCategory: 'personality',
      lessonTags: ['personality'],
    },
  ];

  const distractors = getIntelligentMeaningDistractors(sampleWord, poolWords, 2);
  assert(distractors.length === 2, `Generated exactly 2 distractors (got ${distractors.length})`);
  assert(!distractors.includes(sampleWord.word.meaning), 'Distractors never include the correct meaning');
  assert(new Set(distractors).size === distractors.length, 'Distractors are completely unique');
}

// 5. Difficulty-Aware Weighted Skill Scoring Tests
console.log('\n--- 5. DIFFICULTY-AWARE WEIGHTED SKILL SCORING TESTS ---');
{
  const testQuestions: PlacementQuestion[] = [
    {
      id: 'q-a1',
      level: 'A1',
      skill: 'vocabulary',
      sourceType: 'curriculum',
      prompt: 'Meaning of cat',
      correctAnswer: 'con mèo',
      options: [{ id: 'opt1', text: 'con mèo' }, { id: 'opt2', text: 'con chó' }, { id: 'opt3', text: 'con chim' }, { id: 'opt4', text: 'con cá' }],
    },
    {
      id: 'q-c2',
      level: 'C2',
      skill: 'vocabulary',
      sourceType: 'curriculum',
      prompt: 'Meaning of quintessential',
      correctAnswer: 'tinh túy',
      options: [{ id: 'opt1', text: 'tinh túy' }, { id: 'opt2', text: 'tầm thường' }, { id: 'opt3', text: 'hời hợt' }, { id: 'opt4', text: 'tạm thời' }],
    },
  ];

  // User gets C2 correct (weight 2.0) and A1 wrong (weight 1.0)
  const answers: Record<string, string> = {
    'q-a1': 'con chó',
    'q-c2': 'tinh túy',
  };

  const performance = calculateSkillPerformance(testQuestions, answers);
  const vocabPerf = performance.vocabulary;

  assert(vocabPerf.attempted === 2, 'Attempted count is 2');
  assert(vocabPerf.correct === 1, 'Correct count is 1');
  assert(vocabPerf.percentage === 50, 'Raw percentage is 50%');
  // Weighted score: (1.0*0 + 2.0*1) / (1.0 + 2.0) = 2.0 / 3.0 = 66.67% -> rounded to 67%
  assert(vocabPerf.weightedScore === 67, `Weighted score reflects higher C2 difficulty (got ${vocabPerf.weightedScore}%, expected 67%)`);
}

// 6. Conservative Confidence Evaluation Tests
console.log('\n--- 6. CONSERVATIVE CONFIDENCE EVALUATION TESTS ---');
{
  // Tentative: Level was never directly tested
  const untestedStages: PlacementStageResult[] = [
    { stageIndex: 0, level: 'B1', questionIds: ['q1','q2','q3','q4','q5','q6'], totalQuestions: 6, correctCount: 1, scorePercentage: 17, routingDecision: 'down', nextLevel: 'A2' },
    { stageIndex: 1, level: 'A2', questionIds: ['q7','q8','q9','q10','q11','q12'], totalQuestions: 6, correctCount: 1, scorePercentage: 17, routingDecision: 'down', nextLevel: 'A1' },
    { stageIndex: 2, level: 'A1', questionIds: ['q13','q14','q15','q16','q17','q18'], totalQuestions: 6, correctCount: 1, scorePercentage: 17, routingDecision: 'down', nextLevel: 'A1' },
    { stageIndex: 3, level: 'A1', questionIds: ['q19','q20','q21','q22','q23','q24'], totalQuestions: 6, correctCount: 1, scorePercentage: 17, routingDecision: 'down', nextLevel: 'A1' },
  ];
  // Even though A1 was tested in stages 2 & 3, score was only 17% (downward routing pressure) -> Moderate / Tentative
  const ev1 = evaluatePlacementEvidence(untestedStages, 'A1');
  assert(ev1.confidence !== 'Strong evidence', 'Low score at bottom level does not yield false Strong evidence');

  // Completely untested level
  const evUntested = evaluatePlacementEvidence([
    { stageIndex: 0, level: 'B1', questionIds: ['q1','q2','q3','q4','q5','q6'], totalQuestions: 6, correctCount: 6, scorePercentage: 100, routingDecision: 'up', nextLevel: 'B2' },
    { stageIndex: 1, level: 'B2', questionIds: ['q7','q8','q9','q10','q11','q12'], totalQuestions: 6, correctCount: 6, scorePercentage: 100, routingDecision: 'up', nextLevel: 'C1' },
  ], 'C2');
  assert(evUntested.confidence === 'Tentative estimate', 'Untested level correctly evaluated as Tentative estimate');
}

// 7. Strict Storage Validation & Comprehensive Attack Tests (Cases A through J)
console.log('\n--- 7. STRICT STORAGE VALIDATION & ATTACK TESTS (A–J) ---');
{
  const validQuestions = selectPlacementQuestionsForStage('B1', 0, 12345);
  const validStage0 = {
    stageIndex: 0,
    level: 'B1' as CEFRLevel,
    questions: validQuestions,
    isLocked: false,
  };

  // Base Valid Active Session at Stage 0
  const baseValidSession = {
    schemaVersion: 1,
    id: 'valid-session-1',
    status: 'active' as const,
    sessionSeed: 12345,
    startedAt: Date.now() - 1000,
    currentStageIndex: 0,
    currentQuestionInStageIndex: 0,
    currentLevel: 'B1' as CEFRLevel,
    stages: [validStage0],
    stageResults: [],
    answers: {
      [validQuestions[0].id]: validQuestions[0].options[0].text,
    },
  };
  assert(validatePlacementSession(baseValidSession), 'Base active session passes validation');

  // Attack Case A: Future unreached stage included in active session (stages.length > currentStageIndex + 1)
  const attackCaseA = {
    ...baseValidSession,
    currentStageIndex: 0,
    stages: [
      validStage0,
      { stageIndex: 1, level: 'B2' as CEFRLevel, questions: selectPlacementQuestionsForStage('B2', 1, 12345), isLocked: false },
    ],
  };
  assert(!validatePlacementSession(attackCaseA), 'Attack Case A: Future unreached stage in active session rejected');

  // Attack Case B: currentLevel mismatch with current stage's level
  const attackCaseB = {
    ...baseValidSession,
    currentLevel: 'C1' as CEFRLevel, // Stage 0 is B1, currentLevel is forged to C1
  };
  assert(!validatePlacementSession(attackCaseB), 'Attack Case B: currentLevel mismatch with current stage rejected');

  // Attack Case C: Unlocked past stage (sIdx < currentStageIndex && !stage.isLocked)
  const validStage1Questions = selectPlacementQuestionsForStage('B2', 1, 12345, new Set(validQuestions.map((q) => q.id)));
  const validStage0Result: PlacementStageResult = {
    stageIndex: 0,
    level: 'B1',
    questionIds: validQuestions.map((q) => q.id),
    totalQuestions: 6,
    correctCount: 6,
    scorePercentage: 100,
    routingDecision: 'up',
    nextLevel: 'B2',
  };

  const attackCaseC = {
    ...baseValidSession,
    currentStageIndex: 1,
    currentLevel: 'B2' as CEFRLevel,
    stages: [
      { ...validStage0, isLocked: false }, // Past stage MUST be locked!
      { stageIndex: 1, level: 'B2' as CEFRLevel, questions: validStage1Questions, isLocked: false },
    ],
    stageResults: [validStage0Result],
  };
  assert(!validatePlacementSession(attackCaseC), 'Attack Case C: Unlocked past stage rejected');

  // Attack Case D: Locked current stage (sIdx === currentStageIndex && stage.isLocked)
  const attackCaseD = {
    ...baseValidSession,
    currentStageIndex: 0,
    stages: [
      { ...validStage0, isLocked: true }, // Current active stage MUST NOT be locked!
    ],
  };
  assert(!validatePlacementSession(attackCaseD), 'Attack Case D: Locked current stage rejected');

  // Attack Case E: Answer text not present in question.options (arbitrary string injection)
  const attackCaseE = {
    ...baseValidSession,
    answers: {
      [validQuestions[0].id]: '<script>alert("injected")</script> forged random answer text',
    },
  };
  assert(!validatePlacementSession(attackCaseE), 'Attack Case E: Answer not belonging to question options rejected');

  // Attack Case F: Stage result score percentage not matching Math.round((correctCount/totalQuestions)*100)
  const forgedPercentageResult: PlacementStageResult = {
    ...validStage0Result,
    correctCount: 4, // 4/6 is 67%
    scorePercentage: 99, // Forged!
  };
  const attackCaseF = {
    ...baseValidSession,
    currentStageIndex: 1,
    currentLevel: 'B2' as CEFRLevel,
    stages: [
      { ...validStage0, isLocked: true },
      { stageIndex: 1, level: 'B2' as CEFRLevel, questions: validStage1Questions, isLocked: false },
    ],
    stageResults: [forgedPercentageResult],
  };
  assert(!validatePlacementSession(attackCaseF), 'Attack Case F: Forged stage score percentage formula rejected');

  // Attack Case G: Stage result questionIds not matching stage questions
  const forgedQuestionIdsResult: PlacementStageResult = {
    ...validStage0Result,
    questionIds: ['fake-q1', 'fake-q2', 'fake-q3', 'fake-q4', 'fake-q5', 'fake-q6'],
  };
  const attackCaseG = {
    ...baseValidSession,
    currentStageIndex: 1,
    currentLevel: 'B2' as CEFRLevel,
    stages: [
      { ...validStage0, isLocked: true },
      { stageIndex: 1, level: 'B2' as CEFRLevel, questions: validStage1Questions, isLocked: false },
    ],
    stageResults: [forgedQuestionIdsResult],
  };
  assert(!validatePlacementSession(attackCaseG), 'Attack Case G: Cross-linked question IDs mismatch rejected');

  // Attack Case H: Stage results count not matching currentStageIndex
  const attackCaseH = {
    ...baseValidSession,
    currentStageIndex: 0,
    stageResults: [validStage0Result], // Stage 0 should have 0 stage results!
  };
  assert(!validatePlacementSession(attackCaseH), 'Attack Case H: Stage results count not matching currentStageIndex rejected');

  // Attack Case I: Tampered report with non-existent lessonId
  const attackCaseI: any = {
    id: 'report-attack-i',
    sessionId: 'session-i',
    date: 'Aug 25, 2026',
    startedAt: Date.now() - 600000,
    completedAt: Date.now(),
    estimatedLevel: 'B1',
    levelTitle: 'Intermediate',
    levelDescription: '...',
    canDoSummary: '...',
    confidence: 'Strong evidence',
    confidenceReason: '...',
    totalQuestions: 24,
    correctCount: 16,
    overallPercentage: 67,
    skillScores: {
      vocabulary: { skill: 'vocabulary', attempted: 6, correct: 4, percentage: 67, weightedScore: 67 },
      'use-of-english': { skill: 'use-of-english', attempted: 6, correct: 4, percentage: 67, weightedScore: 67 },
      reading: { skill: 'reading', attempted: 6, correct: 4, percentage: 67, weightedScore: 67 },
      listening: { skill: 'listening', attempted: 6, correct: 4, percentage: 67, weightedScore: 67 },
    },
    stagePath: [
      { stageIndex: 0, level: 'B1', questionIds: ['q1','q2','q3','q4','q5','q6'], totalQuestions: 6, correctCount: 4, scorePercentage: 67, routingDecision: 'same', nextLevel: 'B1' },
      { stageIndex: 1, level: 'B1', questionIds: ['q7','q8','q9','q10','q11','q12'], totalQuestions: 6, correctCount: 4, scorePercentage: 67, routingDecision: 'same', nextLevel: 'B1' },
      { stageIndex: 2, level: 'B1', questionIds: ['q13','q14','q15','q16','q17','q18'], totalQuestions: 6, correctCount: 4, scorePercentage: 67, routingDecision: 'same', nextLevel: 'B1' },
      { stageIndex: 3, level: 'B1', questionIds: ['q19','q20','q21','q22','q23','q24'], totalQuestions: 6, correctCount: 4, scorePercentage: 67, routingDecision: 'same', nextLevel: 'B1' },
    ],
    recommendedLessons: [
      {
        lessonId: 'fake-non-existent-lesson-id-9999',
        lessonTitle: 'Fake Lesson',
        level: 'B1',
        category: 'Vocabulary',
        reason: 'Test',
      },
    ],
    missedTargetItems: [],
  };
  assert(!validatePlacementResultReport(attackCaseI), 'Attack Case I: Report with non-existent lessonId rejected');

  // Attack Case J: Smart Review Export Idempotency & Canonical Items Verification
  console.log('\n--- 8. SMART REVIEW EXPORT IDEMPOTENCY & CANONICAL RESOLUTION TESTS ---');
  const reportId = 'placement-report-idempotency-test-1';
  assert(!isPlacementResultExportedToReview(reportId), 'Report ID is initially not exported');

  const exportResult = exportPlacementMissedToReview(reportId, ['device']);
  assert(exportResult.success, 'First export to review succeeds');
  assert(isPlacementResultExportedToReview(reportId), 'Report ID is marked as exported in canonical review storage');

  // Second call must be idempotent
  const secondExportResult = exportPlacementMissedToReview(reportId, ['device']);
  assert(secondExportResult.success, 'Subsequent export calls remain idempotent');
  assert(isPlacementResultExportedToReview(reportId), 'Subsequent export calls remain recognized as exported');

  // Test canonical word resolution against real curriculum
  const realLessonWordId = 'device'; // Known curriculum word ID from B1 Technology lesson
  const fakeWordId = 'fake-word-id-9999';
  assert(Boolean(resolveCurriculumItem(realLessonWordId)), 'Real curriculum word resolves properly');
  assert(!resolveCurriculumItem(fakeWordId), 'Fake word ID does not resolve in curriculum index');
  // 9. Fault Injection & Persistence Durability Tests
  console.log('\n--- 9. FAULT INJECTION & PERSISTENCE DURABILITY TESTS ---');
  {
    const originalSetItem = (global as any).localStorage.setItem;
    const originalRemoveItem = (global as any).localStorage.removeItem;

    const testReport: any = {
      id: 'placement-durability-test-report',
      sessionId: 'session-durability-1',
      date: '2026-08-29',
      startedAt: Date.now() - 50000,
      completedAt: Date.now(),
      estimatedLevel: 'B1',
      levelTitle: 'Independent User',
      levelDescription: 'Can understand the main points of clear standard input on familiar matters.',
      canDoSummary: 'Can produce simple connected text on topics which are familiar or of personal interest.',
      confidence: 'Strong evidence',
      confidenceReason: 'Consistent performance across adaptive stages.',
      totalQuestions: 24,
      correctCount: 16,
      overallPercentage: 67,
      skillScores: {
        vocabulary: { skill: 'vocabulary', attempted: 6, correct: 4, percentage: 67, weightedScore: 67 },
        'use-of-english': { skill: 'use-of-english', attempted: 6, correct: 4, percentage: 67, weightedScore: 67 },
        reading: { skill: 'reading', attempted: 6, correct: 4, percentage: 67, weightedScore: 67 },
        listening: { skill: 'listening', attempted: 6, correct: 4, percentage: 67, weightedScore: 67 },
      },
      stagePath: [
        { stageIndex: 0, level: 'B1', questionIds: ['q1','q2','q3','q4','q5','q6'], totalQuestions: 6, correctCount: 4, scorePercentage: 67, routingDecision: 'same', nextLevel: 'B1' },
        { stageIndex: 1, level: 'B1', questionIds: ['q7','q8','q9','q10','q11','q12'], totalQuestions: 6, correctCount: 4, scorePercentage: 67, routingDecision: 'same', nextLevel: 'B1' },
        { stageIndex: 2, level: 'B1', questionIds: ['q13','q14','q15','q16','q17','q18'], totalQuestions: 6, correctCount: 4, scorePercentage: 67, routingDecision: 'same', nextLevel: 'B1' },
        { stageIndex: 3, level: 'B1', questionIds: ['q19','q20','q21','q22','q23','q24'], totalQuestions: 6, correctCount: 4, scorePercentage: 67, routingDecision: 'same', nextLevel: 'B1' },
      ],
      recommendedLessons: [],
      missedTargetItems: [],
    };

    // Case 1: Active Placement save fails gracefully
    (global as any).localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const {
      saveActivePlacement,
      savePlacementResultToHistory,
      clearActivePlacement,
      loadActivePlacement,
      loadPlacementHistory,
    } = await import('../src/features/placement/placementStorage');

    const saveActiveResult = saveActivePlacement(baseValidSession as any);
    assert(saveActiveResult === false, 'Fault Injection: saveActivePlacement returns false on storage quota error without throwing');

    // Case 2a: Matrix Permutation - latestSaved=false, historySaved=false -> success=false
    const resBothFailed = savePlacementResultToHistory(testReport);
    assert(resBothFailed.latestSaved === false, 'Matrix 1: latestSaved is false when both fail');
    assert(resBothFailed.historySaved === false, 'Matrix 1: historySaved is false when both fail');
    assert(resBothFailed.success === false, 'Matrix 1: overall success is false when both fail');

    // Case 2b: Matrix Permutation - latestSaved=true, historySaved=false -> success MUST BE false
    (global as any).localStorage.setItem = (key: string, val: string) => {
      if (key === 'flipenglish_placement_latest_report_v1') {
        mockStorage[key] = String(val);
      } else if (key === 'flipenglish_placement_history_v1') {
        throw new Error('QuotaExceededError on history');
      }
    };
    const resLatestOnly = savePlacementResultToHistory(testReport);
    assert(resLatestOnly.latestSaved === true, 'Matrix 2: latestSaved is true');
    assert(resLatestOnly.historySaved === false, 'Matrix 2: historySaved is false');
    assert(resLatestOnly.success === false, 'Matrix 2: success MUST be false when history write fails (no false success UI)');

    // Case 2c: Matrix Permutation - latestSaved=false, historySaved=true -> success MUST BE false
    (global as any).localStorage.setItem = (key: string, val: string) => {
      if (key === 'flipenglish_placement_latest_report_v1') {
        throw new Error('QuotaExceededError on latest');
      } else if (key === 'flipenglish_placement_history_v1') {
        mockStorage[key] = String(val);
      }
    };
    const resHistoryOnly = savePlacementResultToHistory(testReport);
    assert(resHistoryOnly.latestSaved === false, 'Matrix 3: latestSaved is false');
    assert(resHistoryOnly.historySaved === true, 'Matrix 3: historySaved is true');
    assert(resHistoryOnly.success === false, 'Matrix 3: success MUST be false when latest write fails');

    // Case 2d: Matrix Permutation - latestSaved=true, historySaved=true -> success is true
    (global as any).localStorage.setItem = originalSetItem;
    const resBothOk = savePlacementResultToHistory(testReport);
    assert(resBothOk.latestSaved === true, 'Matrix 4: latestSaved is true');
    assert(resBothOk.historySaved === true, 'Matrix 4: historySaved is true');
    assert(resBothOk.success === true, 'Matrix 4: success is true when both succeed');

    // Case 3: Clear active placement fails gracefully on removal error
    (global as any).localStorage.removeItem = () => {
      throw new Error('SecurityError');
    };
    const clearActiveResult = clearActivePlacement();
    assert(clearActiveResult === false, 'Fault Injection: clearActivePlacement returns false on removal error without throwing');

    // Case 5: Completed placement cleanup failure -> verify completed session is NOT offered as resumable
    (global as any).localStorage.removeItem = originalRemoveItem;
    const completedSession = {
      ...baseValidSession,
      status: 'completed' as const,
      completedAt: Date.now(),
    };
    (global as any).localStorage.setItem('flipenglish_placement_active_v1', JSON.stringify(completedSession));
    const loadedCompleted = loadActivePlacement();
    assert(loadedCompleted === null, 'Completed placement session left in active storage key is rejected and cleared, never offered as resumable');

    // Case 6: Idempotent history saving prevents duplicate entries on retry
    const historyAfterFirst = loadPlacementHistory();
    const countFirst = historyAfterFirst.filter((h) => h.id === testReport.id).length;
    assert(countFirst === 1, 'Report appears once in placement history');

    const retryRes = savePlacementResultToHistory(testReport); // Retry
    assert(retryRes.success === true, 'Successful retry placement history write');
    const historyAfterSecond = loadPlacementHistory();
    const countSecond = historyAfterSecond.filter((h) => h.id === testReport.id).length;
    assert(countSecond === 1, 'Retry did not create duplicate placement history entries (idempotent)');

    // 10. Placement Result & Session Lifecycle Matrix (P1 - P6)
    console.log('\n--- 10. PLACEMENT RESULT & SESSION LIFECYCLE MATRIX (P1 - P6) ---');

    // P1: Both saves fail -> persistenceState latestSaved=false, historySaved=false, success=false
    (global as any).localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const p1Res = savePlacementResultToHistory(testReport);
    assert(p1Res.latestSaved === false && p1Res.historySaved === false && p1Res.success === false, 'P1: Both saves fail -> persistenceState.success is false');

    // P2: Latest succeeds, history fails -> success is false, retry available
    (global as any).localStorage.setItem = (key: string, val: string) => {
      if (key === 'flipenglish_placement_latest_report_v1') {
        mockStorage[key] = String(val);
      } else {
        throw new Error('QuotaExceededError on history');
      }
    };
    const p2Res = savePlacementResultToHistory(testReport);
    assert(p2Res.latestSaved === true && p2Res.historySaved === false && p2Res.success === false, 'P2: Latest succeeds, history fails -> persistenceState.success is false');

    // P3: History succeeds, latest fails -> success is false
    (global as any).localStorage.setItem = (key: string, val: string) => {
      if (key === 'flipenglish_placement_history_v1') {
        mockStorage[key] = String(val);
      } else {
        throw new Error('QuotaExceededError on latest');
      }
    };
    const p3Res = savePlacementResultToHistory(testReport);
    assert(p3Res.latestSaved === false && p3Res.historySaved === true && p3Res.success === false, 'P3: History succeeds, latest fails -> persistenceState.success is false');

    // P4: Both succeed -> success is true
    (global as any).localStorage.setItem = originalSetItem;
    const p4Res = savePlacementResultToHistory(testReport);
    assert(p4Res.latestSaved === true && p4Res.historySaved === true && p4Res.success === true, 'P4: Both succeed -> persistenceState.success is true');

    // P5: Active clear fails -> verify completed session does NOT resurrect
    const activeTestSession = {
      ...baseValidSession,
      status: 'completed' as const,
      completedAt: Date.now(),
    };
    mockStorage['flipenglish_placement_active_v1'] = JSON.stringify(activeTestSession);
    (global as any).localStorage.removeItem = () => {
      throw new Error('SecurityError');
    };
    const p5ClearRes = clearActivePlacement();
    assert(p5ClearRes === false, 'P5: clearActivePlacement returns false on storage error');
    assert(loadActivePlacement() === null, 'P5: loadActivePlacement discards completed session and never resurrects');

    // P6: Retry save on P2/P3 -> deduplicates history
    (global as any).localStorage.removeItem = originalRemoveItem;
    const p6Report = { ...testReport, id: 'placement-p6-idempotent-report' };
    const p6FirstRes = savePlacementResultToHistory(p6Report);
    assert(p6FirstRes.success === true, 'P6: Initial history save succeeds');
    const p6RetryRes = savePlacementResultToHistory(p6Report);
    assert(p6RetryRes.success === true, 'P6: Retry history save succeeds');
    const p6History = loadPlacementHistory();
    const p6Entries = p6History.filter((r) => r.id === 'placement-p6-idempotent-report');
    assert(p6Entries.length === 1, 'P6: Deduplicated history: exactly 1 entry for report ID after retry');

    // Restore original mock functions
    (global as any).localStorage.setItem = originalSetItem;
    (global as any).localStorage.removeItem = originalRemoveItem;
  }
}

console.log('\n--- PLACEMENT VALIDATION SUMMARY ---');
if (failedTests === 0) {
  console.log('ALL PLACEMENT AND ATTACK RESISTANCE TESTS PASSED SUCCESSFULLY! (0 failures)\n');
} else {
  console.error(`VALIDATION FAILED WITH ${failedTests} FAILURE(S)!\n`);
  process.exit(1);
}
