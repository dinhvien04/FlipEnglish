import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

dotenv.config();

// Declare extended Request type for request tracking
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

const app = express();
const PORT = 3000;

// Security: Disable X-Powered-By header
app.disable('x-powered-by');

// Security: Proper proxy configuration for Google Cloud Run / reverse proxies
const trustProxyConfig = process.env.TRUST_PROXY || '1';
app.set(
  'trust proxy',
  trustProxyConfig === 'false' ? false : isNaN(Number(trustProxyConfig)) ? trustProxyConfig : Number(trustProxyConfig)
);

// Helper: Sanitize strings for safe security logging (prevents log injection)
function sanitizeForLog(val: any): string {
  if (typeof val !== 'string') {
    val = String(val ?? '');
  }
  return val.replace(/[\r\n\t]+/g, ' ').slice(0, 200);
}

// Security: Apply Helmet with tailored Content-Security-Policy
const isProd = process.env.NODE_ENV === 'production';

app.use(
  helmet({
    // Disable frameguard so AI Studio development preview iframe works via frame-ancestors CSP directive
    frameguard: false,
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    strictTransportSecurity: isProd
      ? { maxAge: 31536000, includeSubDomains: true, preload: false }
      : false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // In development Vite requires inline scripts / eval for fast refresh; production is restricted
        scriptSrc: isProd ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        // Tailwind CSS & motion animations utilize inline style properties
        styleSrc: ["'self'", "'unsafe-inline'"],
        // External lesson images from Unsplash + self, data, blob
        imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
        connectSrc: isProd ? ["'self'"] : ["'self'", 'https:', 'wss:', 'ws:'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        // Allow embedding within Google AI Studio preview frame
        frameAncestors: [
          "'self'",
          'https://ai.studio',
          'https://*.google.com',
          'https://*.run.app',
          'http://localhost:*',
        ],
      },
    },
  })
);

// Middleware: Request ID generator
app.use((req, res, next) => {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Middleware: Cache-Control no-store for all API endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Rate Limiting helper factory
const createLimiter = (options: { windowMs: number; max: number; message: string; name: string }) =>
  rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(
        `[Security RateLimit] 429 on ${sanitizeForLog(req.path)} from IP ${sanitizeForLog(req.ip || 'unknown')} (ReqID: ${req.id})`
      );
      res.status(429).json({
        error: options.message,
        requestId: req.id,
      });
    },
  });

// API-wide rate limiter: 60 requests per 15 minutes per IP
const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_API_MAX || '60', 10),
  message: 'API rate limit exceeded. Please wait a few moments before trying again.',
  name: 'API_GENERAL',
});

// Specific Gemini route rate limiters
const photoLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_PHOTO_MAX || '5', 10),
  message: 'Photo analysis rate limit reached (5 requests per 10 minutes). Please try again shortly.',
  name: 'PHOTO_ANALYZE',
});

const practiceLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_PRACTICE_MAX || '10', 10),
  message: 'AI practice generation rate limit reached (10 requests per 10 minutes). Please try again shortly.',
  name: 'AI_PRACTICE',
});

const mistakeLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MISTAKE_MAX || '20', 10),
  message: 'AI explanation rate limit reached (20 requests per 10 minutes). Please try again shortly.',
  name: 'EXPLAIN_MISTAKE',
});

const examLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_EXAM_MAX || '10', 10),
  message: 'Exam AI analysis rate limit reached (10 requests per 10 minutes). Please try again shortly.',
  name: 'ANALYZE_EXAM',
});

// Middleware: Strict JSON Content-Type validator for POST endpoints
const requireJsonContentType: express.RequestHandler = (req, res, next) => {
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      console.warn(`[Security ContentType] 415 on ${sanitizeForLog(req.path)}: Invalid content-type "${sanitizeForLog(contentType)}" (ReqID: ${req.id})`);
      res.status(415).json({
        error: 'Unsupported Media Type. Request body must be application/json.',
        requestId: req.id,
      });
      return;
    }
  }
  next();
};

// Route-specific Body Parsers
const jsonParserStandard = express.json({ limit: '256kb' });
const jsonParserPhoto = express.json({ limit: '8mb' });

// Middleware: Handle JSON syntax and body-too-large errors safely
const handleJsonErrors: express.ErrorRequestHandler = (err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    console.warn(`[Security BodySize] 413 Payload Too Large on ${sanitizeForLog(req.path)} (ReqID: ${req.id})`);
    res.status(413).json({
      error: 'Payload Too Large. The submitted data exceeds the maximum allowed request size.',
      requestId: req.id,
    });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    console.warn(`[Security JsonSyntax] 400 Malformed JSON on ${sanitizeForLog(req.path)} (ReqID: ${req.id})`);
    res.status(400).json({
      error: 'Malformed JSON payload. Please verify that your request body is valid JSON.',
      requestId: req.id,
    });
    return;
  }
  next(err);
};

// ==========================================
// In-Process Concurrency Guard for Gemini
// ==========================================
const MAX_CONCURRENT_GEMINI = parseInt(process.env.GEMINI_MAX_CONCURRENCY || '4', 10);
let activeGeminiCalls = 0;

class HttpError extends Error {
  statusCode: number;
  userMessage?: string;
  constructor(statusCode: number, userMessage: string, internalMessage?: string) {
    super(internalMessage || userMessage);
    this.statusCode = statusCode;
    this.userMessage = userMessage;
  }
}

async function withGeminiConcurrency<T>(reqId: string, task: () => Promise<T>): Promise<T> {
  if (activeGeminiCalls >= MAX_CONCURRENT_GEMINI) {
    console.warn(`[Security Concurrency] Gemini capacity exhausted (${activeGeminiCalls}/${MAX_CONCURRENT_GEMINI} active). ReqID: ${reqId}`);
    throw new HttpError(503, 'AI services are busy. Please try again shortly.');
  }
  activeGeminiCalls++;
  try {
    return await task();
  } finally {
    activeGeminiCalls--;
  }
}

// Lazy-initialized Gemini client (Server-Side Secret Isolation)
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpError(503, 'AI service configuration is currently unavailable.', 'GEMINI_API_KEY is not configured');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'flipenglish-security-hardened',
        },
      },
    });
  }
  return aiClient;
}

// Resilient Gemini Execution with Bounded Retries, Timeout & Canonical Models
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
  primaryModel?: string;
  reqId?: string;
}) {
  const ai = getGenAI();

  // Canonical supported models in priority order
  const candidateModels = [
    params.primaryModel || 'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
  ];

  const modelsToTry = Array.from(new Set(candidateModels));
  const MAX_TOTAL_ATTEMPTS = 3;
  const REQUEST_TIMEOUT_MS = 28000;

  let totalAttempts = 0;
  let lastError: any = null;

  for (const model of modelsToTry) {
    if (totalAttempts >= MAX_TOTAL_ATTEMPTS) break;
    totalAttempts++;

    try {
      // Execute with bounded timeout
      const callPromise = ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new HttpError(504, 'AI request timed out. Please try again.')), REQUEST_TIMEOUT_MS)
      );

      const response: any = await Promise.race([callPromise, timeoutPromise]);

      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isTransient =
        err.statusCode === 503 ||
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('rate limit');

      console.warn(
        `[Gemini API] ReqID: ${params.reqId || 'unknown'} Attempt ${totalAttempts} with "${model}" failed: ${sanitizeForLog(errMsg)}`
      );

      // Do NOT retry non-transient client/schema errors (400, 401, 403, invalid schema)
      if (!isTransient || totalAttempts >= MAX_TOTAL_ATTEMPTS) {
        break;
      }

      // Exponential backoff with jitter (350ms - 650ms)
      const backoff = 350 * Math.pow(1.5, totalAttempts - 1) + Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  if (lastError instanceof HttpError) {
    throw lastError;
  }
  throw new HttpError(503, 'AI service is temporarily unavailable. Please try again shortly.', lastError?.message);
}

// ==========================================
// Zod Input & Output Validation Schemas
// ==========================================

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

// 1. AI Practice Schemas
const AiPracticeInputSchema = z.object({
  lessonTitle: z.string().trim().max(120).optional().default('Vocabulary'),
  level: z.enum(CEFR_LEVELS).optional().default('A1'),
  mistakeWords: z
    .array(
      z.object({
        word: z.string().trim().min(1).max(80),
        meaning: z.string().trim().min(1).max(200),
        partOfSpeech: z.string().trim().max(40).optional(),
        example: z.string().trim().max(500).optional(),
      })
    )
    .min(1, 'Please provide at least one mistake word.')
    .max(10, 'Cannot submit more than 10 mistake words per request.'),
});

const AiPracticeOutputSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().trim().max(100),
        targetWord: z.string().trim().min(1).max(100),
        prompt: z.string().trim().min(1).max(500),
        options: z.array(z.string().trim().min(1).max(200)).length(4),
        correctAnswer: z.string().trim().min(1).max(200),
        explanation: z.string().trim().min(1).max(500),
      })
    )
    .min(1)
    .max(5),
});

// 2. Explain Mistake Schemas
const ExplainMistakeInputSchema = z.object({
  level: z.enum(CEFR_LEVELS).optional().default('A1'),
  lesson: z.string().trim().max(120).optional().default('Vocabulary'),
  question: z.string().trim().min(1).max(1000),
  selectedAnswer: z.string().trim().min(1).max(300),
  correctAnswer: z.string().trim().min(1).max(300),
  targetWord: z.string().trim().min(1).max(100),
  meaning: z.string().trim().max(300).optional(),
  example: z.string().trim().max(600).optional(),
});

const ExplainMistakeOutputSchema = z.object({
  title: z.string().trim().max(120).optional().default('Why this answer is incorrect'),
  explanation: z.string().trim().min(1).max(1000),
  correctExample: z.string().trim().min(1).max(500),
  tip: z.string().trim().min(1).max(500),
});

// 3. FlipLens Photo Schemas
const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_DECODED_PHOTO_BYTES = 6 * 1024 * 1024; // 6 MB

const FlipLensInputSchema = z.object({
  image: z.string().min(10, 'Image payload cannot be empty.'),
  mimeType: z.enum(ALLOWED_PHOTO_MIMES).optional().default('image/jpeg'),
});

const FlipLensOutputSchema = z.object({
  objects: z
    .array(
      z.object({
        id: z.string().max(100).optional(),
        word: z.string().trim().min(1).max(80),
        meaning: z.string().trim().min(1).max(200),
        pronunciation: z.string().trim().max(80).optional().default(''),
        partOfSpeech: z.enum(['noun', 'verb', 'adjective', 'adverb', 'phrase', 'preposition']).optional().default('noun'),
        level: z.enum(['A1', 'A2', 'B1']).optional().default('A1'),
        example: z.string().trim().max(300).optional().default(''),
        confidence: z.number().min(0).max(1).optional().default(0.9),
        box_2d: z.array(z.number().int().min(0).max(1000)).length(4).optional(),
      })
    )
    .max(12),
});

// 4. Analyze Exam Schemas
const AnalyzeExamInputSchema = z.object({
  level: z.enum(CEFR_LEVELS).optional().default('B2'),
  title: z.string().trim().max(150).optional().default('CEFR Practice Exam'),
  overallPercentage: z.number().min(0).max(100),
  sectionScores: z
    .array(
      z.object({
        sectionTitle: z.string().trim().max(100).optional(),
        correct: z.number().int().min(0).max(100).optional(),
        total: z.number().int().min(1).max(100).optional(),
        percentage: z.number().min(0).max(100).optional(),
      })
    )
    .max(10)
    .optional(),
  missedTags: z.array(z.string().trim().max(80)).max(20).optional(),
  missedItems: z
    .array(
      z.object({
        target: z.string().trim().max(100).optional(),
        word: z.string().trim().max(100).optional(),
        type: z.string().trim().max(80).optional(),
      })
    )
    .max(20)
    .optional(),
});

const AnalyzeExamOutputSchema = z.object({
  summary: z.string().trim().min(1).max(1000),
  strengths: z.array(z.string().trim().max(300)).max(5),
  weaknesses: z.array(z.string().trim().max(300)).max(5),
  recommendations: z
    .array(
      z.object({
        lessonId: z.string().trim().max(100),
        lessonTitle: z.string().trim().max(150),
        level: z.string().trim().max(20),
        reason: z.string().trim().max(500),
      })
    )
    .max(5),
  studyTip: z.string().trim().min(1).max(500),
});

// Helper: Magic byte image signature validation
function validateImageMagicBytes(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;

  if (mime === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === 'image/png') {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    return buffer.subarray(0, 8).equals(pngHeader);
  }
  if (mime === 'image/webp') {
    const isRiff = buffer.subarray(0, 4).toString('ascii') === 'RIFF';
    const isWebp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return isRiff && isWebp;
  }
  return false;
}

// ==========================================
// API Routes
// ==========================================

// Apply general API rate limiter to /api/*
app.use('/api', apiLimiter);

// 1. Health check endpoint (Minimal, no sensitive system disclosure)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 2. Gemini Targeted Practice Endpoint
app.post(
  '/api/ai-practice',
  practiceLimiter,
  requireJsonContentType,
  jsonParserStandard,
  handleJsonErrors,
  async (req, res, next) => {
    try {
      const parseResult = AiPracticeInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.warn(`[Security Validation] 400 on /api/ai-practice (ReqID: ${req.id}): ${parseResult.error.issues[0]?.message}`);
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || 'Invalid input data format.',
          requestId: req.id,
        });
        return;
      }

      const { lessonTitle, level, mistakeWords } = parseResult.data;

      const mistakesSummary = mistakeWords
        .map((w) => `- "${w.word}" (${w.partOfSpeech || 'word'}): Meaning "${w.meaning}". Example: "${w.example || ''}"`)
        .join('\n');

      const prompt = `You are a friendly, encouraging English language teacher for FlipEnglish learners.
The student just completed the lesson "${lessonTitle}" (CEFR level ${level}).
The student made mistakes on the following vocabulary items:
${mistakesSummary}

Please generate exactly 5 targeted, high-quality multiple-choice practice questions that directly test and reinforce these specific mistake words in clear, everyday contexts.
For each question:
1. Provide a clear question prompt (e.g. contextual fill-in-the-blank sentence with '____', situational usage, or meaning match).
2. Provide 4 distinct options.
3. Provide the exact string of the correct answer (matching one of the 4 options).
4. Provide a helpful 1-sentence explanation in Vietnamese reinforcing why this is correct and clarifying the word's meaning.
5. Specify the target word being tested.`;

      const response = await withGeminiConcurrency(req.id || 'practice', () =>
        generateContentWithFallback({
          primaryModel: 'gemini-3.7-flash',
          contents: prompt,
          reqId: req.id,
          config: {
            systemInstruction: 'You are an expert English language tutor creating personalized mistake-targeted quizzes with structured output.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                questions: {
                  type: Type.ARRAY,
                  description: 'List of 5 tailored multiple-choice practice questions.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      targetWord: { type: Type.STRING },
                      prompt: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctAnswer: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                    },
                    required: ['id', 'targetWord', 'prompt', 'options', 'correctAnswer', 'explanation'],
                  },
                },
              },
              required: ['questions'],
            },
          },
        })
      );

      const rawText = response.text || '{}';
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        throw new HttpError(502, 'Failed to parse AI structured response.');
      }

      const outputValidation = AiPracticeOutputSchema.safeParse(parsedJson);
      if (!outputValidation.success) {
        console.warn(`[Security OutputValidation] AI Practice output failed validation (ReqID: ${req.id})`);
        throw new HttpError(502, 'AI generated invalid question data structure.');
      }

      // Filter options to ensure correctAnswer strictly belongs to options and options are unique
      const sanitizedQuestions = outputValidation.data.questions.map((q, idx) => {
        const uniqueOptions = Array.from(new Set(q.options));
        if (!uniqueOptions.includes(q.correctAnswer)) {
          uniqueOptions[0] = q.correctAnswer;
        }
        while (uniqueOptions.length < 4) {
          uniqueOptions.push(`Option ${uniqueOptions.length + 1}`);
        }
        return {
          id: q.id || `ai-q-${idx + 1}`,
          targetWord: q.targetWord,
          prompt: q.prompt,
          options: uniqueOptions.slice(0, 4),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        };
      });

      res.json({
        lessonTitle,
        questions: sanitizedQuestions,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Gemini Explain My Mistake Endpoint
app.post(
  '/api/explain-mistake',
  mistakeLimiter,
  requireJsonContentType,
  jsonParserStandard,
  handleJsonErrors,
  async (req, res, next) => {
    try {
      const parseResult = ExplainMistakeInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.warn(`[Security Validation] 400 on /api/explain-mistake (ReqID: ${req.id}): ${parseResult.error.issues[0]?.message}`);
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || 'Invalid input data format.',
          requestId: req.id,
        });
        return;
      }

      const { level, lesson, question, selectedAnswer, correctAnswer, targetWord, meaning, example } = parseResult.data;

      const prompt = `You are a concise, encouraging English language tutor for FlipEnglish.
The learner made a mistake on this question in CEFR ${level} lesson "${lesson}":
- Question prompt: "${question}"
- Learner's selected (incorrect) answer: "${selectedAnswer}"
- Target vocabulary word: "${targetWord}"
- Meaning (Vietnamese): "${meaning || ''}"
- Correct answer: "${correctAnswer}"
${example ? `- Example sentence: "${example}"` : ''}

Please provide a clear, compact explanation in structured JSON:
1. "title": A short header such as "Why this answer is incorrect"
2. "explanation": A friendly, concise explanation in Vietnamese (1-2 sentences) explaining why "${selectedAnswer}" is not the right choice here, and clarifying what "${targetWord}" ("${correctAnswer}") actually means in this context.
3. "correctExample": One short, natural English sentence illustrating the correct usage of "${targetWord}".
4. "tip": One simple, memorable memory tip (e.g. "Think: ${targetWord} = ...") in Vietnamese or simple English.`;

      const response = await withGeminiConcurrency(req.id || 'explain', () =>
        generateContentWithFallback({
          primaryModel: 'gemini-3.7-flash',
          contents: prompt,
          reqId: req.id,
          config: {
            systemInstruction: `You are a concise English vocabulary tutor. Explain why their selected answer was incorrect and why the correct answer is appropriate. For A1-B1, explain in friendly Vietnamese with English vocabulary context. Give one short example and memory tip. Never criticize the learner.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                explanation: { type: Type.STRING },
                correctExample: { type: Type.STRING },
                tip: { type: Type.STRING },
              },
              required: ['explanation', 'correctExample', 'tip'],
            },
          },
        })
      );

      const rawText = response.text || '{}';
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        throw new HttpError(502, 'Failed to parse AI structured response.');
      }

      const outputValidation = ExplainMistakeOutputSchema.safeParse(parsedJson);
      if (!outputValidation.success) {
        throw new HttpError(502, 'AI generated invalid explanation response.');
      }

      res.json(outputValidation.data);
    } catch (err) {
      next(err);
    }
  }
);

// 4. Gemini Vision FlipLens Endpoint: Analyze Photo for Useful Vocabulary
app.post(
  '/api/analyze-photo',
  photoLimiter,
  requireJsonContentType,
  jsonParserPhoto,
  handleJsonErrors,
  async (req, res, next) => {
    try {
      const parseResult = FlipLensInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.warn(`[Security Validation] 400 on /api/analyze-photo (ReqID: ${req.id}): ${parseResult.error.issues[0]?.message}`);
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || 'Invalid photo upload data.',
          requestId: req.id,
        });
        return;
      }

      const { image, mimeType } = parseResult.data;

      // Extract raw base64 data & MIME
      let base64Data = image;
      let detectedMime: 'image/jpeg' | 'image/png' | 'image/webp' = mimeType;

      if (image.startsWith('data:')) {
        const match = image.match(/^data:(image\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          const rawMime = match[1].toLowerCase();
          if (!ALLOWED_PHOTO_MIMES.includes(rawMime as any)) {
            res.status(415).json({
              error: 'Unsupported Media Type. Only JPEG, PNG, and WebP images are supported.',
              requestId: req.id,
            });
            return;
          }
          detectedMime = rawMime as any;
          base64Data = match[2];
        } else {
          const parts = image.split(',');
          base64Data = parts[1] || image;
        }
      }

      // Validate base64 format
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      const cleanBase64 = base64Data.replace(/\s+/g, '');
      if (!base64Regex.test(cleanBase64)) {
        res.status(400).json({
          error: 'Invalid base64 encoding in image payload.',
          requestId: req.id,
        });
        return;
      }

      // Convert to Buffer and check decoded byte size (Max 6MB)
      const imageBuffer = Buffer.from(cleanBase64, 'base64');
      if (imageBuffer.length > MAX_DECODED_PHOTO_BYTES) {
        res.status(400).json({
          error: 'Image exceeds the maximum allowed size of 6MB. Please upload a smaller image.',
          requestId: req.id,
        });
        return;
      }

      // Verify Magic Bytes / File Signature to prevent spoofing
      const isValidImageSignature = validateImageMagicBytes(imageBuffer, detectedMime);
      if (!isValidImageSignature) {
        console.warn(`[Security MagicBytes] 415 Invalid file signature for claimed mime "${detectedMime}" (ReqID: ${req.id})`);
        res.status(415).json({
          error: 'Unsupported or corrupted image format. Please upload a valid JPEG, PNG, or WebP image.',
          requestId: req.id,
        });
        return;
      }

      const prompt = `You are an English vocabulary teacher analyzing a real-world image for Vietnamese English learners.

Identify only clearly visible, useful, concrete objects in this photo that can become English vocabulary.
Prefer everyday vocabulary suitable for CEFR A1-B1.
- Do not identify people or faces.
- Do not infer sensitive personal information.
- Do not guess objects that are unclear.
- Do not return brands when a generic object name is better (e.g. use "Laptop", not "MacBook"; "Sneakers", not "Nike").
- For each object provide:
  1. "id": lowercase slug (e.g. "laptop", "coffee-cup", "notebook")
  2. "word": proper English word capitalized (e.g. "Laptop", "Coffee cup", "Notebook")
  3. "meaning": accurate Vietnamese translation (e.g. "Máy tính xách tay", "Tách cà phê", "Quyển vở")
  4. "pronunciation": standard IPA phonetic notation if reliable (e.g. "/ˈlæp.tɒp/"), or empty string
  5. "partOfSpeech": one of "noun", "verb", "adjective", "phrase", "preposition"
  6. "level": estimated CEFR level: "A1", "A2", or "B1"
  7. "example": one short, natural English example sentence demonstrating daily usage
  8. "confidence": number between 0.5 and 1.0 indicating visibility certainty
  9. "box_2d": [ymin, xmin, ymax, xmax] bounding box coordinates normalized on a 0-1000 scale (where 0,0 is top-left, 1000,1000 is bottom-right) enclosing that object region in the photo if visible.

Return 5 to 10 high-quality vocabulary items when the image contains enough useful objects (maximum 12).
Avoid duplicates and near-duplicate synonyms.`;

      const response = await withGeminiConcurrency(req.id || 'fliplens', () =>
        generateContentWithFallback({
          primaryModel: 'gemini-3.7-flash',
          contents: [
            { text: prompt },
            {
              inlineData: {
                mimeType: detectedMime,
                data: cleanBase64,
              },
            },
          ],
          reqId: req.id,
          config: {
            systemInstruction: `You are an English vocabulary teacher analyzing a real-world image for Vietnamese English learners. Identify only clearly visible, useful, concrete objects that can become English vocabulary. Prefer everyday vocabulary suitable for CEFR A1-B1. Do not identify people. Do not infer sensitive personal information. Do not guess objects that are unclear. Do not return brands when a generic object name is better. Return 5 to 10 high-quality vocabulary items (maximum 12).`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                objects: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      word: { type: Type.STRING },
                      meaning: { type: Type.STRING },
                      pronunciation: { type: Type.STRING },
                      partOfSpeech: {
                        type: Type.STRING,
                        enum: ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'preposition'],
                      },
                      level: { type: Type.STRING, enum: ['A1', 'A2', 'B1'] },
                      example: { type: Type.STRING },
                      confidence: { type: Type.NUMBER },
                      box_2d: {
                        type: Type.ARRAY,
                        items: { type: Type.INTEGER },
                        description: '[ymin, xmin, ymax, xmax] on a 0-1000 scale',
                      },
                    },
                    required: ['word', 'meaning', 'partOfSpeech', 'level', 'example'],
                  },
                },
              },
              required: ['objects'],
            },
          },
        })
      );

      const rawText = response.text || '{"objects":[]}';
      let parsedJson: any = {};
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        parsedJson = { objects: [] };
      }

      const outputValidation = FlipLensOutputSchema.safeParse(parsedJson);
      const rawObjects = outputValidation.success ? outputValidation.data.objects : [];

      // Deduplicate and sanitize
      const seenWords = new Set<string>();
      const sanitizedObjects = [];

      for (const obj of rawObjects) {
        if (!obj.word || !obj.meaning) continue;
        const cleanWord = obj.word.trim();
        const lowerKey = cleanWord.toLowerCase();
        if (seenWords.has(lowerKey)) continue;
        seenWords.add(lowerKey);

        let validBox: [number, number, number, number] | undefined = undefined;
        if (Array.isArray(obj.box_2d) && obj.box_2d.length === 4) {
          const [ymin, xmin, ymax, xmax] = obj.box_2d;
          if (ymin < ymax && xmin < xmax && ymin >= 0 && ymax <= 1000 && xmin >= 0 && xmax <= 1000) {
            validBox = [ymin, xmin, ymax, xmax];
          }
        }

        sanitizedObjects.push({
          id: obj.id || `fl-${cleanWord.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          word: cleanWord,
          meaning: obj.meaning.trim(),
          pronunciation: obj.pronunciation?.trim() || '',
          partOfSpeech: obj.partOfSpeech || 'noun',
          level: obj.level || 'A1',
          example: obj.example?.trim() || `Look at the ${cleanWord.toLowerCase()}.`,
          confidence: typeof obj.confidence === 'number' ? Math.max(0, Math.min(1, obj.confidence)) : 0.9,
          box_2d: validBox,
        });

        if (sanitizedObjects.length >= 12) break;
      }

      res.json({ objects: sanitizedObjects });
    } catch (err) {
      next(err);
    }
  }
);

// 5. Gemini AI Exam Analysis Endpoint
app.post(
  '/api/analyze-exam',
  examLimiter,
  requireJsonContentType,
  jsonParserStandard,
  handleJsonErrors,
  async (req, res, next) => {
    try {
      const parseResult = AnalyzeExamInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.warn(`[Security Validation] 400 on /api/analyze-exam (ReqID: ${req.id}): ${parseResult.error.issues[0]?.message}`);
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || 'Invalid exam data payload.',
          requestId: req.id,
        });
        return;
      }

      const { level, title, overallPercentage, sectionScores, missedTags, missedItems } = parseResult.data;

      const sectionsSummary = Array.isArray(sectionScores)
        ? sectionScores
            .map((s) => `- ${s.sectionTitle || 'Section'}: ${s.correct ?? 0}/${s.total ?? 0} (${s.percentage ?? 0}%)`)
            .join('\n')
        : 'N/A';

      const missedSummary = Array.isArray(missedItems) && missedItems.length > 0
        ? missedItems
            .slice(0, 10)
            .map((m) => `- Target: "${m.target || m.word || 'Item'}" (Question type: ${m.type || 'multiple-choice'})`)
            .join('\n')
        : 'None';

      const tagsSummary = Array.isArray(missedTags) && missedTags.length > 0
        ? missedTags.slice(0, 10).join(', ')
        : 'None';

      const prompt = `You are a supportive, high-level English language assessment consultant for FlipEnglish.
The learner just finished a practice exam:
- Title: "${title}"
- CEFR Level: ${level}
- Overall Score: ${overallPercentage}%
- Section Breakdown:
${sectionsSummary}
- Question Tags Missed: ${tagsSummary}
- Items with Mistakes:
${missedSummary}

Please deliver an insightful, encouraging diagnostic evaluation in structured JSON:
1. "summary": A 2-sentence diagnostic assessment in English summarizing their overall proficiency and key area needing attention.
2. "strengths": An array of 2 to 3 concise bullet points identifying their strongest demonstrated competencies.
3. "weaknesses": An array of 2 to 3 specific linguistic or structural areas to prioritize for improvement (e.g., "Phrasal verb prepositions", "Reading inference under time pressure").
4. "recommendations": An array of 2 to 3 actionable study recommendations. Each recommendation should have "lessonId" (can be a topic slug like "career-workplace", "academic-research", "c1-advanced-collocations"), "lessonTitle" (e.g. "Advanced Collocations & Idioms"), "level" ("${level}"), and "reason" (why this helps overcome their specific mistakes).
5. "studyTip": One high-impact, practical learning strategy (e.g. "When learning collocations, record full 4-word collocations in your notebook instead of isolated adjectives.").`;

      const response = await withGeminiConcurrency(req.id || 'exam', () =>
        generateContentWithFallback({
          primaryModel: 'gemini-3.7-flash',
          contents: prompt,
          reqId: req.id,
          config: {
            systemInstruction: `You are an expert English language diagnostic tutor for FlipEnglish practice exams. Evaluate user performance objectively, identify specific linguistic patterns in their mistakes, and offer constructive, motivating study strategies. Always respond in valid JSON matching the requested schema.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                strengths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                weaknesses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      lessonId: { type: Type.STRING },
                      lessonTitle: { type: Type.STRING },
                      level: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ['lessonId', 'lessonTitle', 'level', 'reason'],
                  },
                },
                studyTip: { type: Type.STRING },
              },
              required: ['summary', 'strengths', 'weaknesses', 'recommendations', 'studyTip'],
            },
          },
        })
      );

      const rawText = response.text || '{}';
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        throw new HttpError(502, 'Failed to parse AI structured response.');
      }

      const outputValidation = AnalyzeExamOutputSchema.safeParse(parsedJson);
      if (!outputValidation.success) {
        throw new HttpError(502, 'AI generated invalid exam analysis response.');
      }

      res.json(outputValidation.data);
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// Centralized Production Error Handler
// ==========================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const reqId = req.id || 'unknown';
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : (typeof err.status === 'number' ? err.status : 500);

  if (statusCode >= 500) {
    console.error(`[Server Error] [ReqID: ${reqId}] ${sanitizeForLog(err.stack || err.message || err)}`);
    res.status(statusCode).json({
      error: err.userMessage || 'AI service is temporarily unavailable. Please try again shortly.',
      requestId: reqId,
    });
    return;
  }

  console.warn(`[Client Error] [Status: ${statusCode}] [ReqID: ${reqId}] ${sanitizeForLog(err.message || 'Client error')}`);
  res.status(statusCode).json({
    error: err.userMessage || err.message || 'Invalid request.',
    requestId: reqId,
  });
});

// ==========================================
// Vite Middleware & Hardened Static Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Hardened static serving: ignore dotfiles, prevent directory indexing
    app.use(
      express.static(distPath, {
        dotfiles: 'ignore',
        index: false,
        fallthrough: true,
        etag: true,
        lastModified: true,
      })
    );
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlipEnglish hardened server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
