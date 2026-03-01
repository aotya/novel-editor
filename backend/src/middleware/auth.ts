import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const JWKS_URL = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` : null;

const jwks = JWKS_URL
  ? jose.createRemoteJWKSet(new URL(JWKS_URL))
  : null;

export const authMiddleware = createMiddleware(async (c, next) => {
  if (!jwks) {
    return c.json({ detail: 'Supabase URL is not configured' }, 500);
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ detail: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jose.jwtVerify(token, jwks, {
      algorithms: ['HS256', 'ES256'],
    });

    if (!payload.sub) {
      return c.json({ detail: 'Invalid token: missing sub claim' }, 401);
    }

    c.set('user', payload);
    await next();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ detail: `Could not validate credentials: ${message}` }, 401);
  }
});
