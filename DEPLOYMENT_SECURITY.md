# FlipEnglish — Deployment & Infrastructure Security Guide

This document outlines the security architecture, environment configuration, container deployment specifications, and operational verification procedures for running FlipEnglish in production (e.g. Google Cloud Run).

---

## 1. Environment Variables & Secrets Architecture

FlipEnglish minimizes operational friction by utilizing centralized safe defaults for security constants (rate limits, concurrency limits, CSP). Only platform-level runtime variables and the secret API key are managed via the environment.

| Variable | Type | Default | Description & Security Rules |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | `string` | *None* | **REQUIRED (SECRET)**. Server-side Google Gemini API key. Managed automatically in Google AI Studio or configured via Google Cloud Secret Manager. Never exposed to the client bundle. |
| `PORT` | `number` | `3000` | Port on which Express listens. Supplied automatically by Google Cloud Run / hosting environment. |
| `NODE_ENV` | `string` | `development` | Set to `production` in container environments. Enables strict CSP, HSTS, frameguard, and isolated static file serving from `dist/client`. |
| `APP_URL` | `string` | *None* | Public application URL automatically injected by Google AI Studio / Cloud Run. |

### Centralized Application Security Defaults (`SECURITY_CONFIG`)
Security limits and policies are maintained directly in `server.ts` with safe defaults rather than requiring manual environment variable configuration:
- **Gemini Max Concurrency**: 4 active simultaneous requests per container instance.
- **Global API Rate Limit**: 60 requests / 15 minutes.
- **Vision Photo Rate Limit (`/api/analyze-photo`)**: 5 requests / 10 minutes.
- **AI Practice Rate Limit (`/api/ai-practice`)**: 10 requests / 10 minutes.
- **AI Explanation Rate Limit (`/api/explain-mistake`)**: 20 requests / 10 minutes.
- **Exam Diagnostic Rate Limit (`/api/analyze-exam`)**: 10 requests / 10 minutes.

---

## 2. Google Cloud Run Deployment Considerations

### A. Reverse Proxy & Rate Limiting Model
- **In-Memory Window Limiting**: The built-in rate limiters use `express-rate-limit` with an in-memory sliding store per container instance.
- **Trust Proxy Setting**: In production (`NODE_ENV=production`), `app.set('trust proxy', 1)` is enabled to inspect the single trusted Google Front End (GFE) edge reverse-proxy hop. In development, trust proxy is disabled (`false`) to prevent local IP spoofing.

### B. Connection Timeouts & Keep-Alive
- FlipEnglish configures HTTP keep-alive timeouts (`keepAliveTimeout: 5000ms`, `headersTimeout: 32000ms`, `requestTimeout: 35000ms`) to cleanly align with Google Cloud Run's default ingress proxy timeouts and avoid connection resets.

### C. TLS & Edge Security
- Cloud Run automatically terminates SSL/TLS at Google's global edge network.
- The application enables `Strict-Transport-Security` (HSTS) in production via Helmet with `maxAge: 31536000` (1 year).

### D. File Isolation Architecture
- The production server serves static frontend assets **exclusively from `dist/client`**.
- The backend bundle (`dist/server.cjs`), source files (`server.ts`), configuration files (`package.json`), and environment files (`.env`) are physically located outside `dist/client` and return `404 Not Found` upon direct asset probe requests.

---

## 3. Content Security Policy (CSP) & Media Origins

The production application enforces strict CSP directives via Helmet:

- **Scripts**: `'self'` (no `'unsafe-inline'` or `'unsafe-eval'` allowed in production).
- **Images**: `'self'`, `data:`, `blob:`, and `https://images.unsplash.com`.
- **Frames**: `'none'` in production (blocks iframe clickjacking); permits `https://aistudio.google.com` in development preview.
- **Objects & Embeds**: `'none'`.

---

## 4. Pre-Deployment Verification Checklist

Before deploying changes or promoting a container image revision to production traffic, execute the full security and integrity test suite:

```bash
# 1. Clean reproducible dependency install
npm ci

# 2. TypeScript compilation & linting
npm run lint

# 3. Production build (Vite client to dist/client + esbuild server to dist/server.cjs)
npm run build

# 4. Curriculum & Visual asset integrity check
npm run validate:curriculum

# 5. CEFR Exam generator integrity check
npm run validate:exams

# 6. Production dependency vulnerability audit (high severity threshold)
npm run security:audit

# 7. Self-contained production security smoke test suite
npm run test:security
```
