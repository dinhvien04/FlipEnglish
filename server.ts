import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Resilient helper to execute Gemini API calls with automatic retry on 503/429
 * and seamless fallback across supported models if one model experiences high demand.
 */
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
  primaryModel?: string;
}) {
  const ai = getGenAI();

  // Priority order of models to try
  const candidateModels = [
    params.primaryModel || 'gemini-2.5-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3-flash',
  ];

  // Deduplicate candidate models
  const modelsToTry = Array.from(new Set(candidateModels));

  let lastError: any = null;

  for (const model of modelsToTry) {
    // Try up to 2 attempts per model for transient errors
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        // Ensure we got a valid response
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || JSON.stringify(err);
        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('rate limit');

        console.warn(`[Gemini API] Attempt ${attempt + 1} with model "${model}" encountered: ${errMsg.slice(0, 120)}`);

        if (isTransient && attempt === 0) {
          // Wait 600ms with small jitter before quick retry
          const backoff = 600 + Math.floor(Math.random() * 300);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        // On non-transient error or second failed attempt, switch to next fallback model
        break;
      }
    }
  }

  throw lastError || new Error('Gemini API is temporarily busy. Please try again in a moment.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Gemini Targeted Practice Endpoint
app.post('/api/ai-practice', async (req, res) => {
  try {
    const { lessonTitle, level, mistakeWords } = req.body;

    if (!mistakeWords || !Array.isArray(mistakeWords) || mistakeWords.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one mistake word.' });
    }

    const mistakesSummary = mistakeWords
      .map((w: any) => `- "${w.word}" (${w.partOfSpeech || 'word'}): Meaning "${w.meaning}". Example: "${w.example || ''}"`)
      .join('\n');

    const prompt = `You are a friendly, encouraging English language teacher for FlipEnglish learners.
The student just completed the lesson "${lessonTitle || 'Vocabulary'}" (CEFR level ${level || 'A1-B1'}).
The student made mistakes on the following vocabulary items:
${mistakesSummary}

Please generate exactly 5 targeted, high-quality multiple-choice practice questions that directly test and reinforce these specific mistake words in clear, everyday contexts.
For each question:
1. Provide a clear question prompt (e.g. contextual fill-in-the-blank sentence with '____', situational usage, or meaning match).
2. Provide 4 distinct options.
3. Provide the exact string of the correct answer (matching one of the 4 options).
4. Provide a helpful 1-sentence explanation in Vietnamese reinforcing why this is correct and clarifying the word's meaning.
5. Specify the target word being tested.`;

    const response = await generateContentWithFallback({
      primaryModel: 'gemini-2.5-flash',
      contents: prompt,
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
                  targetWord: { type: Type.STRING, description: 'The mistake word being tested' },
                  prompt: { type: Type.STRING, description: 'The question prompt' },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '4 multiple-choice options',
                  },
                  correctAnswer: { type: Type.STRING, description: 'The exact correct answer from the options' },
                  explanation: { type: Type.STRING, description: 'Short 1-sentence explanation in Vietnamese' },
                },
                required: ['id', 'targetWord', 'prompt', 'options', 'correctAnswer', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const rawText = response.text || '{}';
    const parsedData = JSON.parse(rawText);

    if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
      throw new Error('Invalid response structure from Gemini model');
    }

    return res.json({
      lessonTitle: lessonTitle || 'Lesson Practice',
      questions: parsedData.questions,
    });
  } catch (error: any) {
    console.error('Error generating AI practice with Gemini:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate AI targeted practice',
    });
  }
});

// Gemini Explain My Mistake Endpoint
app.post('/api/explain-mistake', async (req, res) => {
  try {
    const { level, lesson, question, selectedAnswer, correctAnswer, targetWord, meaning, example } = req.body;

    if (!question || !selectedAnswer || !correctAnswer || !targetWord) {
      return res.status(400).json({
        error: 'Missing required fields: question, selectedAnswer, correctAnswer, and targetWord are required.',
      });
    }

    const prompt = `You are a concise, encouraging English language tutor for FlipEnglish.
The learner made a mistake on this question in CEFR ${level || 'A1-A2'} lesson "${lesson || 'Vocabulary'}":
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

    const response = await generateContentWithFallback({
      primaryModel: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are a concise English vocabulary tutor. A learner has answered one vocabulary exercise incorrectly. Explain why their selected answer was incorrect and why the correct answer is appropriate. Use language suitable for the supplied CEFR level. For A1 and A2, explain in short, friendly Vietnamese while keeping English vocabulary words and example sentences in English. For B1, concise Vietnamese with English context is fine. Give one short correct example sentence and one simple memory tip. Keep the entire explanation concise and encouraging. Never criticize or shame the learner.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Short heading' },
            explanation: { type: Type.STRING, description: 'Concise explanation in Vietnamese' },
            correctExample: { type: Type.STRING, description: 'One short correct example sentence in English' },
            tip: { type: Type.STRING, description: 'One simple memory tip' },
          },
          required: ['explanation', 'correctExample', 'tip'],
        },
      },
    });

    const rawText = response.text || '{}';
    const parsedData = JSON.parse(rawText);

    if (!parsedData.explanation || !parsedData.correctExample || !parsedData.tip) {
      throw new Error('Incomplete structured explanation received from Gemini.');
    }

    return res.json({
      title: parsedData.title || 'Why this answer is incorrect',
      explanation: parsedData.explanation,
      correctExample: parsedData.correctExample,
      tip: parsedData.tip,
    });
  } catch (error: any) {
    console.error('Error generating mistake explanation with Gemini:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate mistake explanation',
    });
  }
});

// Gemini Vision FlipLens Endpoint: Analyze Photo for Useful Vocabulary
app.post('/api/analyze-photo', async (req, res) => {
  try {
    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid image data string.' });
    }

    // Strip data:image/...;base64, prefix if present
    let base64Data = image;
    let actualMime = mimeType;
    if (image.startsWith('data:')) {
      const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        actualMime = match[1];
        base64Data = match[2];
      } else {
        const parts = image.split(',');
        base64Data = parts[1] || image;
      }
    }

    // Limit check on base64 data size
    if (base64Data.length > 25 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image data is too large. Please upload an image under 15MB.' });
    }

    const ai = getGenAI();
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

    const response = await generateContentWithFallback({
      primaryModel: 'gemini-2.5-flash',
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: actualMime,
            data: base64Data,
          },
        },
      ],
      config: {
        systemInstruction: `You are an English vocabulary teacher analyzing a real-world image for Vietnamese English learners. Identify only clearly visible, useful, concrete objects that can become English vocabulary. Prefer everyday vocabulary suitable for CEFR A1-B1. Do not identify people. Do not infer sensitive personal information. Do not guess objects that are unclear. Do not return brands when a generic object name is better. For each object provide an English word, Vietnamese meaning, part of speech, estimated CEFR level, one short natural example sentence, confidence, and bounding box when possible. Return 5 to 10 high-quality vocabulary items when the image contains enough useful objects. Avoid duplicates and near-duplicate synonyms.`,
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
    });

    const rawText = response.text || '{"objects":[]}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = { objects: [] };
    }

    const rawObjects = Array.isArray(parsedData.objects) ? parsedData.objects : [];

    // Deduplicate and sanitize
    const seenWords = new Set<string>();
    const sanitizedObjects = [];

    for (const obj of rawObjects) {
      if (!obj.word || !obj.meaning) continue;
      const cleanWord = obj.word.trim();
      const lowerKey = cleanWord.toLowerCase();
      if (seenWords.has(lowerKey)) continue;
      seenWords.add(lowerKey);

      // Validate box_2d if provided
      let validBox: [number, number, number, number] | undefined = undefined;
      if (
        Array.isArray(obj.box_2d) &&
        obj.box_2d.length === 4 &&
        obj.box_2d.every((n: any) => typeof n === 'number' && !isNaN(n) && n >= 0 && n <= 1000)
      ) {
        const [ymin, xmin, ymax, xmax] = obj.box_2d;
        if (ymin < ymax && xmin < xmax) {
          validBox = [ymin, xmin, ymax, xmax];
        }
      }

      sanitizedObjects.push({
        id: obj.id || `fl-${cleanWord.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        word: cleanWord,
        meaning: obj.meaning.trim(),
        pronunciation: obj.pronunciation?.trim() || '',
        partOfSpeech: obj.partOfSpeech || 'noun',
        level: ['A1', 'A2', 'B1'].includes(obj.level) ? obj.level : 'A1',
        example: obj.example?.trim() || `Look at the ${cleanWord.toLowerCase()}.`,
        confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.9,
        box_2d: validBox,
      });

      if (sanitizedObjects.length >= 12) break;
    }

    return res.json({ objects: sanitizedObjects });
  } catch (error: any) {
    console.error('Error analyzing photo with Gemini:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze photo with Gemini',
    });
  }
});

// Gemini AI Exam Analysis Endpoint
app.post('/api/analyze-exam', async (req, res) => {
  try {
    const { level, title, overallPercentage, sectionScores, missedTags, missedItems } = req.body;

    const sectionsSummary = Array.isArray(sectionScores)
      ? sectionScores.map((s: any) => `- ${s.sectionTitle || 'Section'}: ${s.correct}/${s.total} (${s.percentage}%)`).join('\n')
      : 'N/A';

    const missedSummary = Array.isArray(missedItems) && missedItems.length > 0
      ? missedItems.slice(0, 10).map((m: any) => `- Target: "${m.target || m.word || 'Item'}" (Question type: ${m.type || 'multiple-choice'})`).join('\n')
      : 'None';

    const tagsSummary = Array.isArray(missedTags) && missedTags.length > 0
      ? missedTags.slice(0, 10).join(', ')
      : 'None';

    const prompt = `You are a supportive, high-level English language assessment consultant for FlipEnglish.
The learner just finished a practice exam:
- Title: "${title || 'CEFR Practice Exam'}"
- CEFR Level: ${level || 'B2'}
- Overall Score: ${overallPercentage || 0}%
- Section Breakdown:
${sectionsSummary}
- Question Tags Missed: ${tagsSummary}
- Items with Mistakes:
${missedSummary}

Please deliver an insightful, encouraging diagnostic evaluation in structured JSON:
1. "summary": A 2-sentence diagnostic assessment in English summarizing their overall proficiency and key area needing attention.
2. "strengths": An array of 2 to 3 concise bullet points identifying their strongest demonstrated competencies.
3. "weaknesses": An array of 2 to 3 specific linguistic or structural areas to prioritize for improvement (e.g., "Phrasal verb prepositions", "Reading inference under time pressure").
4. "recommendations": An array of 2 to 3 actionable study recommendations. Each recommendation should have "lessonId" (can be a topic slug like "career-workplace", "academic-research", "c1-advanced-collocations"), "lessonTitle" (e.g. "Advanced Collocations & Idioms"), "level" ("${level || 'B2'}"), and "reason" (why this helps overcome their specific mistakes).
5. "studyTip": One high-impact, practical learning strategy (e.g. "When learning collocations, record full 4-word collocations in your notebook instead of isolated adjectives.").`;

    const response = await generateContentWithFallback({
      primaryModel: 'gemini-2.5-flash',
      contents: prompt,
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
    });

    const rawText = response.text || '{}';
    const parsedData = JSON.parse(rawText);

    return res.json(parsedData);
  } catch (error: any) {
    console.error('Error generating AI Exam Analysis with Gemini:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate AI Exam Analysis',
    });
  }
});

// Vite Middleware & Static Serving Setup
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlipEnglish server running on http://0.0.0.0:${PORT}`);
  });
}

start();
