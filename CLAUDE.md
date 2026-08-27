# FlipEnglish — Project Overview & Permanent Invariants

FlipEnglish is a web application for English vocabulary learning, interactive practice, and CEFR-aligned self-assessment (A1–C2). It incorporates spaced repetition study, reading comprehension, context-driven vocabulary exercises, speech playback, adaptive placement testing, and progressive web app (PWA) offline capabilities.

---

## 1. Architecture & Technology Stack

- **Runtime / Package Manager**: Node.js `24.x`, npm `10.x` or higher (`packageManager: npm@10.9.8`).
- **Frontend**: React 19, TypeScript (~5.8.2), Tailwind CSS v4 (`@tailwindcss/vite`), motion (`motion/react`).
- **Build Tooling**: Vite 6 (client bundle with `vite-plugin-pwa`), esbuild (CJS server bundling).
- **Backend**: Node.js + Express 4, Helmet (strict CSP & HTTP headers), express-rate-limit.
- **AI Integration**: Server-side only via `@google/genai` (Google Gemini API). Client never accesses Gemini directly.
- **Port Strategy**: Development uses port `5173` (configured via `.env` / server default). Production uses `process.env.PORT`.
- **Navigation & Routing**: State-based SPA routing inside `src/App.tsx` (e.g. `currentView: 'today' | 'curriculum' | 'exam' | ...`).
- **Storage & State**: Learner state persisted locally via `localStorage` with Zod schema validation, corruption fallbacks, and storage quotas.

---

## 2. Core Non-Negotiable Invariants

1. **Server-Side AI Only**: `GEMINI_API_KEY` and Google Gemini interactions must stay in `server.ts`. Never expose Gemini keys or direct client SDK calls in frontend bundles.
2. **No Fake AI Fallback Scores**: Live AI features (Conversation Lab, FlipLens Vision, AI Practice, Explain My Mistake, Exam Analysis) require actual network connectivity. Never simulate or fabricate AI answers when offline or upon API errors.
3. **No Official Certification Claims**: FlipEnglish provides CEFR-aligned learning and placement estimation. Always maintain the disclaimer: *FlipEnglish is not an official CEFR certification provider.*
4. **Professional EdTech UI & Zero-Icon / No Decorative Emoji Policy**: Maintain a clean, calm, accessible UI. Avoid decorative emoji icons in buttons, headers, or cards. Use clear typography, semantic badges, and Lucide/clean SVGs where necessary.
5. **Phone & iPad-First Responsive Design**:
   - Touch targets must adhere to minimum accessible dimensions (~44–48px).
   - Never introduce global `overflow-x: hidden` hacks on `body` or `html` that mask layout bugs.
   - Use safe-area insets (`env(safe-area-inset-*)`) and responsive grid/flex layouts.
6. **PWA & Offline Invariants**:
   - Core learning (Today, Curriculum, Flashcards, Quizzes, Smart Review, Placement Check, Exam scoring) must work offline.
   - All `/api/*` endpoints must be configured as `NetworkOnly` in Workbox.
   - Unsplash remote image caching is bounded (max 150 items / 30-day expiration).
   - Use prompt-based service worker updates (`registerType: 'prompt'`) to prevent disruptive reloads mid-study.
7. **Security Baseline**: Strict Helmet headers, rate limiting on all endpoints, strict input validation with Zod `.strict()`, and image magic-byte verification.
8. **Git & Release Discipline**:
   - Inspect `git diff` before committing.
   - Never force push (`--force` / `-f`) to `main` or shared branches.
   - Do NOT store API keys, passwords, tokens, or credentials in any file or memory.

---

## 3. Essential Commands & Workflows

```bash
# Development
npm run dev               # Start tsx server with Vite dev middleware on port 5173

# Production Build & Start
npm run build             # Build Vite client + esbuild server to dist/
npm run start             # Run production server (node dist/server.cjs)

# Quality & Validation Suites (Run after changes)
npm run lint              # Type check (tsc --noEmit)
npm run validate:pwa      # Verify PWA manifest, PNG icons, Workbox rules, Express headers
npm run validate:placement# Verify 24-question adaptive placement check & scoring
npm run validate:curriculum # Verify 72 lessons & 720 curriculum items
npm run validate:exams    # Verify question pools and exam generation quotas
npm run validate:study-plan # Verify daily plan state, storage, and transitions
npm run validate:review   # Verify SRS scheduling intervals & persistence
npm run validate:conversation # Verify AI scenario contracts & Zod schemas
npm run validate:ai-gating    # Verify 4-permutation AI configuration matrix & 503 gating
npm run security:audit    # Audit production dependencies
npm run test:security     # Run security smoke tests & AI gating matrix
```

---

## 4. Modular Rules Index

Detailed architectural rules are organized under `.claude/rules/`:
- `frontend.md`: UI/UX standards, touch targets, state routing, and responsive constraints.
- `security.md`: Gemini API boundaries, rate limits, CSP, validation, and secret protection.
- `testing.md`: Validation suites, zero-regression policies, and manual test requirements.
- `product-integrity.md`: CEFR estimation guidelines, SRS scheduling invariants, and offline guarantees.
