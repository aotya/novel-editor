import { z } from 'zod';

const rewriteSuccessSchema = z.object({
  success: z.literal(true),
  result: z.object({
    originalText: z.string(),
    rewrittenText: z.string(),
    reason: z.string(),
    diffHighlights: z.array(z.object({
      type: z.string(),
      before: z.string(),
      after: z.string(),
    })).default([]),
  }),
});

const rewriteErrorSchema = z.object({
  success: z.literal(false),
  result: z.object({
    error: z.string(),
  }),
});

export const rewriteSchema = z.discriminatedUnion('success', [
  rewriteSuccessSchema,
  rewriteErrorSchema,
]);
