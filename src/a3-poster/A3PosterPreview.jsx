import { useEffect, useMemo, useRef, useState } from 'react';
import { getFallbackImageBackground, sampleImageAutofillColor } from '../utils/imageColor.js';
import { normalizeGoogleDriveImageUrl, normalizeGoogleDriveMediaUrl } from '../utils/imageUrls.js';
import { removeImageBackground } from '../utils/removeImageBackground.js';
import { getDefaultA3ProductTransform } from './a3ProductLayout.js';
import { getA3Format } from './a3PosterStorage.js';

const formatPrice = (value) => { const number = Number(value); return Number.isFinite(number) && number > 0 ? `${number.toFixed(2)}₾` : ''; };
const getPriceData = (dish) => { const variant = (dish?.priceVariants ?? []).find((item) => Number(item?.newPrice ?? item?.price ?? item?.oldPrice) > 0); return { current: formatPrice(dish?.newPrice ?? variant?.newPrice ?? variant?.price ?? dish?.price), old: formatPrice(dish?.oldPrice ?? variant?.oldPrice) }; };
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
const hexToRgb = (hex) => { const value = String(hex || '').replace('#', ''); if (![3, 6].includes(value.length)) return { r: 35, g: 31, b: 32 }; const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value; const number = Number.parseInt(normalized, 16); return Number.isFinite(number) ? { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 } : { r: 35, g: 31, b: 32 }; };
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;
const averageColors = (colors) => { const valid = colors.filter(Boolean); if (!valid.length) return ''; const totals = valid.map(hexToRgb).reduce((sum, color) => ({ r: sum.r + color.r, g: sum.g + color.g, b: sum.b + color.b }), { r: 0, g: 0, b: 0 }); return rgbToHex({ r: totals.r / valid.length, g: totals.g / valid.length, b: totals.b / valid.length }); };
const applyTone = (hex, tone = 0) => { const color = hexToRgb(hex); const amount = clamp(tone, -40, 40); const target = amount >= 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }; const ratio = Math.abs(amount) / 100; return rgbToHex({ r: color.r + (target.r - color.r) * ratio, g: color.g + (target.g - color.g) * ratio, b: color.b + (target.b - color.b) * ratio }); };
const move = (x, y) => `translate(${x ?? 0}px, ${y ?? 0}px)`;
const getA3ImageUrl = (value) => normalizeGoogleDriveMediaUrl(value) || normalizeGoogleDriveImageUrl(value);

function ProductImage({ dish, poster }) {
  const originalUrl = getA3ImageUrl(dish.imageUrl);
  const [displayUrl, setDisplayUrl] = useState(originalUrl);
  const cutoutEnabled = poster.productCutoutEnabled ?? false;
  const sensitivity = poster.productCutoutSensitivity ?? 38;
  const softness = poster.productCutoutSoftness ?? 2;
  const expand = poster.productCutoutExpand ?? 0;
  const cleanup = poster.productCutoutCleanup ?? 35;
  const protection = poster.productCutoutProtection ?? 45;
  const fillHoles = poster.productCutoutFillHoles ?? true;
  useEffect(() => {
    let cancelled = false; setDisplayUrl(originalUrl);
    if (!cutoutEnabled || !dish.imageUrl) return undefined;
    removeImageBackground(dish.imageUrl, { sensitivity, softness, expand, cleanup, protection, fillHoles })
      .then((url) => { if (!cancelled) setDisplayUrl(url || originalUrl); })
      .catch(() => { if (!cancelled) setDisplayUrl(originalUrl); });
    return () => { cancelled = true; };
  }, [cutoutEnabled, dish.imageUrl, originalUrl, sensitivity, softness, expand, cleanup, protection, fillHoles]);
  if (!displayUrl) return null;
  const shadow = cutoutEnabled && poster.productCutoutShadow ? 'drop-shadow(0 34px 28px rgba(0,0,0,.22))' : 'none';
  return <img className="a3-product-image" src={displayUrl} alt="" style={{ filter: shadow }} />;
}

function FreeProductCard({ dish, poster, index, count, sceneRef, onUpdateProductTransform, onSelectProduct }) {
  const transform = poster.productTransforms?.[dish.id] || getDefaultA3ProductTransform(count, index);
  const selected = poster.selectedProductId === dish.id;
  const price = getPriceData(dish);
  const dragRef = useRef(null);
  const scale = clamp((transform.scale ?? 1) * (poster.imageScale ?? 1), 0.18, 2.5);

  const beginDrag = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    onSelectProduct(dish.id);
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { type: 'move', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: transform.x ?? .5, y: transform.y ?? .5, width: rect.width, height: rect.height };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const beginResize = (event) => {
    event.preventDefault(); event.stopPropagation(); onSelectProduct(dish.id);
    const rect = sceneRef.current?.getBoundingClientRect(); if (!rect) return;
    dragRef.current = { type: 'resize', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, scale: transform.scale ?? 1, size: Math.max(120, Math.min(rect.width, rect.height)) };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handlePointerMove = (event) => {
    const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (drag.type === 'move') {
      onUpdateProductTransform(dish.id, { x: clamp(drag.x + (event.clientX - drag.startX) / drag.width, -0.15, 1.15), y: clamp(drag.y + (event.clientY - drag.startY) / drag.height, -0.15, 1.15) });
    } else {
      const delta = ((event.clientX - drag.startX) + (event.clientY - drag.startY)) / drag.size;
      onUpdateProductTransform(dish.id, { scale: clamp(drag.scale + delta, 0.22, 1.8) });
    }
  };
  const finishPointer = (event) => { if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId); };
  const titleEnColor = poster.productNameColor ?? poster.textColor ?? '#161616';
  const titleGeColor = poster.productNameGeColor ?? poster.textColor ?? '#161616';
  const currentPriceColor = poster.currentPriceColor ?? poster.accentColor ?? '#d83b32';
  const oldPriceColor = poster.oldPriceColor ?? poster.textColor ?? '#161616';

  return <div className={`a3-free-product-card ${selected ? 'selected' : ''}`} style={{ left: `${(transform.x ?? .5) * 100}%`, top: `${(transform.y ?? .55) * 100}%`, zIndex: transform.z ?? index + 2, transform: `translate(-50%, -50%) scale(${scale})` }} onPointerDown={beginDrag} onPointerMove={handlePointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer}>
    <div className="a3-product-image-wrap"><ProductImage dish={dish} poster={poster} /></div>
    {count > 1 && poster.showProductNameEn !== false && dish.nameEn ? <strong className="a3-product-name a3-product-name-en" style={{ fontSize: `${poster.productNameSize}px`, color: titleEnColor, transform: move(poster.productNameXOffset, poster.productNameYOffset) }}>{dish.nameEn}</strong> : null}
    {count > 1 && poster.showProductNameGe !== false && dish.nameGe ? <strong className="a3-product-name a3-product-name-ge" style={{ fontSize: `${poster.productNameGeSize ?? 62}px`, color: titleGeColor, transform: move(poster.productNameGeXOffset, poster.productNameGeYOffset) }}>{dish.nameGe}</strong> : null}
    {poster.showPrice && price.current ? <span className="a3-current-price" style={{ fontSize: `${poster.priceSize}px`, color: currentPriceColor, transform: move(poster.currentPriceXOffset, poster.currentPriceYOffset) }}>{price.current}</span> : null}
    {poster.showPrice && poster.showOldPrice && price.old ? <span className="a3-old-price" style={{ fontSize: `${poster.oldPriceSize}px`, color: oldPriceColor, transform: move(poster.oldPriceXOffset, poster.oldPriceYOffset) }}>{price.old}</span> : null}
    {selected ? <button type="button" className="a3-product-resize-handle" aria-label="Resize product" onPointerDown={beginResize} onPointerMove={handlePointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer} /> : null}
  </div>;
}

const chaikin = (points) => { if (points.length < 3) return points; const result = [points[0]]; for (let index = 0; index < points.length - 1; index += 1) { const current = points[index]; const next = points[index + 1]; result.push({ x: current.x * .75 + next.x * .25, y: current.y * .75 + next.y * .25 }); result.push({ x: current.x * .25 + next.x * .75, y: current.y * .25 + next.y * .75 }); } result.push(points[points.length - 1]); return result; };
const smoothStrokePoints = (points = [], smoothing = 72) => { if (points.length < 3) return points; let result = points; const amount = clamp(smoothing, 0, 100); const iterations = amount >= 75 ? 3 : amount >= 45 ? 2 : amount >= 15 ? 1 : 0; for (let index = 0; index < iterations; index += 1) result = chaikin(result); return result; };
const pointsToPath = (points = [], smoothing = 72) => { const smoothed = smoothStrokePoints(points, smoothing); if (!smoothed.length) return ''; if (smoothed.length === 1) return `M ${smoothed[0].x} ${smoothed[0].y} L ${smoothed[0].x + .01} ${smoothed[0].y + .01}`; let path = `M ${smoothed[0].x} ${smoothed[0].y}`; for (let index = 1; index < smoothed.length - 1; index += 1) { const current = smoothed[index]; const next = smoothed[index + 1]; path += ` Q ${current.x} ${current.y} ${(current.x + next.x) / 2} ${(current.y + next.y) / 2}`; } const last = smoothed[smoothed.length - 1]; return `${path} T ${last.x} ${last.y}`; };
const distanceToSegment = (point, start, end) => { const dx = end.x - start.x; const dy = end.y - start.y; if (!dx && !dy) return Math.hypot(point.x - start.x, point.y - start.y); const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy)); };
const strokeDistance = (stroke, point) => { const points = stroke.points ?? []; if (!points.length) return Infinity; if (points.length === 1) return Math.hypot(points[0].x - point.x, points[0].y - point.y); let best = Infinity; for (let index = 0; index < points.length - 1; index += 1) best = Math.min(best, distanceToSegment(point, points[index], points[index + 1])); return best; };

function DrawingOverlay({ poster, format, onCommitStroke, onEraseStrokes }) {
  const svgRef = useRef(null); const [activeStroke, setActiveStroke] = useState(null); const enabled = poster.drawingEnabled ?? false; const tool = poster.drawingTool ?? 'pencil'; const strokes = poster.drawingStrokes ?? []; const smoothing = poster.drawingSmoothing ?? 72;
  const pointFromClient = (clientX, clientY) => { const rect = svgRef.current.getBoundingClientRect(); return { x: clamp((clientX - rect.left) * format.width / rect.width, 0, format.width), y: clamp((clientY - rect.top) * format.height / rect.height, 0, format.height) }; };
  const eraseAtPoint = (point) => { const radius = Math.max(12, poster.drawingSize ?? 18) * 2.2; const ids = strokes.filter((stroke) => strokeDistance(stroke, point) <= radius + (stroke.size ?? 12) / 2).map((stroke) => stroke.id); if (ids.length) onEraseStrokes(ids); };
  const handlePointerDown = (event) => { if (!enabled) return; event.preventDefault(); svgRef.current.setPointerCapture?.(event.pointerId); const point = pointFromClient(event.clientX, event.clientY); if (tool === 'eraser') { eraseAtPoint(point); setActiveStroke({ tool: 'eraser', points: [point] }); return; } setActiveStroke({ id: `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, tool, color: poster.drawingColor ?? '#e53935', size: poster.drawingSize ?? 18, opacity: tool === 'marker' ? clamp((poster.drawingMarkerOpacity ?? 34) / 100, .08, .85) : 1, smoothing, points: [point] }); };
  const handlePointerMove = (event) => { if (!enabled || !activeStroke) return; event.preventDefault(); const sourceEvents = event.getCoalescedEvents?.() ?? [event]; const newPoints = sourceEvents.map((sourceEvent) => pointFromClient(sourceEvent.clientX, sourceEvent.clientY)); if (tool === 'eraser') { newPoints.forEach(eraseAtPoint); return; } setActiveStroke((current) => { if (!current) return current; const points = [...current.points]; newPoints.forEach((point) => { const last = points[points.length - 1]; const minDistance = Math.max(1.5, (poster.drawingSize ?? 18) * .035); if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= minDistance) points.push(point); }); return { ...current, points }; }); };
  const finishStroke = (event) => { if (!activeStroke) return; svgRef.current.releasePointerCapture?.(event.pointerId); if (activeStroke.tool !== 'eraser' && activeStroke.points.length) onCommitStroke(activeStroke); setActiveStroke(null); };
  const visibleStrokes = activeStroke?.tool !== 'eraser' ? [...strokes, activeStroke].filter(Boolean) : strokes;
  return <svg ref={svgRef} className={`a3-drawing-overlay ${enabled ? 'enabled' : ''}`} viewBox={`0 0 ${format.width} ${format.height}`} preserveAspectRatio="none" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={finishStroke} onPointerCancel={finishStroke}>{visibleStrokes.map((stroke) => <path key={stroke.id} d={pointsToPath(stroke.points, stroke.smoothing ?? smoothing)} fill="none" stroke={stroke.color} strokeWidth={stroke.size} strokeOpacity={stroke.opacity ?? 1} strokeLinecap="round" strokeLinejoin="round" style={stroke.tool === 'marker' ? { mixBlendMode: 'multiply' } : undefined} />)}</svg>;
}

export function A3PosterPreview({ poster, dishes, onCommitStroke, onEraseStrokes, onUpdateProductTransform, onSelectProduct }) {
  const format = getA3Format(poster.formatId); const sceneRef = useRef(null);
  const selectedDishes = useMemo(() => poster.selectedDishIds.map((id) => dishes.find((dish) => dish.id === id)).filter(Boolean), [poster.selectedDishIds, dishes]);
  const count = Math.max(1, poster.productCount || selectedDishes.length || 1); const singleDish = selectedDishes.length === 1 ? selectedDishes[0] : null; const previewScale = format.previewWidth / format.width;
  const [sampledBackground, setSampledBackground] = useState(''); const customBackgroundEnabled = poster.customBackgroundEnabled ?? false; const customBackgroundUrl = customBackgroundEnabled ? getA3ImageUrl(poster.customBackgroundUrl) : ''; const autoBackground = !customBackgroundEnabled && (poster.autoBackground ?? true);
  const imageUrls = useMemo(() => selectedDishes.map((dish) => getA3ImageUrl(dish.imageUrl)).filter(Boolean), [selectedDishes]); const imageKey = imageUrls.join('|');
  useEffect(() => { let cancelled = false; setSampledBackground(''); if (!autoBackground || !imageUrls.length) return undefined; Promise.all(imageUrls.map((url) => sampleImageAutofillColor(url).catch(() => ''))).then((colors) => { if (!cancelled) { const mixed = averageColors(colors); setSampledBackground(applyTone(mixed || getFallbackImageBackground(0), poster.backgroundTone ?? 0)); } }).catch(() => { if (!cancelled) setSampledBackground(applyTone(getFallbackImageBackground(0), poster.backgroundTone ?? 0)); }); return () => { cancelled = true; }; }, [autoBackground, imageKey, poster.backgroundTone]);
  const background = autoBackground ? sampledBackground || applyTone(poster.backgroundColor || '#f4efe8', poster.backgroundTone ?? 0) : poster.backgroundColor;
  const titleEnColor = poster.productNameColor ?? poster.textColor ?? '#161616'; const titleGeColor = poster.productNameGeColor ?? poster.textColor ?? '#161616';
  const showTopTitle = Boolean(singleDish && ((poster.showProductNameEn !== false && singleDish.nameEn) || (poster.showProductNameGe !== false && singleDish.nameGe)));
  return <section className="app-preview-shell" aria-label="A3 poster preview"><div className="app-canvas-wrap a3-poster-canvas-wrap" style={{ width: `${format.previewWidth}px`, aspectRatio: `${format.width} / ${format.height}` }}><article ref={sceneRef} className="a3-poster-scene a3-template-free" style={{ width: `${format.width}px`, height: `${format.height}px`, transform: `scale(${previewScale})`, background, color: poster.textColor, '--a3-accent': poster.accentColor }}>
    {customBackgroundUrl ? <img className="a3-custom-background" src={customBackgroundUrl} alt="" /> : null}
    {showTopTitle ? <div className="a3-title-row"><div className="a3-title-copy">{poster.showProductNameEn !== false && singleDish.nameEn ? <strong className="a3-title-name a3-title-name-en" style={{ fontSize: `${poster.productNameSize}px`, color: titleEnColor, transform: move(poster.productNameXOffset, poster.productNameYOffset) }}>{singleDish.nameEn}</strong> : null}{poster.showProductNameGe !== false && singleDish.nameGe ? <strong className="a3-title-name a3-title-name-ge" style={{ fontSize: `${poster.productNameGeSize ?? 62}px`, color: titleGeColor, transform: move(poster.productNameGeXOffset, poster.productNameGeYOffset) }}>{singleDish.nameGe}</strong> : null}</div></div> : null}
    <div className="a3-products a3-products-free">{selectedDishes.map((dish, index) => <FreeProductCard key={dish.id} dish={dish} poster={poster} index={index} count={count} sceneRef={sceneRef} onUpdateProductTransform={onUpdateProductTransform} onSelectProduct={onSelectProduct} />)}</div>
    {poster.showOffer && poster.offerText ? <div className="a3-offer-badge a3-offer-badge-bottom-left" style={{ transform: move(poster.offerXOffset, poster.offerYOffset), background: poster.accentColor, color: poster.offerTextColor ?? '#fff', fontSize: `${poster.offerSize}px` }}>{poster.offerText}</div> : null}
    <DrawingOverlay poster={poster} format={format} onCommitStroke={onCommitStroke} onEraseStrokes={onEraseStrokes} />
  </article></div><small className="app-preview-size">A3 output: {format.width} × {format.height}px at 300 DPI ratio</small></section>;
}
