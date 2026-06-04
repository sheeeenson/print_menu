import { useEffect, useMemo, useState } from 'react';
import './imageMenu.css';
import './imageMenuPrint.css';
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
  const contentCategories = useMemo(() => project.categories ?? [], [project.categories]);
  const contentDishes = useMemo(() => project.dishes ?? [], [project.dishes]);
  const visibleDishes = useMemo(() => contentDishes.filter((dish) => dish.visible !== false), [contentDishes]);
  const [imageProject, setImageProject] = useState(() => loadImageMenuProject(visibleDishes));
  const [openCategoryIds, setOpenCategoryIds] = useState(() => new Set(contentCategories.map((category) => category.id)));
  const selectedPage = imageProject.pages.find((page) => page.id === imageProject.selectedPageId) ?? imageProject.pages[0];

  const categoryGroups = useMemo(() => contentCategories.map((category) => ({
    category,
    dishes: visibleDishes.filter((dish) => dish.categoryId === category.id),
  })), [contentCategories, visibleDishes]);

  useEffect(() => {
    setImageProject((current) => loadImageMenuProject(visibleDishes.length ? visibleDishes : contentDishes));
  }, [contentDishes, visibleDishes]);

  useEffect(() => {
    saveImageMenuProject(imageProject);
  }, [imageProject]);

  useEffect(() => {
    setOpenCategoryIds((current) => {
      const next = new Set(current);
      contentCategories.forEach((category) => next.add(category.id));
      return next;
    });
  }, [contentCategories]);

  const updateImageProject = (updater) => setImageProject((current) => updater(current));
  const updateSelectedPage = (updater) => updateImageProject((current) => ({
    ...current,
    pages: current.pages.map((page) => page.id === current.selectedPageId ? updater(page) : page),
  }));
  const updateSettings = (changes) => updateSelectedPage((page) => ({ ...page, settings: { ...page.settings, ...changes } }));

  const addPage = () => {
    const page = createImageMenuPage(visibleDishes, `Image Page ${imageProject.pages.length + 1}`);
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

  const toggleCategoryOpen = (categoryId) => {
    setOpenCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const toggleDish = (dishId) => updateSelectedPage((page) => {
    const exists = page.selectedDishIds.includes(dishId);
    const nextIds = exists ? page.selectedDishIds.filter((id) => id !== dishId) : [...page.selectedDishIds, dishId];
    return { ...page, selectedDishIds: clampSelected(nextIds, page.gridVariant) };
  });

  const selectCategoryDishes = (categoryDishes) => updateSelectedPage((page) => {
    const existing = page.selectedDishIds.filter((id) => !categoryDishes.some((dish) => dish.id === id));
    const nextIds = clampSelected([...existing, ...categoryDishes.map((dish) => dish.id)], page.gridVariant);
    return { ...page, selectedDishIds: nextIds };
  });

  const clearCategoryDishes = (categoryDishes) => updateSelectedPage((page) => {
    const categoryIds = new Set(categoryDishes.map((dish) => dish.id));
    return { ...page, selectedDishIds: page.selectedDishIds.filter((id) => !categoryIds.has(id)) };
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
          <button type="button" className="primary-action compact" onClick={addPage}>＋ Add Page</button>
        </div>

        <div className="image-menu-page-list">
          {imageProject.pages.map((page) => (
            <button key={page.id} type="button" className={page.id === selectedPage.id ? 'selected' : ''} onClick={() => updateImageProject((current) => ({ ...current, selectedPageId: page.id }))}>
              <strong>{page.name}</strong><small>{page.gridVariant} items</small>
            </button>
          ))}
        </div>

        <div className="action-row image-menu-page-actions">
          <button type="button" onClick={duplicatePage}>⧉ Duplicate</button>
          <button type="button" className="danger" onClick={deletePage}>🗑 Delete</button>
        </div>

        <div className="panel-section image-menu-select-section">
          <div className="image-menu-section-heading">
            <div>
              <h2>Select dishes</h2>
              <small>{contentCategories.length} content categories</small>
            </div>
            <small>{selectedPage.selectedDishIds.length}/{selectedPage.gridVariant} selected</small>
          </div>
          <div className="image-menu-category-picker">
            {categoryGroups.length === 0 ? <p className="muted-text">No categories in Content yet.</p> : null}
            {categoryGroups.map(({ category, dishes: categoryDishes }) => {
              const isOpen = openCategoryIds.has(category.id);
              const selectedCount = categoryDishes.filter((dish) => selectedPage.selectedDishIds.includes(dish.id)).length;
              return (
                <section key={category.id} className="image-menu-category-group">
                  <button className="image-menu-category-toggle" type="button" onClick={() => toggleCategoryOpen(category.id)} aria-expanded={isOpen}>
                    <span>{isOpen ? '▾' : '▸'}</span>
                    <strong>{category.nameEn || 'Untitled category'}</strong>
                    <small>{selectedCount}/{categoryDishes.length}</small>
                  </button>
                  {isOpen ? (
                    <div className="image-menu-category-body">
                      <div className="image-menu-category-actions">
                        <button type="button" onClick={() => selectCategoryDishes(categoryDishes)} disabled={categoryDishes.length === 0 || (selectedPage.selectedDishIds.length >= selectedPage.gridVariant && selectedCount === 0)}>Select all</button>
                        <button type="button" onClick={() => clearCategoryDishes(categoryDishes)} disabled={selectedCount === 0}>Clear</button>
                      </div>
                      <div className="image-menu-dish-picker">
                        {categoryDishes.length === 0 ? <p className="muted-text">No dishes in this category yet.</p> : null}
                        {categoryDishes.map((dish) => {
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
                  ) : null}
                </section>
              );
            })}
          </div>
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
          <RangeControl label="Price gap" value={selectedPage.settings.priceGap} min={0} max={80} onChange={(priceGap) => updateSettings({ priceGap })} />
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
        <div className="preview-toolbar image-menu-toolbar">
          <div><p className="eyebrow">A4 Landscape</p><h1>{selectedPage.name}</h1></div>
          <div className="image-menu-toolbar-actions">
            <button className="primary-action compact" type="button" onClick={() => window.print()}>🖨 Print Image Menu</button>
            <button className="secondary-action compact" type="button" onClick={() => alert('PNG export can be blocked by external image CORS. Use print/PDF if the image host does not allow canvas export.')}>⇩ Export PNG</button>
          </div>
        </div>
        <ImageMenuPreview page={selectedPage} dishes={visibleDishes} />
      </div>
    </section>
  );
}
