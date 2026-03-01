import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { proofreadRoute } from './routes/proofread.js';
import { rewriteRoute } from './routes/rewrite.js';
import { generateStoryRoute } from './routes/generate-story.js';
import { generateLongStoryRoute } from './routes/generate-long-story.js';
import { authMiddleware } from './middleware/auth.js';

const app = new Hono();

app.use('*', logger());
app.use('/api/*', cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || []),
  ],
  credentials: true,
}));
app.use('/api/*', authMiddleware);

app.get('/', (c) => c.json({ status: 'ok' }));

app.route('/api', proofreadRoute);
app.route('/api', rewriteRoute);
app.route('/api', generateStoryRoute);
app.route('/api', generateLongStoryRoute);

const port = Number(process.env.PORT) || 8080;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`);
});
