import { Hono } from 'hono';
import { generateObject } from 'ai';
import { storyModel } from '../ai/client.js';
import { storySchema } from '../schemas/story.js';
import { LONG_STORY_GENERATOR_PROMPT } from '../ai/prompts/long-story-generator.js';

const generateLongStoryRoute = new Hono();

generateLongStoryRoute.post('/generate-long-story', async (c) => {
  try {
    const { data } = await c.req.json();
    const prompt = JSON.stringify(data, null, 2);

    const { object } = await generateObject({
      model: storyModel,
      schema: storySchema,
      system: LONG_STORY_GENERATOR_PROMPT,
      prompt,
    });

    return c.json(object);
  } catch (e) {
    console.error('Error in generate-long-story:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ detail: message }, 500);
  }
});

export { generateLongStoryRoute };
