import { z } from 'zod';

export const rewriteSchema = z.object({
  success: z.boolean(),
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
