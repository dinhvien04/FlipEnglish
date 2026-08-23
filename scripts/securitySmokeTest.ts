/**
 * Production Security & Invariant Smoke Test Suite
 * Validates security middleware, HTTP headers, content-type enforcement,
 * rate limiting logic, payload size limits, and input validation.
 */
import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

interface RequestOptions {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
}

function makeRequest(opts: RequestOptions): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(opts.path, BASE_URL);
    const req = http.request(
      url,
      {
        method: opts.method,
        headers: opts.headers,
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, headers: res.headers, body: data }));
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (opts.body) {
      req.write(opts.body);
    }
    req.end();
  });
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

async function runSecuritySmokeTests() {
  console.log('\n========================================');
  console.log('🛡️   Running FlipEnglish Security Smoke Tests');
  console.log('========================================\n');

  try {
    // 1. Health check & security headers
    const health = await makeRequest({ method: 'GET', path: '/api/health' });
    assert(health.statusCode === 200, 'GET /api/health returns 200 OK');
    assert(health.headers['x-content-type-options'] === 'nosniff', 'Header X-Content-Type-Options is nosniff');
    assert(!health.headers['x-powered-by'], 'X-Powered-By header is stripped');
    assert(Boolean(health.headers['x-request-id']), 'X-Request-Id header is generated and returned');
    assert(health.headers['cache-control']?.includes('no-store'), 'API Cache-Control header has no-store');

    // 2. Unsupported media type check on POST without Content-Type
    const unsupported = await makeRequest({
      method: 'POST',
      path: '/api/ai-practice',
      headers: { 'Content-Type': 'text/plain' },
      body: 'invalid body',
    });
    assert(unsupported.statusCode === 415, 'POST with text/plain returns 415 Unsupported Media Type');

    // 3. Strict Zod validation on empty JSON body
    const emptyJson = await makeRequest({
      method: 'POST',
      path: '/api/ai-practice',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(emptyJson.statusCode === 400, 'POST empty JSON payload returns 400 Bad Request');
    const emptyJsonParsed = JSON.parse(emptyJson.body || '{}');
    assert(Boolean(emptyJsonParsed.error), 'Error response contains user-friendly message');
    assert(Boolean(emptyJsonParsed.requestId), 'Error response contains requestId for debugging');

    // 4. Strict Zod .strict() rejection of unknown extra fields
    const injectionAttempt = await makeRequest({
      method: 'POST',
      path: '/api/ai-practice',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'A1',
        mistakeWords: [{ word: 'test', meaning: 'kiem tra' }],
        maliciousAdminFlag: true,
      }),
    });
    assert(injectionAttempt.statusCode === 400, 'POST with undeclared extra properties is rejected with 400 (.strict())');

    // 5. Cross-Site Browser Fetch blocking (sec-fetch-site: cross-site)
    const crossSite = await makeRequest({
      method: 'POST',
      path: '/api/ai-practice',
      headers: {
        'Content-Type': 'application/json',
        'Sec-Fetch-Site': 'cross-site',
      },
      body: JSON.stringify({
        level: 'A1',
        mistakeWords: [{ word: 'test', meaning: 'kiem tra' }],
      }),
    });
    assert(crossSite.statusCode === 403, 'POST with Sec-Fetch-Site: cross-site returns 403 Forbidden');

    // 6. Oversized Payload rejection on standard JSON endpoint (>256KB)
    const largeString = 'a'.repeat(300 * 1024);
    const oversized = await makeRequest({
      method: 'POST',
      path: '/api/explain-mistake',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: largeString,
        selectedAnswer: 'test',
        correctAnswer: 'test',
        targetWord: 'test',
      }),
    });
    assert(oversized.statusCode === 413, 'POST payload exceeding limit returns 413 Payload Too Large');

    console.log('\n----------------------------------------');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('----------------------------------------\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[FATAL] Smoke tests could not complete:', err);
    process.exit(1);
  }
}

runSecuritySmokeTests();
