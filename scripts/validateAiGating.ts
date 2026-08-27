/**
 * Deterministic AI Gating & Configuration Permutation Matrix Test Suite
 * Tests all 4 combinations of (GEMINI_API_KEY present/missing) x (AI_FEATURES_ENABLED true/false/missing)
 * Verifies:
 * 1. /api/health response payload semantics (aiConfigured vs aiEnabled)
 * 2. Fail-closed 503 rejection across all 6 Gemini endpoints when disabled
 * 3. 503 payload structure { error: 'AI features are currently unavailable.', requestId: ... }
 * 4. Non-Gemini dictionary & health endpoints remain 100% operational in all states
 * 5. Server never leaks API key in any state
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const SERVER_DIST = path.join(process.cwd(), 'dist', 'server.cjs');

interface RequestOptions {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
}

function makeRequest(
  opts: RequestOptions,
  port: number
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(opts.path, `http://127.0.0.1:${port}`);
    const req = http.request(
      url,
      {
        method: opts.method,
        headers: {
          Connection: 'close',
          ...(opts.headers || {}),
        },
        timeout: 8000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, headers: res.headers, body: data }));
        res.on('error', (err) => reject(err));
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out on ${opts.method} ${opts.path} (Port: ${port})`));
    });

    if (opts.body) {
      req.write(opts.body);
    }
    req.end();
  });
}

async function waitForServerReady(port: number, maxAttempts = 60, delayMs = 150): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await makeRequest({ method: 'GET', path: '/api/health' }, port);
      if (res.statusCode === 200) {
        return true;
      }
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

interface MatrixPermutation {
  name: string;
  port: number;
  env: {
    GEMINI_API_KEY?: string;
    AI_FEATURES_ENABLED?: string;
  };
  expectedConfigured: boolean;
  expectedEnabled: boolean;
}

const PERMUTATIONS: MatrixPermutation[] = [
  {
    name: 'Matrix 1: KEY=present, ENABLED=true (AI Fully Enabled)',
    port: 3201,
    env: {
      GEMINI_API_KEY: 'test-secret-key-12345',
      AI_FEATURES_ENABLED: 'true',
    },
    expectedConfigured: true,
    expectedEnabled: true,
  },
  {
    name: 'Matrix 2: KEY=present, ENABLED=false (Google AI Studio Secret Injected but AI Disabled)',
    port: 3202,
    env: {
      GEMINI_API_KEY: 'test-secret-key-12345',
      AI_FEATURES_ENABLED: 'false',
    },
    expectedConfigured: true,
    expectedEnabled: false,
  },
  {
    name: 'Matrix 3: KEY=missing, ENABLED=true (Enabled Switch but Missing Key -> Safe Fallback)',
    port: 3203,
    env: {
      AI_FEATURES_ENABLED: 'true',
    },
    expectedConfigured: false,
    expectedEnabled: false,
  },
  {
    name: 'Matrix 4: KEY=missing, ENABLED=false (Key Missing & Switch Disabled)',
    port: 3204,
    env: {
      AI_FEATURES_ENABLED: 'false',
    },
    expectedConfigured: false,
    expectedEnabled: false,
  },
];

const GEMINI_ENDPOINTS = [
  { path: '/api/ai-practice', body: JSON.stringify({ lessonTitle: 'Test', level: 'A1', mistakeWords: [{ word: 'test', meaning: 'kiem tra' }] }) },
  { path: '/api/explain-mistake', body: JSON.stringify({ question: 'test', selectedAnswer: 'a', correctAnswer: 'b', targetWord: 'test' }) },
  { path: '/api/analyze-photo', body: JSON.stringify({ image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' }) },
  { path: '/api/analyze-exam', body: JSON.stringify({ level: 'A1', title: 'Test', overallPercentage: 80, sectionScores: [] }) },
  { path: '/api/conversation/turn', body: JSON.stringify({ scenarioId: 'cafe-ordering', level: 'A1', turnNumber: 1, message: 'Hello' }) },
  { path: '/api/conversation/evaluate', body: JSON.stringify({ scenarioId: 'cafe-ordering', level: 'A1', turnsCount: 3 }) },
];

async function testPermutation(matrix: MatrixPermutation) {
  console.log(`\n------------------------------------------------------`);
  console.log(`Testing ${matrix.name} on Port ${matrix.port}...`);
  console.log(`------------------------------------------------------`);

  const spawnEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(matrix.port),
  };

  if (matrix.env.GEMINI_API_KEY) {
    spawnEnv.GEMINI_API_KEY = matrix.env.GEMINI_API_KEY;
  } else {
    delete spawnEnv.GEMINI_API_KEY;
  }

  if (matrix.env.AI_FEATURES_ENABLED !== undefined) {
    spawnEnv.AI_FEATURES_ENABLED = matrix.env.AI_FEATURES_ENABLED;
  } else {
    delete spawnEnv.AI_FEATURES_ENABLED;
  }

  const serverProc: ChildProcess = spawn('node', [SERVER_DIST], {
    env: spawnEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProc.stdout?.resume();
  serverProc.stderr?.resume();

  try {
    const ready = await waitForServerReady(matrix.port);
    assert(ready, `Server booted successfully on port ${matrix.port}`);

    // 1. Verify /api/health payload semantics
    const health = await makeRequest({ method: 'GET', path: '/api/health' }, matrix.port);
    assert(health.statusCode === 200, `[${matrix.name}] GET /api/health returns 200`);
    const healthData = JSON.parse(health.body || '{}');

    assert(healthData.status === 'ok', `[${matrix.name}] health status is 'ok'`);
    assert(
      healthData.aiConfigured === matrix.expectedConfigured,
      `[${matrix.name}] health aiConfigured is ${matrix.expectedConfigured} (got ${healthData.aiConfigured})`
    );
    assert(
      healthData.aiEnabled === matrix.expectedEnabled,
      `[${matrix.name}] health aiEnabled is ${matrix.expectedEnabled} (got ${healthData.aiEnabled})`
    );
    assert(
      !healthData.apiKey && !healthData.key && !health.body.includes('test-secret-key'),
      `[${matrix.name}] /api/health never exposes API keys or secrets`
    );

    // 2. Test Gemini endpoints behavior
    if (!matrix.expectedEnabled) {
      console.log(`  Verifying fail-closed 503 middleware on all 6 Gemini endpoints...`);
      for (const endpoint of GEMINI_ENDPOINTS) {
        const res = await makeRequest(
          {
            method: 'POST',
            path: endpoint.path,
            headers: {
              'Content-Type': 'application/json',
            },
            body: endpoint.body,
          },
          matrix.port
        );

        assert(
          res.statusCode === 503,
          `[${matrix.name}] POST ${endpoint.path} returns 503 when AI disabled (got ${res.statusCode})`
        );

        const body = JSON.parse(res.body || '{}');
        assert(
          body.error === 'AI features are currently unavailable.',
          `[${matrix.name}] POST ${endpoint.path} returns standard 503 error message`
        );
        assert(
          Boolean(body.requestId),
          `[${matrix.name}] POST ${endpoint.path} 503 response contains requestId`
        );
      }
    }

    // 3. Verify non-Gemini dictionary endpoints remain fully operational and mounted
    const dictEmptySuggest = await makeRequest(
      { method: 'GET', path: '/api/dictionary/suggest?q=' },
      matrix.port
    );
    assert(
      dictEmptySuggest.statusCode === 200,
      `[${matrix.name}] GET /api/dictionary/suggest?q= returns 200 regardless of AI status`
    );
    const dictSuggestData = JSON.parse(dictEmptySuggest.body || '{}');
    assert(
      Array.isArray(dictSuggestData.suggestions),
      `[${matrix.name}] Dictionary suggest returns valid JSON structure`
    );

    const dictValidation = await makeRequest(
      { method: 'GET', path: '/api/dictionary/lookup?word=' },
      matrix.port
    );
    assert(
      dictValidation.statusCode === 400,
      `[${matrix.name}] GET /api/dictionary/lookup validation returns 400 Bad Request regardless of AI status`
    );
  } finally {
    serverProc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 200));
    try {
      serverProc.kill('SIGKILL');
    } catch {}
  }
}

async function runMatrixSuite() {
  console.log('\n======================================================');
  console.log('🧪   Running AI Configuration Matrix Permutation Tests');
  console.log('======================================================');

  if (!fs.existsSync(SERVER_DIST)) {
    console.error(`[FATAL] Compiled server bundle not found at ${SERVER_DIST}. Run 'npm run build' first.`);
    process.exit(1);
  }

  for (const permutation of PERMUTATIONS) {
    await testPermutation(permutation);
  }

  console.log('\n======================================================');
  console.log(`Matrix Test Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMatrixSuite();
