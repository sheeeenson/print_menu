import { extractGoogleDriveFileId } from './imageUrls.js';

const fallbackBackgrounds = ['#eef0b4', '#f8d9a1', '#dfeacf', '#f2cfc1', '#d8e5ef', '#eadcf3'];
const colorCache = new Map();
const autofillColorCache = new Map();

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
const toRgb = (data, index) => ({ r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3] });
const isUsefulPixel = ({ a }) => a > 180;
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;
const distance = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

export const getFallbackImageBackground = (index = 0) => fallbackBackgrounds[index % fallbackBackgrounds.length];

const getAnalysisUrl = (value = '') => {
  const source = String(value || '').trim();
  if (!source || source.startsWith('data:') || source.startsWith('blob:') || source.startsWith('/')) return source;
  const driveId = extractGoogleDriveFileId(source);
  if (driveId) return `/api/drive-media?id=${encodeURIComponent(driveId)}&type=image`;
  try {
    const url = new URL(source);
    if (url.protocol === 'https:') return `/api/image-proxy?url=${encodeURIComponent(url.toString())}`;
  } catch {
    return source;
  }
  return source;
};

const readImagePixels = async (imageUrl, maxSide = 160) => {
  const response = await fetch(getAnalysisUrl(imageUrl), {
    credentials: 'same-origin',
    cache: 'force-cache',
    headers: { Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' },
  });
  if (!response.ok) throw new Error(`Could not read image for color analysis: HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob.size) throw new Error('Image is empty');
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(2, Math.round(bitmap.width * scale));
    const height = Math.max(2, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, width, height);
    return { data: context.getImageData(0, 0, width, height).data, width, height };
  } finally {
    bitmap.close?.();
  }
};

const getClusterColor = (pixels, bucketSize = 14) => {
  if (!pixels.length) throw new Error('No useful color pixels');
  const buckets = new Map();
  pixels.forEach((pixel) => {
    const key = [pixel.r, pixel.g, pixel.b].map((value) => Math.round(value / bucketSize) * bucketSize).join(',');
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += pixel.r;
    bucket.g += pixel.g;
    bucket.b += pixel.b;
    buckets.set(key, bucket);
  });
  const ranked = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 6).map((bucket) => ({
    count: bucket.count,
    color: { r: bucket.r / bucket.count, g: bucket.g / bucket.count, b: bucket.b / bucket.count },
  }));
  const primary = ranked[0];
  if (!primary) throw new Error('No dominant color');
  const compatible = ranked.filter((entry) => distance(entry.color, primary.color) <= 42);
  const total = compatible.reduce((sum, entry) => sum + entry.count, 0) || primary.count;
  return compatible.reduce((sum, entry) => ({
    r: sum.r + entry.color.r * entry.count / total,
    g: sum.g + entry.color.g * entry.count / total,
    b: sum.b + entry.color.b * entry.count / total,
  }), { r: 0, g: 0, b: 0 });
};

const collectPerimeterPixels = (data, width, height, bandRatio = 0.08) => {
  const bandX = Math.max(2, Math.round(width * bandRatio));
  const bandY = Math.max(2, Math.round(height * bandRatio));
  const pixels = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= bandX && x < width - bandX && y >= bandY && y < height - bandY) continue;
      const pixel = toRgb(data, (y * width + x) * 4);
      if (isUsefulPixel(pixel)) pixels.push(pixel);
    }
  }
  return pixels;
};

const collectCornerPixels = (data, width, height) => {
  const cornerW = Math.max(3, Math.round(width * 0.2));
  const cornerH = Math.max(3, Math.round(height * 0.2));
  const pixels = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isCorner = (x < cornerW || x >= width - cornerW) && (y < cornerH || y >= height - cornerH);
      if (!isCorner) continue;
      const pixel = toRgb(data, (y * width + x) * 4);
      if (isUsefulPixel(pixel)) pixels.push(pixel);
    }
  }
  return pixels;
};

export const sampleImageColor = async (imageUrl) => {
  if (!imageUrl) throw new Error('Missing image URL');
  if (colorCache.has(imageUrl)) return colorCache.get(imageUrl);
  const { data, width, height } = await readImagePixels(imageUrl, 128);
  const perimeter = collectPerimeterPixels(data, width, height, 0.14);
  const hex = rgbToHex(getClusterColor(perimeter, 12));
  colorCache.set(imageUrl, hex);
  return hex;
};

export const sampleImageAutofillColor = async (imageUrl) => {
  if (!imageUrl) throw new Error('Missing image URL');
  if (autofillColorCache.has(imageUrl)) return autofillColorCache.get(imageUrl);
  const { data, width, height } = await readImagePixels(imageUrl, 180);
  const corners = collectCornerPixels(data, width, height);
  const perimeter = collectPerimeterPixels(data, width, height, 0.08);
  const source = corners.length >= 20 ? corners : perimeter;
  const hex = rgbToHex(getClusterColor(source, 14));
  autofillColorCache.set(imageUrl, hex);
  return hex;
};
