const ALLOWED_HOSTS = new Set([
  'files.getorder.biz',
  'drive.google.com',
  'drive.usercontent.google.com',
  'lh3.googleusercontent.com',
]);

const sendJson = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const rawUrl = String(request.query?.url || '').trim();
  let sourceUrl;
  try {
    sourceUrl = new URL(rawUrl);
  } catch {
    sendJson(response, 400, { error: 'Invalid image URL.' });
    return;
  }

  if (sourceUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(sourceUrl.hostname)) {
    sendJson(response, 400, { error: 'Image host is not allowed.' });
    return;
  }

  try {
    const upstream = await fetch(sourceUrl, {
      method: request.method,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 Print Menu Image Proxy',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    const contentType = upstream.headers.get('content-type') || '';
    if (!upstream.ok || !contentType.startsWith('image/')) {
      sendJson(response, upstream.status || 502, { error: 'Unable to fetch image.' });
      return;
    }

    response.statusCode = upstream.status;
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (!buffer.length) {
      sendJson(response, 502, { error: 'Image is empty.' });
      return;
    }

    response.setHeader('Content-Length', String(buffer.length));
    response.end(buffer);
  } catch (error) {
    sendJson(response, 500, {
      error: 'Unable to proxy image.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
