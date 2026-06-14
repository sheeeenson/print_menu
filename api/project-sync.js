import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

const KEY_PREFIX = 'print-menu-project:';
const MAX_BODY_BYTES = 1500000;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});

const isValidId = (id) => /^[a-zA-Z0-9_-]{8,80}$/.test(String(id || ''));
const keyForId = (id) => `${KEY_PREFIX}${id}`;

export default async function handler(request) {
  try {
    const requestUrl = new URL(request.url);
    const id = requestUrl.searchParams.get('id');

    if (!isValidId(id)) return json({ error: 'Invalid project id.' }, 400);

    if (request.method === 'GET') {
      const data = await kv.get(keyForId(id));
      return json({ data: data || null });
    }

    if (request.method === 'PUT') {
      const contentLength = Number(request.headers.get('content-length') || 0);
      if (contentLength > MAX_BODY_BYTES) return json({ error: 'Project JSON is too large.' }, 413);

      const body = await request.json();
      if (!body || typeof body.project !== 'object') return json({ error: 'Missing project payload.' }, 400);

      const data = {
        version: 1,
        updatedAt: new Date().toISOString(),
        project: body.project,
      };

      await kv.set(keyForId(id), data);
      return json({ data });
    }

    return json({ error: 'Method not allowed.' }, 405);
  } catch (error) {
    return json({ error: error?.message || 'Cloud project sync failed.' }, 500);
  }
}
