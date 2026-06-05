import { useEffect, useMemo, useState } from 'react';
import { getFallbackImageBackground, sampleImageColor } from '../utils/imageColor.js';

export const TV_PROMO_WIDTH = 1920;
export const TV_PROMO_HEIGHT = 1080;

const getPrice = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  return `${number.toFixed(2)}₾`;
};

const hexToRgb = (hex) => {
  const value = String(hex || '').replace('#', '');
  if (![3, 6].includes(value.length)) return { r: 242, g: 234, b: 223 };
  const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  const number = Number.parseInt(normalized, 16);
  if (!Number.isFinite(number)) return { r: 242, g: 234, b: 223 };
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

const adjustRgb = (color, amount) => {
  const target = amount >= 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const ratio = Math.abs(clamp(amount, -40, 40)) / 100;
  return {
    r: Math.round(color.r + (target.r - color.r) * ratio),
    g: Math.round(color.g + (target.g - color.g) * ratio),
    b: Math.round(color.b + (target.b - color.b) * ratio),
  };
};

const rgbToCss = ({ r, g, b }, alpha = 1) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

const colorWithTone = (baseHex, tone = 0) => {
  const base = hexToRgb(baseHex);
  return rgbToCss(adjustRgb(base, tone));
};

const getGifPositionClass = (position, showCta) => {
  if (position === 'bottomLeft') return showCta ? 'promo-gif-bottom-text-left' : 'promo-gif-cta-left';

  return ({
    textLeft: 'promo-gif-headline-left',
    topLeft: 'promo-gif-headline-left',
    topRight: 'promo-gif-price-right',
    bottomRight: 'promo-gif-bottom-right',
  }[position] ?? 'promo-gif-headline-left');
};

export function PromoPreview({ dish, settings, index = 0 }) {
  const [sampledColor, setSampledColor] = useState('');
  const fallbackColor = getFallbackImageBackground(index);
  const edgeColor = sampledColor || fallbackColor;
  const tunedBackground = useMemo(() => colorWithTone(edgeColor, settings.backgroundTone), [edgeColor, settings.backgroundTone]);
  const effects = settings.effects ?? {};
  const oldPrice = getPrice(dish?.oldPrice);
  const salePrice = getPrice(dish?.newPrice);
  const hasPrice = Boolean(oldPrice || salePrice);
  const headline = settings.headline || dish?.nameEn || 'TV Promo';
  const offerText = settings.offerText || (dish?.badges?.[0]?.label ?? dish?.badges?.[0]?.name ?? 'Fresh today');
  const descriptionLines = [dish?.descriptionEn, dish?.descriptionGe].filter(Boolean);

  useEffect(() => {
    let cancelled = false;
    setSampledColor('');
    if (!dish?.imageUrl) return undefined;
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
  }, [dish?.imageUrl]);

  const sceneClass = [
    'promo-scene',
    effects.slowZoom ? 'promo-effect-slow-zoom' : '',
    effects.fastEntrance ? 'promo-effect-fast-entrance' : '',
    effects.stopMotion ? 'promo-effect-stop-motion' : '',
    effects.pricePunch ? 'promo-effect-price-punch' : '',
    effects.glow ? 'promo-effect-glow' : '',
    effects.lightSweep ? 'promo-effect-light-sweep' : '',
  ].filter(Boolean).join(' ');

  return (
    <section className="promo-preview-shell" aria-label="TV Promo 1920 by 1080 preview">
      <div className="promo-canvas-wrap">
        <article
          className={sceneClass}
          style={{
            '--promo-duration': `${settings.duration || 8}s`,
            '--promo-edge-color': tunedBackground,
          }}
        >
          <div className="promo-background" />
          {effects.lightSweep ? <div className="promo-light-sweep" aria-hidden="true" /> : null}

          <div className="promo-copy-block">
            {settings.showOffer ? (
              <p
                className="promo-eyebrow"
                style={{ color: settings.offerColor, fontFamily: settings.offerFont, fontSize: `${settings.offerSize}px` }}
              >
                {offerText}
              </p>
            ) : null}
            <h2 style={{ color: settings.headlineColor, fontFamily: settings.headlineFont, fontSize: `${settings.headlineSize}px` }}>{headline}</h2>
            {dish?.nameGe ? <h3 style={{ color: settings.geTitleColor, fontFamily: settings.geTitleFont, fontSize: `${settings.geTitleSize}px` }}>{dish.nameGe}</h3> : null}
            {settings.showDescription && descriptionLines.length ? (
              <div className="promo-description-stack" style={{ transform: `translateY(${settings.descriptionOffsetY || 0}px)` }}>
                {descriptionLines.map((line, lineIndex) => (
                  <p key={`${line}-${lineIndex}`} className="promo-description" style={{ color: settings.descriptionColor, fontFamily: settings.descriptionFont, fontSize: `${settings.descriptionSize}px` }}>{line}</p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="promo-dish-stage" style={{ transform: `scale(${(settings.dishSize || 650) / 650})` }}>
            {dish?.imageUrl ? (
              <img className="promo-dish-image" src={dish.imageUrl} alt={dish.nameEn || dish.nameGe || 'Dish'} crossOrigin="anonymous" />
            ) : (
              <div className="promo-dish-placeholder">Select dish with image</div>
            )}
          </div>

          {hasPrice ? (
            <div className="promo-price-card">
              {oldPrice ? <span className="promo-old-price" style={{ color: settings.oldPriceColor, fontFamily: settings.oldPriceFont, fontSize: `${settings.oldPriceSize}px` }}>{oldPrice}</span> : null}
              {salePrice ? <strong style={{ color: settings.salePriceColor, fontFamily: settings.salePriceFont, fontSize: `${settings.salePriceSize}px` }}>{salePrice}</strong> : null}
            </div>
          ) : null}

          {settings.showCta ? <div className="promo-cta" style={{ color: settings.ctaColor, fontFamily: settings.ctaFont, fontSize: `${settings.ctaSize}px` }}>{settings.ctaText || 'ORDER NOW'}</div> : null}

          {effects.gifOverlay && settings.gifUrl ? (
            <img
              className={`promo-gif-overlay ${getGifPositionClass(settings.gifPosition, settings.showCta)}`}
              src={settings.gifUrl}
              alt=""
              aria-hidden="true"
              style={{ width: `${settings.gifSize || 18}%` }}
            />
          ) : null}
        </article>
      </div>
      <small className="promo-preview-size">Output canvas: {TV_PROMO_WIDTH} × {TV_PROMO_HEIGHT}px</small>
    </section>
  );
}
