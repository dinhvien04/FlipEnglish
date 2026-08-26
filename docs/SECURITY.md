# Security Policy

## Overview
FlipEnglish is engineered with defense-in-depth security principles to safeguard learner privacy, protect upstream AI infrastructure against abuse, and ensure high availability in production container environments.

---

## 1. Secrets Management & Server-Side Isolation
- **Server-Side Exclusivity**: The Google Gemini API key (`process.env.GEMINI_API_KEY`) is strictly confined to server-side code (`server.ts`). It is never bundled into client JavaScript, exposed in public endpoints, logged in console outputs, or stored in browser storage.
- **Client Build Separation**: The production client is bundled into `dist/client` and the backend is bundled into `dist/server.cjs`. The backend serves *only* `dist/client` as static assets, preventing any accidental exposure of server bundles or configuration files.
- **Environment Declarations**: Required environment variables are documented strictly via `.env.example` (only `GEMINI_API_KEY`, `APP_URL`, `PORT`, `NODE_ENV`). Rate limits, concurrency limits, and security headers utilize centralized application defaults with zero configuration friction. Secrets are never committed to source control.

---

## 2. API Protection & Multi-Tiered Rate Limiting
All API endpoints enforce strict per-IP rate limiting:

| Endpoint | Purpose | Window & Limit | Body Limit |
| :--- | :--- | :--- | :--- |
| `/api/*` (Global) | General API queries | 60 req / 15 min | 256 KB |
| `/api/analyze-photo` | FlipLens Vision object recognition | 5 req / 10 min | 8 MB |
| `/api/ai-practice` | Targeted mistake practice generation | 10 req / 10 min | 256 KB |
| `/api/analyze-exam` | Post-exam diagnostic consultant | 10 req / 10 min | 256 KB |
| `/api/explain-mistake` | Mistake explanation & mnemonic tips | 20 req / 10 min | 256 KB |

---

## 3. Concurrency, Timeout & Model Safety
- **In-Process Concurrency Guard**: Server instances enforce an active concurrency limit (default: 4 simultaneous Gemini requests). Over-capacity requests receive immediate `HTTP 503` responses without unbounded memory queuing.
- **Budgeted Retries**: Transient upstream errors (e.g., 503, 429, ETIMEDOUT) are limited to a maximum of 3 total attempts across fallback models (`gemini-3.7-flash` â†’ `gemini-3.6-flash` â†’ `gemini-3.5-flash-lite`) with exponential backoff and random jitter. Non-transient errors (400, 401, 403, schema failures) fail fast without retry amplification.
- **Strict Output Token & Thinking Bounds**: All Gemini requests configure explicit `maxOutputTokens` and enforce `ThinkingLevel.LOW` to optimize response latency and minimize token consumption.
- **Prompt Injection Defense**: All user-provided text inputs are strictly encapsulated in `<learner_data>` tags accompanied by explicit tutor boundary rules.

---

## 4. Input & Media Validation
- **Strict Zod Schemas**: Every API payload is validated with Zod `.strict()` schemas to prevent prototype pollution and ignore unexpected parameters.
- **Strict Content-Type**: POST endpoints require `application/json` (`HTTP 415` for unsupported media types).
- **FlipLens Photo Uploads**:
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
  - Maximum decoded payload: 6 MB
  - Deep verification: Binary magic byte signature verification is performed on decoded image buffers before passing to the model.
  - Ephemeral processing: Uploaded images are processed in-memory and are never stored or logged.

---

## 5. Security Headers, CSP & Same-Origin Defense
- `Helmet` is configured with strict security headers:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Cross-Origin-Opener-Policy: same-origin-allow-popups`
  - `Strict-Transport-Security` (HSTS enabled in production)
  - `Content-Security-Policy`: Restricts scripts, objects, and external image sources strictly to designated image hosts (`https://images.unsplash.com`), while permitting Google AI Studio preview frame embedding in development.
  - `Sec-Fetch-Site`: State-changing POST requests block untrusted cross-site origins (`HTTP 403`).
- `Cache-Control: no-store` is enforced on all API responses.

---

## 6. Client-Side Data Integrity
- `localStorage` progress and exam history parsers validate data shapes, clamp score ranges (0â€“100), enforce bounds on string sizes, and cap maximum records to prevent client-side storage exhaustion or corrupted state crashes.

---

## 7. Security CI & Automated Audits
The project includes automated security checks in GitHub Actions CI (`.github/workflows/security.yml` and `.github/workflows/codeql.yml`):

```bash
# Run automated security smoke tests
npm run test:security

# Run exam generator deterministic quota audit
npm run validate:exams

# Run production dependency vulnerability audit
npm run security:audit

# Full test & type check
npm run lint

# Production application build
npm run build
```
