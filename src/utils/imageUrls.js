const GOOGLE_DRIVE_ID_PATTERNS = Object.freeze([
  /\/file\/d\/([a-zA-Z0-9_-]+)/,
  /[?&]id=([a-zA-Z0-9_-]+)/,
]);

const LOCAL_RENDERER_BASE_URL = 'http://localhost:3020';

export function extractGoogleDriveFileId(value = '') {
  const input = String(value || '').trim();
  if (!input) return '';

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
  if (fileId && url.includes('drive.google.com')) return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}`;

  return url;
}

export function normalizeGoogleDriveMediaUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';

  const fileId = extractGoogleDriveFileId(url);
  if (fileId && url.includes('drive.google.com')) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;

  return url;
}

export function normalizeGoogleDriveVideoUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';

  const fileId = extractGoogleDriveFileId(url);
  if (fileId && url.includes('drive.google.com')) return `${LOCAL_RENDERER_BASE_URL}/drive-media/${encodeURIComponent(fileId)}`;

  return url;
}

export function guessMediaTypeFromUrl(value = '') {
  const url = String(value || '').trim().toLowerCase();
  if (!url) return 'auto';
  if (/\.(mp4|webm|mov|m4v)(?:\?|#|$)/i.test(url)) return 'video';
  if (/\.(png|jpg|jpeg|webp|gif|avif)(?:\?|#|$)/i.test(url)) return 'image';
  return 'auto';
}
