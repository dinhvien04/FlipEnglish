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
} from '../src/features/placement/placementStorage';
import {
  ORDERED_CEFR_LEVELS,
  CEFRLevel,
  PlacementStageResult,
  PlacementQuestion,
  PLACEMENT_STAGE_SIZE,
  PLACEMENT_TOTAL_QUESTIONS,
} from '../src/features/placement/placementTypes';

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

// 7. Strict Storage Validation & Attack Resistance Tests
console.log('\n--- 7. STRICT STORAGE VALIDATION & ATTACK TESTS ---');
{
  // Attack Case 1: Tampered question count in stage
  const tamperedStageCount: any = {
    schemaVersion: 1,
    id: 'test-1',
    status: 'active',
    sessionSeed: 12345,
    startedAt: Date.now() - 1000,
    currentStageIndex: 0,
    currentQuestionInStageIndex: 0,
    currentLevel: 'B1',
    stages: [
      {
        stageIndex: 0,
        level: 'B1',
        questions: selectPlacementQuestionsForStage('B1', 0, 12345).slice(0, 5), // ONLY 5 questions!
        isLocked: false,
      },
    ],
    stageResults: [],
    answers: {},
  };
  assert(!validatePlacementSession(tamperedStageCount), 'Session with 5 questions in stage rejected (must be exactly 6)');

  // Attack Case 2: Inconsistent routing decision in stageResults
  const validQuestions = selectPlacementQuestionsForStage('B1', 0, 12345);
  const inconsistentRouting: any = {
    schemaVersion: 1,
    id: 'test-2',
    status: 'active',
    sessionSeed: 12345,
    startedAt: Date.now() - 1000,
    currentStageIndex: 1,
    currentQuestionInStageIndex: 0,
    currentLevel: 'B2',
    stages: [
      { stageIndex: 0, level: 'B1', questions: validQuestions, isLocked: true },
      { stageIndex: 1, level: 'B2', questions: selectPlacementQuestionsForStage('B2', 1, 12345), isLocked: false },
    ],
    stageResults: [
      {
        stageIndex: 0,
        level: 'B1',
        questionIds: validQuestions.map((q) => q.id),
        totalQuestions: 6,
        correctCount: 6, // 6/6 MUST route UP to B2
        scorePercentage: 100,
        routingDecision: 'down', // FORGED: claims 'down' to A2
        nextLevel: 'A2',
      },
    ],
    answers: {},
  };
  assert(!validatePlacementSession(inconsistentRouting), 'Session with forged routing decision rejected');

  // Attack Case 3: Unlocked previous stage
  const unlockedPreviousStage: any = {
    schemaVersion: 1,
    id: 'test-3',
    status: 'active',
    sessionSeed: 12345,
    startedAt: Date.now() - 1000,
    currentStageIndex: 1,
    currentQuestionInStageIndex: 0,
    currentLevel: 'B2',
    stages: [
      { stageIndex: 0, level: 'B1', questions: validQuestions, isLocked: false }, // FORGED: should be locked!
      { stageIndex: 1, level: 'B2', questions: selectPlacementQuestionsForStage('B2', 1, 12345), isLocked: false },
    ],
    stageResults: [
      {
        stageIndex: 0,
        level: 'B1',
        questionIds: validQuestions.map((q) => q.id),
        totalQuestions: 6,
        correctCount: 6,
        scorePercentage: 100,
        routingDecision: 'up',
        nextLevel: 'B2',
      },
    ],
    answers: {},
  };
  assert(!validatePlacementSession(unlockedPreviousStage), 'Session with unlocked previous stage rejected');

  // Attack Case 4: Non-existent lesson in recommended lessons report
  const forgedReport: any = {
    id: 'report-1',
    sessionId: 'session-1',
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
  assert(!validatePlacementResultReport(forgedReport), 'Report with non-existent lessonId rejected');
}

console.log('\n--- PLACEMENT VALIDATION SUMMARY ---');
if (failedTests === 0) {
  console.log('ALL PLACEMENT AND ATTACK RESISTANCE TESTS PASSED SUCCESSFULLY! (0 failures)\n');
} else {
  console.error(`VALIDATION FAILED WITH ${failedTests} FAILURE(S)!\n`);
  process.exit(1);
}
