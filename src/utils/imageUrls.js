export function normalizeGoogleDriveImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';

  const filePathMarker = 'drive.google.com/file/d/';
  if (url.includes(filePathMarker)) {
    const afterMarker = url.split(filePathMarker)[1] || '';
    const fileId = afterMarker.split('/')[0];
    return fileId ? `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}` : url;
  }

  if (url.includes('drive.google.com/open?id=')) {
    const fileId = new URL(url).searchParams.get('id');
    return fileId ? `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}` : url;
  }

  if (url.includes('drive.google.com/uc?')) {
    const fileId = new URL(url).searchParams.get('id');
    return fileId ? `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}` : url;
  }

  return url;
}
