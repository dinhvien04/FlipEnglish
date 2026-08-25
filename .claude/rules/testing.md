# Testing & Validation Standards

## 1. Automated Validation Suites

FlipEnglish maintains automated validation suites for integrity, curriculum correctness, exam quotas, and storage safety. Run these before any commit:

```bash
# 1. Static Type Checking
npm run lint                 # tsc --noEmit

# 2. PWA & Service Worker Rules
npm run validate:pwa         # Verifies icons, manifest, Workbox cache names/bounds, Express headers

# 3. Curriculum & Vocab Integrity
npm run validate:curriculum  # Verifies 72 lessons, 720 vocabulary items, CEFR levels, and required fields

# 4. Adaptive Placement Engine
npm run validate:placement   # Verifies 24-question adaptive placement flow, score bounds, and stage transitions

# 5. Exam Generation & Quotas
npm run validate:exams       # Verifies Quick Test (15), Level Exams (20-40), Full Mock (50), and question pools

# 6. Study Plan & Daily Progression
npm run validate:study-plan  # Verifies daily target calculations, completion flags, and localStorage persistence

# 7. Spaced Repetition (SRS)
npm run validate:review      # Verifies SRS interval algorithms (Again/Hard/Good/Easy), bounds, and state

# 8. AI Scenarios & Security
npm run validate:conversation# Verifies Conversation Lab prompts, scenario metadata, and Zod schemas
npm run security:audit       # Audits production dependencies for vulnerabilities
npm run test:security        # Runs security smoke test suite
```

## 2. Regression & Change Discipline

- **Run Suites on Change**: Any change touching curriculum, exams, review, storage, PWA, or server endpoints must run the relevant validation scripts.
- **Pre-Commit Verification**: Run `git status` and `git diff` to inspect every modified line before committing.
- **Never Force Push**: Never use `git push --force` or `git push -f` on repository branches.
