import { z } from 'zod';

export const proofreadRequestSchema = z.object({
  content: z.string().min(1, 'content is required'),
});

export const rewriteRequestSchema = z.object({
  data: z.object({
    fullText: z.string(),
    selectedText: z.string(),
    instruction: z.string(),
    selectionRange: z.object({
      start: z.number(),
      end: z.number(),
    }).nullable().optional(),
    context: z.record(z.unknown()).optional(),
  }),
});

export const storyRequestSchema = z.object({
  data: z.record(z.unknown()),
});
