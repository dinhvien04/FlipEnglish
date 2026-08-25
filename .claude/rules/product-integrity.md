# Product Integrity & Domain Rules

## 1. CEFR Alignment & Disclaimers

- **Educational Framework**: FlipEnglish uses the CEFR (Common European Framework of Reference for Languages) levels A1, A2, B1, B2, C1, and C2 to structure vocabulary and estimate proficiency.
- **No Official Certification**: FlipEnglish does not issue official certificates or replace accredited exam boards (IELTS, TOEFL, Cambridge English).
- **Mandatory Disclaimer**: All placement results, exam diagnostics, and profile views must clearly state that assessments are for internal self-study guidance.

## 2. Spaced Repetition (SRS) & Learning Invariants

- **Scheduling Intervals**:
  - `Again`: 10 minutes (reset interval)
  - `Hard`: 1 day (slight interval reduction / retention reinforcement)
  - `Good`: 3 days (standard progression)
  - `Easy`: 7 days (expanded interval)
- **Automatic Mistake Capture**: Incorrect answers across quizzes, exams, and placement checks can be automatically exported to the Smart Review queue with appropriate due dates.
- **Storage Resilience**: All learner data stored in `localStorage` must handle quota errors, parsing failures, and schema migrations gracefully without throwing unhandled exceptions or blanking out the UI.

## 3. Offline Experience & AI Guardrails

- **Guaranteed Offline Learning**: All non-AI core features (Flashcards, Quizzes, Curriculum, SRS Review, Placement Check, and Exam Center scoring) must function 100% offline.
- **Strictly No Fake AI**: Live AI features (Conversation Lab, FlipLens Vision, AI Practice, Explain My Mistake, Exam Analysis) must display an explicit offline indicator or error message when disconnected. Never fabricate artificial AI scores, feedback, or responses offline.
- **Disruption-Free Updates**: Prompt users when new service worker builds are available (`PWAUpdatePrompt.tsx`) with "Update Now" and "Later" options, never forcing sudden unprompted page reloads.
