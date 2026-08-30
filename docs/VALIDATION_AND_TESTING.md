# FlipEnglish — Quality Assurance & Validation Matrix

## 1. Automated Validation Architecture

FlipEnglish enforces continuous quality gates via 14+ self-contained, automated test suites located in `scripts/`. These suites test functionality, resilience, security, and pedagogical algorithms without requiring external network dependencies.

```
npm run lint                   # TypeScript static type check (tsc --noEmit)
npm run build                  # Vite client bundle + esbuild standalone server
npm run validate:curriculum    # 72 lessons & 720 curriculum items
npm run validate:placement     # 24-question adaptive placement check & scoring
npm run validate:review        # SRS scheduling intervals & persistence
npm run validate:exams         # Question pools and exam generation quotas
npm run validate:study-plan    # Daily plan state, storage, and transitions
npm run validate:conversation  # AI scenario contracts & Zod schemas
npm run validate:ai-gating     # 4-permutation AI configuration matrix & 503 gating
npm run validate:dictionary    # Dictionary cache & offline snapshot integrity
npm run validate:data-management # Scoped resets & third-party storage preservation
npm run validate:resilience    # Error handling, storage health, and recovery
npm run validate:i18n          # Translation catalog parity & formatters
npm run validate:pwa           # PWA manifest, PNG icons, Workbox rules, Express headers
npm run validate:performance   # Bundle size and loading gates
npm run validate:deployment    # Production deployment & runtime boundaries
npm run security:audit         # Audit production dependencies (0 vulnerabilities)
npm run test:security          # Security smoke tests & AI gating matrix
```

---

## 2. Validation Suites Breakdown

### 2.1 Curriculum & Vocabulary Integrity (`validate:curriculum`)
- Verifies 72 lessons and 720 vocabulary items across CEFR levels A1 to C2.
- Ensures all items include canonical IDs, phonetics, Vietnamese translations, and high-quality contextual sentences.
- Validates that image URLs conform to bounded caching policies.

### 2.2 Adaptive Placement Test Engine (`validate:placement`)
- Tests 4-stage multi-stage adaptive testing (MSAT) logic.
- Verifies upward, downward, and neutral stage routing.
- Evaluates attack test cases (A–J) ensuring forged percentages, invalid stage keys, and tampered options are rejected.
- Validates fault-injection durability during placement report persistence.

### 2.3 Smart Review & Spaced Repetition (`validate:review`)
- Verifies interval calculations across first and subsequent recalls (Again, Hard, Good, Easy).
- Verifies memory lapse handling on mastered items.
- Runs the 22-part regression suite (R1–R22) testing atomic rating mutations, snapshot index and breakdown reconciliation, legacy export migration, and truthful UI event dispatching.

### 2.4 AI Configuration & Gating Matrix (`validate:ai-gating`)
Tests all 4 combinations of server configuration:
1. `KEY=present, ENABLED=true`: AI endpoints operational.
2. `KEY=present, ENABLED=false`: 503 Fail-closed on all 6 Gemini endpoints.
3. `KEY=missing, ENABLED=true`: 503 Fail-closed on all 6 Gemini endpoints.
4. `KEY=missing, ENABLED=false`: 503 Fail-closed on all 6 Gemini endpoints.

### 2.5 Resilience & Storage Fault-Injection (`validate:resilience`)
- Simulates `QuotaExceededError` and `SecurityError` during storage operations.
- Verifies non-invasive storage health tracking.
- Tests ErrorBoundary classification (Chunk loading vs. Render errors).
- Validates 100% parity across all bilingual error translations.

### 2.6 Performance & Bundle Accounting (`validate:performance`)
- Analyzes Vite production bundle chunks.
- Ensures no eager sub-chunk leaks occur in the initial HTML entry.
- Enforces strict bundle limits on initial JavaScript and CSS payloads.
