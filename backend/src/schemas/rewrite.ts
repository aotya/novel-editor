import { z } from 'zod';

export const rewriteSchema = z.object({
  success: z.boolean(),
  result: z.object({
    originalText: z.string().optional().default(''),
    rewrittenText: z.string().optional().default(''),
    reason: z.string().optional().default(''),
    error: z.string().optional().default(''),
    diffHighlights: z.array(z.object({
      type: z.string(),
      before: z.string(),
      after: z.string(),
    })).optional().default([]),
  }),
});
