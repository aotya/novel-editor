import { Hono } from 'hono';
import { generateObject } from 'ai';
import { storyModel } from '../ai/client.js';
import { storySchema } from '../schemas/story.js';
import { STORY_GENERATOR_PROMPT } from '../ai/prompts/story-generator.js';

const generateStoryRoute = new Hono();

generateStoryRoute.post('/generate-story', async (c) => {
  try {
    const { data } = await c.req.json();
    const prompt = JSON.stringify(data, null, 2);

    const { object } = await generateObject({
      model: storyModel,
      schema: storySchema,
      system: STORY_GENERATOR_PROMPT,
      prompt,
    });

    return c.json(object);
  } catch (e) {
    console.error('Error in generate-story:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ detail: message }, 500);
  }
});

export { generateStoryRoute };
