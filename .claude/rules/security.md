# Security Architecture & Secret Management

## 1. Secrets & Credentials Policy

- **Zero Client Secrets**: The frontend client bundle must NEVER contain API keys, service tokens, private certificates, or database credentials.
- **Environment Isolation**:
  - `GEMINI_API_KEY` is loaded strictly on the server via `process.env.GEMINI_API_KEY` (`dotenv`).
  - `AI_FEATURES_ENABLED` (`'true'` | `'false'`) controls whether Gemini product features and endpoints are active. When `AI_FEATURES_ENABLED !== 'true'` or `GEMINI_API_KEY` is missing, all Gemini endpoints fail closed with 503 and UI elements remain hidden.
  - Never prefix AI keys with `VITE_` or expose them to client build outputs.
  - Never commit `.env` or files containing live credentials.
- **Claude / Memory Invariant**: Never store real passwords, authorization tokens, API keys, or private user data in `CLAUDE.md`, `.claude/rules/`, or persistent memory files.

## 2. Server-Side Protection & Middlewares

- **Helmet & CSP**: `server.ts` configures `helmet` with a strict Content Security Policy allowing only required origins (self, `https://fonts.googleapis.com`, `https://fonts.gstatic.com`, `https://images.unsplash.com`).
- **Tiered Rate Limiting**:
  - General API endpoints: 100 requests per 15 minutes per IP.
  - AI endpoints (`/api/conversation`, `/api/analyze-photo`, `/api/ai-practice`): Stricter rate limits (e.g. 20 requests per 15 minutes per IP) to protect against quota exhaustion and DoS.
- **Strict Input Validation**:
  - All JSON payloads must be validated using Zod schemas configured with `.strict()` to reject unknown fields.
  - File/image uploads must validate MIME types and verify binary magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `52 49 46 46...57 45 42 50`).

## 3. PWA & Network Boundary Invariants

- **NetworkOnly for AI Routes**: Workbox must never cache `/api/*` routes. AI responses and mistake explanations must always come from a live server round-trip.
- **Cache-Control Headers**:
  - `sw.js`: `no-cache, no-store, must-revalidate` (max-age=0).
  - `.webmanifest`: `public, max-age=0, must-revalidate`.
  - Hashed assets (`/assets/*`): `public, max-age=31536000, immutable`.
