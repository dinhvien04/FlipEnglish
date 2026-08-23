# Security Policy

## Overview
FlipEnglish is designed with defense-in-depth security principles to ensure reliability, safeguard user privacy, and prevent unauthorized API abuse or resource exhaustion.

---

## 1. Secrets Management & Server-Side Isolation
- **Server-Side Exclusivity**: The Google Gemini API key (`process.env.GEMINI_API_KEY`) is strictly confined to server-side code (`server.ts`). It is never bundled into client JavaScript, exposed in public endpoints, logged in console outputs, or stored in client-side persistent storage.
- **Environment Declarations**: Required environment variables are documented strictly via `.env.example`. Actual secrets must never be committed to source control.

---

## 2. API Protection & Rate Limiting
All Gemini proxy endpoints are protected by multi-tiered rate limiting per IP address to guard against denial of service, automated scraping, and quota exhaustion:

| Endpoint | Purpose | Limit (per IP) | Body Limit |
| :--- | :--- | :--- | :--- |
| `/api/*` (Global) | General API queries | 60 requests / 15 min | — |
| `/api/analyze-photo` | FlipLens Vision object recognition | 5 requests / 10 min | 8 MB |
| `/api/ai-practice` | Targeted mistake practice generation | 10 requests / 10 min | 256 KB |
| `/api/analyze-exam` | Post-exam diagnostic consultant | 10 requests / 10 min | 256 KB |
| `/api/explain-mistake` | Mistake explanation & mnemonic tips | 20 requests / 10 min | 256 KB |

---

## 3. Concurrency & Upstream Resiliency
- **In-Process Concurrency Guard**: Server instances enforce a cap on concurrent active Gemini requests (default: 4 simultaneous requests). Over-capacity requests receive immediate `HTTP 503` responses without unbounded memory queuing.
- **Budgeted Retries**: Transient upstream errors (e.g., 503, 429) are limited to a maximum of 3 total attempts across fallback models with exponential backoff and jitter. Non-transient errors (400, 401, 403, schema failures) fail fast without retry amplification.
- **Request Timers**: Upstream AI calls enforce bounded 28-second timeouts.

---

## 4. Input & Media Validation
- **Strict Content-Type**: POST endpoints require `application/json` (`HTTP 415` for unsupported media types).
- **Zod Schemas**: Strict input and output schema validations enforce bounds on payload strings, arrays, and types.
- **FlipLens Photo Uploads**:
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
  - Maximum decoded payload: 6 MB
  - Deep verification: Binary magic byte/signature verification is performed on decoded buffers to prevent extension/MIME spoofing.
  - Ephemeral processing: Uploaded images are processed in-memory and are never written to disk or logged.

---

## 5. Security Headers & CSP
- `Helmet` is configured with strict security headers:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Cross-Origin-Opener-Policy: same-origin-allow-popups`
  - `Strict-Transport-Security` (HSTS enabled in production)
  - `Content-Security-Policy`: Restricts scripts, objects, and external image sources strictly to designated image hosts (`https://images.unsplash.com`), while permitting Google AI Studio preview frame embedding.
- `Cache-Control: no-store` is enforced on all API responses.

---

## 6. Dependency & Security Audits
To verify dependencies and exam generation integrity locally or in CI:

```bash
# Run exam generator deterministic quota audit
npm run validate:exams

# Run production dependency vulnerability audit
npm run security:audit

# Full test & type check
npm run lint
```

---

## 7. Reporting a Vulnerability
If you discover a security vulnerability, please submit a report to the maintainers or contact `security@flipenglish.app` (placeholder). Reports will be acknowledged and reviewed promptly.
