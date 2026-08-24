import { z } from 'zod';
import { Type } from '@google/genai';

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

// 1. Conversation Turn Input Schema (Client -> Server)
export const ConversationTurnInputSchema = z
  .object({
    scenarioId: z.string().trim().min(1).max(80),
    level: z.enum(CEFR_LEVELS),
    turnNumber: z.number().int().min(1).max(10),
    message: z.string().trim().min(1).max(500),
    previousInteractionId: z.string().trim().min(1).max(256).nullable().optional(),
  })
  .strict();

export type ConversationTurnInput = z.infer<typeof ConversationTurnInputSchema>;

// 2. Conversation Turn Output Schema (Gemini -> Server -> Client)
export const ConversationTurnOutputSchema = z
  .object({
    reply: z.string().trim().min(1).max(1000),
    feedback: z
      .object({
        hasCorrection: z.boolean(),
        original: z.string().trim().max(500).optional(),
        suggestion: z.string().trim().max(500).optional(),
        explanation: z.string().trim().max(500).optional(),
      })
      .strict(),
    usefulExpressions: z
      .array(
        z
          .object({
            expression: z.string().trim().min(1).max(200),
            meaning: z.string().trim().min(1).max(300),
            level: z.enum(CEFR_LEVELS).optional(),
          })
          .strict()
      )
      .max(3),
    conversationStatus: z.enum(['continue', 'complete']),
  })
  .strict();

export type ConversationTurnOutput = z.infer<typeof ConversationTurnOutputSchema>;

// 3. Conversation Evaluate Input Schema (Client -> Server)
export const ConversationEvaluateInputSchema = z
  .object({
    scenarioId: z.string().trim().min(1).max(80),
    level: z.enum(CEFR_LEVELS),
    turnsCount: z.number().int().min(2).max(10),
    previousInteractionId: z.string().trim().min(1).max(256).nullable().optional(),
    transcriptSummary: z.string().trim().max(4000).optional(),
  })
  .strict();

export type ConversationEvaluateInput = z.infer<typeof ConversationEvaluateInputSchema>;

// 4. Conversation Evaluate Output Schema (Gemini -> Server -> Client)
export const ConversationEvaluateOutputSchema = z
  .object({
    summary: z.string().trim().min(1).max(1000),
    scores: z
      .object({
        communication: z.number().min(0).max(100),
        vocabulary: z.number().min(0).max(100),
        grammar: z.number().min(0).max(100),
        naturalExpression: z.number().min(0).max(100),
      })
      .strict(),
    overallScore: z.number().min(0).max(100),
    strengths: z.array(z.string().trim().max(300)).max(3),
    improvements: z.array(z.string().trim().max(300)).max(3),
    reviewItems: z
      .array(
        z
          .object({
            expression: z.string().trim().min(1).max(200),
            meaning: z.string().trim().min(1).max(300),
            reason: z.string().trim().min(1).max(500),
          })
          .strict()
      )
      .max(5),
  })
  .strict();

export type ConversationEvaluateOutput = z.infer<typeof ConversationEvaluateOutputSchema>;

// 5. GenAI Top-Level response_format Schemas for ai.interactions.create
export const conversationTurnJsonSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    feedback: {
      type: Type.OBJECT,
      properties: {
        hasCorrection: { type: Type.BOOLEAN },
        original: { type: Type.STRING },
        suggestion: { type: Type.STRING },
        explanation: { type: Type.STRING },
      },
      required: ['hasCorrection'],
    },
    usefulExpressions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          expression: { type: Type.STRING },
          meaning: { type: Type.STRING },
          level: { type: Type.STRING },
        },
        required: ['expression', 'meaning'],
      },
    },
    conversationStatus: {
      type: Type.STRING,
      enum: ['continue', 'complete'],
    },
  },
  required: ['reply', 'feedback', 'usefulExpressions', 'conversationStatus'],
};

export const conversationEvaluateJsonSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    scores: {
      type: Type.OBJECT,
      properties: {
        communication: { type: Type.NUMBER },
        vocabulary: { type: Type.NUMBER },
        grammar: { type: Type.NUMBER },
        naturalExpression: { type: Type.NUMBER },
      },
      required: ['communication', 'vocabulary', 'grammar', 'naturalExpression'],
    },
    overallScore: { type: Type.NUMBER },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    improvements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    reviewItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          expression: { type: Type.STRING },
          meaning: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ['expression', 'meaning', 'reason'],
      },
    },
  },
  required: ['summary', 'scores', 'overallScore', 'strengths', 'improvements', 'reviewItems'],
};
