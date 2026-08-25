import { useEffect, useMemo, useState } from 'react';
import { getFallbackImageBackground, sampleImageAutofillColor } from '../utils/imageColor.js';
import { normalizeGoogleDriveImageUrl } from '../utils/imageUrls.js';
import { getA3Format } from './a3PosterStorage.js';

const formatPrice = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `${number.toFixed(2)}₾` : '';
};

const getPriceData = (dish) => {
  const variant = (dish?.priceVariants ?? []).find((item) => Number(item?.newPrice ?? item?.price ?? item?.oldPrice) > 0);
  const newValue = dish?.newPrice ?? variant?.newPrice ?? variant?.price ?? dish?.price;
  const oldValue = dish?.oldPrice ?? variant?.oldPrice;
  return {
    current: formatPrice(newValue),
    old: formatPrice(oldValue),
  };
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

const hexToRgb = (hex) => {
  const value = String(hex || '').replace('#', '');
  if (![3, 6].includes(value.length)) return { r: 35, g: 31, b: 32 };
  const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  const number = Number.parseInt(normalized, 16);
  if (!Number.isFinite(number)) return { r: 35, g: 31, b: 32 };
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
};

const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;

const averageColors = (colors) => {
  const valid = colors.filter(Boolean);
  if (!valid.length) return '';
  const totals = valid.map(hexToRgb).reduce((sum, color) => ({ r: sum.r + color.r, g: sum.g + color.g, b: sum.b + color.b }), { r: 0, g: 0, b: 0 });
  return rgbToHex({ r: totals.r / valid.length, g: totals.g / valid.length, b: totals.b / valid.length });
};

const applyTone = (hex, tone = 0) => {
  const color = hexToRgb(hex);
  const amount = clamp(tone, -40, 40);
  const target = amount >= 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const ratio = Math.abs(amount) / 100;
  return rgbToHex({
    r: color.r + (target.r - color.r) * ratio,
    g: color.g + (target.g - color.g) * ratio,
    b: color.b + (target.b - color.b) * ratio,
  });
};

export function A3PosterPreview({ poster, dishes }) {
  const format = getA3Format(poster.formatId);
  const selectedDishes = useMemo(() => poster.selectedDishIds.map((id) => dishes.find((dish) => dish.id === id)).filter(Boolean), [poster.selectedDishIds, dishes]);
  const previewScale = format.previewWidth / format.width;
  const template = poster.template || 'single';
  const headline = poster.headline || selectedDishes[0]?.nameEn || 'A3 Poster';
  const [sampledBackground, setSampledBackground] = useState('');
  const autoBackground = poster.autoBackground ?? true;
  const imageUrls = useMemo(() => selectedDishes.map((dish) => normalizeGoogleDriveImageUrl(dish.imageUrl)).filter(Boolean), [selectedDishes]);
  const imageKey = imageUrls.join('|');

  useEffect(() => {
    let cancelled = false;
    setSampledBackground('');
    if (!autoBackground || !imageUrls.length) return undefined;

    Promise.all(imageUrls.map((url) => sampleImageAutofillColor(url).catch(() => '')))
      .then((colors) => {
        if (cancelled) return;
        const mixed = averageColors(colors);
        const fallback = getFallbackImageBackground(0);
        setSampledBackground(applyTone(mixed || fallback, poster.backgroundTone ?? 0));
      })
      .catch(() => {
        if (!cancelled) setSampledBackground(applyTone(getFallbackImageBackground(0), poster.backgroundTone ?? 0));
      });

    return () => {
      cancelled = true;
    };
  }, [autoBackground, imageKey, poster.backgroundTone]);

  const background = autoBackground
    ? sampledBackground || applyTone(poster.backgroundColor || '#f4efe8', poster.backgroundTone ?? 0)
    : poster.backgroundColor;

  return (
    <section className="app-preview-shell" aria-label="A3 poster preview">
      <div className="app-canvas-wrap a3-poster-canvas-wrap" style={{ width: `${format.previewWidth}px`, aspectRatio: `${format.width} / ${format.height}` }}>
        <article
          className={`a3-poster-scene a3-template-${template}`}
          style={{
            width: `${format.width}px`,
            height: `${format.height}px`,
            transform: `scale(${previewScale})`,
            background,
            color: poster.textColor,
            '--a3-accent': poster.accentColor,
          }}
        >
          {poster.showOffer && poster.offerText ? (
            <div
              className="a3-offer-badge"
              style={{
                transform: `translate(${poster.offerXOffset ?? 0}px, ${poster.offerYOffset ?? 0}px)`,
                background: poster.accentColor,
                color: poster.offerTextColor,
                fontSize: `${poster.offerSize}px`,
              }}
            >
              {poster.offerText}
            </div>
          ) : null}

          <div className="a3-copy" style={{ transform: `translate(${poster.contentXOffset ?? 0}px, ${poster.contentYOffset}px)` }}>
            <h2 style={{ fontSize: `${poster.headlineSize}px` }}>{headline}</h2>
            {poster.subheadline ? <p style={{ fontSize: `${poster.subheadlineSize}px` }}>{poster.subheadline}</p> : null}
          </div>

          <div className="a3-products" style={{ transform: `translate(${poster.imageXOffset ?? 0}px, ${poster.imageYOffset}px)` }}>
            {selectedDishes.map((dish) => {
              const imageUrl = normalizeGoogleDriveImageUrl(dish.imageUrl);
              const price = getPriceData(dish);
              return (
                <div key={dish.id} className="a3-product-card">
                  <div className="a3-product-image-wrap">
                    {imageUrl ? <img className="a3-product-image" src={imageUrl} alt="" style={{ transform: `scale(${poster.imageScale})` }} /> : null}
                  </div>
                  <div className="a3-product-meta" style={{ transform: `translate(${poster.metaXOffset ?? 0}px, ${poster.metaYOffset ?? 0}px)` }}>
                    <div className="a3-product-copy">
                      <strong style={{ fontSize: `${poster.productNameSize}px` }}>{dish.nameEn || dish.nameGe || 'Untitled'}</strong>
                      {poster.showDescriptionEn && dish.descriptionEn ? <p style={{ fontSize: `${poster.descriptionSize}px` }}>{dish.descriptionEn}</p> : null}
                      {poster.showDescriptionGe && dish.descriptionGe ? <p className="a3-description-ge" style={{ fontSize: `${poster.descriptionSize}px` }}>{dish.descriptionGe}</p> : null}
                    </div>
                    {poster.showPrice && price.current ? (
                      <div className="a3-price-block">
                        {poster.showOldPrice && price.old ? <span className="a3-old-price" style={{ fontSize: `${poster.oldPriceSize}px` }}>{price.old}</span> : null}
                        <span className="a3-current-price" style={{ fontSize: `${poster.priceSize}px` }}>{price.current}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>
      <small className="app-preview-size">A3 output: {format.width} × {format.height}px at 300 DPI ratio</small>
    </section>
  );
}
