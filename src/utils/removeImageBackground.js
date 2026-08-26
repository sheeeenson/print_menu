import { extractGoogleDriveFileId } from './imageUrls.js';

const MAX_MASK_SIDE = 900;
const CACHE_LIMIT = 24;
const cutoutCache = new Map();

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

const getFetchUrl = (value = '') => {
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

const loadImageBitmap = async (source) => {
  const response = await fetch(getFetchUrl(source), {
    credentials: 'same-origin',
    cache: 'force-cache',
    headers: { Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' },
  });
  if (!response.ok) throw new Error(`Could not load product image: HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob.size) throw new Error('Product image is empty.');
  return createImageBitmap(blob);
};

const addReference = (references, data, width, height, x, y) => {
  const safeX = clamp(Math.round(x), 0, width - 1);
  const safeY = clamp(Math.round(y), 0, height - 1);
  const offset = (safeY * width + safeX) * 4;
  if (data[offset + 3] < 32) return;
  references.push([data[offset], data[offset + 1], data[offset + 2]]);
};

const collectBorderReferences = (data, width, height) => {
  const references = [];
  const samples = 16;
  for (let index = 0; index <= samples; index += 1) {
    const ratio = index / samples;
    addReference(references, data, width, height, ratio * (width - 1), 0);
    addReference(references, data, width, height, ratio * (width - 1), height - 1);
    addReference(references, data, width, height, 0, ratio * (height - 1));
    addReference(references, data, width, height, width - 1, ratio * (height - 1));
  }
  return references.length ? references : [[255, 255, 255]];
};

const buildBackgroundMask = (imageData, width, height, sensitivity) => {
  const { data } = imageData;
  const references = collectBorderReferences(data, width, height);
  const threshold = 16 + clamp(sensitivity, 0, 100) * 0.9;
  const thresholdSquared = threshold * threshold;
  const visited = new Uint8Array(width * height);
  const background = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const similaritySquared = (pixelIndex) => {
    const offset = pixelIndex * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    let best = Infinity;
    for (let index = 0; index < references.length; index += 1) {
      const reference = references[index];
      const dr = red - reference[0];
      const dg = green - reference[1];
      const db = blue - reference[2];
      const distance = dr * dr + dg * dg + db * db;
      if (distance < best) best = distance;
    }
    return best;
  };

  const trySeed = (pixelIndex) => {
    if (visited[pixelIndex]) return;
    visited[pixelIndex] = 1;
    const alpha = data[pixelIndex * 4 + 3];
    if (alpha < 16 || similaritySquared(pixelIndex) <= thresholdSquared) {
      background[pixelIndex] = 1;
      queue[tail++] = pixelIndex;
    }
  };

  for (let x = 0; x < width; x += 1) {
    trySeed(x);
    trySeed((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    trySeed(y * width);
    trySeed(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head++];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const neighbors = [];
    if (x > 0) neighbors.push(pixelIndex - 1);
    if (x + 1 < width) neighbors.push(pixelIndex + 1);
    if (y > 0) neighbors.push(pixelIndex - width);
    if (y + 1 < height) neighbors.push(pixelIndex + width);

    for (const neighborIndex of neighbors) {
      if (visited[neighborIndex]) continue;
      visited[neighborIndex] = 1;
      const alpha = data[neighborIndex * 4 + 3];
      if (alpha < 16 || similaritySquared(neighborIndex) <= thresholdSquared) {
        background[neighborIndex] = 1;
        queue[tail++] = neighborIndex;
      }
    }
  }

  const foreground = new Uint8Array(width * height);
  for (let index = 0; index < background.length; index += 1) foreground[index] = background[index] ? 0 : 1;
  return foreground;
};

const morphMask = (source, width, height, amount) => {
  const steps = Math.abs(Math.round(amount));
  if (!steps) return source;
  let current = source;
  const expand = amount > 0;
  for (let step = 0; step < steps; step += 1) {
    const next = new Uint8Array(current.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        let value = expand ? 0 : 1;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            const neighbor = nx >= 0 && ny >= 0 && nx < width && ny < height ? current[ny * width + nx] : 0;
            if (expand && neighbor) value = 1;
            if (!expand && !neighbor) value = 0;
          }
        }
        next[index] = value;
      }
    }
    current = next;
  }
  return current;
};

const fillSmallHoles = (source, width, height) => {
  const visited = new Uint8Array(source.length);
  const queue = new Int32Array(source.length);
  let head = 0;
  let tail = 0;
  const seed = (index) => {
    if (visited[index] || source[index]) return;
    visited[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    const neighbors = [];
    if (x > 0) neighbors.push(index - 1);
    if (x + 1 < width) neighbors.push(index + 1);
    if (y > 0) neighbors.push(index - width);
    if (y + 1 < height) neighbors.push(index + width);
    neighbors.forEach(seed);
  }
  const result = source.slice();
  for (let index = 0; index < result.length; index += 1) {
    if (!source[index] && !visited[index]) result[index] = 1;
  }
  return result;
};

const maskToImageData = (mask, width, height) => {
  const imageData = new ImageData(width, height);
  for (let index = 0; index < mask.length; index += 1) {
    const offset = index * 4;
    imageData.data[offset] = 255;
    imageData.data[offset + 1] = 255;
    imageData.data[offset + 2] = 255;
    imageData.data[offset + 3] = mask[index] ? 255 : 0;
  }
  return imageData;
};

const cleanEdgeColors = (context, amount) => {
  if (!amount) return;
  const image = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
  const ratio = clamp(amount, 0, 100) / 100;
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const alpha = image.data[offset + 3];
    if (alpha <= 0 || alpha >= 245) continue;
    const max = Math.max(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
    const min = Math.min(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
    const neutral = (max + min) / 2;
    image.data[offset] += (neutral - image.data[offset]) * ratio * 0.65;
    image.data[offset + 1] += (neutral - image.data[offset + 1]) * ratio * 0.65;
    image.data[offset + 2] += (neutral - image.data[offset + 2]) * ratio * 0.65;
  }
  context.putImageData(image, 0, 0);
};

const canvasToBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create transparent product image.')), 'image/png');
});

const rememberCutout = (key, url) => {
  cutoutCache.set(key, url);
  if (cutoutCache.size > CACHE_LIMIT) {
    const firstKey = cutoutCache.keys().next().value;
    const staleUrl = cutoutCache.get(firstKey);
    if (staleUrl?.startsWith('blob:')) URL.revokeObjectURL(staleUrl);
    cutoutCache.delete(firstKey);
  }
};

export async function removeImageBackground(source, options = {}) {
  const sensitivity = clamp(options.sensitivity ?? 38, 0, 100);
  const softness = clamp(options.softness ?? 2, 0, 10);
  const expand = clamp(options.expand ?? 0, -12, 12);
  const cleanup = clamp(options.cleanup ?? 35, 0, 100);
  const fillHoles = options.fillHoles !== false;
  const key = `${source}|${sensitivity}|${softness}|${expand}|${cleanup}|${fillHoles}`;
  const cached = cutoutCache.get(key);
  if (cached) return cached;

  const image = await loadImageBitmap(source);
  try {
    const scale = Math.min(1, MAX_MASK_SIDE / Math.max(image.width, image.height));
    const maskWidth = Math.max(2, Math.round(image.width * scale));
    const maskHeight = Math.max(2, Math.round(image.height * scale));

    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = maskWidth;
    sampleCanvas.height = maskHeight;
    const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
    sampleContext.drawImage(image, 0, 0, maskWidth, maskHeight);
    const sampleData = sampleContext.getImageData(0, 0, maskWidth, maskHeight);
    let mask = buildBackgroundMask(sampleData, maskWidth, maskHeight, sensitivity);
    if (fillHoles) mask = fillSmallHoles(mask, maskWidth, maskHeight);
    if (expand) mask = morphMask(mask, maskWidth, maskHeight, Math.round(expand * scale));

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = maskWidth;
    maskCanvas.height = maskHeight;
    maskCanvas.getContext('2d').putImageData(maskToImageData(mask, maskWidth, maskHeight), 0, 0);

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = image.width;
    outputCanvas.height = image.height;
    const outputContext = outputCanvas.getContext('2d', { willReadFrequently: true });
    outputContext.drawImage(image, 0, 0);
    outputContext.globalCompositeOperation = 'destination-in';
    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = 'high';
    if (softness > 0) outputContext.filter = `blur(${softness * Math.max(1, 1 / scale)}px)`;
    outputContext.drawImage(maskCanvas, 0, 0, image.width, image.height);
    outputContext.filter = 'none';
    outputContext.globalCompositeOperation = 'source-over';
    cleanEdgeColors(outputContext, cleanup);

    const blob = await canvasToBlob(outputCanvas);
    const url = URL.createObjectURL(blob);
    rememberCutout(key, url);
    return url;
  } finally {
    image.close?.();
  }
}
