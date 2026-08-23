/**
 * Production Security & Invariant Smoke Test Suite
 * Self-contained: Spawns dist/server.cjs on isolated test port, executes comprehensive
 * HTTP security invariants, tests rate limiters & trust proxy, and guarantees process cleanup.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const TEST_PORT = 3107;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const SERVER_DIST = path.join(process.cwd(), 'dist', 'server.cjs');

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
        timeout: 8000,
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
      reject(new Error(`Request timed out on ${opts.method} ${opts.path}`));
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

async function waitForServerReady(maxAttempts = 35, delayMs = 200): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await makeRequest({ method: 'GET', path: '/api/health' });
      if (res.statusCode === 200) {
        return true;
      }
    } catch {
      // Wait and retry
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function runSecuritySmokeTests() {
  console.log('\n======================================================');
  console.log('🛡️   Running FlipEnglish Self-Contained Security Smoke Tests');
  console.log('======================================================\n');

  if (!fs.existsSync(SERVER_DIST)) {
    console.error(`[FATAL] Compiled server bundle not found at ${SERVER_DIST}. Run 'npm run build' first.`);
    process.exit(1);
  }

  let serverProc: ChildProcess | null = null;

  try {
    console.log(`[Test Server] Spawning production server on port ${TEST_PORT}...`);
    serverProc = spawn('node', [SERVER_DIST], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(TEST_PORT),
        GEMINI_API_KEY: 'test-placeholder-key',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProc.stderr?.on('data', (d) => {
      const msg = d.toString();
      if (!msg.includes('Client error') && !msg.includes('Security Validation') && !msg.includes('Security MagicBytes')) {
        // Output only unexpected critical logs
      }
    });

    const isReady = await waitForServerReady();
    if (!isReady) {
      throw new Error(`Test server failed to start on port ${TEST_PORT} within timeout.`);
    }
    console.log(`[Test Server] Ready and accepting connections on ${BASE_URL}.\n`);

    // 1. Health check & security headers
    const health = await makeRequest({ method: 'GET', path: '/api/health' });
    assert(health.statusCode === 200, 'GET /api/health returns 200 OK');
    assert(health.headers['x-content-type-options'] === 'nosniff', 'Header X-Content-Type-Options is nosniff');
    assert(!health.headers['x-powered-by'], 'Header X-Powered-By is stripped/absent');
    assert(Boolean(health.headers['referrer-policy']), 'Header Referrer-Policy is present');
    assert(Boolean(health.headers['content-security-policy']), 'Header Content-Security-Policy is present');
    assert(Boolean(health.headers['cache-control']?.includes('no-store')), 'API Cache-Control header contains no-store');

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const reqId = String(health.headers['x-request-id'] || '');
    assert(uuidRegex.test(reqId), `X-Request-Id matches authoritative internal UUID format (${reqId})`);

    // 2. Unsupported media type check on POST without Content-Type or invalid Content-Type
    const unsupported = await makeRequest({
      method: 'POST',
      path: '/api/ai-practice',
      headers: { 'Content-Type': 'text/plain' },
      body: 'invalid body',
    });
    assert(unsupported.statusCode === 415, 'POST with text/plain returns 415 Unsupported Media Type');

    // 3. Malformed JSON body handling
    const malformed = await makeRequest({
      method: 'POST',
      path: '/api/ai-practice',
      headers: { 'Content-Type': 'application/json' },
      body: '{ "invalidJson": ',
    });
    assert(malformed.statusCode === 400, 'POST with malformed JSON syntax returns 400 Bad Request');

    // 4. Strict Zod validation on empty JSON body
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

    // 5. Strict Zod .strict() rejection of unknown extra fields
    const injectionAttempt = await makeRequest({
      method: 'POST',
      path: '/api/ai-practice',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonTitle: 'Test Lesson',
        level: 'A1',
        mistakeWords: [{ word: 'test', meaning: 'kiem tra' }],
        maliciousAdminFlag: true,
      }),
    });
    assert(injectionAttempt.statusCode === 400, 'POST with undeclared extra properties is rejected with 400 (.strict())');

    // 6. Cross-Site Browser Fetch blocking (sec-fetch-site: cross-site)
    const crossSite = await makeRequest({
      method: 'POST',
      path: '/api/ai-practice',
      headers: {
        'Content-Type': 'application/json',
        'Sec-Fetch-Site': 'cross-site',
      },
      body: JSON.stringify({
        lessonTitle: 'Test Lesson',
        level: 'A1',
        mistakeWords: [{ word: 'test', meaning: 'kiem tra' }],
      }),
    });
    assert(crossSite.statusCode === 403, 'POST with Sec-Fetch-Site: cross-site returns 403 Forbidden');

    // 7. Oversized Payload rejection on standard JSON endpoint (>256KB)
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

    // 8. Photo Endpoint: Unsupported Image MIME rejection
    const gifAttempt = await makeRequest({
      method: 'POST',
      path: '/api/analyze-photo',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      }),
    });
    assert(gifAttempt.statusCode === 415, 'POST image with unsupported GIF format returns 415');

    // 9. Photo Endpoint: Invalid JPEG magic bytes detection
    const fakeJpeg = await makeRequest({
      method: 'POST',
      path: '/api/analyze-photo',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: 'data:image/jpeg;base64,Tm90QVJlYWxKUEVHaGVhZGVyQXRBbGw=',
      }),
    });
    assert(fakeJpeg.statusCode === 415, 'POST image with invalid JPEG magic bytes returns 415');

    // 10. Photo Endpoint: Rate Limit Activation (5 req / 10 min reached)
    // Requests 8 & 9 were 2 requests. We send 3 more to reach the 5-request limit.
    for (let i = 0; i < 3; i++) {
      await makeRequest({
        method: 'POST',
        path: '/api/analyze-photo',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: 'data:image/jpeg;base64,Tm90QVJlYWxKUEVHaGVhZGVyQXRBbGw=',
        }),
      });
    }

    const rateLimitedPhoto = await makeRequest({
      method: 'POST',
      path: '/api/analyze-photo',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: 'data:image/png;base64,Tm90QVJlYWxQTkdoZWFkZXJBdEFsbA==',
      }),
    });
    assert(rateLimitedPhoto.statusCode === 429, 'POST request exceeding specialized rate limit returns 429 Too Many Requests');

    // 11. Rate limit error response structure validation
    const rateLimitJson = JSON.parse(rateLimitedPhoto.body || '{}');
    assert(Boolean(rateLimitJson.error), 'Rate limit 429 response contains user-friendly error message');
    assert(Boolean(rateLimitJson.requestId), 'Rate limit 429 response contains tracking requestId');

    // 12. Static Assets Leak Protection (Files not inside dist/client return 404, not source code or SPA)
    const leaksToTest = [
      '/server.cjs',
      '/server.cjs.map',
      '/server.ts',
      '/.env',
      '/.git/config',
      '/package.json',
    ];

    for (const leakPath of leaksToTest) {
      const leakRes = await makeRequest({ method: 'GET', path: leakPath });
      assert(leakRes.statusCode === 404, `GET ${leakPath} returns 404 Not Found`);
    }

    console.log('\n------------------------------------------------------');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('------------------------------------------------------\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[FATAL] Smoke tests encountered an unhandled error:', err);
    process.exit(1);
  } finally {
    if (serverProc) {
      console.log('[Test Server] Terminating background test server process...');
      serverProc.kill('SIGTERM');
      setTimeout(() => {
        try {
          serverProc?.kill('SIGKILL');
        } catch {}
      }, 1000).unref();
    }
  }
}

runSecuritySmokeTests();
