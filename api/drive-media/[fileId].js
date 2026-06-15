const DRIVE_DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=';

const json = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const getFileId = (request) => {
  const queryValue = request.query?.fileId;
  const rawFileId = Array.isArray(queryValue) ? queryValue[0] : queryValue;
  return String(rawFileId || '').trim();
};

const getContentType = (upstreamResponse) => {
  const contentType = upstreamResponse.headers.get('content-type');
  if (contentType && !contentType.includes('text/html')) return contentType;
  return 'video/mp4';
};

const getFilename = (fileId) => `drive-video-${fileId}.mp4`;

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    json(response, 405, { error: 'Method not allowed' });
    return;
  }

  const fileId = getFileId(request);
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    json(response, 400, { error: 'Invalid Google Drive file id.' });
    return;
  }

  const headers = {};
  const range = request.headers.range;
  if (range) headers.Range = range;

  try {
    const upstreamResponse = await fetch(`${DRIVE_DOWNLOAD_URL}${encodeURIComponent(fileId)}`, {
      method: request.method,
      headers,
      redirect: 'follow',
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      json(response, upstreamResponse.status, {
        error: 'Unable to fetch Google Drive media.',
        detail: upstreamResponse.statusText,
      });
      return;
    }

    response.statusCode = upstreamResponse.status;
    response.setHeader('Content-Type', getContentType(upstreamResponse));
    response.setHeader('Accept-Ranges', upstreamResponse.headers.get('accept-ranges') || 'bytes');
    response.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    response.setHeader('Content-Disposition', `inline; filename="${getFilename(fileId)}"`);

    const contentLength = upstreamResponse.headers.get('content-length');
    if (contentLength) response.setHeader('Content-Length', contentLength);

    const contentRange = upstreamResponse.headers.get('content-range');
    if (contentRange) response.setHeader('Content-Range', contentRange);

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const fileBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    response.end(fileBuffer);
  } catch (error) {
    json(response, 500, {
      error: 'Unable to proxy Google Drive media.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
