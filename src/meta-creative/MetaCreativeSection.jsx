import html2canvas from 'html2canvas';
import { useEffect, useMemo, useState } from 'react';
import { extractGoogleDriveFileId } from '../utils/imageUrls.js';
import { A3CatalogueAccordion } from '../a3-poster/A3CatalogueAccordion.jsx';
import '../a3-poster/a3Poster.css';
import { MetaCreativeControls } from './MetaCreativeControls.jsx';
import { MetaCreativePreview } from './MetaCreativePreview.jsx';
import { buildDefaultMetaProductTransforms, createMetaCreative, getDefaultMetaProductTransform, getMetaFormat, loadMetaCreativeProject, META_FORMATS, saveMetaCreativeProject } from './metaCreativeStorage.js';
import './metaCreative.css';

const safeName = (value) => String(value || 'meta-creative').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'meta-creative';
const downloadUrl = (url, filename) => { const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); };
const blobToDataUrl = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(reader.error || new Error('Could not read image data.')); reader.readAsDataURL(blob); });
const getCanvasSafeImageUrl = (value = '') => { const source = String(value || '').trim(); if (!source || source.startsWith('data:') || source.startsWith('blob:')) return source; const driveId = extractGoogleDriveFileId(source); return driveId ? `/api/drive-media?id=${encodeURIComponent(driveId)}&type=image` : source; };
const fetchImageBlob = async (source) => { const response = await fetch(getCanvasSafeImageUrl(source), { credentials: 'same-origin', cache: 'reload' }); if (!response.ok) throw new Error(`Could not load creative image: HTTP ${response.status}`); const blob = await response.blob(); if (!blob.size) throw new Error('Creative image is empty.'); return blob; };

const embedImages = async (clone) => {
  clone.querySelectorAll('.meta-editor-only').forEach((node) => node.remove());
  clone.querySelectorAll('.meta-product-card').forEach((node) => node.classList.remove('selected'));
  const images = Array.from(clone.querySelectorAll('img'));
  await Promise.all(images.map(async (image) => {
    const source = image.getAttribute('src') || image.currentSrc || '';
    if (!source || source.startsWith('data:')) return;
    const blob = await fetchImageBlob(source);
    image.removeAttribute('crossorigin');
    image.src = await blobToDataUrl(blob);
    if (typeof image.decode === 'function') await image.decode().catch(() => undefined);
  }));
};

async function exportCreative(creative, mimeType, extension) {
  const format = getMetaFormat(creative.formatId);
  const scene = document.querySelector('.meta-creative-scene');
  if (!scene) throw new Error('Creative preview is not ready.');
  if (document.fonts?.ready) await document.fonts.ready;
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed'; wrapper.style.left = '0'; wrapper.style.top = '0'; wrapper.style.width = `${format.width}px`; wrapper.style.height = `${format.height}px`; wrapper.style.zIndex = '-9999'; wrapper.style.pointerEvents = 'none'; wrapper.style.overflow = 'hidden';
  const clone = scene.cloneNode(true);
  clone.style.position = 'relative'; clone.style.left = '0'; clone.style.top = '0'; clone.style.transform = 'none'; clone.style.width = `${format.width}px`; clone.style.height = `${format.height}px`;
  wrapper.appendChild(clone); document.body.appendChild(wrapper);
  try {
    await embedImages(clone);
    const canvas = await html2canvas(clone, { backgroundColor: null, width: format.width, height: format.height, windowWidth: format.width, windowHeight: format.height, scrollX: 0, scrollY: 0, scale: 1, useCORS: false, allowTaint: false, logging: false });
    if (canvas.width !== format.width || canvas.height !== format.height) throw new Error(`Export size mismatch: ${canvas.width}x${canvas.height}.`);
    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not create image file.')), mimeType, .96));
    const url = URL.createObjectURL(blob); downloadUrl(url, `${safeName(creative.name)}-${format.label.replace(':','x')}.${extension}`); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally { wrapper.remove(); }
}

export function MetaCreativeSection({ project }) {
  const categories = useMemo(() => project.categories ?? [], [project.categories]);
  const dishes = useMemo(() => (project.dishes ?? []).filter((dish) => dish.visible !== false && dish.imageUrl), [project.dishes]);
  const [metaProject, setMetaProject] = useState(() => loadMetaCreativeProject(dishes));
  const [exportStatus, setExportStatus] = useState('');
  const selectedCreative = metaProject.creatives.find((creative) => creative.id === metaProject.selectedCreativeId) ?? metaProject.creatives[0];
  useEffect(() => saveMetaCreativeProject(metaProject), [metaProject]);

  const updateProject = (updater) => setMetaProject((current) => updater(current));
  const updateCreative = (changes) => updateProject((current) => ({ ...current, creatives: current.creatives.map((creative) => creative.id === current.selectedCreativeId ? { ...creative, ...changes } : creative) }));
  const addCreative = () => { const creative = createMetaCreative(dishes, `Meta Creative ${metaProject.creatives.length + 1}`); updateProject((current) => ({ ...current, creatives: [...current.creatives, creative], selectedCreativeId: creative.id })); };
  const duplicateCreative = () => { const creative = { ...selectedCreative, id: `meta_${Math.random().toString(36).slice(2, 10)}`, name: `${selectedCreative.name} copy`, selectedDishIds: [...selectedCreative.selectedDishIds], productTransforms: JSON.parse(JSON.stringify(selectedCreative.productTransforms || {})) }; updateProject((current) => ({ ...current, creatives: [...current.creatives, creative], selectedCreativeId: creative.id })); };
  const deleteCreative = () => updateProject((current) => { if (current.creatives.length <= 1) return current; const creatives = current.creatives.filter((creative) => creative.id !== current.selectedCreativeId); return { ...current, creatives, selectedCreativeId: creatives[0].id }; });

  const handleProductCount = (productCount) => {
    const ids = selectedCreative.selectedDishIds.slice(0, productCount);
    const transforms = { ...(selectedCreative.productTransforms || {}) };
    ids.forEach((id, index) => { if (!transforms[id]) transforms[id] = getDefaultMetaProductTransform(productCount, index); });
    updateCreative({ productCount, selectedDishIds: ids, productTransforms: transforms, selectedProductId: ids.includes(selectedCreative.selectedProductId) ? selectedCreative.selectedProductId : (ids[0] || '') });
  };
  const toggleDish = (dishId) => {
    const selected = selectedCreative.selectedDishIds.includes(dishId);
    if (selected) { const next = selectedCreative.selectedDishIds.filter((id) => id !== dishId); updateCreative({ selectedDishIds: next, selectedProductId: selectedCreative.selectedProductId === dishId ? (next[0] || '') : selectedCreative.selectedProductId }); return; }
    if (selectedCreative.selectedDishIds.length >= selectedCreative.productCount) return;
    const next = [...selectedCreative.selectedDishIds, dishId].slice(0, 5);
    const transforms = { ...(selectedCreative.productTransforms || {}) };
    if (!transforms[dishId]) transforms[dishId] = getDefaultMetaProductTransform(selectedCreative.productCount, next.length - 1);
    updateCreative({ selectedDishIds: next, productTransforms: transforms, selectedProductId: dishId });
  };
  const updateProductTransform = (dishId, changes) => updateCreative({ productTransforms: { ...(selectedCreative.productTransforms || {}), [dishId]: { ...(selectedCreative.productTransforms?.[dishId] || getDefaultMetaProductTransform(selectedCreative.productCount, 0)), ...changes } }, selectedProductId: dishId });
  const selectProduct = (dishId) => { const maxZ = Math.max(2, ...Object.values(selectedCreative.productTransforms || {}).map((value) => Number(value?.z) || 2)); updateProductTransform(dishId, { z: maxZ + 1 }); };
  const autoArrange = () => updateCreative({ productTransforms: buildDefaultMetaProductTransforms(selectedCreative.selectedDishIds) });
  const handleExport = async (mimeType, extension) => { try { setExportStatus(`Preparing ${extension.toUpperCase()}...`); await exportCreative(selectedCreative, mimeType, extension); setExportStatus(`${extension.toUpperCase()} downloaded.`); } catch (error) { console.error(error); setExportStatus(error?.message || 'Export failed.'); } };

  if (!selectedCreative) return null;
  return <section className="app-page meta-creative-page">
    <aside className="app-side-panel meta-creative-side-panel">
      <header className="app-panel-header"><p>Advertising</p><h2>Meta Creatives</h2><span>Create Meta ad creatives in exact 1:1, 4:5 and 9:16 formats.</span></header>
      <section className="app-control-group"><div className="panel-title-row"><h3>Creatives</h3><button type="button" className="primary-action compact" onClick={addCreative}>＋ Add</button></div><div className="a3-poster-list">{metaProject.creatives.map((creative) => <button key={creative.id} type="button" className={creative.id === selectedCreative.id ? 'selected' : ''} onClick={() => updateProject((current) => ({ ...current, selectedCreativeId: creative.id }))}><strong>{creative.name}</strong><small>{getMetaFormat(creative.formatId).label}</small></button>)}</div><div className="action-row"><button type="button" onClick={duplicateCreative}>Duplicate</button><button type="button" className="danger" onClick={deleteCreative}>Delete</button></div></section>
      <section className="app-control-group"><h3>Format</h3><div className="meta-format-row">{META_FORMATS.map((format) => <button key={format.id} type="button" className={selectedCreative.formatId === format.id ? 'active' : ''} onClick={() => updateCreative({ formatId: format.id })}>{format.label}<br/><small>{format.width}×{format.height}</small></button>)}</div></section>
      <section className="app-control-group"><div className="panel-title-row"><h3>Products</h3><button type="button" onClick={autoArrange}>Auto arrange</button></div><div className="meta-product-count-row">{[1,2,3,4,5].map((count) => <button key={count} type="button" className={selectedCreative.productCount === count ? 'active' : ''} onClick={() => handleProductCount(count)}>{count}</button>)}</div><small>Choose products below. Drag each product directly on the creative; use the blue handle to resize it.</small></section>
      <section className="app-control-group"><h3>Catalogue</h3><small>{selectedCreative.selectedDishIds.length}/{selectedCreative.productCount} selected</small><A3CatalogueAccordion categories={categories} dishes={dishes} selectedDishIds={selectedCreative.selectedDishIds} onToggleDish={toggleDish} /></section>
      <MetaCreativeControls creative={selectedCreative} updateCreative={updateCreative} />
      <section className="app-control-group"><h3>Download</h3><div className="meta-export-row"><button type="button" onClick={() => handleExport('image/png', 'png')}>PNG</button><button type="button" onClick={() => handleExport('image/jpeg', 'jpg')}>JPG</button></div>{exportStatus ? <small className="app-preview-size">{exportStatus}</small> : null}</section>
    </aside>
    <main className="app-preview-stage meta-creative-preview-stage"><div className="app-toolbar"><div><p>Preview</p><h2>{selectedCreative.name}</h2></div><div className="app-pill">{getMetaFormat(selectedCreative.formatId).label}</div></div><MetaCreativePreview creative={selectedCreative} dishes={dishes} onUpdateProductTransform={updateProductTransform} onSelectProduct={selectProduct} /></main>
  </section>;
}
