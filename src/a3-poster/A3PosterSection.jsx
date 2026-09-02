import html2canvas from 'html2canvas';
import { useEffect, useMemo, useState } from 'react';
import { extractGoogleDriveFileId } from '../utils/imageUrls.js';
import { A3CatalogueAccordion } from './A3CatalogueAccordion.jsx';
import { A3PosterControls } from './A3PosterControls.jsx';
import { A3PosterPreview } from './A3PosterPreview.jsx';
import { buildDefaultA3ElementTransforms, getA3ElementKey } from './a3IndependentLayers.js';
import { buildDefaultA3ProductTransforms, getDefaultA3ProductTransform, MAX_A3_PRODUCTS } from './a3ProductLayout.js';
import { A3_FORMATS, createA3Poster, getA3Format, loadA3PosterProject, saveA3PosterProject } from './a3PosterStorage.js';
import './a3Poster.css';
import './a3PosterLayerOrder.css';

const safeName = (value) => String(value || 'a3-poster').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'a3-poster';
const downloadUrl = (url, filename) => { const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); };
const blobToDataUrl = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(reader.error || new Error('Could not read image data.')); reader.readAsDataURL(blob); });
const getCanvasSafeImageUrl = (value = '') => { const source = String(value || '').trim(); if (!source || source.startsWith('data:') || source.startsWith('blob:')) return source; const driveId = extractGoogleDriveFileId(source); return driveId ? `/api/drive-media?id=${encodeURIComponent(driveId)}&type=image` : source; };
const fetchPosterBlob = async (source) => { const response = await fetch(getCanvasSafeImageUrl(source), { credentials: 'same-origin', cache: 'reload', headers: { Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' } }); if (!response.ok) throw new Error(`Could not load poster image: HTTP ${response.status}`); const blob = await response.blob(); if (!blob.size) throw new Error('Poster image is empty.'); return blob; };
const getTransformScale = (transform = '') => { const match = String(transform).match(/scale\(([-\d.]+)\)/); const value = match ? Number(match[1]) : 1; return Number.isFinite(value) && value > 0 ? value : 1; };

const rasterizeProductImage = async (image) => {
  const source = image.getAttribute('src') || image.currentSrc || '';
  if (!source) return;
  const blob = source.startsWith('data:') ? await fetch(source).then((response) => response.blob()) : await fetchPosterBlob(source);
  const bitmap = await createImageBitmap(blob);
  try {
    const styles = getComputedStyle(image);
    const boxWidth = Math.max(1, Math.round(image.offsetWidth || image.clientWidth || image.getBoundingClientRect().width));
    const boxHeight = Math.max(1, Math.round(image.offsetHeight || image.clientHeight || image.getBoundingClientRect().height));
    const visualScale = Math.max(1, getTransformScale(styles.transform === 'none' ? image.style.transform : styles.transform));
    const backingScale = Math.min(2.5, visualScale);
    const backingWidth = Math.max(boxWidth, Math.round(boxWidth * backingScale));
    const backingHeight = Math.max(boxHeight, Math.round(boxHeight * backingScale));
    const canvas = document.createElement('canvas');
    canvas.width = backingWidth; canvas.height = backingHeight; canvas.className = image.className; canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = image.style.cssText; canvas.style.width = `${boxWidth}px`; canvas.style.height = `${boxHeight}px`; canvas.style.objectFit = ''; canvas.style.display = styles.display;
    const scale = Math.min(backingWidth / bitmap.width, backingHeight / bitmap.height);
    const drawWidth = bitmap.width * scale; const drawHeight = bitmap.height * scale; const drawX = (backingWidth - drawWidth) / 2; const drawY = (backingHeight - drawHeight) / 2;
    const context = canvas.getContext('2d'); context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'; context.clearRect(0, 0, backingWidth, backingHeight); context.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);
    image.replaceWith(canvas);
  } finally { bitmap.close?.(); }
};

const embedImages = async (clone) => {
  clone.querySelectorAll('.a3-editor-only').forEach((node) => node.remove());
  clone.querySelectorAll('.a3-free-element').forEach((node) => node.classList.remove('selected'));
  const productImages = Array.from(clone.querySelectorAll('img.a3-product-image'));
  await Promise.all(productImages.map(rasterizeProductImage));
  const images = Array.from(clone.querySelectorAll('img'));
  await Promise.all(images.map(async (image) => { const source = image.getAttribute('src') || image.currentSrc || ''; if (!source || source.startsWith('data:')) return; const blob = await fetchPosterBlob(source); image.removeAttribute('crossorigin'); image.src = await blobToDataUrl(blob); if (typeof image.decode === 'function') await image.decode().catch(() => undefined); }));
};

async function exportPoster(poster, mimeType, extension) {
  const format = getA3Format(poster.formatId);
  const scene = document.querySelector('.a3-poster-scene');
  if (!scene) throw new Error('Poster preview is not ready.');
  if (document.fonts?.ready) await document.fonts.ready;
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed'; wrapper.style.left = '0'; wrapper.style.top = '0'; wrapper.style.width = `${format.width}px`; wrapper.style.height = `${format.height}px`; wrapper.style.zIndex = '-9999'; wrapper.style.pointerEvents = 'none'; wrapper.style.overflow = 'hidden';
  const clone = scene.cloneNode(true);
  clone.style.position = 'relative'; clone.style.left = '0'; clone.style.top = '0'; clone.style.transform = 'none'; clone.style.width = `${format.width}px`; clone.style.height = `${format.height}px`;
  const drawingOverlay = clone.querySelector('.a3-drawing-overlay'); if (drawingOverlay) drawingOverlay.classList.remove('enabled');
  wrapper.appendChild(clone); document.body.appendChild(wrapper);
  try {
    await embedImages(clone);
    const canvas = await html2canvas(clone, { backgroundColor: null, width: format.width, height: format.height, windowWidth: format.width, windowHeight: format.height, scrollX: 0, scrollY: 0, scale: 1, useCORS: false, allowTaint: false, logging: false });
    if (canvas.width !== format.width || canvas.height !== format.height) throw new Error(`Export size mismatch: ${canvas.width}x${canvas.height}.`);
    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not create image file.')), mimeType, 0.95));
    const url = URL.createObjectURL(blob); downloadUrl(url, `${safeName(poster.name)}-${format.id}.${extension}`); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally { wrapper.remove(); }
}

export function A3PosterSection({ project }) {
  const categories = useMemo(() => project.categories ?? [], [project.categories]);
  const dishes = useMemo(() => (project.dishes ?? []).filter((dish) => dish.visible !== false && dish.imageUrl), [project.dishes]);
  const [a3Project, setA3Project] = useState(() => loadA3PosterProject(dishes));
  const [exportStatus, setExportStatus] = useState('');
  const [drawingHistory, setDrawingHistory] = useState({});
  const selectedPoster = a3Project.posters.find((poster) => poster.id === a3Project.selectedPosterId) ?? a3Project.posters[0];

  useEffect(() => saveA3PosterProject(a3Project), [a3Project]);
  const updateProject = (updater) => setA3Project((current) => updater(current));
  const updatePoster = (changes) => updateProject((current) => ({ ...current, posters: current.posters.map((poster) => poster.id === current.selectedPosterId ? { ...poster, ...changes } : poster) }));
  const updateDrawingStrokes = (nextStrokes, recordHistory = true) => { if (!selectedPoster) return; const previous = selectedPoster.drawingStrokes ?? []; if (recordHistory) setDrawingHistory((current) => ({ ...current, [selectedPoster.id]: { undo: [...(current[selectedPoster.id]?.undo ?? []), previous].slice(-60), redo: [] } })); updatePoster({ drawingStrokes: nextStrokes }); };
  const commitStroke = (stroke) => updateDrawingStrokes([...(selectedPoster.drawingStrokes ?? []), stroke]);
  const eraseStrokes = (ids) => { const idSet = new Set(ids); const next = (selectedPoster.drawingStrokes ?? []).filter((stroke) => !idSet.has(stroke.id)); if (next.length !== (selectedPoster.drawingStrokes ?? []).length) updateDrawingStrokes(next); };
  const undoDrawing = () => { const entry = drawingHistory[selectedPoster.id]; if (!entry?.undo?.length) return; const previous = entry.undo[entry.undo.length - 1]; const currentStrokes = selectedPoster.drawingStrokes ?? []; setDrawingHistory((current) => ({ ...current, [selectedPoster.id]: { undo: entry.undo.slice(0, -1), redo: [currentStrokes, ...(entry.redo ?? [])].slice(0, 60) } })); updateDrawingStrokes(previous, false); };
  const redoDrawing = () => { const entry = drawingHistory[selectedPoster.id]; if (!entry?.redo?.length) return; const next = entry.redo[0]; const currentStrokes = selectedPoster.drawingStrokes ?? []; setDrawingHistory((current) => ({ ...current, [selectedPoster.id]: { undo: [...(entry.undo ?? []), currentStrokes].slice(-60), redo: entry.redo.slice(1) } })); updateDrawingStrokes(next, false); };
  const clearDrawing = () => { if ((selectedPoster.drawingStrokes ?? []).length) updateDrawingStrokes([]); };

  const addPoster = () => { const poster = createA3Poster(dishes, `A3 Poster ${a3Project.posters.length + 1}`); updateProject((current) => ({ ...current, posters: [...current.posters, poster], selectedPosterId: poster.id })); };
  const duplicatePoster = () => { const poster = { ...selectedPoster, id: `a3_${Math.random().toString(36).slice(2, 10)}`, name: `${selectedPoster.name} copy`, selectedDishIds: [...selectedPoster.selectedDishIds], productTransforms: JSON.parse(JSON.stringify(selectedPoster.productTransforms || {})), elementTransforms: JSON.parse(JSON.stringify(selectedPoster.elementTransforms || {})), offerTransform: { ...(selectedPoster.offerTransform || {}) }, drawingStrokes: (selectedPoster.drawingStrokes ?? []).map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point })) })) }; updateProject((current) => ({ ...current, posters: [...current.posters, poster], selectedPosterId: poster.id })); };
  const deletePoster = () => updateProject((current) => { if (current.posters.length <= 1) return current; const posters = current.posters.filter((poster) => poster.id !== current.selectedPosterId); return { ...current, posters, selectedPosterId: posters[0].id }; });

  const mergeElementDefaults = (ids, existing = {}) => ({ ...buildDefaultA3ElementTransforms(ids, getDefaultA3ProductTransform), ...existing });
  const handleProductCount = (productCount) => {
    const nextIds = selectedPoster.selectedDishIds.slice(0, productCount);
    updatePoster({ productCount, selectedDishIds: nextIds, elementTransforms: mergeElementDefaults(nextIds, selectedPoster.elementTransforms), selectedElementKey: nextIds.some((id) => selectedPoster.selectedElementKey?.startsWith(`${id}:`)) ? selectedPoster.selectedElementKey : (nextIds[0] ? getA3ElementKey(nextIds[0], 'image') : '') });
  };

  const toggleDish = (dishId) => {
    const selected = selectedPoster.selectedDishIds.includes(dishId);
    if (selected) { const next = selectedPoster.selectedDishIds.filter((id) => id !== dishId); updatePoster({ selectedDishIds: next, selectedElementKey: selectedPoster.selectedElementKey?.startsWith(`${dishId}:`) ? (next[0] ? getA3ElementKey(next[0], 'image') : '') : selectedPoster.selectedElementKey }); return; }
    if (selectedPoster.selectedDishIds.length >= selectedPoster.productCount) return;
    const next = [...selectedPoster.selectedDishIds, dishId].slice(0, MAX_A3_PRODUCTS);
    updatePoster({ selectedDishIds: next, elementTransforms: mergeElementDefaults(next, selectedPoster.elementTransforms), selectedElementKey: getA3ElementKey(dishId, 'image') });
  };

  const updateElementTransform = (elementId, changes) => updatePoster({ elementTransforms: { ...(selectedPoster.elementTransforms || {}), [elementId]: { ...(selectedPoster.elementTransforms?.[elementId] || { x: .5, y: .5, scale: 1, z: 10 }), ...changes } }, selectedElementKey: elementId });
  const selectElement = (elementId) => {
    const values = [...Object.values(selectedPoster.elementTransforms || {}), selectedPoster.offerTransform || {}];
    const maxZ = Math.max(10, ...values.map((value) => Number(value?.z) || 10));
    if (elementId === 'offer') updatePoster({ selectedElementKey: 'offer', offerTransform: { ...(selectedPoster.offerTransform || { x: .18, y: .88, scale: 1 }), z: maxZ + 1 } });
    else updateElementTransform(elementId, { z: maxZ + 1 });
  };
  const updateOfferTransform = (changes) => updatePoster({ offerTransform: { ...(selectedPoster.offerTransform || { x: .18, y: .88, scale: 1, z: 70 }), ...changes }, selectedElementKey: 'offer' });
  const autoArrangeProducts = () => updatePoster({ elementTransforms: buildDefaultA3ElementTransforms(selectedPoster.selectedDishIds, getDefaultA3ProductTransform), selectedElementKey: selectedPoster.selectedDishIds[0] ? getA3ElementKey(selectedPoster.selectedDishIds[0], 'image') : '' });

  const handleExport = async (mimeType, extension) => { try { setExportStatus(`Preparing ${extension.toUpperCase()}...`); await exportPoster(selectedPoster, mimeType, extension); setExportStatus(`${extension.toUpperCase()} downloaded.`); } catch (error) { console.error(error); setExportStatus(error?.message || 'Export failed.'); } };

  if (!selectedPoster) return null;
  const history = drawingHistory[selectedPoster.id] ?? { undo: [], redo: [] };
  return <section className="app-page a3-poster-page">
    <aside className="app-side-panel a3-poster-side-panel">
      <header className="app-panel-header"><p>Print image</p><h2>A3 Poster</h2><span>Create printable A3 images from the same product catalogue used across the app.</span></header>
      <section className="app-control-group"><div className="panel-title-row"><h3>Posters</h3><button type="button" className="primary-action compact" onClick={addPoster}>＋ Add</button></div><div className="a3-poster-list">{a3Project.posters.map((poster) => <button key={poster.id} type="button" className={poster.id === selectedPoster.id ? 'selected' : ''} onClick={() => updateProject((current) => ({ ...current, selectedPosterId: poster.id }))}><strong>{poster.name}</strong><small>{getA3Format(poster.formatId).label}</small></button>)}</div><div className="action-row"><button type="button" onClick={duplicatePoster}>Duplicate</button><button type="button" className="danger" onClick={deletePoster}>Delete</button></div></section>
      <section className="app-control-group"><h3>Format</h3><div className="a3-poster-format-row">{A3_FORMATS.map((format) => <button key={format.id} type="button" className={selectedPoster.formatId === format.id ? 'active' : ''} onClick={() => updatePoster({ formatId: format.id })}>{format.label}</button>)}</div></section>
      <section className="app-control-group"><div className="panel-title-row"><h3>Products</h3><button type="button" onClick={autoArrangeProducts}>Auto arrange</button></div><div className="a3-template-row">{[1,2,3,4,5].map((count) => <button key={count} type="button" className={selectedPoster.productCount === count ? 'active' : ''} onClick={() => handleProductCount(count)}>{count}</button>)}</div><A3CatalogueAccordion categories={categories} dishes={dishes} selectedIds={selectedPoster.selectedDishIds} maxSelected={selectedPoster.productCount} onToggle={toggleDish} /></section>
      <A3PosterControls poster={selectedPoster} selectedDishes={selectedPoster.selectedDishIds.map((id) => dishes.find((dish) => dish.id === id)).filter(Boolean)} onChange={updatePoster} onUpdateElement={updateElementTransform} onUpdateOffer={updateOfferTransform} onUndoDrawing={undoDrawing} onRedoDrawing={redoDrawing} onClearDrawing={clearDrawing} canUndoDrawing={Boolean(history.undo.length)} canRedoDrawing={Boolean(history.redo.length)} />
      <section className="app-control-group"><h3>Download</h3><div className="a3-export-row"><button type="button" onClick={() => handleExport('image/png','png')}>PNG</button><button type="button" onClick={() => handleExport('image/jpeg','jpg')}>JPG</button></div>{exportStatus ? <small>{exportStatus}</small> : null}</section>
    </aside>
    <main className="app-preview-stage a3-poster-preview-stage"><A3PosterPreview poster={selectedPoster} dishes={dishes} onCommitStroke={commitStroke} onEraseStrokes={eraseStrokes} onUpdateElementTransform={updateElementTransform} onSelectElement={selectElement} onUpdateOfferTransform={updateOfferTransform} /></main>
  </section>;
}
