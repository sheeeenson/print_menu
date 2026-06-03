import { useEffect, useState } from 'react';

const gridClassByVariant = {
  2: 'image-menu-grid-two',
  4: 'image-menu-grid-four',
  6: 'image-menu-grid-six',
};

const fallbackBackgrounds = ['#eef0b4', '#f8d9a1', '#dfeacf', '#f2cfc1', '#d8e5ef', '#eadcf3'];
const colorCache = new Map();

const getPrice = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  return `${number.toFixed(2)}₾`;
};

const toRgb = (data, index) => ({ r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3] });
const isUsefulPixel = ({ a }) => a > 180;
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
const colorKey = ({ r, g, b }) => `${r},${g},${b}`;

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

const sampleImageColor = (imageUrl) => new Promise((resolve, reject) => {
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

const getFallbackBackground = (dish, index, settings) => dish?.imageMenuBackgroundColor || dish?.backgroundColor || settings.manualBackgroundColor || fallbackBackgrounds[index % fallbackBackgrounds.length];

function ImageMenuCard({ dish, settings, index }) {
  const hasImage = Boolean(dish?.imageUrl);
  const [sampledColor, setSampledColor] = useState('');
  const oldPrice = getPrice(dish?.oldPrice);
  const salePrice = getPrice(dish?.newPrice);
  const backgroundColor = settings.backgroundMode === 'manual'
    ? settings.manualBackgroundColor
    : sampledColor || getFallbackBackground(dish, index, settings);
  const imageStyle = {
    width: `${settings.imageSize}%`,
    transform: `translate(${settings.imageX}%, ${settings.imageY}%)`,
  };
  const textStyle = {
    bottom: `${settings.textBottomOffset}px`,
    left: `${settings.textPaddingLeft}px`,
    right: `${settings.textPaddingRight}px`,
  };

  useEffect(() => {
    let cancelled = false;
    setSampledColor('');
    if (settings.backgroundMode !== 'auto' || !dish?.imageUrl) return undefined;
    sampleImageColor(dish.imageUrl)
      .then((color) => {
        if (!cancelled) setSampledColor(color);
      })
      .catch(() => {
        if (!cancelled) setSampledColor('');
      });
    return () => {
      cancelled = true;
    };
  }, [dish?.imageUrl, settings.backgroundMode]);

  return (
    <article className={`image-menu-card image-menu-bg-${settings.backgroundMode} image-menu-overlay-${settings.overlayGradient}`} style={{ backgroundColor }}>
      {settings.backgroundMode === 'blurred' && hasImage ? <img className="image-menu-blur-bg" src={dish.imageUrl} alt="" aria-hidden="true" /> : null}
      <div className="image-menu-photo-wrap">
        {hasImage ? (
          <img className="image-menu-photo" src={dish.imageUrl} alt={dish.nameEn || dish.nameGe || 'Dish'} style={imageStyle} crossOrigin="anonymous" />
        ) : (
          <div className="image-menu-photo-placeholder" style={imageStyle}>No image</div>
        )}
      </div>
      {settings.showBadge && settings.badgeImageUrl ? (
        <img className={`image-menu-badge image-menu-badge-${settings.badgePosition}`} src={settings.badgeImageUrl} alt="" style={{ width: `${settings.badgeSize}%`, '--badge-x': `${settings.badgeX}px`, '--badge-y': `${settings.badgeY}px` }} />
      ) : null}
      <div className="image-menu-text" data-align={settings.textAlign} style={textStyle}>
        <h2 className="image-menu-title-en" style={{ color: settings.textColor, fontFamily: settings.enTitleFont, fontSize: `${settings.enTitleSize}px` }}>
          {dish?.nameEn || 'Dish name'}
        </h2>
        <h3 className="image-menu-title-ge" style={{ color: settings.textColor, fontFamily: settings.geTitleFont, fontSize: `${settings.geTitleSize}px`, marginTop: `${settings.titleLanguageGap}px` }}>
          {dish?.nameGe || 'ქართული სახელი'}
        </h3>
        {settings.showDescriptions ? (
          <div className="image-menu-descriptions" style={{ marginTop: `${settings.titleDescriptionGap}px`, color: settings.descriptionColor, fontFamily: settings.descriptionFont, fontSize: `${settings.descriptionSize}px` }}>
            {dish?.descriptionEn ? <p>{dish.descriptionEn}</p> : null}
            {dish?.descriptionGe ? <p>{dish.descriptionGe}</p> : null}
          </div>
        ) : null}
        {(oldPrice || salePrice) ? (
          <div className="image-menu-prices">
            {oldPrice ? <span className="image-menu-old-price" style={{ color: settings.oldPriceColor, fontSize: `${settings.oldPriceSize}px` }}>{oldPrice}</span> : null}
            {salePrice ? <strong className="image-menu-sale-price" style={{ color: settings.salePriceColor, fontSize: `${settings.salePriceSize}px` }}>{salePrice}</strong> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ImageMenuPreview({ page, dishes }) {
  const selectedDishes = page.selectedDishIds.map((dishId) => dishes.find((dish) => dish.id === dishId)).filter(Boolean);
  const emptySlots = Math.max(0, page.gridVariant - selectedDishes.length);

  return (
    <section className="image-menu-preview-shell" aria-label="Image Menu A4 landscape preview">
      <div className={`image-menu-page ${gridClassByVariant[page.gridVariant]}`} data-image-menu-print-page="true">
        {selectedDishes.map((dish, index) => <ImageMenuCard key={dish.id} dish={dish} settings={page.settings} index={index} />)}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <div className="image-menu-card image-menu-empty-slot" key={`empty-${index}`}>
            Select dish
          </div>
        ))}
      </div>
    </section>
  );
}
