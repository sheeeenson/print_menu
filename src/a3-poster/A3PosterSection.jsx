import html2canvas from 'html2canvas';
import { useEffect, useMemo, useState } from 'react';
import { extractGoogleDriveFileId, normalizeGoogleDriveImageUrl } from '../utils/imageUrls.js';
import { A3PosterControls } from './A3PosterControls.jsx';
import { A3PosterPreview } from './A3PosterPreview.jsx';
import { A3_FORMATS, createA3Poster, getA3Format, loadA3PosterProject, saveA3PosterProject } from './a3PosterStorage.js';
import './a3Poster.css';

const maxItemsForTemplate = (template) => template === 'four' ? 4 : template === 'two' ? 2 : 1;
const safeName = (value) => String(value || 'a3-poster').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'a3-poster';

const downloadUrl = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Could not read image data.'));
  reader.readAsDataURL(blob);
});

const getCanvasSafeImageUrl = (value = '') => {
  const source = String(value || '').trim();
  if (!source || source.startsWith('data:') || source.startsWith('blob:')) return source;
  const driveId = extractGoogleDriveFileId(source);
  return driveId ? `/api/drive-media?id=${encodeURIComponent(driveId)}&type=image` : source;
};

const embedImages = async (clone) => {
  const images = Array.from(clone.querySelectorAll('img'));
  await Promise.all(images.map(async (image) => {
    const source = image.getAttribute('src') || image.currentSrc || '';
    if (!source || source.startsWith('data:')) return;
    const response = await fetch(getCanvasSafeImageUrl(source), {
      credentials: 'same-origin',
      cache: 'reload',
      headers: { Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' },
    });
    if (!response.ok) throw new Error(`Could not load poster image: HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.size) throw new Error('Poster image is empty.');
    image.removeAttribute('crossorigin');
    image.src = await blobToDataUrl(blob);
    if (typeof image.decode === 'function') await image.decode().catch(() => undefined);
  }));
};

async function exportPoster(poster, mimeType, extension) {
  const format = getA3Format(poster.formatId);
  const scene = document.querySelector('.a3-poster-scene');
  if (!scene) throw new Error('Poster preview is not ready.');
  if (document.fonts?.ready) await document.fonts.ready;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.width = `${format.width}px`;
  wrapper.style.height = `${format.height}px`;
  wrapper.style.zIndex = '-9999';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.overflow = 'hidden';
  const clone = scene.cloneNode(true);
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.transform = 'none';
  clone.style.width = `${format.width}px`;
  clone.style.height = `${format.height}px`;
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await embedImages(clone);
    const canvas = await html2canvas(clone, {
      backgroundColor: null,
      width: format.width,
      height: format.height,
      windowWidth: format.width,
      windowHeight: format.height,
      scrollX: 0,
      scrollY: 0,
      scale: 1,
      useCORS: false,
      allowTaint: false,
      logging: false,
    });
    if (canvas.width !== format.width || canvas.height !== format.height) throw new Error(`Export size mismatch: ${canvas.width}x${canvas.height}.`);
    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not create image file.')), mimeType, 0.95));
    const url = URL.createObjectURL(blob);
    downloadUrl(url, `${safeName(poster.name)}-${format.id}.${extension}`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    wrapper.remove();
  }
}

export function A3PosterSection({ project }) {
  const categories = useMemo(() => project.categories ?? [], [project.categories]);
  const dishes = useMemo(() => (project.dishes ?? []).filter((dish) => dish.visible !== false && dish.imageUrl), [project.dishes]);
  const [a3Project, setA3Project] = useState(() => loadA3PosterProject(dishes));
  const [exportStatus, setExportStatus] = useState('');
  const selectedPoster = a3Project.posters.find((poster) => poster.id === a3Project.selectedPosterId) ?? a3Project.posters[0];

  useEffect(() => saveA3PosterProject(a3Project), [a3Project]);

  const updateProject = (updater) => setA3Project((current) => updater(current));
  const updatePoster = (changes) => updateProject((current) => ({ ...current, posters: current.posters.map((poster) => poster.id === current.selectedPosterId ? { ...poster, ...changes } : poster) }));
  const addPoster = () => {
    const poster = createA3Poster(dishes, `A3 Poster ${a3Project.posters.length + 1}`);
    updateProject((current) => ({ ...current, posters: [...current.posters, poster], selectedPosterId: poster.id }));
  };
  const duplicatePoster = () => {
    const poster = { ...selectedPoster, id: `a3_${Math.random().toString(36).slice(2, 10)}`, name: `${selectedPoster.name} copy`, selectedDishIds: [...selectedPoster.selectedDishIds] };
    updateProject((current) => ({ ...current, posters: [...current.posters, poster], selectedPosterId: poster.id }));
  };
  const deletePoster = () => updateProject((current) => {
    if (current.posters.length <= 1) return current;
    const posters = current.posters.filter((poster) => poster.id !== current.selectedPosterId);
    return { ...current, posters, selectedPosterId: posters[0].id };
  });
  const handleTemplate = (template) => updatePoster({ template, selectedDishIds: selectedPoster.selectedDishIds.slice(0, maxItemsForTemplate(template)) });
  const toggleDish = (dishId) => {
    const selected = selectedPoster.selectedDishIds.includes(dishId);
    const max = maxItemsForTemplate(selectedPoster.template);
    const next = selected ? selectedPoster.selectedDishIds.filter((id) => id !== dishId) : [...selectedPoster.selectedDishIds, dishId].slice(-max);
    updatePoster({ selectedDishIds: next });
  };
  const handleExport = async (mimeType, extension) => {
    try {
      setExportStatus(`Preparing ${extension.toUpperCase()}...`);
      await exportPoster(selectedPoster, mimeType, extension);
      setExportStatus(`${extension.toUpperCase()} downloaded.`);
    } catch (error) {
      console.error(error);
      setExportStatus(error?.message || 'Export failed.');
    }
  };

  if (!selectedPoster) return null;

  return <section className="app-page a3-poster-page">
    <aside className="app-side-panel a3-poster-side-panel">
      <header className="app-panel-header"><p>Print image</p><h2>A3 Poster</h2><span>Create printable A3 images from the same product catalogue used across the app.</span></header>

      <section className="app-control-group">
        <div className="panel-title-row"><h3>Posters</h3><button type="button" className="primary-action compact" onClick={addPoster}>＋ Add</button></div>
        <div className="a3-poster-list">{a3Project.posters.map((poster) => <button key={poster.id} type="button" className={poster.id === selectedPoster.id ? 'selected' : ''} onClick={() => updateProject((current) => ({ ...current, selectedPosterId: poster.id }))}><strong>{poster.name}</strong><small>{getA3Format(poster.formatId).label}</small></button>)}</div>
        <div className="action-row"><button type="button" onClick={duplicatePoster}>Duplicate</button><button type="button" className="danger" onClick={deletePoster}>Delete</button></div>
      </section>

      <section className="app-control-group"><h3>Format</h3><div className="a3-poster-format-row">{A3_FORMATS.map((format) => <button key={format.id} type="button" className={selectedPoster.formatId === format.id ? 'active' : ''} onClick={() => updatePoster({ formatId: format.id })}>{format.label}</button>)}</div></section>

      <section className="app-control-group"><h3>Layout</h3><div className="a3-template-row"><button type="button" className={selectedPoster.template === 'single' ? 'active' : ''} onClick={() => handleTemplate('single')}>1 product</button><button type="button" className={selectedPoster.template === 'two' ? 'active' : ''} onClick={() => handleTemplate('two')}>2 products</button><button type="button" className={selectedPoster.template === 'four' ? 'active' : ''} onClick={() => handleTemplate('four')}>4 products</button></div></section>

      <section className="app-control-group">
        <h3>Catalogue</h3><small>{selectedPoster.selectedDishIds.length}/{maxItemsForTemplate(selectedPoster.template)} selected</small>
        <div className="a3-dish-picker">{categories.map((category) => {
          const categoryDishes = dishes.filter((dish) => dish.categoryId === category.id);
          if (!categoryDishes.length) return null;
          return <div key={category.id}><div className="a3-category-title">{category.nameEn || category.nameGe || 'Category'}</div>{categoryDishes.map((dish) => {
            const selected = selectedPoster.selectedDishIds.includes(dish.id);
            const imageUrl = normalizeGoogleDriveImageUrl(dish.imageUrl);
            return <label key={dish.id} className={selected ? 'selected' : ''}><input type="checkbox" checked={selected} onChange={() => toggleDish(dish.id)} /><img src={imageUrl} alt="" /><span><strong>{dish.nameEn || dish.nameGe}</strong><small>{dish.nameGe}</small></span></label>;
          })}</div>;
        })}</div>
      </section>

      <A3PosterControls poster={selectedPoster} updatePoster={updatePoster} />

      <section className="app-control-group"><h3>Download</h3><div className="a3-export-row"><button type="button" onClick={() => handleExport('image/png', 'png')}>PNG</button><button type="button" onClick={() => handleExport('image/jpeg', 'jpg')}>JPG</button><button type="button" onClick={() => window.print()}>Print / PDF</button></div>{exportStatus ? <small className="app-preview-size">{exportStatus}</small> : null}</section>
    </aside>

    <main className="app-preview-stage a3-poster-preview-stage"><div className="app-toolbar"><div><p>Preview</p><h2>{selectedPoster.name}</h2></div><div className="app-pill">{getA3Format(selectedPoster.formatId).label}</div></div><A3PosterPreview poster={selectedPoster} dishes={dishes} /></main>
  </section>;
}
