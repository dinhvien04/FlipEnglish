# FlipEnglish — Comprehensive System Architecture

## 1. High-Level Architecture Overview

FlipEnglish is a modern, privacy-first, local-first EdTech Progressive Web Application (PWA) engineered for CEFR-aligned English vocabulary acquisition, adaptive placement testing, spaced repetition review (SRS), reading comprehension, context-driven quizzes, pronunciation audio, practice exams, and AI-assisted conversational practice.

```
+-----------------------------------------------------------------------------------+
|                                   Client Browser / PWA                            |
|                                                                                   |
|  +---------------------+  +-------------------------+  +-----------------------+  |
|  |     React 19 SPA    |  |   Tailwind CSS v4 &     |  |   State-Based Routing |  |
|  |  TypeScript (~5.8)  |  |      motion/react       |  |      (src/App.tsx)    |  |
|  +----------+----------+  +------------+------------+  +-----------+-----------+  |
|             |                          |                           |              |
|             +--------------------------+---------------------------+              |
|                                        |                                          |
|  +-------------------------------------+---------------------------------------+  |
|  |                           Core Application Engines                          |  |
|  |  +----------------------+ +--------------------+ +-----------------------+  |  |
|  |  |  Spaced Repetition   | | Adaptive Placement | |   Daily Study Plan    |  |  |
|  |  |   Scheduler & Resume | |   4-Stage Engine   | |   & Task Allocator    |  |  |
|  |  +----------------------+ +--------------------+ +-----------------------+  |  |
|  |  +----------------------+ +--------------------+ +-----------------------+  |  |
|  |  |   Smart Next Action  | |  Streak & Active   | |  Bilingual (EN / VI)  |  |  |
|  |  |   Priority Engine    | |    Time Engine     | |      I18n Provider    |  |  |
|  |  +----------------------+ +--------------------+ +-----------------------+  |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|  +-------------------------------------+---------------------------------------+  |
|  |                   Local-First Persistence & Storage Health                  |  |
|  |  +-------------------------------+  +-------------------------------------+  |  |
|  |  | localStorage (Safe Wrappers)  |  | IndexedDB (FlipEnglishDictionary)  |  |  |
|  |  | - Review Storage & Snapshots  |  | - 12,000+ Offline Words Snapshot    |  |  |
|  |  | - Placement History & Reports |  | - User Saved Vocabulary Wordbook    |  |  |
|  |  | - Daily Study Plan & History  |  | - Local Search Index & Metadata     |  |  |
|  |  | - Learner Streak & Time Recs  |  +-------------------------------------+  |  |
|  |  +-------------------------------+                                             |  |
|  +-----------------------------------------------------------------------------+  |
+----------------------------------------+------------------------------------------+
                                         | (Network / Fetch API)
                                         v
+-----------------------------------------------------------------------------------+
|                        Node.js & Express 4 Backend Server                         |
|                                                                                   |
|  +------------------+  +--------------------+  +-------------------------------+  |
|  |  Helmet Security |  | Multi-Tiered Rate  |  | In-Process Concurrency Guard  |  |
|  |  Headers & CSP   |  | Limiting (Per-IP)  |  |    (Max 4 Active AI Reqs)     |  |
|  +--------+---------+  +---------+----------+  +---------------+---------------+  |
|           |                      |                             |                  |
|           +----------------------+-----------------------------+                  |
|                                  |                                                |
|  +-------------------------------+---------------------------------------------+  |
|  |                         API Gateways & Endpoints                            |  |
|  |  - /api/health (Health check & AI configuration state)                      |  |
|  |  - /api/analyze-photo (FlipLens Image Recognition - Binary Magic Bytes)     |  |
|  |  - /api/ai-practice (Mistake-Driven Targeted Exercises)                     |  |
|  |  - /api/explain-mistake (Pedagogical Root-Cause Analysis)                   |  |
|  |  - /api/analyze-exam (Post-Exam Diagnostic Consultation)                    |  |
|  |  - /api/conversation/* (Multi-turn CEFR Scenario Dialogues)                 |  |
|  |  - /api/dictionary/* (Lookup & Search Suggestions)                          |  |
|  +-------------------------------+---------------------------------------------+  |
|                                  |                                                |
|                                  v                                                |
|  +-----------------------------------------------------------------------------+  |
|  |                Google Gemini API (@google/genai SDK)                        |  |
|  |  - Models: gemini-3.7-flash (Primary) -> gemini-3.6-flash -> gemini-3.5-lite|  |
|  |  - Structured JSON Output + Zod Schema Validation (.strict())               |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Frontend Architecture & Technology Stack

### 2.1 Technology Matrix
- **Core Framework**: React 19 (`react`, `react-dom`) with TypeScript (~5.8.2).
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) utilizing pure semantic utility tokens.
- **Animation & Motion**: `motion/react` for accessible, GPU-accelerated transitions.
- **Build Tool**: Vite 6 with `@vitejs/plugin-react` and `vite-plugin-pwa`.
- **Icons & Typography**: Heroicons v2 (`@heroicons/react`), Inter typography with system font fallbacks.
- **Audio Synthesis**: Native HTML5 Audio and Web Speech Synthesis API.

### 2.2 Routing Strategy: State-Based SPA
Instead of heavy client-side history push routing, FlipEnglish uses an explicit state machine model in `src/App.tsx`:
```ts
export type AppView =
  | 'today'
  | 'home'
  | 'lesson-intro'
  | 'learn'
  | 'exercise'
  | 'result'
  | 'review'
  | 'placement-intro'
  | 'placement-session'
  | 'placement-result'
  | 'exam-center'
  | 'exam-intro'
  | 'exam-session'
  | 'exam-result'
  | 'exam-history'
  | 'conversation-home'
  | 'conversation-setup'
  | 'conversation-session'
  | 'conversation-result'
  | 'dictionary'
  | 'fliplens'
  | 'settings'
  | 'help'
  | 'onboarding';
```
**Benefits**:
- Zero route-sync desynchronization when offline or restoring saved state.
- Predictable view transitions with lifecycle-safe cleanup.
- Instant fallback rendering via `LazyViewFallback` for dynamically imported views.

### 2.3 Code Splitting & Performance Budgeting
Heavy secondary modules and generative datasets are lazy-loaded via dynamic `import()`:
- `ReviewDashboard` (`src/features/review/ReviewDashboard.tsx`)
- `PlacementSession` & `PlacementResult` (`src/features/placement/`)
- `ExamSession`, `ExamResult`, `ExamHistory` (`src/pages/`)
- `ConversationSession` & `ConversationResult` (`src/features/conversation/`)
- `DictionaryPage` (`src/features/dictionary/`)
- `FlipLens` (`src/pages/FlipLens.tsx`)
- Large datasets: `placementPool.ts`, `examGenerator.ts`, `readingPassages.ts`.

---

## 3. Server Architecture & Security Boundaries

### 3.1 Server Runtime & Static Asset Isolation
- **Server Bundling**: `esbuild` compiles `server.ts` into a standalone CommonJS bundle at `dist/server.cjs`.
- **Static File Isolation**: The server strictly serves static files from `dist/client`. Server source code, `.env` files, `.git/`, and `package.json` are unreachable and return `404 Not Found`.

### 3.2 Security Controls & Middleware Pipeline
1. **Helmet**: Strict Content-Security-Policy (CSP), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.
2. **Rate Limiting**: Multi-tiered rate limiters via `express-rate-limit` protecting against scraping and API exhaustion.
3. **Fail-Closed AI Gating**: When `AI_FEATURES_ENABLED !== 'true'` or `GEMINI_API_KEY` is missing, all AI endpoints return `503 Service Unavailable` with structured diagnostic request IDs.
4. **Input Sanitization & Magic Bytes**: Strict Zod `.strict()` schema enforcement on JSON payloads and deep binary magic byte verification for uploaded images.

---

## 4. Local-First Persistence & Data Model

FlipEnglish adopts a resilient local-first persistence model:
- **LocalStorage**: Structured data partitioned by functional domain (`review`, `placement`, `study_plan`, `streak`, `active_time`, `settings`, `reminders`).
- **IndexedDB**: Large-scale storage (`FlipEnglishDictionary`) holding 12,000+ words snapshot, custom user wordbook, and search index.
- **Safety Primitives**: All storage mutations pass through `safeSetLocalStorage`, `safeGetLocalStorage`, and `safeRemoveLocalStorage` with QuotaExceeded fallback, non-invasive storage health tracking, and tombstone lifecycle management.
