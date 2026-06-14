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

const getPromoSceneSize = () => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) return { width: 1920, height: 1080 };
  const scale = Number(scene.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1) || 1;
  const rect = scene.getBoundingClientRect();
  return {
    width: Math.round(rect.width / scale) || scene.offsetWidth || 1920,
    height: Math.round(rect.height / scale) || scene.offsetHeight || 1080,
  };
};

const getRenderErrorMessage = async (response, fallbackMessage) => {
  const responseText = await response.text();
  if (!responseText) return fallbackMessage;
  try {
    const payload = JSON.parse(responseText);
    return payload.detail || payload.error || responseText;
  } catch (error) {
    return responseText;
  }
};

const blobToImage = (blob) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Could not read renderer PNG before JPEG conversion.'));
  };
  image.src = url;
});

const canvasToJpegBlob = (canvas, quality = JPEG_QUALITY) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('Browser could not create JPEG.'));
      return;
    }
    resolve(blob);
  }, 'image/jpeg', quality);
});

const pngBlobToJpegBlob = async (pngBlob) => {
  const image = await blobToImage(pngBlob);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#231f20';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const jpegBlob = await canvasToJpegBlob(canvas);
  return { blob: jpegBlob, width: canvas.width, height: canvas.height };
};

export const downloadPromoJpeg = async ({ filename, onStatus }) => {
  const html = await getSceneHtmlDocument();
  if (!html) throw new Error('Could not find the promo scene.');

  const { width, height } = getPromoSceneSize();
  const pngFilename = filename.replace(/\.jpe?g$/i, '.png');

  onStatus?.('Rendering JPEG source via PNG renderer...');
  const response = await fetch('/api/promo-render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      output: 'png',
      filename: pngFilename,
      format: { id: 'current', label: `${width}x${height}`, width, height },
      duration: 1,
      fps: 24,
      html,
    }),
  });

  if (!response.ok) throw new Error(await getRenderErrorMessage(response, 'JPEG source PNG export failed.'));
  const pngBlob = await response.blob();
  if (!pngBlob.size) throw new Error('Renderer returned an empty PNG for JPEG conversion.');

  onStatus?.('Converting rendered PNG to JPEG...');
  const jpeg = await pngBlobToJpegBlob(pngBlob);
  downloadBlob(jpeg.blob, filename);
  return { width: jpeg.width, height: jpeg.height, sizeKb: Math.round(jpeg.blob.size / 1024) };
};
