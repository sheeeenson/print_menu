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

const mixRgb = (color, target, amount) => ({
  r: Math.round(color.r + (target.r - color.r) * amount),
  g: Math.round(color.g + (target.g - color.g) * amount),
  b: Math.round(color.b + (target.b - color.b) * amount),
});

const rgbToCss = ({ r, g, b }, alpha = 1) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

const buildPalette = (baseHex) => {
  const base = hexToRgb(baseHex);
  const light = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.28);
  const dark = mixRgb(base, { r: 10, g: 8, b: 7 }, 0.38);
  const glow = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.18);

  return {
    baseHex,
    base: rgbToCss(base),
    light: rgbToCss(light),
    dark: rgbToCss(dark),
    glow: rgbToCss(glow, 0.72),
    gradient: `radial-gradient(circle at 62% 42%, ${rgbToCss(light, 0.88)} 0%, ${rgbToCss(base, 0.98)} 44%, ${rgbToCss(dark, 0.92)} 100%)`,
  };
};

const positionClass = (position) => ({
  topLeft: 'promo-gif-top-left',
  topRight: 'promo-gif-top-right',
  bottomLeft: 'promo-gif-bottom-left',
  bottomRight: 'promo-gif-bottom-right',
}[position] ?? 'promo-gif-top-right');

export function PromoPreview({ dish, settings, index = 0 }) {
  const [sampledColor, setSampledColor] = useState('');
  const fallbackColor = getFallbackImageBackground(index);
  const edgeColor = sampledColor || fallbackColor;
  const palette = useMemo(() => buildPalette(edgeColor), [edgeColor]);
  const effects = settings.effects ?? {};
  const oldPrice = getPrice(dish?.oldPrice);
  const salePrice = getPrice(dish?.newPrice);
  const hasPrice = Boolean(oldPrice || salePrice);
  const headline = settings.headline || dish?.nameEn || 'TV Promo';
  const offerText = settings.offerText || (dish?.badges?.[0]?.label ?? dish?.badges?.[0]?.name ?? 'Fresh today');

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
    dish?.imageUrl ? 'promo-has-source-image' : '',
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
            '--promo-edge-color': edgeColor,
            '--promo-bg': palette.gradient,
            '--promo-base': palette.base,
            '--promo-light': palette.light,
            '--promo-dark': palette.dark,
            '--promo-glow': palette.glow,
            '--promo-source-image': dish?.imageUrl ? `url("${dish.imageUrl}")` : 'none',
          }}
        >
          <div className="promo-background" />
          {dish?.imageUrl ? <div className="promo-photo-fill" aria-hidden="true" /> : null}
          {effects.glow ? <div className="promo-dish-glow" aria-hidden="true" /> : null}
          {effects.lightSweep ? <div className="promo-light-sweep" aria-hidden="true" /> : null}

          <div className="promo-copy-block">
            <p className="promo-eyebrow">{offerText}</p>
            <h2>{headline}</h2>
            {dish?.nameGe ? <h3>{dish.nameGe}</h3> : null}
            {dish?.descriptionEn ? <p className="promo-description">{dish.descriptionEn}</p> : null}
          </div>

          <div className="promo-dish-stage">
            {dish?.imageUrl ? (
              <img className="promo-dish-image" src={dish.imageUrl} alt={dish.nameEn || dish.nameGe || 'Dish'} crossOrigin="anonymous" />
            ) : (
              <div className="promo-dish-placeholder">Select dish with image</div>
            )}
          </div>

          {hasPrice ? (
            <div className="promo-price-card">
              {oldPrice ? <span className="promo-old-price">{oldPrice}</span> : null}
              {salePrice ? <strong>{salePrice}</strong> : null}
            </div>
          ) : null}

          <div className="promo-cta">{settings.ctaText || 'ORDER NOW'}</div>

          {effects.gifOverlay && settings.gifUrl ? (
            <img
              className={`promo-gif-overlay ${positionClass(settings.gifPosition)}`}
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
