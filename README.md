# FlipEnglish

FlipEnglish is a web application for English vocabulary learning, interactive practice, and assessment aligned with the Common European Framework of Reference for Languages (CEFR A1–C2). It incorporates spaced repetition study, reading comprehension, context-driven vocabulary exercises, speech playback, and an adaptive placement check.

FlipEnglish uses CEFR levels as a framework for learning and self-assessment. It is not an official CEFR certification provider.

---

## Core Features

### Curriculum (A1–C2)
- 72 structured lessons containing 720 core vocabulary and phrase items.
- **A1–A2**: Visual-first learning with contextual imagery and everyday vocabulary.
- **B1–C2**: Academic, professional, collocation, phrasal verb, nuance, and idiom focus.
- English pronunciation playback using the browser Web Speech API, including Normal (0.9x) and Slow (0.65x) playback speeds.

### Learning & Quiz
- Flashcard study interface with flip interactions and keyboard shortcuts (Spacebar to flip, Arrow keys to navigate).
- Diverse exercise modalities:
  - English to Vietnamese and Vietnamese to English multiple choice
  - Fill in the blank (sentence context)
  - Listening challenge (speech playback to meaning)
  - Picture quiz (image-to-word matching for A1–A2 items)

### Adaptive English Placement Check (A1–C2)
- Multistage adaptive assessment to estimate an appropriate starting CEFR level (A1 to C2) inside FlipEnglish.
- 4 stages of 6 questions each (maximum 24 questions total), starting at B1.
- Evaluates four skill areas: Vocabulary, Use of English, Reading, and Listening.
- 100% deterministic client-side execution with zero external AI latency or API costs.
- Generates qualitative evidence assessments (Strong evidence, Moderate evidence, Tentative estimate), Can-Do descriptors, and targeted lesson recommendations.
- Missed canonical vocabulary can be exported directly into the Smart Review queue.
- *Disclaimer: This short placement check recommends a starting level inside FlipEnglish. It is not an official CEFR certification.*

### Multilingual UX & Internationalization (i18n)
- **Three-Tier Language Resolution**: Pure language determination engine resolving (1) explicit user preference (`Tiếng Việt`, `Song ngữ / Bilingual`, or `English`), (2) existing learner backward compatibility (preserving English for users with existing study progress), and (3) new learner browser detection.
- **Guided Bilingual Mode**: Seamless Vietnamese-first interface with secondary English terminology reinforcement for major feature headers and contextual guidance.
- **Language-of-Parts & Semantic HTML**: Preserves authentic English study material (vocabulary, examples, transcriptions, definitions, exam passages) with strict `lang="en"` tags while localizing UI chrome in Vietnamese (`lang="vi"`) or English.
- **100% Offline Static Catalogs**: Zero runtime translation API latency or dependencies. Full token placeholder parity across all catalog keys.

### FlipEnglish Dictionary & Offline Wordbook
- **Comprehensive Learner Lexicon**: Structured definitions grouped by part of speech, IPA phonetic transcriptions, provider pronunciation audio where available with browser speech synthesis fallback (Normal 0.9x and Slow 0.65x), usage examples, and interactive synonym/antonym chips.
- **3-Layer Architecture**:
  - *Layer 1 (Local Curriculum Index)*: Instant offline lookup across all 72 lessons (720 vocabulary items) with CEFR level tags and "Open Lesson" navigation.
  - *Layer 2 (External Dictionary Provider)*: Proxy integration with the Free Dictionary API for full English definitions, bounded payloads, and sanitized HTTPS audio pronunciations.
  - *Layer 3 (Word Discovery & Relations)*: Synonyms, antonyms, similar concepts, sounds-like relations, and reverse dictionary (means-like search) powered by Datamuse.
- **IndexedDB Offline Cache**: Native browser database (`flipenglish_dictionary_v1`) caching looked-up entries with LRU eviction (bounded to 250 entries / 30-day TTL) and compact snapshots.
- **My Vocabulary (Personal Wordbook)**: Save words and curriculum items to your offline wordbook, filter by source (All/Curriculum/Dictionary), sort (Recent/A-Z), and open entries offline directly from local snapshots.
- **Cross-Feature Integration**: Deep link to dictionary lookup directly from Flashcards and Smart Review cards with contextual "Back to Lesson" and "Back to Smart Review" return navigation.

### Smart Review (Spaced Repetition System)
- Interval-based recall scheduling with four self-assessment ratings: `Again` (10 minutes), `Hard` (1 day), `Good` (3 days), `Easy` (7 days).
- Prioritizes due items and automatically schedules mistakes recorded during quiz exercises, exams, and the placement check.
- Safe client-side storage persistence in the browser.

### Exam Center
- Three dedicated practice modes:
  - **Quick Test**: 15 questions across mixed topics
  - **Level Exam**: Tailored question counts by CEFR level (A1: 20, A2: 25, B1: 30, B2: 35, C1: 40, C2: 40)
  - **Full Mock Exam**: 50 questions with timer, question flag, and review navigator
- Comprehensive post-exam diagnostics and direct mistake export to Smart Review.

### AI Features (Optional Google Gemini Integration)
- **Explain My Mistake**: Contextual grammatical and lexical explanations for incorrect quiz answers.
- **AI Targeted Practice**: Dynamically generated reinforcement exercises focusing on weak vocabulary.
- **AI Conversation Lab**: Text-first contextual conversation scenarios (Travel, Work, Study, Everyday, Advanced) offering feedback on grammar, vocabulary precision, natural expression, and communication goals.
- **FlipLens (Vision)**: Object recognition from uploaded images to generate personalized vocabulary study items.

### PWA & Offline Learning Capabilities
- **Progressive Web App**: Installable on Android (Chrome/Samsung Internet), Windows/macOS (Chrome/Edge), and iOS/iPadOS (Safari Add to Home Screen).
- **Offline Core Learning**: Today's Plan, Curriculum browsing, Flashcards, Quizzes, Smart Review, Placement Check, and Exam Center scoring operate offline after your first visit.
- **Runtime Image Caching**: Previously visited lesson photos and flashcard images are safely cached for offline access (bounded to 150 items / 30 days). Uncached remote images render a calm, professional fallback without breaking quiz layouts.
- **Network-Only AI Guard**: Live AI features (Conversation Lab, FlipLens Vision, AI Practice, Explain My Mistake, Exam AI Analysis) strictly require an internet connection and are never faked with stale cached data.
- **Speech Playback**: Offline availability of pronunciation audio depends on provider audio URLs cached in your browser or local voices installed on your device.
- **Disruption-Free Updates**: Updates prompt with "Update Now" and "Later" options without force-reloading active learning sessions.

### Mobile & Accessibility
- Responsive layout optimized for smartphones, tablets, and desktop displays.
- Designed with accessibility-conscious touch targets (~44–48px minimum touch targets), keyboard navigation, focus states, and responsive layouts.
- Styled with Tailwind CSS and CSS safe-area viewport insets.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Build Tool**: Vite 6, esbuild
- **Backend / API**: Express, Node.js, Helmet, Express Rate Limit
- **AI Integration**: @google/genai (Google Gemini Interactions & Multimodal Vision API)
- **Schema Validation**: Zod

---

## Getting Started

### 1. Prerequisites
- **Node.js**: 24.x
- **npm**: 10.x or higher

### 2. Install Dependencies
```bash
git clone https://github.com/dinhvien04/FlipEnglish.git
cd FlipEnglish
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root:
```env
PORT=5173
GEMINI_API_KEY=your_google_gemini_api_key_here
```
*(Note: Core features, including Curriculum, Flashcards, Exams, Smart Review, Dictionary, and the Placement Check, operate entirely without a Gemini API key).*

### 4. Run Development Server
```bash
npm run dev
```
Open your browser at: `http://localhost:5173`

### 5. Production Build
```bash
# Build Vite client and Express server bundle
npm run build

# Start production server
npm run start
```

---

## Validation & Testing

The project includes an automated suite of integrity, curriculum, exam, placement, and security tests:

```bash
# TypeScript type checking
npm run lint

# Validate i18n catalogs parity, token placeholders, formatters, and three-tier resolution
npm run validate:i18n

# Validate Dictionary providers, local curriculum index, and offline wordbook cache
npm run validate:dictionary

# Validate 24-question adaptive Placement Check engine, question pool, and routing
npm run validate:placement

# Validate 72 lessons and 720 curriculum items
npm run validate:curriculum

# Validate practice exam generation quotas and question pools
npm run validate:exams

# Validate personalized Today study plan generation, storage, and state rules
npm run validate:study-plan

# Validate Progressive Web App (PWA), manifest, icons, and service worker caching rules
npm run validate:pwa

# Validate Spaced Repetition System (SRS) intervals and storage invariants
npm run validate:review

# Validate AI Conversation Lab scenarios and Zod schemas
npm run validate:conversation

# Run dependency audit and security smoke tests
npm run security:audit
npm run test:security
```

---

## Security & Architecture

- **Security Headers**: HTTP headers and strict Content Security Policy managed via `Helmet`.
- **Rate Limiting**: Tiered IP-based rate limiting on all API routes with `express-rate-limit`.
- **Strict Input Validation**: Zod `.strict()` schema enforcement rejecting unexpected properties and validating image magic bytes.
- **Client-Side Persistence**: Placement, Exam history, and Smart Review records are maintained locally with schema validation and corruption protection.

---

## License

Educational and research project. All rights reserved.
