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
    novelTitle: z.string().nullable().optional(),
    novelSynopsis: z.string().nullable().optional(),
    worldSetting: z.string().nullable().optional(),
    references: z.object({
      correlationMap: z.array(z.record(z.unknown())).nullable().optional(),
      plot: z.array(z.object({
        title: z.string(),
        scenes: z.array(z.object({
          content: z.string().nullable(),
          note: z.string().nullable(),
        })),
      })).nullable().optional(),
      relationMap: z.array(z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().nullable(),
        type: z.string().nullable(),
      })).nullable().optional(),
      worldElements: z.array(z.record(z.unknown())).nullable().optional(),
    }).nullable().optional(),
    pastContent: z.array(z.object({
      episodeNumber: z.number(),
      title: z.string().nullable(),
      content: z.string(),
    })).nullable().optional(),
  }),
});

export const storyRequestSchema = z.object({
  data: z.record(z.unknown()),
});
