import { useEffect, useMemo, useState } from 'react';
import { getPromoFormat } from './promoStorage.js';
import { getFallbackImageBackground, sampleImageColor } from '../utils/imageColor.js';
import { guessMediaTypeFromUrl, normalizeGoogleDriveImageUrl, normalizeGoogleDriveMediaUrl, normalizeGoogleDriveVideoUrl } from '../utils/imageUrls.js';

export const TV_PROMO_WIDTH = 1920;
export const TV_PROMO_HEIGHT = 1080;

const FORMAT_LAYOUTS = Object.freeze({
  landscape: {
    copy: { left: 112, top: 116, width: 690, textAlign: 'left', justifyItems: 'start' },
    dish: { right: 95, bottom: 86, width: 1030, height: 780, scale: 1 },
    price: { right: 120, bottom: 100, justifyItems: 'end', textAlign: 'right' },
    cta: { left: 112, bottom: 100, textAlign: 'left' },
    gif: { headlineLeft: { left: 112, top: 78 }, priceRight: { right: 120, top: 78 }, bottomLeft: { left: 112, bottom: 150 }, ctaLeft: { left: 112, bottom: 100 }, bottomRight: { right: 120, bottom: 100 } },
  },
  square: {
    copy: { left: 80, top: 78, width: 920, textAlign: 'center', justifyItems: 'center' },
    dish: { left: 90, top: 330, width: 900, height: 560, scale: 0.92 },
    price: { right: 74, bottom: 70, justifyItems: 'end', textAlign: 'right' },
    cta: { left: 80, bottom: 70, textAlign: 'left' },
    gif: { headlineLeft: { left: 80, top: 42 }, priceRight: { right: 74, top: 48 }, bottomLeft: { left: 80, bottom: 140 }, ctaLeft: { left: 80, bottom: 70 }, bottomRight: { right: 74, bottom: 70 } },
  },
  portrait: {
    copy: { left: 74, top: 88, width: 932, textAlign: 'center', justifyItems: 'center' },
    dish: { left: 42, top: 410, width: 996, height: 650, scale: 1.05 },
    price: { right: 70, bottom: 88, justifyItems: 'end', textAlign: 'right' },
    cta: { left: 74, bottom: 88, textAlign: 'left' },
    gif: { headlineLeft: { left: 74, top: 50 }, priceRight: { right: 70, top: 62 }, bottomLeft: { left: 74, bottom: 168 }, ctaLeft: { left: 74, bottom: 88 }, bottomRight: { right: 70, bottom: 88 } },
  },
  story: {
    copy: { left: 70, top: 110, width: 940, textAlign: 'center', justifyItems: 'center' },
    dish: { left: 34, top: 590, width: 1012, height: 820, scale: 1.14 },
    price: { right: 70, bottom: 190, justifyItems: 'end', textAlign: 'right' },
    cta: { left: 70, bottom: 190, textAlign: 'left' },
    gif: { headlineLeft: { left: 70, top: 62 }, priceRight: { right: 70, top: 76 }, bottomLeft: { left: 70, bottom: 184 }, ctaLeft: { left: 70, bottom: 190 }, bottomRight: { right: 70, bottom: 190 } },
  },
});

const GIF_SHAPE_CLIPS = Object.freeze({
  star: 'polygon(50% 0%, 61% 34%, 98% 34%, 68% 55%, 79% 91%, 50% 70%, 21% 91%, 32% 55%, 2% 34%, 39% 34%)',
  hexagon: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  blob: 'polygon(49% 2%, 78% 10%, 97% 35%, 92% 68%, 67% 94%, 32% 92%, 7% 68%, 5% 34%, 20% 11%)',
});

const isTransparentProduct = (dish) => dish?.imageMode === 'transparent' || dish?.transparentImage === true;
const getRawBackgroundUrl = (dish, settings) => settings.backgroundMediaUrl || (isTransparentProduct(dish) ? dish?.promoBackgroundUrl : '') || '';
const normalizeBackgroundUrl = (dish, settings) => normalizeGoogleDriveMediaUrl(getRawBackgroundUrl(dish, settings));
const normalizeImageBackgroundUrl = (url) => normalizeGoogleDriveImageUrl(url);
const normalizeVideoBackgroundUrl = (url) => normalizeGoogleDriveVideoUrl(url);
const getBackgroundFit = (settings) => settings.backgroundFit === 'contain' || settings.backgroundFit === 'fill' ? settings.backgroundFit : 'cover';
const getBackgroundMediaType = (url, settings) => {
  const explicitType = settings.backgroundMediaType || 'auto';
  if (explicitType === 'image' || explicitType === 'video') return explicitType;
  const guessedType = guessMediaTypeFromUrl(url);
  return guessedType === 'video' ? 'video' : 'image';
};

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
const colorWithTone = (baseHex, tone = 0) => rgbToCss(adjustRgb(hexToRgb(baseHex), tone));
const textShadowCss = (settings) => {
  if (settings.showTextShadow === false) return 'none';
  const rgb = hexToRgb(settings.textShadowColor || '#000000');
  const alpha = clamp(settings.textShadowOpacity ?? 34, 0, 100) / 100;
  const blur = clamp(settings.textShadowBlur ?? 38, 0, 90);
  return `0 18px ${blur}px ${rgbToCss(rgb, alpha)}`;
};

const gifShadowCss = (settings) => {
  if (!settings.gifShadow) return 'none';
  const color = rgbToCss(hexToRgb(settings.gifShadowColor || '#000000'), 0.52);
  return `drop-shadow(0 24px 34px ${color})`;
};

const backgroundMediaStyle = (settings) => {
  const fit = getBackgroundFit(settings);
  return {
    objectFit: fit === 'fill' ? 'fill' : fit,
    filter: settings.backgroundBlur ? `blur(${clamp(settings.backgroundBlur, 0, 40)}px)` : 'none',
    transform: settings.backgroundBlur ? 'scale(1.04)' : 'none',
  };
};

const getGifLayout = (layout, position, showCta) => {
  if (position === 'bottomLeft') return showCta ? layout.gif.bottomLeft : layout.gif.ctaLeft;
  return ({ textLeft: layout.gif.headlineLeft, topLeft: layout.gif.headlineLeft, topRight: layout.gif.priceRight, bottomRight: layout.gif.bottomRight }[position] ?? layout.gif.headlineLeft);
};
const layoutStyle = (layout = {}) => Object.fromEntries(Object.entries(layout).filter(([, value]) => value !== undefined));
const layoutPositionStyle = (layout = {}) => Object.fromEntries(Object.entries(layout).filter(([key, value]) => key !== 'scale' && value !== undefined));
const offsetPosition = (position = {}, offsetX = 0, offsetY = 0) => {
  const next = { ...position };
  if (next.left !== undefined) next.left += offsetX;
  else if (next.right !== undefined) next.right -= offsetX;
  if (next.top !== undefined) next.top += offsetY;
  else if (next.bottom !== undefined) next.bottom -= offsetY;
  return next;
};

const getGifShapeStyle = (settings) => {
  const shape = settings.gifShape || 'rectangle';
  if (shape === 'circle') return { borderRadius: '9999px', aspectRatio: '1 / 1', objectFit: 'cover' };
  if (shape === 'rounded') return { borderRadius: '36px' };
  if (shape === 'rectangle') return { borderRadius: `${settings.gifBorderRadius || 0}px` };
  const clipPath = GIF_SHAPE_CLIPS[shape];
  return clipPath ? { clipPath, WebkitClipPath: clipPath, borderRadius: 0, aspectRatio: '1 / 1', objectFit: 'cover' } : { borderRadius: `${settings.gifBorderRadius || 0}px` };
};

function PromoBackgroundMedia({ url, settings }) {
  if (!url) return null;
  const style = backgroundMediaStyle(settings);
  const mediaType = getBackgroundMediaType(url, settings);
  if (mediaType === 'video') {
    return <video className="promo-background-media" src={normalizeVideoBackgroundUrl(url)} muted loop autoPlay playsInline preload="auto" aria-hidden="true" style={style} />;
  }
  return <img className="promo-background-media" src={normalizeImageBackgroundUrl(url)} alt="" aria-hidden="true" style={style} />;
}

export function PromoPreview({ dish, settings, index = 0 }) {
  const [sampledColor, setSampledColor] = useState('');
  const fallbackColor = getFallbackImageBackground(index);
  const edgeColor = sampledColor || fallbackColor;
  const tunedBackground = useMemo(() => colorWithTone(edgeColor, settings.backgroundTone), [edgeColor, settings.backgroundTone]);
  const backgroundUrl = normalizeBackgroundUrl(dish, settings);
  const backgroundDim = clamp(settings.backgroundDim ?? 28, 0, 85) / 100;
  const format = getPromoFormat(settings.formatId);
  const layout = FORMAT_LAYOUTS[format.id] ?? FORMAT_LAYOUTS.landscape;
  const offsets = settings.layoutOffsets ?? {};
  const previewScale = format.previewWidth / format.width;
  const effects = settings.effects ?? {};
  const oldPrice = getPrice(dish?.oldPrice);
  const salePrice = getPrice(dish?.newPrice);
  const hasPrice = Boolean(oldPrice || salePrice);
  const headline = settings.headline || dish?.nameEn || 'TV Promo';
  const offerText = settings.offerText || (dish?.badges?.[0]?.label ?? dish?.badges?.[0]?.name ?? 'Fresh today');
  const descriptionLines = [dish?.descriptionEn, dish?.descriptionGe].filter(Boolean);
  const dishImageSize = clamp(settings.dishSize || 650, 100, 900);
  const copyLayout = offsetPosition(layout.copy, offsets.copyX, offsets.copyY);
  const dishLayout = offsetPosition(layout.dish, offsets.dishX, offsets.dishY);
  const priceLayout = offsetPosition(layout.price, offsets.priceX, offsets.priceY);
  const ctaLayout = offsetPosition(layout.cta, offsets.ctaX, offsets.ctaY);
  const gifLayout = offsetPosition(getGifLayout(layout, settings.gifPosition, settings.showCta), offsets.gifX, offsets.gifY);
  const textShadow = textShadowCss(settings);
  const gifFilter = gifShadowCss(settings);

  useEffect(() => {
    let cancelled = false;
    setSampledColor('');
    if (!dish?.imageUrl) return undefined;
    sampleImageColor(dish.imageUrl).then((color) => {
      if (!cancelled) setSampledColor(color);
    }).catch(() => {
      if (!cancelled) setSampledColor('');
    });
    return () => { cancelled = true; };
  }, [dish?.imageUrl]);

  const sceneClass = [
    'promo-scene',
    backgroundUrl ? 'promo-scene-has-background-media' : '',
    isTransparentProduct(dish) ? 'promo-scene-transparent-product' : '',
    effects.slowZoom ? 'promo-effect-slow-zoom' : '',
    effects.fastEntrance ? 'promo-effect-fast-entrance' : '',
    effects.stopMotion ? 'promo-effect-stop-motion' : '',
    effects.pricePunch ? 'promo-effect-price-punch' : '',
    effects.glow ? 'promo-effect-glow' : '',
    effects.lightSweep ? 'promo-effect-light-sweep' : '',
    effects.textRise ? 'promo-effect-text-rise' : '',
    effects.headlineSplit ? 'promo-effect-headline-split' : '',
    effects.textWave ? 'promo-effect-text-wave' : '',
    effects.textGlitch ? 'promo-effect-text-glitch' : '',
    effects.dishSlide ? 'promo-effect-dish-slide' : '',
    effects.dishPulse ? 'promo-effect-dish-pulse' : '',
    effects.dishRotate ? 'promo-effect-dish-rotate' : '',
    effects.priceShake ? 'promo-effect-price-shake' : '',
    effects.priceFlip ? 'promo-effect-price-flip' : '',
    effects.priceGlow ? 'promo-effect-price-glow' : '',
    effects.backgroundOrbit ? 'promo-effect-background-orbit' : '',
    effects.backgroundPulse ? 'promo-effect-background-pulse' : '',
    effects.spotlightPulse ? 'promo-effect-spotlight-pulse' : '',
    effects.confetti ? 'promo-effect-confetti' : '',
    effects.vignette ? 'promo-effect-vignette' : '',
    effects.gifSpin ? 'promo-effect-gif-spin' : '',
    effects.gifBounce ? 'promo-effect-gif-bounce' : '',
  ].filter(Boolean).join(' ');

  return (
    <section className="promo-preview-shell" aria-label={`TV Promo ${format.label} preview`}>
      <div className="promo-canvas-wrap" style={{ width: `${format.previewWidth}px`, aspectRatio: `${format.width} / ${format.height}` }}>
        <article
          className={sceneClass}
          style={{
            width: `${format.width}px`,
            height: `${format.height}px`,
            transform: `scale(${previewScale})`,
            '--promo-duration': `${settings.duration || 8}s`,
            '--promo-gif-motion-duration': '1s',
            '--promo-edge-color': tunedBackground,
            '--promo-background-dim': backgroundDim,
            '--promo-text-shadow': textShadow,
          }}
        >
          <div className="promo-background" />
          <PromoBackgroundMedia url={backgroundUrl} settings={settings} />
          {backgroundUrl ? <div className="promo-background-dimmer" aria-hidden="true" /> : null}
          {effects.spotlightPulse ? <div className="promo-spotlight" aria-hidden="true" /> : null}
          {effects.lightSweep ? <div className="promo-light-sweep" aria-hidden="true" /> : null}
          {effects.confetti ? <div className="promo-confetti" aria-hidden="true" /> : null}
          {effects.vignette ? <div className="promo-vignette" aria-hidden="true" /> : null}

          <div className="promo-copy-block" style={{ ...layoutStyle(copyLayout), textShadow }}>
            {settings.showOffer ? <p className="promo-eyebrow" style={{ color: settings.offerColor, fontFamily: settings.offerFont, fontSize: `${settings.offerSize}px` }}>{offerText}</p> : null}
            <h2 style={{ color: settings.headlineColor, fontFamily: settings.headlineFont, fontSize: `${settings.headlineSize}px` }}>{headline}</h2>
            {dish?.nameGe ? <h3 style={{ color: settings.geTitleColor, fontFamily: settings.geTitleFont, fontSize: `${settings.geTitleSize}px` }}>{dish.nameGe}</h3> : null}
            {settings.showDescription && descriptionLines.length ? (
              <div className="promo-description-stack" style={{ transform: `translateY(${settings.descriptionOffsetY || 0}px)` }}>
                {descriptionLines.map((line, lineIndex) => <p key={`${line}-${lineIndex}`} className="promo-description" style={{ color: settings.descriptionColor, fontFamily: settings.descriptionFont, fontSize: `${settings.descriptionSize}px` }}>{line}</p>)}
              </div>
            ) : null}
          </div>

          <div className="promo-dish-stage" style={layoutPositionStyle(dishLayout)}>
            {dish?.imageUrl ? (
              <img
                className="promo-dish-image"
                src={dish.imageUrl}
                alt={dish.nameEn || dish.nameGe || 'Dish'}
                style={{ width: `${dishImageSize}px`, maxWidth: 'none', maxHeight: 'none' }}
              />
            ) : <div className="promo-dish-placeholder">Select dish with image</div>}
          </div>

          {hasPrice ? (
            <div className="promo-price-card" style={{ ...layoutStyle(priceLayout), textShadow }}>
              {oldPrice ? <span className="promo-old-price" style={{ color: settings.oldPriceColor, fontFamily: settings.oldPriceFont, fontSize: `${settings.oldPriceSize}px` }}>{oldPrice}</span> : null}
              {salePrice ? <strong style={{ color: settings.salePriceColor, fontFamily: settings.salePriceFont, fontSize: `${settings.salePriceSize}px` }}>{salePrice}</strong> : null}
            </div>
          ) : null}

          {settings.showCta ? <div className="promo-cta" style={{ ...layoutStyle(ctaLayout), color: settings.ctaColor, fontFamily: settings.ctaFont, fontSize: `${settings.ctaSize}px`, textShadow }}>{settings.ctaText || 'ORDER NOW'}</div> : null}
          {effects.gifOverlay && settings.gifUrl ? <img className="promo-gif-overlay" src={settings.gifUrl} alt="" aria-hidden="true" style={{ ...layoutStyle(gifLayout), width: `${settings.gifSize || 18}%`, filter: gifFilter, ...getGifShapeStyle(settings) }} /> : null}
        </article>
      </div>
      <small className="promo-preview-size">Output format: {format.label}</small>
    </section>
  );
}
