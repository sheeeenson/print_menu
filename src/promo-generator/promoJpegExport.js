import { getSceneHtmlDocument } from './promoHtmlDownload.js';

const JPEG_QUALITY = 0.9;

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadPromoJpeg = async () => {
  const html = await getSceneHtmlDocument();
  if (!html) throw new Error('Could not find the promo scene.');
  throw new Error(`JPEG local export is pending. ${JPEG_QUALITY}`);
};
