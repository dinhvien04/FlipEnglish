# FlipEnglish — Project Overview & Permanent Invariants

FlipEnglish is a modern web application for English vocabulary mastery, spaced repetition review (SRS), reading comprehension, context-driven quizzes, pronunciation audio, adaptive placement testing, practice exams, and PWA offline learning (aligned with CEFR A1–C2).

---

## 1. Architecture & Technology Stack

- **Runtime / Package Manager**: Node.js `24.x`, npm `10.x` or higher (`packageManager: npm@10.9.8`).
- **Frontend**: React 19, TypeScript (~5.8.2), Tailwind CSS v4 (`@tailwindcss/vite`), motion (`motion/react`).
- **Build Tooling**: Vite 6 (client bundle with `vite-plugin-pwa`), esbuild (CJS server bundling).
- **Backend**: Node.js + Express 4, Helmet (strict CSP & HTTP headers), express-rate-limit.
- **AI Integration**: Server-side only via `@google/genai` (Google Gemini API). Client never accesses Gemini directly.
- **Port Strategy**: Development uses port `5173`. Production uses `process.env.PORT`.
- **Navigation & Routing**: State-based SPA routing in `src/App.tsx` (`currentView: 'today' | 'home' | 'settings' | 'help' | ...`).
- **Storage & State**: Hybrid `localStorage` + `IndexedDB` (Dictionary) with schema validation, storage health tracking, safe deletion primitives, and zero calls to `localStorage.clear()`.

---

## 2. Core Non-Negotiable Invariants

1. **Server-Side AI Only**: `GEMINI_API_KEY` and Google Gemini interactions must stay in `server.ts`. Never expose Gemini keys or direct client SDK calls in frontend bundles. AI features are disabled/gated when `AI_FEATURES_ENABLED !== 'true'`.
2. **Zero Fake AI / Offline Honesty**: Live AI features require active internet connectivity. Never simulate or fabricate AI answers when offline or on error.
3. **No Official Certification Claims**: FlipEnglish provides CEFR-aligned learning and placement estimation for self-study. Maintain the disclaimer: *FlipEnglish is not an official CEFR certification provider.*
4. **Professional EdTech UI & Zero Decorative Emoji Policy**: Maintain a calm, accessible UI. Zero decorative emojis in buttons, headers, or cards. Use clear typography and semantic badges.
5. **Phone & iPad-First Responsive Design**:
   - Minimum accessible touch target dimensions ($\ge 44\text{px}$).
   - Never introduce global `overflow-x: hidden` hacks on `body` or `html`.
   - Use safe-area insets (`env(safe-area-inset-*)`) and responsive layout containers.
6. **PWA & Offline Invariants**:
   - Core learning (Today, Curriculum, Flashcards, Quizzes, Smart Review, Placement Check, Exam scoring, Dictionary local search, Settings) must work offline.
   - All `/api/*` endpoints must be configured as `NetworkOnly` in Workbox.
   - Unsplash remote image caching is bounded (max 150 items / 30-day expiration).
   - Prompt-based service worker updates (`registerType: 'prompt'`) to prevent disruptive reloads mid-study.
7. **Storage & Data Management**:
   - Never call `localStorage.clear()`.
   - Categorize storage keys explicitly (learning, vocabulary, preferences).
   - Report actual storage operation success/failure.
8. **Bilingual Parity**: Maintain 100% key and placeholder parity across English (`en.ts`) and Vietnamese (`vi.ts`).
9. **Security Baseline**: Strict Helmet headers, rate limiting on all endpoints, strict input validation with Zod `.strict()`, and image magic-byte verification.
10. **Git & Release Discipline**:
   - Inspect `git diff` before committing.
   - Never force push (`--force` / `-f`) to `main` or shared branches.
   - Do NOT store API keys, tokens, or credentials in any file or memory.

---

## 3. Essential Commands & Validation Suites

```bash
# Development
npm run dev                    # Start tsx server with Vite dev middleware on port 5173

# Production Build & Start
npm run build                  # Build Vite client + esbuild server to dist/
npm run start                  # Run production server (node dist/server.cjs)

# Quality & Validation Suites
npm run lint                   # Type check (tsc --noEmit)
npm run validate:i18n          # Translation catalog parity & formatters
npm run validate:pwa           # PWA manifest, PNG icons, Workbox rules, Express headers
npm run validate:curriculum    # 72 lessons & 720 curriculum items
npm run validate:placement     # 24-question adaptive placement check & scoring
npm run validate:exams         # Question pools and exam generation quotas
npm run validate:study-plan    # Daily plan state, storage, and transitions
npm run validate:review        # SRS scheduling intervals & persistence
npm run validate:conversation  # AI scenario contracts & Zod schemas
npm run validate:ai-gating     # 4-permutation AI configuration matrix & 503 gating
npm run validate:dictionary    # Dictionary cache & offline snapshot integrity
npm run validate:data-management # Scoped resets & third-party storage preservation
npm run validate:resilience    # Error handling, storage health, and recovery
npm run validate:performance   # Bundle size and loading gates
npm run validate:deployment    # Production deployment & runtime boundaries
npm run security:audit         # Audit production dependencies
npm run test:security          # Security smoke tests & AI gating matrix
```
