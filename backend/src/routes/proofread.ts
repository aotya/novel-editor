import { Hono } from 'hono';
import { generateObject } from 'ai';
import { proofreadModel } from '../ai/client.js';
import { proofreadSchema } from '../schemas/proofread.js';
import { PROOFREADER_PROMPT } from '../ai/prompts/proofreader.js';

const proofreadRoute = new Hono();

proofreadRoute.post('/proofread', async (c) => {
  try {
    const { content } = await c.req.json();

    const { object } = await generateObject({
      model: proofreadModel,
      schema: proofreadSchema,
      system: PROOFREADER_PROMPT,
      prompt: content,
    });

    return c.json(object);
  } catch (e) {
    console.error('Error in proofread:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ detail: message }, 500);
  }
});

export { proofreadRoute };
