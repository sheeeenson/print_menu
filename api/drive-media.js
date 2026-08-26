const DRIVE_DOWNLOAD_URL = 'https://drive.usercontent.google.com/download?id=';
const DRIVE_THUMBNAIL_URL = 'https://drive.google.com/thumbnail?id=';

const sendJson = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const getQueryValue = (request, key) => {
  const queryValue = request.query?.[key];
  const rawValue = Array.isArray(queryValue) ? queryValue[0] : queryValue;
  return String(rawValue || '').trim();
};

const getFileId = (request) => getQueryValue(request, 'id') || getQueryValue(request, 'fileId');
const getMediaType = (request) => {
  const value = getQueryValue(request, 'type').toLowerCase();
  return value === 'image' || value === 'video' ? value : 'auto';
};

const getSafeContentType = (upstreamResponse, mediaType) => {
  const contentType = upstreamResponse.headers.get('content-type') || '';
  if (contentType && !contentType.includes('text/html')) return contentType;
  return mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
};

const getFilename = (fileId, mediaType) => mediaType === 'video' ? `drive-video-${fileId}.mp4` : `drive-image-${fileId}`;

const isUsableMediaResponse = (upstreamResponse) => {
  const contentType = upstreamResponse.headers.get('content-type') || '';
  return (upstreamResponse.ok || upstreamResponse.status === 206) && !contentType.includes('text/html');
};

const fetchDriveDownload = ({ fileId, method, headers }) => fetch(
  `${DRIVE_DOWNLOAD_URL}${encodeURIComponent(fileId)}&export=download&confirm=t`,
  {
    method,
    headers,
    redirect: 'follow',
  },
);

const fetchDriveMedia = async ({ fileId, mediaType, method, headers }) => {
  // Always prefer the original Drive file. The old implementation preferred
  // Google's thumbnail endpoint for images, which recompressed/resized the source
  // and caused visible quality loss in A3 exports.
  const originalResponse = await fetchDriveDownload({ fileId, method, headers });
  if (isUsableMediaResponse(originalResponse)) return originalResponse;

  if (mediaType === 'image') {
    const thumbnailResponse = await fetch(`${DRIVE_THUMBNAIL_URL}${encodeURIComponent(fileId)}&sz=w4096`, {
      method,
      headers: {
        ...headers,
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (isUsableMediaResponse(thumbnailResponse)) return thumbnailResponse;
  }

  return originalResponse;
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

  const mediaType = getMediaType(request);
  const headers = {
    'User-Agent': 'Mozilla/5.0 Print Menu Drive Media Proxy',
    Accept: mediaType === 'video' ? 'video/mp4,video/webm,video/*,*/*;q=0.8' : 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  };
  if (request.headers.range) headers.Range = request.headers.range;

  try {
    const upstreamResponse = await fetchDriveMedia({ fileId, mediaType, method: request.method, headers });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      sendJson(response, upstreamResponse.status, {
        error: 'Unable to fetch Google Drive media.',
        detail: upstreamResponse.statusText,
      });
      return;
    }

    const contentType = getSafeContentType(upstreamResponse, mediaType);
    response.statusCode = upstreamResponse.status;
    response.setHeader('Content-Type', contentType);
    response.setHeader('Accept-Ranges', upstreamResponse.headers.get('accept-ranges') || 'bytes');
    response.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    response.setHeader('Content-Disposition', `inline; filename="${getFilename(fileId, mediaType)}"`);

    const contentRange = upstreamResponse.headers.get('content-range');
    if (contentRange) response.setHeader('Content-Range', contentRange);

    if (request.method === 'HEAD') {
      const contentLength = upstreamResponse.headers.get('content-length');
      if (contentLength) response.setHeader('Content-Length', contentLength);
      response.end();
      return;
    }

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    if (!buffer.length) {
      sendJson(response, 502, { error: 'Google Drive returned an empty media file.' });
      return;
    }

    if (/text\/html/i.test(contentType) || buffer.subarray(0, 120).toString('utf8').includes('<html')) {
      sendJson(response, 502, {
        error: 'Google Drive returned HTML instead of media.',
        detail: 'Check file sharing: Anyone with the link should have Viewer access.',
      });
      return;
    }

    response.setHeader('Content-Length', String(buffer.length));
    response.end(buffer);
  } catch (error) {
    sendJson(response, 500, {
      error: 'Unable to proxy Google Drive media.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
