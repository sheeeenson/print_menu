const DRIVE_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=';

const sendJson = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const getFileId = (request) => {
  const queryValue = request.query?.id;
  const rawFileId = Array.isArray(queryValue) ? queryValue[0] : queryValue;
  return String(rawFileId || '').trim();
};

const getSafeContentType = (upstreamResponse) => {
  const contentType = upstreamResponse.headers.get('content-type') || '';
  if (contentType && !contentType.includes('text/html')) return contentType;
  return 'video/mp4';
};

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const fileId = getFileId(request);
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    sendJson(response, 400, { error: 'Invalid Google Drive file id.' });
    return;
  }

  const headers = {};
  if (request.headers.range) headers.Range = request.headers.range;

  try {
    const upstreamResponse = await fetch(`${DRIVE_DOWNLOAD_URL}${encodeURIComponent(fileId)}`, {
      method: request.method,
      headers,
      redirect: 'follow',
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      sendJson(response, upstreamResponse.status, {
        error: 'Unable to fetch Google Drive media.',
        detail: upstreamResponse.statusText,
      });
      return;
    }

    response.statusCode = upstreamResponse.status;
    response.setHeader('Content-Type', getSafeContentType(upstreamResponse));
    response.setHeader('Accept-Ranges', upstreamResponse.headers.get('accept-ranges') || 'bytes');
    response.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    response.setHeader('Content-Disposition', `inline; filename="drive-video-${fileId}.mp4"`);

    const contentLength = upstreamResponse.headers.get('content-length');
    if (contentLength) response.setHeader('Content-Length', contentLength);

    const contentRange = upstreamResponse.headers.get('content-range');
    if (contentRange) response.setHeader('Content-Range', contentRange);

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    response.end(Buffer.from(await upstreamResponse.arrayBuffer()));
  } catch (error) {
    sendJson(response, 500, {
      error: 'Unable to proxy Google Drive media.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
