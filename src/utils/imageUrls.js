const GOOGLE_DRIVE_ID_PATTERNS = Object.freeze([
  /\/file\/d\/([a-zA-Z0-9_-]+)/,
  /[?&]id=([a-zA-Z0-9_-]+)/,
]);

const LOCAL_RENDERER_PROTOCOL = 'http:';
const LOCAL_RENDERER_HOSTNAME = 'localhost';
const LOCAL_RENDERER_PORT = '3020';
const LOCAL_RENDERER_BASE_URL = `${LOCAL_RENDERER_PROTOCOL}//${LOCAL_RENDERER_HOSTNAME}:${LOCAL_RENDERER_PORT}`;

const isBrowser = () => typeof window !== 'undefined' && Boolean(window.location);

const shouldUseLocalRendererMediaProxy = () => {
  if (!isBrowser()) return false;
  const { protocol, hostname } = window.location;
  return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
};

const getPreviewDriveMediaUrl = (fileId) => `/api/drive-media?id=${encodeURIComponent(fileId)}`;

const extractLocalRendererDriveMediaFileId = (value = '') => {
  const input = String(value || '').trim();
  if (!input) return '';

  try {
    const parsed = new URL(input);
    const isLocalRendererUrl = parsed.hostname === LOCAL_RENDERER_HOSTNAME && parsed.port === LOCAL_RENDERER_PORT;
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (isLocalRendererUrl && pathParts[0] === 'drive-media' && pathParts[1]) {
      return pathParts[1];
    }
  } catch (error) {
    return '';
  }

  return '';
};

export function extractGoogleDriveFileId(value = '') {
  const input = String(value || '').trim();
  if (!input) return '';

  const localMediaFileId = extractLocalRendererDriveMediaFileId(input);
  if (localMediaFileId) return localMediaFileId;

  for (const pattern of GOOGLE_DRIVE_ID_PATTERNS) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }

  return '';
}

export function normalizeGoogleDriveImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';

  const fileId = extractGoogleDriveFileId(url);
  if (fileId && url.includes('drive.google.com')) {
    return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}`;
  }

  return url;
}

export function normalizeGoogleDriveMediaUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';

  const fileId = extractGoogleDriveFileId(url);
  if (fileId && url.includes('drive.google.com')) {
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
  }

  return url;
}

export function normalizeGoogleDriveVideoUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';

  const localMediaFileId = extractLocalRendererDriveMediaFileId(url);
  if (localMediaFileId && !shouldUseLocalRendererMediaProxy()) {
    return getPreviewDriveMediaUrl(localMediaFileId);
  }

  const fileId = extractGoogleDriveFileId(url);
  if (fileId && (url.includes('drive.google.com') || url.includes('drive.usercontent.google.com'))) {
    if (shouldUseLocalRendererMediaProxy()) {
      return `${LOCAL_RENDERER_BASE_URL}/drive-media/${encodeURIComponent(fileId)}`;
    }

    return getPreviewDriveMediaUrl(fileId);
  }

  return url;
}

export function isVideoLikeUrl(value = '') {
  const url = String(value || '').trim().toLowerCase();
  if (!url) return false;
  if (/\/api\/drive-media\?id=[a-z0-9_-]+/i.test(url)) return true;
  if (/\/drive-media\/[a-z0-9_-]+/i.test(url)) return true;
  if (url.includes('drive.usercontent.google.com/download')) return true;
  if (/\.(mp4|webm|mov|m4v)(?:\?|#|$)/i.test(url)) return true;
  return false;
}

export function guessMediaTypeFromUrl(value = '') {
  const url = String(value || '').trim().toLowerCase();
  if (!url) return 'auto';
  if (isVideoLikeUrl(url)) return 'video';
  if (/\.(png|jpg|jpeg|webp|gif|avif)(?:\?|#|$)/i.test(url)) return 'image';
  return 'auto';
}
