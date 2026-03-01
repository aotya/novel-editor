import { Hono } from 'hono';
import { generateObject } from 'ai';
import { rewriteModel } from '../ai/client.js';
import { rewriteSchema } from '../schemas/rewrite.js';
import { rewriteRequestSchema } from '../schemas/request.js';
import { REWRITER_PROMPT } from '../ai/prompts/rewriter.js';

const rewriteRoute = new Hono();

rewriteRoute.post('/rewrite', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = rewriteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ detail: parsed.error.issues[0].message }, 400);
  }

  try {
    const prompt = JSON.stringify(parsed.data.data, null, 2);

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
