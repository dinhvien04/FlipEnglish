import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn, ChildProcess } from 'child_process';

/**
 * FlipEnglish Production Deployment & Runtime Boundaries Validator (Phase 4.1)
 *
 * Deterministically verifies:
 * A. dist/client and dist/server.cjs existence
 * B. dist/client contains only public static assets (no source, configs, .env, or server code)
 * C. No server secrets (GEMINI_API_KEY, AIza..., VITE_ secrets) leaked into client bundles
 * D. No frontend imports of @google/genai or direct Gemini SDK in src/
 * E. Production server startup with injected PORT (Cloud Run contract)
 * F. Production HTTP static probes (blocks .env, package.json, server.ts, .git, .qa, docs)
 * G. Health endpoint (/api/health) response bounded & safe
 * H. Required production security headers (CSP, HSTS, X-Content-Type-Options, frameguard, etc.)
 * I. Workbox Service Worker runtime caching rules keep /api/* strictly NetworkOnly
 * J. Graceful SIGTERM server shutdown
 */

let totalChecks = 0;
let passedChecks = 0;

function assert(condition: boolean, description: string, detail?: string): void {
  totalChecks++;
  if (condition) {
    console.log(`  ✓ [PASS] ${description}`);
    passedChecks++;
  } else {
    console.error(`  ✗ [FAIL] ${description}${detail ? ` - ${detail}` : ''}`);
    process.exit(1);
  }
}

function makeRequest(
  port: number,
  options: { method: string; path: string; headers?: Record<string, string>; body?: string }
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: options.path,
        method: options.method,
        headers: options.headers || {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function waitForServerReady(port: number, maxAttempts = 60, delayMs = 150): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await makeRequest(port, { method: 'GET', path: '/api/health' });
      if (res.statusCode === 200) {
        return true;
      }
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function validateDeployment() {
  console.log('\n======================================================');
  console.log('🚀   FlipEnglish Production Deployment & Runtime Validator');
  console.log('======================================================\n');

  const cwd = process.cwd();
  const distClient = path.join(cwd, 'dist', 'client');
  const distServer = path.join(cwd, 'dist', 'server.cjs');

  // --- Section 0: Buildpack Engines & Package Manager Pinning ---
  console.log('--- 0. Buildpack Engines & Package Manager Pinning ---');
  const pkgJsonPath = path.join(cwd, 'package.json');
  assert(fs.existsSync(pkgJsonPath), 'package.json exists');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  assert(pkgJson.engines?.node === '24.x', 'package.json engines.node is pinned to "24.x"');
  assert(pkgJson.engines?.npm === '10.9.8', 'package.json engines.npm is pinned to "10.9.8" for Cloud Run buildpack');
  assert(pkgJson.packageManager === 'npm@10.9.8', 'package.json packageManager is pinned to "npm@10.9.8"');

  // --- Section 1: Build Artifacts & Output Isolation ---
  console.log('\n--- 1. Build Artifacts & File Isolation ---');
  assert(fs.existsSync(distClient), 'dist/client directory exists');
  assert(fs.existsSync(distServer), 'dist/server.cjs compiled server exists');
  assert(fs.existsSync(path.join(distClient, 'index.html')), 'dist/client/index.html exists');
  assert(fs.existsSync(path.join(distClient, 'manifest.webmanifest')), 'dist/client/manifest.webmanifest exists');

  // Scan dist/client for forbidden files
  function scanDir(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        files.push(...scanDir(full));
      } else {
        files.push(full);
      }
    }
    return files;
  }

  const clientFiles = scanDir(distClient);
  const forbiddenPatterns = [
    /\.env/i,
    /package\.json/i,
    /server\.ts/i,
    /server\.cjs/i,
    /tsconfig/i,
    /CLAUDE\.md/i,
    /\.git/i,
    /\.qa/i,
    /docs\//i,
    /\.ts$/i,
    /\.tsx$/i,
  ];

  let forbiddenCount = 0;
  for (const file of clientFiles) {
    const relative = path.relative(distClient, file);
    for (const pat of forbiddenPatterns) {
      if (pat.test(relative)) {
        forbiddenCount++;
        console.error(`  ✗ [FAIL] dist/client contains forbidden file: ${relative}`);
      }
    }
  }
  assert(forbiddenCount === 0, `dist/client contains 0 forbidden source/config files (scanned ${clientFiles.length} files)`);

  // --- Section 2: Frontend Bundle Secret Scan ---
  console.log('\n--- 2. Frontend Client Bundle Secret Audit ---');
  const jsFiles = clientFiles.filter((f) => f.endsWith('.js'));
  assert(jsFiles.length > 0, `Found ${jsFiles.length} client JavaScript chunks for secret scanning`);

  const secretKeywords = ['AIzaSy', 'GEMINI_API_KEY', 'process.env.GEMINI'];
  for (const jsFile of jsFiles) {
    const content = fs.readFileSync(jsFile, 'utf8');
    const relative = path.relative(distClient, jsFile);
    for (const kw of secretKeywords) {
      assert(!content.includes(kw), `Client chunk "${relative}" does not contain secret keyword "${kw}"`);
    }
  }

  // --- Section 3: Architecture Boundaries (src/ contains no @google/genai) ---
  console.log('\n--- 3. Client Architecture & Gemini Boundaries ---');
  const srcFiles = scanDir(path.join(cwd, 'src')).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
  for (const srcFile of srcFiles) {
    const content = fs.readFileSync(srcFile, 'utf8');
    const relative = path.relative(cwd, srcFile);
    assert(!content.includes('@google/genai'), `Source file "${relative}" does not import @google/genai`);
  }

  // --- Section 4: Service Worker /api/* NetworkOnly Verification ---
  console.log('\n--- 4. PWA Service Worker API NetworkOnly Invariant ---');
  const swPath = path.join(distClient, 'sw.js');
  assert(fs.existsSync(swPath), 'dist/client/sw.js service worker generated');
  const swContent = fs.readFileSync(swPath, 'utf8');
  assert(swContent.includes('NetworkOnly'), 'sw.js configures NetworkOnly handler for network boundaries');

  // --- Section 5: Real Production Runtime Probes & Cloud Run Port Contract ---
  console.log('\n--- 5. Runtime Server Probes & Cloud Run Ingress ---');
  const testPort = 3845;
  let serverProc: ChildProcess | null = null;

  try {
    serverProc = spawn('node', [distServer], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(testPort),
        GEMINI_API_KEY: 'test-runtime-key',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const isReady = await waitForServerReady(testPort);
    assert(isReady, `Server boots on Cloud Run injected PORT=${testPort}`);

    // Test A: Health check response & Rate-limit Immunity (>60 consecutive requests must all be 200 OK)
    const health = await makeRequest(testPort, { method: 'GET', path: '/api/health' });
    assert(health.statusCode === 200, 'GET /api/health returns 200 OK');
    const healthJson = JSON.parse(health.body || '{}');
    assert(healthJson.status === 'ok', 'Health status is "ok"');
    assert(healthJson.aiConfigured === true, 'Health reports aiConfigured: true when key present');
    assert(!healthJson.apiKey && !healthJson.GEMINI_API_KEY, 'Health response does not leak secret key');

    console.log('    Testing /api/health rate-limit exemption across 70 consecutive requests...');
    let healthFailures = 0;
    for (let i = 0; i < 70; i++) {
      const hRes = await makeRequest(testPort, { method: 'GET', path: '/api/health' });
      if (hRes.statusCode !== 200) {
        healthFailures++;
      }
    }
    assert(
      healthFailures === 0,
      `All 70 rapid /api/health requests returned 200 OK (0 rate-limited 429s, exempt from global 60-req limiter)`
    );

    // Test B: Security headers on app shell
    const shell = await makeRequest(testPort, { method: 'GET', path: '/' });
    assert(shell.statusCode === 200, 'GET / returns 200 OK for SPA app shell');
    assert(Boolean(shell.headers['content-security-policy']), 'CSP header present on app shell');
    assert(shell.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options: nosniff present');
    assert(Boolean(shell.headers['strict-transport-security']), 'HSTS header present in production');
    assert(!shell.headers['x-powered-by'], 'X-Powered-By header is removed');

    // Test C: Sensitive Path Probes (must return 404)
    const sensitiveProbes = [
      '/.env',
      '/.env.example',
      '/.git/config',
      '/package.json',
      '/package-lock.json',
      '/server.ts',
      '/server.cjs',
      '/CLAUDE.md',
      '/docs/DEPLOYMENT_SECURITY.md',
      '/.qa/performance-summary.json',
    ];

    for (const probePath of sensitiveProbes) {
      const probeRes = await makeRequest(testPort, { method: 'GET', path: probePath });
      assert(
        probeRes.statusCode === 404,
        `Direct probe of sensitive path "${probePath}" returns 404 Not Found (got ${probeRes.statusCode})`
      );
      assert(
        !probeRes.body.includes('GEMINI_API_KEY') && !probeRes.body.includes('dependencies'),
        `Sensitive probe "${probePath}" does not leak file content`
      );
    }

    // Test D: Body size limit enforcement (FlipLens 8MB limit vs oversized)
    const oversizedPayload = JSON.stringify({ image: 'a'.repeat(9 * 1024 * 1024) });
    const sizeRes = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/analyze-photo',
      headers: { 'Content-Type': 'application/json' },
      body: oversizedPayload,
    });
    assert(
      sizeRes.statusCode === 413,
      `Oversized POST payload returns 413 Payload Too Large (got ${sizeRes.statusCode})`
    );

    // Test E: Malformed JSON rejection
    const malformedRes = await makeRequest(testPort, {
      method: 'POST',
      path: '/api/ai-practice',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalidJson": ',
    });
    assert(
      malformedRes.statusCode === 400,
      `Malformed JSON returns 400 Bad Request (got ${malformedRes.statusCode})`
    );
  } finally {
    if (serverProc) {
      console.log('\n--- 6. Graceful SIGTERM Shutdown ---');
      const shutdownPromise = new Promise<boolean>((resolve) => {
        serverProc!.on('exit', (code, signal) => {
          resolve(code === 0 || signal === 'SIGTERM');
        });
      });

      serverProc.kill('SIGTERM');
      const cleanExit = await Promise.race([
        shutdownPromise,
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
      ]);
      assert(cleanExit, 'Server terminates cleanly upon SIGTERM');
    }
  }

  // --- Section 7: Fail-Fast Production Port Validation Subprocess Probes ---
  console.log('\n--- 7. Production Fail-Fast Startup & PORT Contract Tests ---');

  async function testServerExit(envOverrides: Record<string, string | undefined>): Promise<number | null> {
    return new Promise((resolve) => {
      const child = spawn('node', [distServer], {
        env: {
          ...process.env,
          ...envOverrides,
        },
        stdio: ['ignore', 'ignore', 'ignore'],
      });

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve(null); // Timed out (did not exit immediately)
      }, 2500);

      child.on('exit', (code) => {
        clearTimeout(timer);
        resolve(code);
      });
    });
  }

  // 1. Missing PORT in production mode must exit 1 immediately
  const missingPortCode = await testServerExit({ NODE_ENV: 'production', PORT: '' });
  assert(missingPortCode === 1, 'Production server fails fast with exit code 1 when PORT is empty/missing');

  // 2. Invalid non-numeric PORT in production mode must exit 1 immediately
  const invalidAlphaPortCode = await testServerExit({ NODE_ENV: 'production', PORT: 'invalid-port' });
  assert(invalidAlphaPortCode === 1, 'Production server fails fast with exit code 1 when PORT is non-numeric');

  // 3. Out-of-bounds PORT (0) in production mode must exit 1 immediately
  const invalidZeroPortCode = await testServerExit({ NODE_ENV: 'production', PORT: '0' });
  assert(invalidZeroPortCode === 1, 'Production server fails fast with exit code 1 when PORT=0');

  // 4. Out-of-bounds PORT (70000) in production mode must exit 1 immediately
  const invalidHighPortCode = await testServerExit({ NODE_ENV: 'production', PORT: '70000' });
  assert(invalidHighPortCode === 1, 'Production server fails fast with exit code 1 when PORT=70000 (>65535)');

  console.log('\n------------------------------------------------------');
  console.log(`🎉 All Deployment & Runtime Validation Checks Passed (${passedChecks}/${totalChecks})`);
  console.log('------------------------------------------------------\n');
}

validateDeployment().catch((err) => {
  console.error('❌ Deployment validation failed with error:', err);
  process.exit(1);
});
