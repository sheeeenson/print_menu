import html2canvas from 'html2canvas';
import { useEffect, useMemo, useState } from 'react';
import { SiteBannerPreview } from './SiteBannerPreview.jsx';
import { getQualityOptimizedPng, PNG_OPTIMIZED_TARGET_BYTES } from './pngOptimization.js';
import { DEFAULT_PRODUCT_SIZE_BY_FORMAT, DEFAULT_SITE_BANNER_LAYOUT, SITE_BANNER_FONT_OPTIONS, SITE_BANNER_FORMATS, getSiteBannerFormat, loadSiteBannerProject, saveSiteBannerProject } from './siteBannerStorage.js';
import './siteBanner.css';

const getDishTitle = (dish) => dish?.nameEn || dish?.nameGe || 'Untitled dish';
const getSafeFilename = (value) => String(value || 'sushiwoki-banner').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sushiwoki-banner';
const createIconId = () => `icon-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const downloadUrl = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const canvasToBlob = (canvas, mimeType) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('Could not create banner file.'));
      return;
    }
    resolve(blob);
  }, mimeType, 0.94);
});

const createFullSizeExportNode = (scene, format) => {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.width = `${format.width}px`;
  wrapper.style.height = `${format.height}px`;
  wrapper.style.overflow = 'hidden';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.zIndex = '-9999';
  wrapper.style.background = 'transparent';

  const clone = scene.cloneNode(true);
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.width = `${format.width}px`;
  clone.style.height = `${format.height}px`;
  clone.querySelectorAll('.site-banner-guides').forEach((node) => node.remove());

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  return { wrapper, clone };
};

async function downloadSiteBannerImage(mimeType, extension, selectedDish, format, options = {}) {
  const scene = document.querySelector('.site-banner-scene');
  if (!scene) throw new Error('Banner preview is not ready yet.');

  if (document.fonts?.ready) await document.fonts.ready;

  const { wrapper, clone } = createFullSizeExportNode(scene, format);

  try {
    const canvas = await html2canvas(clone, {
      backgroundColor: null,
      height: format.height,
      width: format.width,
      windowHeight: format.height,
      windowWidth: format.width,
      scrollX: 0,
      scrollY: 0,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
      ignoreElements: (element) => element.classList?.contains('site-banner-guides'),
    });

    if (canvas.width !== format.width || canvas.height !== format.height) {
      throw new Error(`Export size mismatch: ${canvas.width}x${canvas.height}.`);
    }

    const exportResult = options.optimizePng && mimeType === 'image/png'
      ? await getQualityOptimizedPng(canvas, options.targetBytes)
      : { blob: await canvasToBlob(canvas, mimeType), width: canvas.width, height: canvas.height };
    const suffix = options.optimizePng ? '-optimized' : '';
    const filename = `${getSafeFilename(selectedDish?.nameEn || selectedDish?.nameGe)}-sushiwoki-${exportResult.width}x${exportResult.height}${suffix}.${extension}`;
    const outputUrl = URL.createObjectURL(exportResult.blob);
    downloadUrl(outputUrl, filename);
    setTimeout(() => URL.revokeObjectURL(outputUrl), 1000);
    return { ...exportResult, sizeKb: Math.round(exportResult.blob.size / 1024) };
  } finally {
    wrapper.remove();
  }
}

function ControlGroup({ title, children }) {
  return <section className="app-control-group"><h3>{title}</h3>{children}</section>;
}

function ToggleField({ checked, label, onChange }) {
  return <label className="app-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function RangeControl({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return <label className="app-field image-menu-control"><span>{label} <strong>{value}{suffix}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function ColorControl({ label, value, onChange }) {
  return <label className="app-field">{label}<input type="color" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function FontControl({ label, value, onChange }) {
  return (
    <label className="app-field">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {SITE_BANNER_FONT_OPTIONS.map((font) => <option key={font} value={font}>{font.split(',')[0]}</option>)}
      </select>
    </label>
  );
}

function FormatControl({ value, onChange }) {
  return (
    <ControlGroup title="Format">
      <label className="app-field">
        <span>Banner size</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {SITE_BANNER_FORMATS.map((format) => <option key={format.id} value={format.id}>{format.label}</option>)}
        </select>
      </label>
    </ControlGroup>
  );
}

function TextStyleControls({ title, prefix, settings, updateSettings, sizeMin = 12, sizeMax = 160 }) {
  return (
    <div className="app-card site-banner-style-block">
      <h4>{title}</h4>
      <ColorControl label="Color" value={settings[`${prefix}Color`]} onChange={(value) => updateSettings({ [`${prefix}Color`]: value })} />
      <FontControl label="Font" value={settings[`${prefix}Font`]} onChange={(value) => updateSettings({ [`${prefix}Font`]: value })} />
      <RangeControl label="Size" value={settings[`${prefix}Size`]} min={sizeMin} max={sizeMax} onChange={(value) => updateSettings({ [`${prefix}Size`]: value })} suffix="px" />
    </div>
  );
}

function TextShadowControls({ settings, updateSettings }) {
  return (
    <div className="app-card site-banner-style-block">
      <h4>Text shadow</h4>
      <ToggleField label="Show text shadow" checked={Boolean(settings.textShadowEnabled)} onChange={(textShadowEnabled) => updateSettings({ textShadowEnabled })} />
      <ColorControl label="Shadow color" value={settings.textShadowColor} onChange={(textShadowColor) => updateSettings({ textShadowColor })} />
      <RangeControl label="Shadow radius" value={settings.textShadowBlur} min={0} max={100} onChange={(textShadowBlur) => updateSettings({ textShadowBlur })} suffix="px" />
    </div>
  );
}

function IconControls({ icons, addIcon, updateIcon, removeIcon, format }) {
  return (
    <div className="site-banner-style-stack">
      <button type="button" className="secondary-button" onClick={addIcon}>Add PNG icon</button>
      {icons.length === 0 ? <p className="muted-text">Add PNG icons by URL, then drag them directly on the preview.</p> : null}
      {icons.map((icon, index) => (
        <div key={icon.id} className="app-card site-banner-style-block site-banner-icon-panel">
          <h4>Icon {index + 1}</h4>
          <ToggleField label="Visible" checked={Boolean(icon.visible)} onChange={(visible) => updateIcon(icon.id, { visible })} />
          <label className="app-field"><span>PNG URL</span><input value={icon.url} placeholder="https://.../icon.png" onChange={(event) => updateIcon(icon.id, { url: event.target.value })} /></label>
          <RangeControl label="X" value={icon.x} min={-400} max={format.width + 400} onChange={(x) => updateIcon(icon.id, { x })} suffix="px" />
          <RangeControl label="Y" value={icon.y} min={-400} max={format.height + 400} onChange={(y) => updateIcon(icon.id, { y })} suffix="px" />
          <RangeControl label="Size" value={icon.size} min={10} max={700} onChange={(size) => updateIcon(icon.id, { size })} suffix="px" />
          <RangeControl label="Opacity" value={icon.opacity} min={0} max={1} step={0.01} onChange={(opacity) => updateIcon(icon.id, { opacity })} />
          <RangeControl label="Rotation" value={icon.rotation} min={-180} max={180} onChange={(rotation) => updateIcon(icon.id, { rotation })} suffix="°" />
          <div className="site-banner-icon-actions"><button type="button" className="danger-button" onClick={() => removeIcon(icon.id)}>Delete icon</button></div>
        </div>
      ))}
    </div>
  );
}

function LayoutOffsetControls({ settings, updateLayoutOffset, resetLayoutOffsets }) {
  const offsets = settings.layoutOffsets ?? DEFAULT_SITE_BANNER_LAYOUT;
  return (
    <div className="site-banner-style-stack">
      <button className="secondary-button" type="button" onClick={resetLayoutOffsets}>Reset Layout</button>
      {[
        { title: 'Text block', x: 'textX', y: 'textY' },
        { title: 'Product visual', x: 'productX', y: 'productY' },
        { title: 'CTA', x: 'ctaX', y: 'ctaY' },
        { title: 'Price', x: 'priceX', y: 'priceY' },
      ].map((group) => (
        <div key={group.title} className="app-card site-banner-style-block">
          <h4>{group.title}</h4>
          <RangeControl label="X" value={offsets[group.x] ?? 0} min={-900} max={900} onChange={(value) => updateLayoutOffset(group.x, value)} suffix="px" />
          <RangeControl label="Y" value={offsets[group.y] ?? 0} min={-500} max={500} onChange={(value) => updateLayoutOffset(group.y, value)} suffix="px" />
        </div>
      ))}
    </div>
  );
}

export function SiteBannerSection({ project }) {
  const contentCategories = useMemo(() => project.categories ?? [], [project.categories]);
  const contentDishes = useMemo(() => project.dishes ?? [], [project.dishes]);
  const visibleDishes = useMemo(() => contentDishes.filter((dish) => dish.visible !== false), [contentDishes]);
  const dishesWithImages = useMemo(() => visibleDishes.filter((dish) => dish.imageUrl), [visibleDishes]);
  const categoryGroups = useMemo(() => contentCategories.map((category) => ({ category, dishes: dishesWithImages.filter((dish) => dish.categoryId === category.id) })), [contentCategories, dishesWithImages]);
  const [openCategoryIds, setOpenCategoryIds] = useState(() => new Set(contentCategories.map((category) => category.id)));
  const [settings, setSettings] = useState(() => loadSiteBannerProject(dishesWithImages));
  const [exportStatus, setExportStatus] = useState('');
  const selectedFormat = getSiteBannerFormat(settings.formatId);

  useEffect(() => {
    setSettings((current) => ({ ...loadSiteBannerProject(dishesWithImages.length ? dishesWithImages : contentDishes), ...current }));
  }, [contentDishes, dishesWithImages]);

  useEffect(() => {
    saveSiteBannerProject(settings);
  }, [settings]);

  useEffect(() => {
    setOpenCategoryIds((current) => {
      const next = new Set(current);
      contentCategories.forEach((category) => next.add(category.id));
      return next;
    });
  }, [contentCategories]);

  const selectedDish = dishesWithImages.find((dish) => dish.id === settings.selectedDishId) ?? dishesWithImages[0] ?? null;
  const selectedIndex = Math.max(0, dishesWithImages.findIndex((dish) => dish.id === selectedDish?.id));
  const icons = settings.icons ?? [];

  const updateSettings = (changes) => setSettings((current) => ({ ...current, ...changes }));
  const updateLayoutOffset = (key, value) => updateSettings({ layoutOffsets: { ...DEFAULT_SITE_BANNER_LAYOUT, ...(settings.layoutOffsets ?? {}), [key]: value } });
  const resetLayoutOffsets = () => updateSettings({ layoutOffsets: { ...DEFAULT_SITE_BANNER_LAYOUT } });
  const updateIcon = (iconId, changes) => setSettings((current) => ({ ...current, icons: (current.icons ?? []).map((icon) => icon.id === iconId ? { ...icon, ...changes } : icon) }));
  const addIcon = () => setSettings((current) => ({
    ...current,
    icons: [
      ...(current.icons ?? []),
      { id: createIconId(), url: '', x: Math.round(selectedFormat.width * 0.2), y: Math.round(selectedFormat.height * 0.45), size: 140, opacity: 1, rotation: 0, visible: true },
    ],
  }));
  const removeIcon = (iconId) => setSettings((current) => ({ ...current, icons: (current.icons ?? []).filter((icon) => icon.id !== iconId) }));

  const handleFormatChange = (formatId) => {
    const nextFormat = getSiteBannerFormat(formatId);
    setSettings((current) => ({
      ...current,
      formatId: nextFormat.id,
      productSize: DEFAULT_PRODUCT_SIZE_BY_FORMAT[nextFormat.id] ?? current.productSize,
      layoutOffsets: { ...DEFAULT_SITE_BANNER_LAYOUT },
    }));
  };

  const handleDownload = async (mimeType, extension, options = {}) => {
    const label = options.label || extension.toUpperCase();
    try {
      setExportStatus(`Preparing ${label}...`);
      const result = await downloadSiteBannerImage(mimeType, extension, selectedDish, selectedFormat, options);
      const details = options.optimizePng ? ` ${result.width}x${result.height}, ${result.sizeKb}KB` : '';
      setExportStatus(`${label} downloaded.${details}`);
    } catch (error) {
      console.error(error);
      setExportStatus(error?.message || 'Export failed. Check that the product image is loaded, then try again.');
    }
  };

  const toggleCategoryOpen = (categoryId) => {
    setOpenCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  return (
    <section className="app-page site-banner-page">
      <aside className="app-side-panel site-banner-side-panel">
        <header className="app-panel-header">
          <p>Website Banner</p>
          <h2>Sushiwoki Banner</h2>
          <span>{selectedFormat.width} x {selectedFormat.height}px canvas with safer center-focused zones.</span>
        </header>

        <FormatControl value={selectedFormat.id} onChange={handleFormatChange} />

        <ControlGroup title="Export">
          <div className="app-segmented site-banner-export-row">
            <button type="button" onClick={() => handleDownload('image/png', 'png')}>PNG</button>
            <button type="button" onClick={() => handleDownload('image/png', 'png', { optimizePng: true, targetBytes: PNG_OPTIMIZED_TARGET_BYTES, label: 'PNG optimized' })}>PNG optimized</button>
            <button type="button" onClick={() => handleDownload('image/jpeg', 'jpg')}>JPG</button>
            <button type="button" onClick={() => handleDownload('image/webp', 'webp')}>WebP</button>
          </div>
          {exportStatus ? <small className="app-preview-size">{exportStatus}</small> : null}
        </ControlGroup>

        <div className="app-control-group site-banner-select-section">
          <div className="image-menu-section-heading"><div><h2>Select product</h2><small>{contentCategories.length} content categories</small></div><small>{selectedDish ? '1/1 selected' : '0/1 selected'}</small></div>
          <div className="image-menu-category-picker site-banner-category-picker">
            {categoryGroups.length === 0 ? <p className="muted-text">No categories in Content yet.</p> : null}
            {categoryGroups.map(({ category, dishes: categoryDishes }) => {
              const isOpen = openCategoryIds.has(category.id);
              const selectedCount = categoryDishes.some((dish) => dish.id === selectedDish?.id) ? 1 : 0;
              return (
                <section key={category.id} className="image-menu-category-group">
                  <button className="image-menu-category-toggle" type="button" onClick={() => toggleCategoryOpen(category.id)} aria-expanded={isOpen}><span>{isOpen ? '▾' : '▸'}</span><strong>{category.nameEn || category.nameGe || 'Untitled category'}</strong><small>{selectedCount}/{categoryDishes.length}</small></button>
                  {isOpen ? (
                    <div className="image-menu-category-body">
                      <div className="image-menu-dish-picker site-banner-dish-picker">
                        {categoryDishes.length === 0 ? <p className="muted-text">No products with images in this category.</p> : null}
                        {categoryDishes.map((dish) => {
                          const selected = dish.id === selectedDish?.id;
                          return <div key={dish.id} className={selected ? 'selected' : ''}><label><input type="radio" name="site-banner-dish" checked={selected} onChange={() => setSettings((current) => ({ ...current, selectedDishId: dish.id }))} />{dish.imageUrl ? <img src={dish.imageUrl} alt="" /> : <span className="image-menu-mini-placeholder" />}<span><strong>{dish.nameEn}</strong><small>{dish.nameGe}</small></span></label></div>;
                        })}
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>

        <ControlGroup title="Copy">
          <ToggleField label="Show offer" checked={Boolean(settings.showOffer)} onChange={(showOffer) => updateSettings({ showOffer })} />
          <label className="app-field"><span>Offer</span><input value={settings.offerText} placeholder="SUSHIWOKI" onChange={(event) => updateSettings({ offerText: event.target.value })} /></label>
          <label className="app-field"><span>Headline</span><input value={settings.headline} placeholder={selectedDish ? getDishTitle(selectedDish) : 'Banner headline'} onChange={(event) => updateSettings({ headline: event.target.value })} /></label>
          <ToggleField label="Show subheadline" checked={Boolean(settings.showSubheadline)} onChange={(showSubheadline) => updateSettings({ showSubheadline })} />
          <label className="app-field"><span>Subheadline</span><input value={settings.subheadline} placeholder="Fresh sushi, rolls and wok delivery" onChange={(event) => updateSettings({ subheadline: event.target.value })} /></label>
          <ToggleField label="Show CTA" checked={Boolean(settings.showCta)} onChange={(showCta) => updateSettings({ showCta })} />
          <label className="app-field"><span>CTA</span><input value={settings.ctaText} placeholder="ORDER NOW" onChange={(event) => updateSettings({ ctaText: event.target.value })} /></label>
          <ToggleField label="Show price" checked={Boolean(settings.showPrice)} onChange={(showPrice) => updateSettings({ showPrice })} />
        </ControlGroup>

        <ControlGroup title="Text shadow">
          <TextShadowControls settings={settings} updateSettings={updateSettings} />
        </ControlGroup>

        <ControlGroup title="PNG icons">
          <IconControls icons={icons} addIcon={addIcon} updateIcon={updateIcon} removeIcon={removeIcon} format={selectedFormat} />
        </ControlGroup>

        <ControlGroup title="Background">
          <label className="app-field"><span>Mode</span><select value={settings.backgroundMode} onChange={(event) => updateSettings({ backgroundMode: event.target.value })}><option value="auto">Auto fill from product image</option><option value="custom">Custom background URL</option></select></label>
          <label className="app-field"><span>Custom background URL</span><input value={settings.customBackgroundUrl} placeholder="Paste background image URL" onChange={(event) => updateSettings({ customBackgroundUrl: event.target.value })} /></label>
          <RangeControl label="Background tone" value={settings.backgroundTone} min={-50} max={50} onChange={(backgroundTone) => updateSettings({ backgroundTone })} />
          <ColorControl label="Accent color" value={settings.accentColor} onChange={(accentColor) => updateSettings({ accentColor })} />
        </ControlGroup>

        <ControlGroup title="Safe zones">
          <ToggleField label="Show safe-zone overlay" checked={Boolean(settings.showSafeZones)} onChange={(showSafeZones) => updateSettings({ showSafeZones })} />
          <ToggleField label="General safe zone" checked={Boolean(settings.showGeneralSafeZone)} onChange={(showGeneralSafeZone) => updateSettings({ showGeneralSafeZone })} />
          <ToggleField label="Recommended text/product zones" checked={Boolean(settings.showRecommendedZones)} onChange={(showRecommendedZones) => updateSettings({ showRecommendedZones })} />
        </ControlGroup>

        <ControlGroup title="Appearance"><RangeControl label="Product size" value={settings.productSize} min={260} max={980} onChange={(productSize) => updateSettings({ productSize })} suffix="px" /></ControlGroup>
        <ControlGroup title="Layout"><LayoutOffsetControls settings={settings} updateLayoutOffset={updateLayoutOffset} resetLayoutOffsets={resetLayoutOffsets} /></ControlGroup>
        <ControlGroup title="Text styles">
          <TextStyleControls title="Offer" prefix="offer" settings={settings} updateSettings={updateSettings} sizeMin={18} sizeMax={60} />
          <TextStyleControls title="Headline" prefix="headline" settings={settings} updateSettings={updateSettings} sizeMin={54} sizeMax={180} />
          <TextStyleControls title="Subheadline" prefix="subheadline" settings={settings} updateSettings={updateSettings} sizeMin={20} sizeMax={76} />
          <TextStyleControls title="CTA" prefix="cta" settings={settings} updateSettings={updateSettings} sizeMin={18} sizeMax={60} />
          <TextStyleControls title="Price" prefix="price" settings={settings} updateSettings={updateSettings} sizeMin={34} sizeMax={130} />
        </ControlGroup>
      </aside>

      <main className="app-preview-stage site-banner-preview-stage">
        <div className="app-toolbar"><div><p>Preview</p><h2>{selectedDish ? getDishTitle(selectedDish) : 'Select product'}</h2></div><div className="app-pill">{selectedFormat.label}</div></div>
        <SiteBannerPreview dish={selectedDish} settings={settings} index={selectedIndex} onDragIcon={updateIcon} />
      </main>
    </section>
  );
}