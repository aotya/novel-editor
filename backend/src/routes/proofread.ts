import { Hono } from 'hono';
import { generateObject } from 'ai';
import { proofreadModel } from '../ai/client.js';
import { proofreadSchema } from '../schemas/proofread.js';
import { proofreadRequestSchema } from '../schemas/request.js';
import { PROOFREADER_PROMPT } from '../ai/prompts/proofreader.js';

const proofreadRoute = new Hono();

proofreadRoute.post('/proofread', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = proofreadRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ detail: parsed.error.issues[0].message }, 400);
  }

  try {
    const { object } = await generateObject({
      model: proofreadModel,
      schema: proofreadSchema,
      system: PROOFREADER_PROMPT,
      prompt: parsed.data.content,
    });

    return c.json(object);
  } catch (e) {
    console.error('Error in proofread:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ detail: message }, 500);
  }
});

export { proofreadRoute };
