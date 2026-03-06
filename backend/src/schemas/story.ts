import { z } from 'zod';

export const storySchema = z.object({
  generatedStory: z.object({
    title: z.string(),
    content: z.string(),
    summary: z.string(),
    aiComment: z.string(),
  }),
});
