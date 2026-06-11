const getGoogleDriveFileId = (url) => {
  const text = String(url || '').trim();
  if (!text) return '';

  const filePathMarker = 'drive.google.com/file/d/';
  if (text.includes(filePathMarker)) {
    const afterMarker = text.split(filePathMarker)[1] || '';
    return afterMarker.split('/')[0] || '';
  }

  try {
    const parsed = new URL(text);
    if (parsed.hostname.includes('drive.google.com')) return parsed.searchParams.get('id') || '';
  } catch (error) {
    return '';
  }

  return '';
};

export function normalizeGoogleDriveImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';

  const fileId = getGoogleDriveFileId(url);
  if (fileId && url.includes('drive.google.com')) return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}`;

  return url;
}

export function normalizeGoogleDriveMediaUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';

  const fileId = getGoogleDriveFileId(url);
  if (fileId && url.includes('drive.google.com')) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

  return url;
}
