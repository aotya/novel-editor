import { Hono } from 'hono';
import { generateObject } from 'ai';
import { rewriteModel } from '../ai/client.js';
import { rewriteSchema } from '../schemas/rewrite.js';
import { REWRITER_PROMPT } from '../ai/prompts/rewriter.js';

const rewriteRoute = new Hono();

rewriteRoute.post('/rewrite', async (c) => {
  try {
    const { data } = await c.req.json();
    const prompt = JSON.stringify(data, null, 2);

    const { object } = await generateObject({
      model: rewriteModel,
      schema: rewriteSchema,
      system: REWRITER_PROMPT,
      prompt,
    });

    return c.json(object);
  } catch (e) {
    console.error('Error in rewrite:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ detail: message }, 500);
  }
});

export { rewriteRoute };
