const fallbackBackgrounds = ['#eef0b4', '#f8d9a1', '#dfeacf', '#f2cfc1', '#d8e5ef', '#eadcf3'];
const colorCache = new Map();

const toRgb = (data, index) => ({ r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3] });
const isUsefulPixel = ({ a }) => a > 180;
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
const colorKey = ({ r, g, b }) => `${r},${g},${b}`;

export const getFallbackImageBackground = (index = 0) => fallbackBackgrounds[index % fallbackBackgrounds.length];

const getDominantColor = (pixels) => {
  const exactBuckets = new Map();
  pixels.forEach((pixel) => {
    const key = colorKey(pixel);
    exactBuckets.set(key, (exactBuckets.get(key) || 0) + 1);
  });

  let bestKey = '';
  let bestCount = 0;
  exactBuckets.forEach((count, key) => {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  });

  if (bestCount >= 4) {
    const [r, g, b] = bestKey.split(',').map(Number);
    return { r, g, b };
  }

  const softBuckets = new Map();
  pixels.forEach((pixel) => {
    const key = [pixel.r, pixel.g, pixel.b].map((value) => Math.round(value / 4) * 4).join(',');
    const bucket = softBuckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += pixel.r;
    bucket.g += pixel.g;
    bucket.b += pixel.b;
    softBuckets.set(key, bucket);
  });

  let bestBucket = null;
  softBuckets.forEach((bucket) => {
    if (!bestBucket || bucket.count > bestBucket.count) bestBucket = bucket;
  });

  if (!bestBucket) throw new Error('No dominant color found');
  return {
    r: Math.round(bestBucket.r / bestBucket.count),
    g: Math.round(bestBucket.g / bestBucket.count),
    b: Math.round(bestBucket.b / bestBucket.count),
  };
};

export const sampleImageColor = (imageUrl) => new Promise((resolve, reject) => {
  if (!imageUrl) {
    reject(new Error('Missing image URL'));
    return;
  }

  if (colorCache.has(imageUrl)) {
    resolve(colorCache.get(imageUrl));
    return;
  }

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.referrerPolicy = 'no-referrer';
  image.onload = () => {
    try {
      const size = 64;
      const edgeWidth = 10;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, size, size);
      const { data } = context.getImageData(0, 0, size, size);
      const edgePixels = [];
      const allPixels = [];

      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const pixel = toRgb(data, (y * size + x) * 4);
          if (!isUsefulPixel(pixel)) continue;
          allPixels.push(pixel);
          if (x < edgeWidth || x >= size - edgeWidth || y < edgeWidth || y >= size - edgeWidth) edgePixels.push(pixel);
        }
      }

      const sourcePixels = edgePixels.length > 20 ? edgePixels : allPixels;
      if (!sourcePixels.length) throw new Error('No useful image pixels');

      const hex = rgbToHex(getDominantColor(sourcePixels));
      colorCache.set(imageUrl, hex);
      resolve(hex);
    } catch (error) {
      reject(error);
    }
  };
  image.onerror = reject;
  image.src = imageUrl;
});
