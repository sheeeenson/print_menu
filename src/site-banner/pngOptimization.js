import { SITE_BANNER_FORMAT } from './siteBannerStorage.js';

export const PNG_OPTIMIZED_TARGET_BYTES = 500 * 1024;

const OPTIMIZED_WIDTHS = [2048, 1920, 1800, 1680, 1600];

const canvasToPngBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('Could not create optimized PNG file.'));
      return;
    }
    resolve(blob);
  }, 'image/png');
});

const resizeCanvas = (sourceCanvas, width) => {
  const height = Math.round(width * (SITE_BANNER_FORMAT.height / SITE_BANNER_FORMAT.width));
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const context = outputCanvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sourceCanvas, 0, 0, width, height);
  return outputCanvas;
};

export const getQualityOptimizedPng = async (sourceCanvas, targetBytes = PNG_OPTIMIZED_TARGET_BYTES) => {
  const candidates = [];

  for (const width of OPTIMIZED_WIDTHS) {
    const canvas = width === sourceCanvas.width ? sourceCanvas : resizeCanvas(sourceCanvas, width);
    const blob = await canvasToPngBlob(canvas);
    candidates.push({ blob, width: canvas.width, height: canvas.height });
  }

  return candidates.find((candidate) => candidate.blob.size <= targetBytes) ?? candidates[candidates.length - 1];
};
