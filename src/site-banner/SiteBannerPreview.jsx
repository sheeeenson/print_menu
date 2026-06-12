import { useEffect, useMemo, useState } from 'react';
import { getFallbackImageBackground, sampleImageColor } from '../utils/imageColor.js';
import { normalizeGoogleDriveImageUrl } from '../utils/imageUrls.js';
import { SITE_BANNER_FORMAT, SITE_BANNER_SAFE_ZONES } from './siteBannerStorage.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

const hexToRgb = (hex) => {
  const value = String(hex || '').replace('#', '');
  if (![3, 6].includes(value.length)) return { r: 35, g: 31, b: 32 };
  const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  const number = Number.parseInt(normalized, 16);
  if (!Number.isFinite(number)) return { r: 35, g: 31, b: 32 };
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
};

const adjustRgb = (color, amount) => {
  const target = amount >= 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const ratio = Math.abs(clamp(amount, -50, 50)) / 100;
  return {
    r: Math.round(color.r + (target.r - color.r) * ratio),
    g: Math.round(color.g + (target.g - color.g) * ratio),
    b: Math.round(color.b + (target.b - color.b) * ratio),
  };
};

const rgbToCss = ({ r, g, b }, alpha = 1) => `rgba(${r}, ${g}, ${b}, ${alpha})`;
const colorWithTone = (baseHex, tone = 0) => rgbToCss(adjustRgb(hexToRgb(baseHex), tone));
const getPrice = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  return `${number.toFixed(2)}₾`;
};

const positionWithOffset = ({ x, y }, offsetX = 0, offsetY = 0) => ({ left: x + offsetX, top: y + offsetY });
const normalizeCustomBackgroundUrl = (url) => normalizeGoogleDriveImageUrl(String(url || '').trim());
const getBackgroundFit = (settings) => settings.backgroundFit === 'contain' || settings.backgroundFit === 'fill' ? settings.backgroundFit : 'cover';
const getBackgroundDim = (settings) => clamp(settings.backgroundDim ?? 0, 0, 70) / 100;
const backgroundMediaStyle = (settings) => {
  const fit = getBackgroundFit(settings);
  return { objectFit: fit === 'fill' ? 'fill' : fit };
};

function SiteBannerCustomBackground({ url, settings }) {
  const normalizedUrl = normalizeCustomBackgroundUrl(url);
  if (!normalizedUrl) return null;
  return <img key={normalizedUrl} className="site-banner-custom-background" src={normalizedUrl} alt="" aria-hidden="true" style={backgroundMediaStyle(settings)} />;
}

export function SiteBannerPreview({ dish, settings, index = 0 }) {
  const [sampledColor, setSampledColor] = useState('');
  const fallbackColor = getFallbackImageBackground(index);
  const edgeColor = sampledColor || fallbackColor;
  const tunedBackground = useMemo(() => colorWithTone(edgeColor, settings.backgroundTone), [edgeColor, settings.backgroundTone]);
  const previewScale = SITE_BANNER_FORMAT.previewWidth / SITE_BANNER_FORMAT.width;
  const offsets = settings.layoutOffsets ?? {};
  const headline = settings.headline || dish?.nameEn || 'Sushiwoki Banner';
  const salePrice = getPrice(dish?.newPrice);
  const oldPrice = getPrice(dish?.oldPrice);
  const textPosition = positionWithOffset({ x: 300, y: 136 }, offsets.textX, offsets.textY);
  const productPosition = positionWithOffset({ x: 1040, y: 138 }, offsets.productX, offsets.productY);
  const ctaPosition = positionWithOffset({ x: 300, y: 680 }, offsets.ctaX, offsets.ctaY);
  const pricePosition = positionWithOffset({ x: 650, y: 640 }, offsets.priceX, offsets.priceY);
  const customBackgroundUrl = settings.backgroundMode === 'custom' ? normalizeCustomBackgroundUrl(settings.customBackgroundUrl) : '';
  const backgroundDim = getBackgroundDim(settings);

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
    'site-banner-scene',
    customBackgroundUrl ? 'site-banner-scene-has-custom-background' : '',
  ].filter(Boolean).join(' ');

  return (
    <section className="app-preview-shell" aria-label="Sushiwoki website banner preview">
      <div className="app-canvas-wrap site-banner-canvas-wrap" style={{ width: `${SITE_BANNER_FORMAT.previewWidth}px`, aspectRatio: `${SITE_BANNER_FORMAT.width} / ${SITE_BANNER_FORMAT.height}` }}>
        <article className={sceneClass} style={{ width: `${SITE_BANNER_FORMAT.width}px`, height: `${SITE_BANNER_FORMAT.height}px`, transform: `scale(${previewScale})`, '--site-banner-bg': tunedBackground, '--site-banner-accent': settings.accentColor, '--site-banner-background-dim': backgroundDim }}>
          <div className="site-banner-background" />
          {customBackgroundUrl ? <SiteBannerCustomBackground url={customBackgroundUrl} settings={settings} /> : null}
          {settings.backgroundMode === 'auto' && dish?.imageUrl ? <img className="site-banner-edge-fill" src={dish.imageUrl} alt="" crossOrigin="anonymous" /> : null}
          {customBackgroundUrl ? <div className="site-banner-background-dimmer" aria-hidden="true" /> : null}
          <div className="site-banner-vignette" />

          {settings.showSafeZones ? (
            <div className="site-banner-guides" aria-hidden="true">
              {settings.showGeneralSafeZone ? <div className="site-banner-guide site-banner-guide-general" style={{ left: SITE_BANNER_SAFE_ZONES.general.left, top: SITE_BANNER_SAFE_ZONES.general.top, right: SITE_BANNER_SAFE_ZONES.general.right, bottom: SITE_BANNER_SAFE_ZONES.general.bottom }}><span>general safe zone</span></div> : null}
              {settings.showRecommendedZones ? (
                <>
                  <div className="site-banner-guide site-banner-guide-text" style={{ left: SITE_BANNER_SAFE_ZONES.text.x, top: SITE_BANNER_SAFE_ZONES.text.y, width: SITE_BANNER_SAFE_ZONES.text.width, height: SITE_BANNER_SAFE_ZONES.text.height }}><span>text 300-880</span></div>
                  <div className="site-banner-guide site-banner-guide-product" style={{ left: SITE_BANNER_SAFE_ZONES.product.x, top: SITE_BANNER_SAFE_ZONES.product.y, width: SITE_BANNER_SAFE_ZONES.product.width, height: SITE_BANNER_SAFE_ZONES.product.height }}><span>product 920-1850</span></div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="site-banner-copy" style={textPosition}>
            <p className="site-banner-eyebrow">SUSHIWOKI</p>
            <h2 style={{ color: settings.headlineColor, fontFamily: settings.headlineFont, fontSize: `${settings.headlineSize}px` }}>{headline}</h2>
            {settings.showSubheadline ? <p className="site-banner-subheadline" style={{ color: settings.subheadlineColor, fontFamily: settings.subheadlineFont, fontSize: `${settings.subheadlineSize}px` }}>{settings.subheadline}</p> : null}
          </div>

          <div className="site-banner-product-stage" style={{ ...productPosition, width: `${settings.productSize}px`, height: `${settings.productSize}px` }}>
            {dish?.imageUrl ? <img className="site-banner-product-image" src={dish.imageUrl} alt={dish.nameEn || dish.nameGe || 'Dish'} crossOrigin="anonymous" /> : <div className="site-banner-product-placeholder">Select dish with image</div>}
          </div>

          {settings.showCta ? <div className="site-banner-cta" style={{ ...ctaPosition, color: settings.ctaColor, fontFamily: settings.ctaFont, fontSize: `${settings.ctaSize}px` }}>{settings.ctaText || 'ORDER NOW'}</div> : null}

          {settings.showPrice && (salePrice || oldPrice) ? (
            <div className="site-banner-price" style={{ ...pricePosition, color: settings.priceColor, fontFamily: settings.priceFont, fontSize: `${settings.priceSize}px` }}>
              {oldPrice ? <span>{oldPrice}</span> : null}
              {salePrice ? <strong>{salePrice}</strong> : null}
            </div>
          ) : null}
        </article>
      </div>
      <small className="app-preview-size">Output canvas: {SITE_BANNER_FORMAT.width} × {SITE_BANNER_FORMAT.height}px</small>
    </section>
  );
}
