import { z } from 'zod';

export const proofreadSchema = z.object({
  suggestions: z.array(z.object({
    type: z.string(),
    original: z.string(),
    suggestion: z.string(),
    reason: z.string(),
    priority: z.string(),
  })),
});
