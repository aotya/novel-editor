import { google } from '@ai-sdk/google';

export const proofreadModel = google(
  process.env.AI_MODEL_PROOFREAD || 'gemini-2.5-flash'
);

export const rewriteModel = google(
  process.env.AI_MODEL_REWRITE || 'gemini-2.5-flash'
);

export const storyModel = google(
  process.env.AI_MODEL_STORY || 'gemini-2.5-flash'
);
