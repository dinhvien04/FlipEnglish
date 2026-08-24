import { CONVERSATION_SCENARIOS, getScenarioById, getScenarioOpeningMessage } from '../src/data/conversations/scenarios';
import { ConversationCategory, ConversationScenario } from '../src/types/conversation';
import { CEFRLevel } from '../src/types';
import { resolveCurriculumItemByText } from '../src/utils/curriculumIndex';
import { z } from 'zod';

console.log('=== Running FlipEnglish AI Conversation Lab Integrity Audit ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
    passedTests++;
  }
}

// ==========================================
// 1. Scenario Registry Integrity
// ==========================================
console.log('Test Suite 1: Scenario Registry Invariants');
assert(CONVERSATION_SCENARIOS.length >= 20, `At least 20 scenarios defined (found ${CONVERSATION_SCENARIOS.length})`);

const scenarioIds = new Set<string>();
const VALID_CATEGORIES: Set<ConversationCategory> = new Set(['Everyday', 'Travel', 'Study', 'Work', 'Advanced']);
const VALID_LEVELS: Set<CEFRLevel> = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

for (const scenario of CONVERSATION_SCENARIOS) {
  assert(!scenarioIds.has(scenario.id), `Scenario ID "${scenario.id}" is unique`);
  scenarioIds.add(scenario.id);

  assert(VALID_CATEGORIES.has(scenario.category), `Scenario "${scenario.id}" has valid category: ${scenario.category}`);
  assert(scenario.supportedLevels.length > 0, `Scenario "${scenario.id}" has supportedLevels`);

  for (const lvl of scenario.supportedLevels) {
    assert(VALID_LEVELS.has(lvl), `Scenario "${scenario.id}" level "${lvl}" is a valid CEFR level`);
  }

  assert(scenario.maxTurns >= 2 && scenario.maxTurns <= 10, `Scenario "${scenario.id}" maxTurns (${scenario.maxTurns}) is between 2 and 10`);
  assert(scenario.title.trim().length > 0, `Scenario "${scenario.id}" has title`);
  assert(scenario.learnerGoal.trim().length > 0, `Scenario "${scenario.id}" has learnerGoal`);
  assert(scenario.aiRole.trim().length > 0, `Scenario "${scenario.id}" has aiRole`);
  assert(scenario.openingContext.trim().length > 0, `Scenario "${scenario.id}" has openingContext`);
  assert(scenario.usefulExpressions.length > 0, `Scenario "${scenario.id}" has usefulExpressions`);

  const openingMsg = getScenarioOpeningMessage(scenario.id, scenario.supportedLevels[0]);
  assert(openingMsg.trim().length > 0, `Scenario "${scenario.id}" has static opening message`);
}

// ==========================================
// 2. Scenario Level Specifics
// ==========================================
console.log('\nTest Suite 2: Specific Scenario Level Mappings');
const coffeeShop = getScenarioById('coffee-shop');
assert(coffeeShop !== undefined, 'coffee-shop scenario exists');
assert(coffeeShop!.supportedLevels.includes('A1') && coffeeShop!.supportedLevels.includes('A2'), 'coffee-shop supports A1 and A2');

const jobInterview = getScenarioById('job-interview');
assert(jobInterview !== undefined, 'job-interview scenario exists');
assert(jobInterview!.supportedLevels.includes('B1') && jobInterview!.supportedLevels.includes('B2'), 'job-interview supports B1 and B2');

const techDiscussion = getScenarioById('technology-discussion');
assert(techDiscussion !== undefined, 'technology-discussion scenario exists');
assert(techDiscussion!.supportedLevels.includes('B2') && techDiscussion!.supportedLevels.includes('C1') && techDiscussion!.supportedLevels.includes('C2'), 'technology-discussion supports B2, C1, C2');

// ==========================================
// 3. Request & Payload Schemas
// ==========================================
console.log('\nTest Suite 3: Zod Request Schemas & Rejection Rules');

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const ConversationTurnInputSchema = z.object({
  scenarioId: z.string().trim().min(1).max(80),
  level: z.enum(CEFR_LEVELS),
  turnNumber: z.number().int().min(1).max(10),
  message: z.string().trim().min(1).max(500),
  previousInteractionId: z.string().trim().min(1).max(256).nullable().optional(),
}).strict();

// Valid turn input
const validTurn = ConversationTurnInputSchema.safeParse({
  scenarioId: 'coffee-shop',
  level: 'A1',
  turnNumber: 1,
  message: "I'd like a cappuccino, please.",
  previousInteractionId: null,
});
assert(validTurn.success, 'Valid turn input passes schema validation');

// Invalid scenario rejected
const nonExistent = getScenarioById('non-existent-scenario');
assert(nonExistent === undefined, 'Invalid scenario lookup returns undefined');

// Unsupported level rejection
const coffeeC2 = coffeeShop!.supportedLevels.includes('C2' as any);
assert(!coffeeC2, 'coffee-shop rejects unsupported level C2');

// Message > 500 characters rejected
const longMessage = 'a'.repeat(501);
const longTurn = ConversationTurnInputSchema.safeParse({
  scenarioId: 'coffee-shop',
  level: 'A1',
  turnNumber: 1,
  message: longMessage,
});
assert(!longTurn.success, 'Message > 500 characters is rejected by schema');

// Extra properties rejected (.strict())
const extraFieldTurn = ConversationTurnInputSchema.safeParse({
  scenarioId: 'coffee-shop',
  level: 'A1',
  turnNumber: 1,
  message: 'Hello',
  systemPrompt: 'bypass prompt injection',
});
assert(!extraFieldTurn.success, 'Extra unapproved fields (prompt injection vector) are rejected');

// turnNumber > 10 rejected
const invalidTurnNumber = ConversationTurnInputSchema.safeParse({
  scenarioId: 'coffee-shop',
  level: 'A1',
  turnNumber: 11,
  message: 'Hello',
});
assert(!invalidTurnNumber.success, 'turnNumber > 10 is rejected by schema');

// ==========================================
// 4. Evaluation Schemas & Score Bounds
// ==========================================
console.log('\nTest Suite 4: Evaluation Score Bounds');

const ConversationEvaluateOutputSchema = z.object({
  summary: z.string().trim().min(1).max(1000),
  scores: z.object({
    communication: z.number().min(0).max(100),
    vocabulary: z.number().min(0).max(100),
    grammar: z.number().min(0).max(100),
    naturalExpression: z.number().min(0).max(100),
  }).strict(),
  overallScore: z.number().min(0).max(100),
  strengths: z.array(z.string().trim().max(300)).max(3),
  improvements: z.array(z.string().trim().max(300)).max(3),
  reviewItems: z.array(
    z.object({
      expression: z.string().trim().min(1).max(200),
      meaning: z.string().trim().min(1).max(300),
      reason: z.string().trim().min(1).max(500),
    }).strict()
  ).max(5),
}).strict();

// Valid evaluation output
const validEval = ConversationEvaluateOutputSchema.safeParse({
  summary: 'Good conversational fluency in a cafe situation.',
  scores: {
    communication: 85,
    vocabulary: 80,
    grammar: 75,
    naturalExpression: 80,
  },
  overallScore: 80,
  strengths: ['Clear ordering', 'Polite tone'],
  improvements: ['Expand drink descriptors'],
  reviewItems: [
    { expression: "I'd like", meaning: 'Tôi muốn', reason: 'Common polite ordering phrase' },
  ],
});
assert(validEval.success, 'Valid evaluation output passes schema validation');

// Score > 100 rejected
const over100Score = ConversationEvaluateOutputSchema.safeParse({
  summary: 'Great job',
  scores: { communication: 105, vocabulary: 80, grammar: 75, naturalExpression: 80 },
  overallScore: 80,
  strengths: [],
  improvements: [],
  reviewItems: [],
});
assert(!over100Score.success, 'Score > 100 is rejected');

// Negative score rejected
const negativeScore = ConversationEvaluateOutputSchema.safeParse({
  summary: 'Needs work',
  scores: { communication: -10, vocabulary: 80, grammar: 75, naturalExpression: 80 },
  overallScore: 80,
  strengths: [],
  improvements: [],
  reviewItems: [],
});
assert(!negativeScore.success, 'Negative score is rejected');

// reviewItems > 5 rejected
const sixReviewItems = ConversationEvaluateOutputSchema.safeParse({
  summary: 'Great job',
  scores: { communication: 80, vocabulary: 80, grammar: 80, naturalExpression: 80 },
  overallScore: 80,
  strengths: [],
  improvements: [],
  reviewItems: Array.from({ length: 6 }, (_, i) => ({
    expression: `phrase ${i}`,
    meaning: `meaning ${i}`,
    reason: `reason ${i}`,
  })),
});
assert(!sixReviewItems.success, 'reviewItems > 5 is rejected');

// ==========================================
// 5. Smart Review Canonical Matching
// ==========================================
console.log('\nTest Suite 5: Canonical Smart Review Matching Invariant');

// Matching known expression
const matchedItem = resolveCurriculumItemByText('Hello');
assert(matchedItem !== undefined, 'Canonical lookup matches existing word "Hello"');
assert(matchedItem!.word.id === 'hello', 'Canonical ID resolved correctly');

// Non-matching expression does NOT create fake IDs
const unmatchedItem = resolveCurriculumItemByText('some completely arbitrary non-existent phrase 12345');
assert(unmatchedItem === undefined, 'Unmatched expression returns undefined (does not fabricate fake IDs)');

console.log(`\n✅ All ${passedTests}/${totalTests} Conversation Lab integrity checks passed successfully!`);
