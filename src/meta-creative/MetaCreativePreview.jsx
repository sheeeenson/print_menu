import { useEffect, useMemo, useRef, useState } from 'react';
import { getFallbackImageBackground, sampleImageAutofillColor } from '../utils/imageColor.js';
import { normalizeGoogleDriveImageUrl, normalizeGoogleDriveMediaUrl } from '../utils/imageUrls.js';
import { removeImageBackground } from '../utils/removeImageBackground.js';
import { buildDefaultMetaElementTransforms, getMetaFormat } from './metaCreativeStorage.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
const formatPrice = (value) => { const number = Number(value); return Number.isFinite(number) && number > 0 ? `${number.toFixed(2)}₾` : ''; };
const getPriceData = (dish) => { const variant = (dish?.priceVariants ?? []).find((item) => Number(item?.newPrice ?? item?.price ?? item?.oldPrice) > 0); return { current: formatPrice(dish?.newPrice ?? variant?.newPrice ?? variant?.price ?? dish?.price), old: formatPrice(dish?.oldPrice ?? variant?.oldPrice) }; };
const getImageUrl = (value) => normalizeGoogleDriveMediaUrl(value) || normalizeGoogleDriveImageUrl(value);
const elementKey = (dishId, type) => `${dishId}:${type}`;
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

function DraggableElement({ elementId, transform, sceneRef, selected, onSelect, onUpdate, children, className = '', resizable = true, minScale = .25, maxScale = 3 }) {
  const dragRef = useRef(null);
  const start = (event, type) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    onSelect(elementId);
    const rect = sceneRef.current?.getBoundingClientRect(); if (!rect) return;
    dragRef.current = { type, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: transform.x ?? .5, y: transform.y ?? .5, scale: transform.scale ?? 1, width: rect.width, height: rect.height, size: Math.max(120, Math.min(rect.width, rect.height)) };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const movePointer = (event) => {
    const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (drag.type === 'move') {
      onUpdate(elementId, { x: clamp(drag.x + (event.clientX - drag.startX) / drag.width, -.1, 1.1), y: clamp(drag.y + (event.clientY - drag.startY) / drag.height, -.1, 1.1) });
    } else {
      onUpdate(elementId, { scale: clamp(drag.scale + ((event.clientX - drag.startX) + (event.clientY - drag.startY)) / drag.size, minScale, maxScale) });
    }
  };
  const finish = (event) => { dragRef.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId); };
  return <div className={`meta-free-element ${className} ${selected ? 'selected' : ''}`} style={{ left: `${(transform.x ?? .5) * 100}%`, top: `${(transform.y ?? .5) * 100}%`, zIndex: transform.z ?? 10, transform: `translate(-50%,-50%) scale(${transform.scale ?? 1})` }} onPointerDown={(event) => start(event, 'move')} onPointerMove={movePointer} onPointerUp={finish} onPointerCancel={finish}>
    {children}
    {selected && resizable ? <button type="button" className="meta-element-resize-handle meta-editor-only" aria-label="Resize element" onPointerDown={(event) => start(event, 'resize')} onPointerMove={movePointer} onPointerUp={finish} onPointerCancel={finish} /> : null}
  </div>;
}

export function MetaCreativePreview({ creative, dishes, onUpdateElementTransform, onSelectElement, onUpdateOfferTransform }) {
  const format = getMetaFormat(creative.formatId);
  const sceneRef = useRef(null);
  const selectedDishes = useMemo(() => creative.selectedDishIds.map((id) => dishes.find((dish) => dish.id === id)).filter(Boolean), [creative.selectedDishIds, dishes]);
  const previewScale = format.previewWidth / format.width;
  const customBackgroundUrl = creative.customBackgroundEnabled ? getImageUrl(creative.customBackgroundUrl) : '';
  const textureUrl = creative.textureEnabled ? getImageUrl(creative.textureUrl) : '';
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
  const defaults = useMemo(() => buildDefaultMetaElementTransforms(selectedDishes.map((dish) => dish.id)), [selectedDishes]);
  const getTransform = (dishId, type) => creative.elementTransforms?.[elementKey(dishId, type)] || defaults[elementKey(dishId, type)] || { x: .5, y: .5, scale: 1, z: 10 };
  const isSelected = (key) => creative.selectedElementKey === key;

  return <section className="app-preview-shell" aria-label="Meta creative preview">
    <div className="app-canvas-wrap meta-canvas-wrap" style={{ width: `${format.previewWidth}px`, aspectRatio: `${format.width} / ${format.height}` }}>
      <article ref={sceneRef} className="meta-creative-scene" style={{ width: `${format.width}px`, height: `${format.height}px`, transform: `scale(${previewScale})`, background, color: creative.textColor }}>
        {customBackgroundUrl ? <img className="meta-custom-background" src={customBackgroundUrl} alt="" style={{ left: `${(creative.backgroundX ?? .5) * 100}%`, top: `${(creative.backgroundY ?? .5) * 100}%`, transform: `translate(-50%,-50%) scale(${creative.backgroundScale ?? 1})` }} /> : null}
        {textureUrl ? <img className="meta-texture-layer" src={textureUrl} alt="" style={{ left: `${(creative.textureX ?? .5) * 100}%`, top: `${(creative.textureY ?? .5) * 100}%`, opacity: creative.textureOpacity ?? .35, mixBlendMode: creative.textureBlendMode ?? 'normal', transform: `translate(-50%,-50%) scale(${creative.textureScale ?? 1})` }} /> : null}

        {selectedDishes.map((dish) => {
          const price = getPriceData(dish);
          const renderElement = (type, content, className, style = {}, resizable = true) => {
            const key = elementKey(dish.id, type);
            if (!content) return null;
            return <DraggableElement key={key} elementId={key} transform={getTransform(dish.id, type)} sceneRef={sceneRef} selected={isSelected(key)} onSelect={onSelectElement} onUpdate={onUpdateElementTransform} className={className} resizable={resizable}>{typeof content === 'function' ? content() : <div style={style}>{content}</div>}</DraggableElement>;
          };
          return <div key={dish.id} className="meta-dish-layer-group">
            {renderElement('image', () => <div className="meta-product-image-wrap"><ProductImage dish={dish} creative={creative} /></div>, 'meta-image-element')}
            {creative.showProductNameEn !== false && dish.nameEn ? renderElement('nameEn', dish.nameEn, 'meta-text-element meta-name-en', { fontSize: `${creative.productNameSize}px`, color: creative.productNameColor }) : null}
            {creative.showProductNameGe !== false && dish.nameGe ? renderElement('nameGe', dish.nameGe, 'meta-text-element meta-name-ge', { fontSize: `${creative.productNameGeSize}px`, color: creative.productNameGeColor }) : null}
            {creative.showDescriptionEn && dish.descriptionEn ? renderElement('descriptionEn', dish.descriptionEn, 'meta-text-element meta-description-en', { fontSize: `${creative.descriptionSize}px`, color: creative.descriptionEnColor }) : null}
            {creative.showDescriptionGe && dish.descriptionGe ? renderElement('descriptionGe', dish.descriptionGe, 'meta-text-element meta-description-ge', { fontSize: `${creative.descriptionSize}px`, color: creative.descriptionGeColor }) : null}
            {creative.showPrice && price.current ? renderElement('price', price.current, 'meta-text-element meta-price-element', { fontSize: `${creative.priceSize}px`, color: creative.currentPriceColor }) : null}
            {creative.showPrice && creative.showOldPrice && price.old ? renderElement('oldPrice', price.old, 'meta-text-element meta-old-price-element', { fontSize: `${creative.oldPriceSize}px`, color: creative.oldPriceColor }) : null}
          </div>;
        })}

        {creative.showOffer && creative.offerText ? <DraggableElement elementId="offer" transform={creative.offerTransform || { x: .2, y: .88, scale: 1, z: 30 }} sceneRef={sceneRef} selected={creative.selectedElementKey === 'offer'} onSelect={onSelectElement} onUpdate={(_, changes) => onUpdateOfferTransform(changes)} className="meta-offer-element"><div className="meta-offer-badge" style={{ background: creative.accentColor, color: creative.offerTextColor, fontSize: `${creative.offerSize}px` }}>{creative.offerText}</div></DraggableElement> : null}
      </article>
    </div>
    <small className="app-preview-size">Meta output: {format.width} × {format.height}px · {format.label}</small>
  </section>;
}
