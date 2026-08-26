import { useEffect, useMemo, useRef, useState } from 'react';
import { getFallbackImageBackground, sampleImageAutofillColor } from '../utils/imageColor.js';
import { normalizeGoogleDriveImageUrl, normalizeGoogleDriveMediaUrl } from '../utils/imageUrls.js';
import { removeImageBackground } from '../utils/removeImageBackground.js';
import { getDefaultMetaProductTransform, getMetaFormat } from './metaCreativeStorage.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
const formatPrice = (value) => { const number = Number(value); return Number.isFinite(number) && number > 0 ? `${number.toFixed(2)}₾` : ''; };
const getPriceData = (dish) => { const variant = (dish?.priceVariants ?? []).find((item) => Number(item?.newPrice ?? item?.price ?? item?.oldPrice) > 0); return { current: formatPrice(dish?.newPrice ?? variant?.newPrice ?? variant?.price ?? dish?.price), old: formatPrice(dish?.oldPrice ?? variant?.oldPrice) }; };
const getImageUrl = (value) => normalizeGoogleDriveMediaUrl(value) || normalizeGoogleDriveImageUrl(value);
const move = (x, y) => `translate(${x ?? 0}px, ${y ?? 0}px)`;
const hexToRgb = (hex) => { const raw = String(hex || '').replace('#', ''); const value = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw; const n = Number.parseInt(value, 16); return Number.isFinite(n) ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 } : { r: 244, g: 239, b: 232 }; };
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
const averageColors = (colors) => { const valid = colors.filter(Boolean); if (!valid.length) return ''; const total = valid.map(hexToRgb).reduce((sum, c) => ({ r: sum.r + c.r, g: sum.g + c.g, b: sum.b + c.b }), { r: 0, g: 0, b: 0 }); return rgbToHex({ r: total.r / valid.length, g: total.g / valid.length, b: total.b / valid.length }); };
const applyTone = (hex, tone = 0) => { const c = hexToRgb(hex); const amount = clamp(tone, -40, 40); const target = amount >= 0 ? 255 : 0; const ratio = Math.abs(amount) / 100; return rgbToHex({ r: c.r + (target - c.r) * ratio, g: c.g + (target - c.g) * ratio, b: c.b + (target - c.b) * ratio }); };

function ProductImage({ dish, creative }) {
  const originalUrl = getImageUrl(dish.imageUrl);
  const [displayUrl, setDisplayUrl] = useState(originalUrl);
  useEffect(() => {
    let cancelled = false;
    setDisplayUrl(originalUrl);
    if (!creative.productCutoutEnabled || !dish.imageUrl) return undefined;
    removeImageBackground(dish.imageUrl, {
      sensitivity: creative.productCutoutSensitivity ?? 38,
      softness: creative.productCutoutSoftness ?? 2,
      expand: creative.productCutoutExpand ?? 0,
      cleanup: creative.productCutoutCleanup ?? 35,
      protection: creative.productCutoutProtection ?? 45,
      fillHoles: creative.productCutoutFillHoles ?? true,
    }).then((url) => { if (!cancelled) setDisplayUrl(url || originalUrl); }).catch(() => { if (!cancelled) setDisplayUrl(originalUrl); });
    return () => { cancelled = true; };
  }, [dish.imageUrl, originalUrl, creative.productCutoutEnabled, creative.productCutoutSensitivity, creative.productCutoutSoftness, creative.productCutoutExpand, creative.productCutoutCleanup, creative.productCutoutProtection, creative.productCutoutFillHoles]);
  if (!displayUrl) return null;
  const shadow = creative.productCutoutEnabled && creative.productCutoutShadow ? 'drop-shadow(0 18px 18px rgba(0,0,0,.2))' : 'none';
  return <img className="meta-product-image" src={displayUrl} alt="" style={{ filter: shadow }} />;
}

function ProductCard({ dish, creative, index, count, sceneRef, onUpdateProductTransform, onSelectProduct }) {
  const transform = creative.productTransforms?.[dish.id] || getDefaultMetaProductTransform(count, index);
  const selected = creative.selectedProductId === dish.id;
  const dragRef = useRef(null);
  const price = getPriceData(dish);
  const scale = clamp((transform.scale ?? 1) * (creative.imageScale ?? 1), .18, 2.4);

  const start = (event, type) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); onSelectProduct(dish.id);
    const rect = sceneRef.current?.getBoundingClientRect(); if (!rect) return;
    dragRef.current = { type, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: transform.x ?? .5, y: transform.y ?? .5, scale: transform.scale ?? 1, width: rect.width, height: rect.height, size: Math.max(120, Math.min(rect.width, rect.height)) };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const movePointer = (event) => {
    const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (drag.type === 'move') onUpdateProductTransform(dish.id, { x: clamp(drag.x + (event.clientX - drag.startX) / drag.width, -.15, 1.15), y: clamp(drag.y + (event.clientY - drag.startY) / drag.height, -.15, 1.15) });
    else onUpdateProductTransform(dish.id, { scale: clamp(drag.scale + ((event.clientX - drag.startX) + (event.clientY - drag.startY)) / drag.size, .2, 1.9) });
  };
  const finish = (event) => { dragRef.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId); };

  return <div className={`meta-product-card ${selected ? 'selected' : ''}`} style={{ left: `${(transform.x ?? .5) * 100}%`, top: `${(transform.y ?? .5) * 100}%`, zIndex: transform.z ?? index + 2, transform: `translate(-50%,-50%) scale(${scale})` }} onPointerDown={(event) => start(event, 'move')} onPointerMove={movePointer} onPointerUp={finish} onPointerCancel={finish}>
    <div className="meta-product-image-wrap"><ProductImage dish={dish} creative={creative} /></div>
    {creative.showProductNameEn !== false && dish.nameEn ? <strong className="meta-product-name meta-product-name-en" style={{ fontSize: `${creative.productNameSize}px`, color: creative.productNameColor, transform: move(creative.productNameXOffset, creative.productNameYOffset) }}>{dish.nameEn}</strong> : null}
    {creative.showProductNameGe !== false && dish.nameGe ? <strong className="meta-product-name meta-product-name-ge" style={{ fontSize: `${creative.productNameGeSize}px`, color: creative.productNameGeColor, transform: move(creative.productNameGeXOffset, creative.productNameGeYOffset) }}>{dish.nameGe}</strong> : null}
    {creative.showPrice && price.current ? <span className="meta-current-price" style={{ fontSize: `${creative.priceSize}px`, color: creative.currentPriceColor, transform: move(creative.currentPriceXOffset, creative.currentPriceYOffset) }}>{price.current}</span> : null}
    {creative.showPrice && creative.showOldPrice && price.old ? <span className="meta-old-price" style={{ fontSize: `${creative.oldPriceSize}px`, color: creative.oldPriceColor, transform: move(creative.oldPriceXOffset, creative.oldPriceYOffset) }}>{price.old}</span> : null}
    {selected ? <button type="button" className="meta-product-resize-handle meta-editor-only" aria-label="Resize product" onPointerDown={(event) => start(event, 'resize')} onPointerMove={movePointer} onPointerUp={finish} onPointerCancel={finish} /> : null}
  </div>;
}

export function MetaCreativePreview({ creative, dishes, onUpdateProductTransform, onSelectProduct }) {
  const format = getMetaFormat(creative.formatId);
  const sceneRef = useRef(null);
  const selectedDishes = useMemo(() => creative.selectedDishIds.map((id) => dishes.find((dish) => dish.id === id)).filter(Boolean), [creative.selectedDishIds, dishes]);
  const previewScale = format.previewWidth / format.width;
  const count = Math.max(1, creative.productCount || selectedDishes.length || 1);
  const customBackgroundUrl = creative.customBackgroundEnabled ? getImageUrl(creative.customBackgroundUrl) : '';
  const autoBackground = !creative.customBackgroundEnabled && (creative.autoBackground ?? true);
  const imageUrls = useMemo(() => selectedDishes.map((dish) => getImageUrl(dish.imageUrl)).filter(Boolean), [selectedDishes]);
  const imageKey = imageUrls.join('|');
  const [sampledBackground, setSampledBackground] = useState('');
  useEffect(() => {
    let cancelled = false; setSampledBackground('');
    if (!autoBackground || !imageUrls.length) return undefined;
    Promise.all(imageUrls.map((url) => sampleImageAutofillColor(url).catch(() => ''))).then((colors) => {
      if (!cancelled) setSampledBackground(applyTone(averageColors(colors) || getFallbackImageBackground(0), creative.backgroundTone ?? 0));
    }).catch(() => { if (!cancelled) setSampledBackground(applyTone(getFallbackImageBackground(0), creative.backgroundTone ?? 0)); });
    return () => { cancelled = true; };
  }, [autoBackground, imageKey, creative.backgroundTone]);
  const background = autoBackground ? sampledBackground || applyTone(creative.backgroundColor || '#f4efe8', creative.backgroundTone ?? 0) : creative.backgroundColor;

  return <section className="app-preview-shell" aria-label="Meta creative preview">
    <div className="app-canvas-wrap meta-canvas-wrap" style={{ width: `${format.previewWidth}px`, aspectRatio: `${format.width} / ${format.height}` }}>
      <article ref={sceneRef} className="meta-creative-scene" style={{ width: `${format.width}px`, height: `${format.height}px`, transform: `scale(${previewScale})`, background, color: creative.textColor }}>
        {customBackgroundUrl ? <img className="meta-custom-background" src={customBackgroundUrl} alt="" /> : null}
        <div className="meta-products-layer">{selectedDishes.map((dish, index) => <ProductCard key={dish.id} dish={dish} creative={creative} index={index} count={count} sceneRef={sceneRef} onUpdateProductTransform={onUpdateProductTransform} onSelectProduct={onSelectProduct} />)}</div>
        {creative.showOffer && creative.offerText ? <div className="meta-offer-badge" style={{ transform: move(creative.offerXOffset, creative.offerYOffset), background: creative.accentColor, color: creative.offerTextColor, fontSize: `${creative.offerSize}px` }}>{creative.offerText}</div> : null}
      </article>
    </div>
    <small className="app-preview-size">Meta output: {format.width} × {format.height}px · {format.label}</small>
  </section>;
}
