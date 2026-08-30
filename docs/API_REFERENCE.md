# FlipEnglish — Backend API Reference & Security Contracts

## 1. Overview & Protocol Contract

All FlipEnglish backend endpoints are served by the Node.js / Express server in `server.ts`. 

- **Base URL**: `/api`
- **Protocol**: HTTP/1.1 over TLS (HTTPS) in production.
- **Content-Type**: `application/json; charset=utf-8` (Strictly enforced on POST endpoints).
- **Diagnostics**: Every response (success or failure) includes an authoritative `X-Request-Id` UUID header for distributed tracing.
- **AI Gating**: If `AI_FEATURES_ENABLED !== 'true'` or `GEMINI_API_KEY` is not present, all AI endpoints fail closed with `HTTP 503 Service Unavailable`.

---

## 2. Endpoints Specification

### 2.1 System & Health (`GET /api/health`)
Checks backend operational status and AI subsystem configuration without exposing sensitive API keys.

- **Response `200 OK`**:
```json
{
  "status": "ok",
  "aiConfigured": true,
  "aiEnabled": true,
  "timestamp": "2026-08-30T04:30:00.000Z"
}
```

---

### 2.2 FlipLens Photo Analysis (`POST /api/analyze-photo`)
Analyzes real-world learner photos to detect everyday objects, extract vocabulary, and generate contextual sentences.

- **Rate Limit**: 5 requests / 10 min per IP. Body size limit: 8 MB.
- **Request Body**:
```json
{
  "imageBase64": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg"
}
```
- **Validation**: Strict binary magic byte signature verification (`image/jpeg`, `image/png`, `image/webp`). Max decoded image buffer: 6 MB.
- **Response `200 OK`**:
```json
{
  "detectedItems": [
    {
      "englishWord": "cup",
      "vietnameseMeaning": "cái cốc / cái tách",
      "phonetic": "/kʌp/",
      "partOfSpeech": "noun",
      "cefrLevel": "A1",
      "exampleSentence": "There is a cup of hot coffee on the table."
    }
  ]
}
```

---

### 2.3 Mistake-Driven Practice Generator (`POST /api/ai-practice`)
Generates targeted pedagogical exercises based on recent quiz or exam mistakes.

- **Rate Limit**: 10 requests / 10 min per IP.
- **Request Body**:
```json
{
  "targetWord": "schedule",
  "userMistake": "schedual",
  "context": "lesson-quiz",
  "cefrLevel": "B1"
}
```
- **Response `200 OK`**:
```json
{
  "exercises": [
    {
      "type": "fill-in-the-blank",
      "question": "Can we check our _____ for the upcoming meeting?",
      "options": ["schedule", "schedual", "scheduler", "scheduling"],
      "correctAnswer": "schedule",
      "explanation": "'Schedule' is the correct spelling referring to a plan of activities."
    }
  ]
}
```

---

### 2.4 Mistake Explanation & Mnemonic (`POST /api/explain-mistake`)
Provides pedagogical root-cause explanations and memorable mnemonic cues for learning errors.

- **Rate Limit**: 20 requests / 10 min per IP.
- **Request Body**:
```json
{
  "word": "accommodate",
  "chosenOption": "acommodate",
  "correctOption": "accommodate",
  "sentenceContext": "The hotel can accommodate up to 200 guests."
}
```
- **Response `200 OK`**:
```json
{
  "rootCause": "Missing the double 'c' and double 'm' spelling pattern.",
  "mnemonic": "Remember: 'accommodate' has double 'c' and double 'm' (2 Cots and 2 Mattresses).",
  "grammarNote": "A regular verb commonly followed by direct object (guests, requests)."
}
```

---

### 2.5 Post-Exam Diagnostic Analysis (`POST /api/analyze-exam`)
Analyzes completed practice exam results and provides personalized study recommendations.

- **Rate Limit**: 10 requests / 10 min per IP.
- **Request Body**:
```json
{
  "examType": "general",
  "level": "B2",
  "score": 82,
  "sectionScores": {
    "vocabulary": 85,
    "useOfEnglish": 80,
    "reading": 80,
    "listening": 83
  },
  "missedTopics": ["phrasal verbs", "conditionals"]
}
```
- **Response `200 OK`**:
```json
{
  "diagnosticSummary": "Strong vocabulary retention with occasional uncertainty in mixed conditional clauses.",
  "priorityFocusAreas": ["Third and mixed conditionals", "Separable phrasal verbs"],
  "recommendedStudyAction": "Review Lesson B2-08 (Advanced Conditionals) and complete 2 practice sessions."
}
```

---

### 2.6 AI Conversation Lab (`POST /api/conversation/turn` & `POST /api/conversation/evaluate`)
Multi-turn conversational roleplay aligned with CEFR scenarios (Study, Work, Daily Life).

- **Turn Rate Limit**: 30 requests / 10 min per IP.
- **Evaluate Rate Limit**: 10 requests / 10 min per IP.
- **Payloads**: Verified with Zod `.strict()` enforcing message history boundaries ($\le 10$ turns) and CEFR level constraints.
