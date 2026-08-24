import { buildPlacementPool, selectPlacementQuestionsForStage, isValidPlacementQuestion, createSeededRandom, seededShuffle } from '../src/data/placement/placementPool';
import { routeNextLevel, calculatePlacementResult, calculateSkillPerformance } from '../src/features/placement/placementEngine';
import { validatePlacementSession } from '../src/features/placement/placementStorage';
import { ORDERED_CEFR_LEVELS, CEFRLevel, PlacementStageResult } from '../src/features/placement/placementTypes';

console.log('--- STARTING PLACEMENT TEST SUITE & VALIDATION ---\n');

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

// B1 + 6/6 -> B2
const r1 = routeNextLevel('B1', 6, 6);
assert(r1.nextLevel === 'B2' && r1.decision === 'up', 'B1 with 6/6 routes UP to B2');

// B1 + 5/6 -> B2
const r2 = routeNextLevel('B1', 5, 6);
assert(r2.nextLevel === 'B2' && r2.decision === 'up', 'B1 with 5/6 routes UP to B2');

// B1 + 4/6 -> B1
const r3 = routeNextLevel('B1', 4, 6);
assert(r3.nextLevel === 'B1' && r3.decision === 'same', 'B1 with 4/6 STAYS at B1');

// B1 + 3/6 -> B1
const r4 = routeNextLevel('B1', 3, 6);
assert(r4.nextLevel === 'B1' && r4.decision === 'same', 'B1 with 3/6 STAYS at B1');

// B1 + 2/6 -> A2
const r5 = routeNextLevel('B1', 2, 6);
assert(r5.nextLevel === 'A2' && r5.decision === 'down', 'B1 with 2/6 routes DOWN to A2');

// B1 + 0/6 -> A2
const r6 = routeNextLevel('B1', 0, 6);
assert(r6.nextLevel === 'A2' && r6.decision === 'down', 'B1 with 0/6 routes DOWN to A2');

// A1 + 0/6 -> A1 (clamped at bottom)
const r7 = routeNextLevel('A1', 0, 6);
assert(r7.nextLevel === 'A1' && r7.decision === 'down', 'A1 with 0/6 clamps at A1');

// C2 + 6/6 -> C2 (clamped at top)
const r8 = routeNextLevel('C2', 6, 6);
assert(r8.nextLevel === 'C2' && r8.decision === 'up', 'C2 with 6/6 clamps at C2');

// 3. Multi-Stage Path Simulation Tests
console.log('\n--- 3. MULTI-STAGE PATH SIMULATION TESTS ---');

// Strong Learner: B1 -> B2 -> C1 -> C2
{
  const seed = 12345;
  const stage0Questions = selectPlacementQuestionsForStage('B1', 0, seed);
  assert(stage0Questions.length === 6, 'Stage 0 selected exactly 6 questions');

  const s0: PlacementStageResult = {
    stageIndex: 0,
    level: 'B1',
    questionIds: stage0Questions.map((q) => q.id),
    totalQuestions: 6,
    correctCount: 6,
    scorePercentage: 100,
    routingDecision: 'up',
    nextLevel: 'B2',
  };

  const stage1Questions = selectPlacementQuestionsForStage('B2', 1, seed, new Set(s0.questionIds));
  assert(stage1Questions.length === 6, 'Stage 1 selected exactly 6 questions');

  const s1: PlacementStageResult = {
    stageIndex: 1,
    level: 'B2',
    questionIds: stage1Questions.map((q) => q.id),
    totalQuestions: 6,
    correctCount: 5,
    scorePercentage: 83,
    routingDecision: 'up',
    nextLevel: 'C1',
  };

  const stage2Questions = selectPlacementQuestionsForStage('C1', 2, seed, new Set([...s0.questionIds, ...s1.questionIds]));
  assert(stage2Questions.length === 6, 'Stage 2 selected exactly 6 questions');

  const s2: PlacementStageResult = {
    stageIndex: 2,
    level: 'C1',
    questionIds: stage2Questions.map((q) => q.id),
    totalQuestions: 6,
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
  assert(stage3Questions.length === 6, 'Stage 3 selected exactly 6 questions');

  const s3: PlacementStageResult = {
    stageIndex: 3,
    level: 'C2',
    questionIds: stage3Questions.map((q) => q.id),
    totalQuestions: 6,
    correctCount: 4,
    scorePercentage: 67,
    routingDecision: 'same',
    nextLevel: 'C2',
  };

  const allQuestions = [...stage0Questions, ...stage1Questions, ...stage2Questions, ...stage3Questions];
  assert(allQuestions.length === 24, 'Total completed session has exactly 24 questions');

  // Verify all 24 questions have unique IDs
  const uniqueIds = new Set(allQuestions.map((q) => q.id));
  assert(uniqueIds.size === 24, 'All 24 selected questions have unique IDs');

  // Create simulated answers
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

// 4. Seeded Random and Reproducibility Tests
console.log('\n--- 4. SEEDED RANDOM REPRODUCIBILITY TESTS ---');
{
  const seed = 42;
  const q1 = selectPlacementQuestionsForStage('B1', 0, seed);
  const q2 = selectPlacementQuestionsForStage('B1', 0, seed);
  assert(
    q1.map((q) => q.id).join(',') === q2.map((q) => q.id).join(','),
    'Same session seed produces identical stage questions'
  );

  const diffSeed = 999;
  const q3 = selectPlacementQuestionsForStage('B1', 0, diffSeed);
  assert(
    q1.map((q) => q.id).join(',') !== q3.map((q) => q.id).join(','),
    'Different seed varies stage question selection'
  );
}

// 5. Storage Validation & Corruption Resistance
console.log('\n--- 5. STORAGE VALIDATION & CORRUPTION TESTS ---');
{
  assert(!validatePlacementSession(null), 'Null session rejected');
  assert(!validatePlacementSession({ schemaVersion: 99 }), 'Invalid schema version rejected');
  assert(!validatePlacementSession({ schemaVersion: 1, currentLevel: 'Z9' }), 'Invalid CEFR level rejected');
  assert(!validatePlacementSession({ schemaVersion: 1, stages: new Array(1000) }), '1000 stages rejected');
}

console.log('\n--- PLACEMENT VALIDATION SUMMARY ---');
if (failedTests === 0) {
  console.log('ALL PLACEMENT TESTS PASSED SUCCESSFULLY! (0 failures)\n');
} else {
  console.error(`VALIDATION FAILED WITH ${failedTests} FAILURE(S)!\n`);
  process.exit(1);
}
