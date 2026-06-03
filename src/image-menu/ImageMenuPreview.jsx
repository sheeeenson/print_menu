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
const isUsefulPixel = ({ r, g, b, a }) => a > 180 && !(r > 246 && g > 246 && b > 246) && !(r < 10 && g < 10 && b < 10);
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;

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
      const size = 42;
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
          if (x < 8 || x > size - 9 || y < 8 || y > size - 9) edgePixels.push(pixel);
        }
      }

      const sourcePixels = edgePixels.length > 20 ? edgePixels : allPixels;
      if (!sourcePixels.length) throw new Error('No useful image pixels');

      const color = sourcePixels.reduce((acc, pixel) => ({
        r: acc.r + pixel.r,
        g: acc.g + pixel.g,
        b: acc.b + pixel.b,
      }), { r: 0, g: 0, b: 0 });

      const average = {
        r: Math.round(color.r / sourcePixels.length),
        g: Math.round(color.g / sourcePixels.length),
        b: Math.round(color.b / sourcePixels.length),
      };
      const hex = rgbToHex(average);
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
