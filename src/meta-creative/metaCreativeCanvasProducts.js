import { extractGoogleDriveFileId } from '../utils/imageUrls.js';
import { buildDefaultMetaElementTransforms } from './metaCreativeStorage.js';

const elementKey = (dishId, type) => `${dishId}:${type}`;
const getCanvasSafeImageUrl = (value = '') => {
  const source = String(value || '').trim();
  if (!source || source.startsWith('data:') || source.startsWith('blob:')) return source;
  const driveId = extractGoogleDriveFileId(source);
  return driveId ? `/api/drive-media?id=${encodeURIComponent(driveId)}&type=image` : source;
};

const loadBitmap = async (source) => {
  const safeSource = getCanvasSafeImageUrl(source);
  const response = await fetch(safeSource, { credentials: 'same-origin', cache: 'reload' });
  if (!response.ok) throw new Error(`Could not load product image: HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob.size) throw new Error('Product image is empty.');
  return createImageBitmap(blob);
};

const getVisibleProductSource = (dishId, fallback) => {
  const node = document.querySelector(`.meta-creative-scene img.meta-product-image[data-dish-id="${CSS.escape(String(dishId))}"]`);
  return node?.getAttribute('src') || node?.currentSrc || fallback || '';
};

export async function drawMetaCreativeProductLayers(canvas, creative, dishes, format) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const selectedDishes = (creative.selectedDishIds || [])
    .map((id) => dishes.find((dish) => dish.id === id))
    .filter(Boolean);
  const defaults = buildDefaultMetaElementTransforms(selectedDishes.map((dish) => dish.id));

  for (const dish of selectedDishes) {
    const transform = creative.elementTransforms?.[elementKey(dish.id, 'image')]
      || defaults[elementKey(dish.id, 'image')]
      || { x: .5, y: .5, scale: 1 };
    const source = getVisibleProductSource(dish.id, dish.imageUrl);
    if (!source) continue;

    const bitmap = await loadBitmap(source);
    try {
      const scale = Number(transform.scale) || 1;
      const boxWidth = format.width * .46 * scale;
      const boxHeight = format.height * .46 * scale;
      const ratio = Math.min(boxWidth / bitmap.width, boxHeight / bitmap.height);
      const drawWidth = bitmap.width * ratio;
      const drawHeight = bitmap.height * ratio;
      const x = (Number(transform.x) || .5) * format.width - drawWidth / 2;
      const y = (Number(transform.y) || .5) * format.height - drawHeight / 2;

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (creative.productCutoutEnabled && creative.productCutoutShadow) {
        ctx.shadowColor = 'rgba(0,0,0,.2)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 18;
      }
      ctx.drawImage(bitmap, x, y, drawWidth, drawHeight);
      ctx.restore();
    } finally {
      bitmap.close?.();
    }
  }
}
