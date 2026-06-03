import { useEffect, useMemo, useState } from 'react';
import { ImageMenuPreview } from './ImageMenuPreview.jsx';
import { createImageMenuPage, loadImageMenuProject, saveImageMenuProject } from './imageMenuStorage.js';

const FONT_OPTIONS = [
  'Inter, Arial, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  'Noto Serif Georgian, Noto Serif, serif',
  'Times New Roman, serif',
];

const clampSelected = (ids, gridVariant) => ids.slice(0, Number(gridVariant));

function RangeControl({ label, value, min, max, step = 1, onChange, suffix = '' }) {
  return (
    <label className="image-menu-control">
      <span>{label}<strong>{value}{suffix}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function FontSelect({ label, value, onChange }) {
  return (
    <label className="field-label image-menu-field">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font.split(',')[0]}</option>)}
      </select>
    </label>
  );
}

export function ImageMenuSection({ project }) {
  const dishes = useMemo(() => project.dishes.filter((dish) => dish.visible !== false), [project.dishes]);
  const [imageProject, setImageProject] = useState(() => loadImageMenuProject(dishes));
  const selectedPage = imageProject.pages.find((page) => page.id === imageProject.selectedPageId) ?? imageProject.pages[0];

  useEffect(() => {
    setImageProject((current) => loadImageMenuProject(dishes.length ? dishes : project.dishes));
  }, [project.dishes]);

  useEffect(() => {
    saveImageMenuProject(imageProject);
  }, [imageProject]);

  const updateImageProject = (updater) => setImageProject((current) => updater(current));
  const updateSelectedPage = (updater) => updateImageProject((current) => ({
    ...current,
    pages: current.pages.map((page) => page.id === current.selectedPageId ? updater(page) : page),
  }));
  const updateSettings = (changes) => updateSelectedPage((page) => ({ ...page, settings: { ...page.settings, ...changes } }));

  const addPage = () => {
    const page = createImageMenuPage(dishes, `Image Page ${imageProject.pages.length + 1}`);
    updateImageProject((current) => ({ ...current, pages: [...current.pages, page], selectedPageId: page.id }));
  };

  const duplicatePage = () => {
    const page = { ...selectedPage, id: `imagePage_${Math.random().toString(36).slice(2, 10)}`, name: `${selectedPage.name} copy` };
    updateImageProject((current) => ({ ...current, pages: [...current.pages, page], selectedPageId: page.id }));
  };

  const deletePage = () => updateImageProject((current) => {
    if (current.pages.length === 1) return current;
    const pages = current.pages.filter((page) => page.id !== current.selectedPageId);
    return { ...current, pages, selectedPageId: pages[0].id };
  });

  const toggleDish = (dishId) => updateSelectedPage((page) => {
    const exists = page.selectedDishIds.includes(dishId);
    const nextIds = exists ? page.selectedDishIds.filter((id) => id !== dishId) : [...page.selectedDishIds, dishId];
    return { ...page, selectedDishIds: clampSelected(nextIds, page.gridVariant) };
  });

  const moveDish = (dishId, direction) => updateSelectedPage((page) => {
    const ids = [...page.selectedDishIds];
    const index = ids.indexOf(dishId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return page;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    return { ...page, selectedDishIds: ids };
  });

  if (!selectedPage) return null;

  return (
    <section className="image-menu-section">
      <aside className="image-menu-panel">
        <div className="panel-title-row">
          <div><p className="eyebrow">Image Menu</p><h1>Pages</h1></div>
          <button type="button" className="primary-action compact" onClick={addPage}>Add Page</button>
        </div>

        <div className="image-menu-page-list">
          {imageProject.pages.map((page) => (
            <button key={page.id} type="button" className={page.id === selectedPage.id ? 'selected' : ''} onClick={() => updateImageProject((current) => ({ ...current, selectedPageId: page.id }))}>
              <strong>{page.name}</strong><small>{page.gridVariant} items</small>
            </button>
          ))}
        </div>

        <div className="action-row image-menu-page-actions">
          <button type="button" onClick={duplicatePage}>Duplicate</button>
          <button type="button" className="danger" onClick={deletePage}>Delete</button>
        </div>

        <div className="panel-section">
          <h2>Grid</h2>
          <div className="image-menu-grid-buttons">
            {[2, 4, 6].map((variant) => (
              <button key={variant} type="button" className={selectedPage.gridVariant === variant ? 'active' : ''} onClick={() => updateSelectedPage((page) => ({ ...page, gridVariant: variant, selectedDishIds: clampSelected(page.selectedDishIds, variant) }))}>{variant} dishes</button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h2>Select dishes</h2>
          <div className="image-menu-dish-picker">
            {dishes.map((dish) => {
              const selected = selectedPage.selectedDishIds.includes(dish.id);
              return (
                <div key={dish.id} className={selected ? 'selected' : ''}>
                  <label><input type="checkbox" checked={selected} disabled={!selected && selectedPage.selectedDishIds.length >= selectedPage.gridVariant} onChange={() => toggleDish(dish.id)} />{dish.imageUrl ? <img src={dish.imageUrl} alt="" /> : <span className="image-menu-mini-placeholder" />}<span><strong>{dish.nameEn}</strong><small>{dish.nameGe}</small></span></label>
                  {selected ? <div className="image-menu-order"><button type="button" onClick={() => moveDish(dish.id, -1)}>↑</button><button type="button" onClick={() => moveDish(dish.id, 1)}>↓</button></div> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel-section">
          <h2>Image</h2>
          <RangeControl label="Image size" value={selectedPage.settings.imageSize} min={20} max={120} onChange={(imageSize) => updateSettings({ imageSize })} suffix="%" />
          <RangeControl label="Image X position" value={selectedPage.settings.imageX} min={-50} max={50} onChange={(imageX) => updateSettings({ imageX })} />
          <RangeControl label="Image Y position" value={selectedPage.settings.imageY} min={-50} max={50} onChange={(imageY) => updateSettings({ imageY })} />
        </div>

        <div className="panel-section">
          <h2>Text</h2>
          <label className="category-checkbox"><input type="checkbox" checked={selectedPage.settings.showDescriptions} onChange={(event) => updateSettings({ showDescriptions: event.target.checked })} /><span><strong>Show descriptions</strong><small>EN and GE</small></span></label>
          <RangeControl label="EN title size" value={selectedPage.settings.enTitleSize} min={12} max={72} onChange={(enTitleSize) => updateSettings({ enTitleSize })} />
          <RangeControl label="GE title size" value={selectedPage.settings.geTitleSize} min={12} max={72} onChange={(geTitleSize) => updateSettings({ geTitleSize })} />
          <RangeControl label="Description size" value={selectedPage.settings.descriptionSize} min={8} max={30} onChange={(descriptionSize) => updateSettings({ descriptionSize })} />
          <RangeControl label="EN/GE title gap" value={selectedPage.settings.titleLanguageGap} min={0} max={48} onChange={(titleLanguageGap) => updateSettings({ titleLanguageGap })} />
          <RangeControl label="Title/description gap" value={selectedPage.settings.titleDescriptionGap} min={0} max={64} onChange={(titleDescriptionGap) => updateSettings({ titleDescriptionGap })} />
          <RangeControl label="Text bottom offset" value={selectedPage.settings.textBottomOffset} min={0} max={150} onChange={(textBottomOffset) => updateSettings({ textBottomOffset })} />
          <FontSelect label="EN title font" value={selectedPage.settings.enTitleFont} onChange={(enTitleFont) => updateSettings({ enTitleFont })} />
          <FontSelect label="GE title font" value={selectedPage.settings.geTitleFont} onChange={(geTitleFont) => updateSettings({ geTitleFont })} />
          <FontSelect label="Description font" value={selectedPage.settings.descriptionFont} onChange={(descriptionFont) => updateSettings({ descriptionFont })} />
          <label className="field-label image-menu-field">Text color<input type="color" value={selectedPage.settings.textColor} onChange={(event) => updateSettings({ textColor: event.target.value })} /></label>
          <label className="field-label image-menu-field">Description color<input type="color" value={selectedPage.settings.descriptionColor} onChange={(event) => updateSettings({ descriptionColor: event.target.value })} /></label>
        </div>

        <div className="panel-section">
          <h2>Background</h2>
          <label className="field-label image-menu-field">Mode<select value={selectedPage.settings.backgroundMode} onChange={(event) => updateSettings({ backgroundMode: event.target.value })}><option value="auto">Auto color from image / dish</option><option value="manual">Manual background color</option><option value="blurred">Blurred image background</option></select></label>
          <label className="field-label image-menu-field">Manual color<input type="color" value={selectedPage.settings.manualBackgroundColor} onChange={(event) => updateSettings({ manualBackgroundColor: event.target.value })} /></label>
        </div>
      </aside>

      <div className="image-menu-preview-stage">
        <div className="preview-toolbar image-menu-toolbar"><div><p className="eyebrow">A4 Landscape</p><h1>{selectedPage.name}</h1></div><div><button className="primary-action compact" type="button" onClick={() => window.print()}>Print Image Menu</button><button className="secondary-action compact" type="button" onClick={() => alert('PNG export can be blocked by external image CORS. Use print/PDF if the image host does not allow canvas export.')}>Export PNG</button></div></div>
        <ImageMenuPreview page={selectedPage} dishes={dishes} />
      </div>
    </section>
  );
}
