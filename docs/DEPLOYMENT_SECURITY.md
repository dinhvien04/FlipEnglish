# FlipEnglish — Production Deployment & Runtime Hardening Guide

This document outlines the security architecture, environment configuration, container deployment specifications, and operational verification procedures for running FlipEnglish in production (e.g. Google Cloud Run).

---

## 1. Supported Production Runtime & Node/npm Standards

- **Node.js**: `24.x LTS` (configured in `package.json` engines).
- **Package Manager**: `npm@10.9.8` (deterministic installation via `npm ci`).
- **Build Toolchain**:
  - Frontend: Vite 6 compiling client SPA to `dist/client`.
  - Backend: esbuild bundling `server.ts` into a standalone CommonJS bundle at `dist/server.cjs`.
- **Production Execution**: `node dist/server.cjs` (via `npm run start`).

---

## 2. Environment Variables & Secrets Architecture

FlipEnglish minimizes operational friction by utilizing centralized safe defaults for security constants (rate limits, concurrency limits, CSP). Only platform-level runtime variables and the secret API key are managed via the environment.

| Variable | Type | Default | Description & Security Rules |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | `string` | *None* | **REQUIRED (SECRET)**. Server-side Google Gemini API key. Managed via Google Cloud Secret Manager. Never prefixed with `VITE_` and never exposed to browser bundles. |
| `PORT` | `number` | `5173` (local fallback) | **Injected by Cloud Run**. Port on which the Express server listens. Validated on startup as a valid integer (1–65535). |
| `NODE_ENV` | `string` | `development` | Set to `production` in container environments. Enables strict CSP, HSTS, frameguard, and isolated static file serving from `dist/client`. |
| `APP_URL` | `string` | *None* | Public application URL automatically injected by Google AI Studio / Cloud Run. |

### Centralized Application Security Defaults (`SECURITY_CONFIG`)
Security limits and policies are maintained directly in `server.ts` with safe defaults rather than requiring manual environment variable configuration:
- **Gemini Max Concurrency**: 4 active simultaneous requests per container instance.
- **Global API Rate Limit**: 60 requests / 15 minutes.
- **Vision Photo Rate Limit (`/api/analyze-photo`)**: 5 requests / 10 minutes (8 MB JSON body limit, 6 MB decoded image limit).
- **AI Practice Rate Limit (`/api/ai-practice`)**: 10 requests / 10 minutes (256 KB JSON body limit).
- **AI Explanation Rate Limit (`/api/explain-mistake`)**: 20 requests / 10 minutes (256 KB JSON body limit).
- **Exam Diagnostic Rate Limit (`/api/analyze-exam`)**: 10 requests / 10 minutes (256 KB JSON body limit).
- **Conversation Turn Rate Limit (`/api/conversation/turn`)**: 30 requests / 10 minutes.
- **Conversation Evaluate Rate Limit (`/api/conversation/evaluate`)**: 10 requests / 10 minutes.
- **Dictionary Lookups (`/api/dictionary/*`)**: 60–180 requests / 10 minutes.

---

## 3. Google Cloud Run Deployment Specifications

### A. Listen Address & Port Contract
- The production server listens on `0.0.0.0` (all network interfaces) to accept inbound traffic within the container sandbox.
- It dynamically reads `process.env.PORT` injected by Google Cloud Run.

### B. Reverse Proxy & Rate Limiting Model
- **In-Memory Window Limiting**: Rate limiters use `express-rate-limit` with an in-memory sliding store per container instance. Note: in horizontally scaled multi-instance deployments, rate limits are enforced per-container rather than globally across all instances.
- **Trust Proxy Setting**: In production (`NODE_ENV=production`), `app.set('trust proxy', 1)` is enabled to inspect the single trusted Google Front End (GFE) edge reverse-proxy hop. In development, trust proxy is disabled (`false`) to prevent local IP spoofing.

### C. TLS & Edge Security
- Cloud Run automatically terminates SSL/TLS at Google's global edge network.
- The application enables `Strict-Transport-Security` (HSTS) in production via Helmet with `maxAge: 31536000` (1 year).

### D. File Isolation Architecture
- The production server serves static frontend assets **exclusively from `dist/client`**.
- The backend bundle (`dist/server.cjs`), source files (`server.ts`), configuration files (`package.json`), documentation (`docs/`), and environment files (`.env`) are physically located outside `dist/client` and return `404 Not Found` upon direct asset probe requests.

### E. Graceful Shutdown (SIGTERM Lifecycle)
- Cloud Run sends a `SIGTERM` signal before terminating container instances during scale-down.
- The server intercepts `SIGTERM` and `SIGINT`, calls `serverInstance.close()`, allows pending HTTP connections up to 10 seconds to finish, and exits cleanly with code `0`.

### F. Health Endpoint (`/api/health`)
- Returns a minimal, safe operational JSON payload:
  ```json
  {
    "status": "ok",
    "aiConfigured": true
  }
  ```
- Never exposes API keys, file paths, environment dumps, or internal system diagnostics.

---

## 4. Content Security Policy (CSP) & Media Origins

The production application enforces strict CSP directives via Helmet:

- **Scripts**: `'self'` (no `'unsafe-inline'` or `'unsafe-eval'` allowed in production).
- **Styles**: `'self'`, `'unsafe-inline'`, and `https://fonts.googleapis.com`.
- **Fonts**: `'self'`, `data:`, and `https://fonts.gstatic.com`.
- **Images**: `'self'`, `data:`, `blob:`, and `https://images.unsplash.com`.
- **Media**: `'self'`, `https://api.dictionaryapi.dev`, and `https://ssl.gstatic.com`.
- **Frames**: `'none'` in production (blocks iframe clickjacking); permits `https://aistudio.google.com` in development preview.
- **Objects & Embeds**: `'none'`.

---

## 5. PWA & Service Worker Boundary Rules

- **Offline Guarantees**: Core learning (Today, Curriculum, Flashcards, Quizzes, Smart Review, Placement Check, Exam scoring) is 100% functional offline via Workbox precaching.
- **API NetworkOnly Invariant**: All `/api/*` routes are strictly configured as `NetworkOnly` in Workbox. AI responses, mistake explanations, and dictionary lookups are never cached in browser cache storage.
- **Service Worker Headers**: `sw.js` is served with `Cache-Control: no-cache, no-store, must-revalidate`.

---

## 6. Cloud Run Deployment Reference (Example Commands)

When deploying to Google Cloud Run, pass secrets via Secret Manager placeholders without hardcoding credentials:

```bash
# Example Cloud Run deployment command (Reference only)
gcloud run deploy SERVICE_NAME \
  --source . \
  --region REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=SECRET_NAME:latest \
  --set-env-vars NODE_ENV=production
```

---

## 7. Pre-Deployment Verification Checklist

Before deploying changes or promoting a container revision to production traffic, execute the full security, deployment, and integrity test suite:

```bash
# 1. Clean reproducible dependency install
npm ci

# 2. TypeScript compilation & linting
npm run lint

# 3. Production build (Vite client to dist/client + esbuild server to dist/server.cjs)
npm run build

# 4. Translation & internationalization parity audit
npm run validate:i18n

# 5. PWA & Service Worker cache rules audit
npm run validate:pwa

# 6. Curriculum & visual asset integrity check
npm run validate:curriculum

# 7. Adaptive placement engine integrity check
npm run validate:placement

# 8. CEFR Exam generator integrity check
npm run validate:exams

# 9. Daily study plan progression audit
npm run validate:study-plan

# 10. Smart Review & SRS interval scheduler audit
npm run validate:review

# 11. AI Conversation Lab contracts & schema audit
npm run validate:conversation

# 12. Deterministic dictionary engine audit
npm run validate:dictionary

# 13. Bundle budgets & performance report audit
npm run validate:performance

# 14. Production deployment & runtime boundaries audit
npm run validate:deployment

# 15. Production dependency vulnerability audit
npm run security:audit

# 16. Self-contained production security smoke test suite
npm run test:security
```
