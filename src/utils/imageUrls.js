const GOOGLE_DRIVE_ID_PATTERNS = Object.freeze([
  /\/file\/d\/([a-zA-Z0-9_-]+)/,
  /[?&]id=([a-zA-Z0-9_-]+)/,
]);

const mediaSegment = ['drive', 'media'].join('-');
const previewMediaPrefix = `/api/${mediaSegment}?id=`;

const getPreviewDriveMediaUrl = (fileId) => `${previewMediaPrefix}${encodeURIComponent(fileId)}`;

const extractSavedPreviewMediaFileId = (value = '') => {
  const input = String(value || '').trim();
  if (!input) return '';

  const marker = `/${mediaSegment}/`;
  const markerIndex = input.indexOf(marker);
  if (markerIndex < 0) return '';

  return input.slice(markerIndex + marker.length).split(/[?#/]/)[0] || '';
};

export function extractGoogleDriveFileId(value = '') {
  const input = String(value || '').trim();
  if (!input) return '';

  const savedPreviewMediaFileId = extractSavedPreviewMediaFileId(input);
  if (savedPreviewMediaFileId) return savedPreviewMediaFileId;

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

  const fileId = extractGoogleDriveFileId(url);
  if (fileId && (url.includes('drive.google.com') || url.includes('drive.usercontent.google.com') || url.includes(`/${mediaSegment}/`))) {
    return getPreviewDriveMediaUrl(fileId);
  }

  return url;
}

export function isVideoLikeUrl(value = '') {
  const url = String(value || '').trim().toLowerCase();
  if (!url) return false;
  if (url.includes(previewMediaPrefix)) return true;
  if (url.includes(`/${mediaSegment}/`)) return true;
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
