import { useEffect, useMemo, useState } from 'react';
import { PromoPreview } from './PromoPreview.jsx';
import { DEFAULT_PROMO_EFFECTS, DEFAULT_PROMO_LAYOUT_OFFSETS, getPromoFormat, loadPromoProject, PROMO_DURATIONS, PROMO_FONT_OPTIONS, PROMO_FORMATS, savePromoProject } from './promoStorage.js';
import './promoGenerator.css';

const EFFECT_GROUPS = [
  {
    title: 'Animation',
    items: [
      ['slowZoom', 'Slow Zoom'],
      ['fastEntrance', 'Fast Entrance'],
      ['stopMotion', 'Stop Motion'],
      ['pricePunch', 'Price Punch'],
      ['textRise', 'Text Rise'],
      ['dishPulse', 'Dish Pulse'],
      ['priceShake', 'Price Shake'],
    ],
  },
  {
    title: 'Effects',
    items: [
      ['glow', 'Glow'],
      ['lightSweep', 'Light Sweep'],
      ['backgroundOrbit', 'Background Orbit'],
      ['spotlightPulse', 'Spotlight Pulse'],
    ],
  },
  {
    title: 'Media',
    items: [['gifOverlay', 'GIF Overlay']],
  },
];

const LAYOUT_CONTROL_GROUPS = [
  { title: 'Text block', x: 'copyX', y: 'copyY' },
  { title: 'Dish photo', x: 'dishX', y: 'dishY' },
  { title: 'Price', x: 'priceX', y: 'priceY' },
  { title: 'CTA', x: 'ctaX', y: 'ctaY' },
  { title: 'GIF', x: 'gifX', y: 'gifY' },
];

const GLOBAL_PROMO_KEYS = new Set(['gifUrl', 'gifPosition', 'gifSize', 'gifBorderRadius', 'gifLibrary', 'selectedDishId', 'formatId']);
const getDishTitle = (dish) => dish?.nameEn || dish?.nameGe || 'Untitled dish';
const getSafeFilename = (value) => String(value || 'promo').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'promo';
const normalizeGifUrl = (value) => String(value || '').trim();
const withFallback = (value, fallback) => value === undefined || value === null ? fallback : value;

const getDocumentCss = () => Array.from(document.styleSheets)
  .map((sheet) => {
    try {
      return Array.from(sheet.cssRules ?? []).map((rule) => rule.cssText).join('\n');
    } catch (error) {
      return '';
    }
  })
  .filter(Boolean)
  .join('\n');

const downloadUrl = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const getPromoSceneHtml = () => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) return '';

  const clone = scene.cloneNode(true);
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';

  return `
    <style>${getDocumentCss()}</style>
    ${clone.outerHTML}
  `;
};

async function downloadPromoExport(format, selectedDish, settings, output) {
  const html = getPromoSceneHtml();
  if (!html) throw new Error('Could not find the promo scene.');

  const extension = output === 'png' ? 'png' : 'mp4';
  const filename = `${getSafeFilename(selectedDish?.nameEn || selectedDish?.nameGe)}-${format.label.replace(':', 'x')}.${extension}`;
  const response = await fetch('/api/promo-render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      output,
      filename,
      format,
      duration: settings?.duration || 8,
      fps: 30,
      settings,
      dish: selectedDish,
      html,
    }),
  });

  if (!response.ok) {
    let message = `${extension.toUpperCase()} export failed.`;
    try {
      const payload = await response.json();
      message = payload.detail || payload.error || message;
    } catch (error) {
      message = await response.text();
    }
    throw new Error(message);
  }

  const fileBlob = await response.blob();
  if (!fileBlob.size) throw new Error(`Renderer returned an empty ${extension.toUpperCase()} file.`);

  const fileUrl = URL.createObjectURL(fileBlob);
  downloadUrl(fileUrl, filename);
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
}

function PromoControlGroup({ title, children }) {
  return (
    <section className="promo-panel-group">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ToggleField({ checked, label, onChange }) {
  return (
    <label className="promo-toggle-field">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function RangeControl({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <label className="image-menu-control">
      <span>{label} <strong>{value}{suffix}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ColorControl({ label, value, onChange }) {
  return (
    <label className="field-label image-menu-field">
      {label}
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FontControl({ label, value, onChange }) {
  return (
    <label className="field-label image-menu-field">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {PROMO_FONT_OPTIONS.map((font) => <option key={font} value={font}>{font.split(',')[0]}</option>)}
      </select>
    </label>
  );
}

function TextStyleControls({ title, prefix, settings, updateSettings, sizeMin = 12, sizeMax = 160 }) {
  return (
    <div className="promo-style-block">
      <h4>{title}</h4>
      <ColorControl label="Color" value={settings[`${prefix}Color`]} onChange={(value) => updateSettings({ [`${prefix}Color`]: value })} />
      <FontControl label="Font" value={settings[`${prefix}Font`]} onChange={(value) => updateSettings({ [`${prefix}Font`]: value })} />
      <RangeControl label="Size" value={settings[`${prefix}Size`]} min={sizeMin} max={sizeMax} onChange={(value) => updateSettings({ [`${prefix}Size`]: value })} suffix="px" />
    </div>
  );
}

function LayoutOffsetControls({ settings, updateLayoutOffset, resetLayoutOffsets }) {
  const offsets = settings.layoutOffsets ?? DEFAULT_PROMO_LAYOUT_OFFSETS;
  return (
    <div className="promo-style-block">
      <button className="secondary-button" type="button" onClick={resetLayoutOffsets}>Reset Layout</button>
      {LAYOUT_CONTROL_GROUPS.map((group) => (
        <div key={group.title} className="promo-style-block">
          <h4>{group.title}</h4>
          <RangeControl label="X" value={offsets[group.x] ?? 0} min={-600} max={600} onChange={(value) => updateLayoutOffset(group.x, value)} suffix="px" />
          <RangeControl label="Y" value={offsets[group.y] ?? 0} min={-600} max={600} onChange={(value) => updateLayoutOffset(group.y, value)} suffix="px" />
        </div>
      ))}
    </div>
  );
}

function TextShadowControls({ settings, updateSettings }) {
  return (
    <div className="promo-style-block">
      <ToggleField label="Enable text shadow" checked={Boolean(withFallback(settings.showTextShadow, true))} onChange={(showTextShadow) => updateSettings({ showTextShadow })} />
      <ColorControl label="Shadow color" value={withFallback(settings.textShadowColor, '#000000')} onChange={(textShadowColor) => updateSettings({ textShadowColor })} />
      <RangeControl label="Shadow opacity" value={withFallback(settings.textShadowOpacity, 34)} min={0} max={100} onChange={(textShadowOpacity) => updateSettings({ textShadowOpacity })} suffix="%" />
      <RangeControl label="Shadow blur" value={withFallback(settings.textShadowBlur, 38)} min={0} max={90} onChange={(textShadowBlur) => updateSettings({ textShadowBlur })} suffix="px" />
    </div>
  );
}

function GifLibraryControls({ settings, updateSettings }) {
  const gifUrl = normalizeGifUrl(settings.gifUrl);
  const gifLibrary = Array.isArray(settings.gifLibrary) ? settings.gifLibrary : [];
  const selectedLibraryUrl = gifLibrary.some((item) => item.url === gifUrl) ? gifUrl : '';

  const saveCurrentGif = () => {
    const url = normalizeGifUrl(settings.gifUrl);
    if (!url) return;
    const existing = gifLibrary.find((item) => item.url === url);
    const nextItem = existing || { id: `gif_${Date.now()}`, name: `GIF ${gifLibrary.length + 1}`, url };
    updateSettings({
      gifLibrary: [nextItem, ...gifLibrary.filter((item) => item.url !== url)].slice(0, 60),
      gifUrl: url,
    });
  };

  const deleteGif = (url) => {
    updateSettings({
      gifLibrary: gifLibrary.filter((item) => item.url !== url),
      gifUrl: gifUrl === url ? '' : gifUrl,
    });
  };

  return (
    <div className="promo-gif-library">
      <label className="image-menu-control">
        <span>GIF URL</span>
        <input value={settings.gifUrl || ''} placeholder="Paste GIF URL" onChange={(event) => updateSettings({ gifUrl: event.target.value })} />
      </label>
      <div className="promo-gif-library-actions">
        <button type="button" onClick={saveCurrentGif} disabled={!gifUrl}>Save current GIF</button>
        {gifLibrary.length ? (
          <select value={selectedLibraryUrl} onChange={(event) => event.target.value && updateSettings({ gifUrl: event.target.value })}>
            <option value="">Choose saved GIF</option>
            {gifLibrary.map((item) => <option key={item.id || item.url} value={item.url}>{item.name}</option>)}
          </select>
        ) : null}
      </div>
      {gifLibrary.length ? (
        <div className="promo-gif-library-list">
          {gifLibrary.map((item) => (
            <div key={item.id || item.url} className={item.url === gifUrl ? 'active' : ''}>
              <button type="button" onClick={() => updateSettings({ gifUrl: item.url })}>
                <span>{item.name}</span>
                <small>{item.url}</small>
              </button>
              <button type="button" className="danger" onClick={() => deleteGif(item.url)}>Delete</button>
            </div>
          ))}
        </div>
      ) : <small className="promo-preview-size">Saved GIFs will appear here after you save a URL.</small>}
    </div>
  );
}

export function PromoSection({ project }) {
  const contentCategories = useMemo(() => project.categories ?? [], [project.categories]);
  const contentDishes = useMemo(() => project.dishes ?? [], [project.dishes]);
  const visibleDishes = useMemo(() => contentDishes.filter((dish) => dish.visible !== false), [contentDishes]);
  const dishesWithImages = useMemo(() => visibleDishes.filter((dish) => dish.imageUrl), [visibleDishes]);
  const categoryGroups = useMemo(() => contentCategories.map((category) => ({
    category,
    dishes: dishesWithImages.filter((dish) => dish.categoryId === category.id),
  })), [contentCategories, dishesWithImages]);
  const [openCategoryIds, setOpenCategoryIds] = useState(() => new Set());
  const [settings, setSettings] = useState(() => loadPromoProject(dishesWithImages));
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    setSettings((current) => ({ ...loadPromoProject(dishesWithImages.length ? dishesWithImages : contentDishes), ...current }));
  }, [contentDishes, dishesWithImages]);

  useEffect(() => {
    savePromoProject(settings);
  }, [settings]);

  const selectedDish = dishesWithImages.find((dish) => dish.id === settings.selectedDishId) ?? dishesWithImages[0] ?? null;
  const selectedIndex = Math.max(0, dishesWithImages.findIndex((dish) => dish.id === selectedDish?.id));
  const activeFormat = getPromoFormat(settings.formatId);

  const syncFormats = (current, changes = {}) => {
    const formatChanges = Object.fromEntries(Object.entries(changes).filter(([key]) => !GLOBAL_PROMO_KEYS.has(key)));
    const currentFormatSettings = current.formats?.[current.formatId] ?? {};
    const syncedFormatSettings = { ...currentFormatSettings, ...formatChanges };
    return Object.fromEntries(PROMO_FORMATS.map((format) => [
      format.id,
      {
        ...(current.formats?.[format.id] ?? {}),
        ...syncedFormatSettings,
      },
    ]));
  };

  const updateSettings = (changes) => {
    setSettings((current) => ({
      ...current,
      ...changes,
      formats: syncFormats(current, changes),
    }));
  };

  const updateLayoutOffset = (key, value) => {
    updateSettings({
      layoutOffsets: {
        ...DEFAULT_PROMO_LAYOUT_OFFSETS,
        ...(settings.layoutOffsets ?? {}),
        [key]: value,
      },
    });
  };

  const resetLayoutOffsets = () => updateSettings({ layoutOffsets: { ...DEFAULT_PROMO_LAYOUT_OFFSETS } });

  const switchFormat = (formatId) => {
    setSettings((current) => ({
      ...current,
      formatId,
      formats: syncFormats(current),
    }));
  };

  const updateEffect = (key, value) => {
    updateSettings({ effects: { ...DEFAULT_PROMO_EFFECTS, ...(settings.effects ?? {}), [key]: value } });
  };

  const handleDownloadPng = async () => {
    if (!selectedDish) {
      setExportStatus('Select a dish with an image before exporting PNG.');
      return;
    }
    try {
      setExportStatus('Rendering PNG on server...');
      await downloadPromoExport(activeFormat, selectedDish, settings, 'png');
      setExportStatus('PNG downloaded.');
    } catch (error) {
      console.error(error);
      setExportStatus(error instanceof Error ? error.message : 'PNG export failed.');
    }
  };

  const handleDownloadMp4 = async () => {
    if (!selectedDish) {
      setExportStatus('Select a dish with an image before exporting MP4.');
      return;
    }
    try {
      setExportStatus('Rendering MP4 on server...');
      await downloadPromoExport(activeFormat, selectedDish, settings, 'mp4');
      setExportStatus('MP4 video downloaded.');
    } catch (error) {
      console.error(error);
      setExportStatus(error instanceof Error ? error.message : 'MP4 export failed.');
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
    <section className="promo-generator-section">
      <aside className="promo-generator-panel">
        <header className="promo-panel-header">
          <p>TV Promo</p>
          <h2>Promo Generator</h2>
          <span>{activeFormat.label} scene</span>
        </header>

        <PromoControlGroup title="Download">
          <div className="promo-duration-buttons">
            <button type="button" onClick={handleDownloadPng}>PNG</button>
            <button type="button" onClick={handleDownloadMp4}>MP4</button>
          </div>
          {exportStatus ? <small className="promo-preview-size">{exportStatus}</small> : null}
        </PromoControlGroup>

        <PromoControlGroup title="Format">
          <div className="promo-format-buttons promo-format-buttons-clean">
            {PROMO_FORMATS.map((format) => (
              <button key={format.id} className={settings.formatId === format.id ? 'active' : ''} type="button" onClick={() => switchFormat(format.id)}>
                <strong>{format.label}</strong>
              </button>
            ))}
          </div>
        </PromoControlGroup>

        <div className="panel-section promo-select-section">
          <div className="image-menu-section-heading">
            <div>
              <h2>Select dish</h2>
              <small>{contentCategories.length} content categories</small>
            </div>
            <small>{selectedDish ? '1/1 selected' : '0/1 selected'}</small>
          </div>
          <div className="image-menu-category-picker promo-category-picker">
            {categoryGroups.length === 0 ? <p className="muted-text">No categories in Content yet.</p> : null}
            {categoryGroups.map(({ category, dishes: categoryDishes }) => {
              const isOpen = openCategoryIds.has(category.id);
              const selectedCount = categoryDishes.some((dish) => dish.id === selectedDish?.id) ? 1 : 0;
              return (
                <section key={category.id} className="image-menu-category-group">
                  <button className="image-menu-category-toggle" type="button" onClick={() => toggleCategoryOpen(category.id)} aria-expanded={isOpen}>
                    <span>{isOpen ? '▾' : '▸'}</span>
                    <strong>{category.nameEn || category.nameGe || 'Untitled category'}</strong>
                    <small>{selectedCount}/{categoryDishes.length}</small>
                  </button>
                  {isOpen ? (
                    <div className="image-menu-category-body">
                      <div className="image-menu-dish-picker promo-dish-picker">
                        {categoryDishes.length === 0 ? <p className="muted-text">No dishes with images in this category.</p> : null}
                        {categoryDishes.map((dish) => {
                          const selected = dish.id === selectedDish?.id;
                          return (
                            <div key={dish.id} className={selected ? 'selected' : ''}>
                              <label>
                                <input type="radio" name="tv-promo-dish" checked={selected} onChange={() => updateSettings({ selectedDishId: dish.id })} />
                                {dish.imageUrl ? <img src={dish.imageUrl} alt="" /> : <span className="image-menu-mini-placeholder" />}
                                <span><strong>{dish.nameEn}</strong><small>{dish.nameGe}</small></span>
                              </label>
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

        <PromoControlGroup title="Duration">
          <div className="promo-duration-buttons">
            {PROMO_DURATIONS.map((duration) => (
              <button key={duration} className={settings.duration === duration ? 'active' : ''} type="button" onClick={() => updateSettings({ duration })}>{duration}s</button>
            ))}
          </div>
        </PromoControlGroup>

        <PromoControlGroup title="Offer">
          <ToggleField label="Show offer text" checked={Boolean(settings.showOffer)} onChange={(showOffer) => updateSettings({ showOffer })} />
          <label className="image-menu-control"><span>Headline</span><input value={settings.headline} placeholder={selectedDish ? getDishTitle(selectedDish) : 'Promo headline'} onChange={(event) => updateSettings({ headline: event.target.value })} /></label>
          <label className="image-menu-control"><span>Offer text</span><input value={settings.offerText} placeholder="New, Today only, -20%" onChange={(event) => updateSettings({ offerText: event.target.value })} /></label>
          <ToggleField label="Show CTA" checked={Boolean(settings.showCta)} onChange={(showCta) => updateSettings({ showCta })} />
          <label className="image-menu-control"><span>CTA</span><input value={settings.ctaText} placeholder="ORDER NOW" onChange={(event) => updateSettings({ ctaText: event.target.value })} /></label>
        </PromoControlGroup>

        <PromoControlGroup title="Appearance">
          <RangeControl label="Background tone" value={settings.backgroundTone} min={-40} max={40} onChange={(backgroundTone) => updateSettings({ backgroundTone })} />
          <RangeControl label="Dish size" value={settings.dishSize} min={100} max={650} onChange={(dishSize) => updateSettings({ dishSize })} suffix="px" />
          <ToggleField label="Show description" checked={Boolean(settings.showDescription)} onChange={(showDescription) => updateSettings({ showDescription })} />
          <RangeControl label="Description vertical offset" value={settings.descriptionOffsetY} min={-180} max={180} onChange={(descriptionOffsetY) => updateSettings({ descriptionOffsetY })} suffix="px" />
        </PromoControlGroup>

        <PromoControlGroup title="Text shadow"><TextShadowControls settings={settings} updateSettings={updateSettings} /></PromoControlGroup>
        <PromoControlGroup title="Layout"><LayoutOffsetControls settings={settings} updateLayoutOffset={updateLayoutOffset} resetLayoutOffsets={resetLayoutOffsets} /></PromoControlGroup>

        <PromoControlGroup title="Text styles">
          <TextStyleControls title="Offer label" prefix="offer" settings={settings} updateSettings={updateSettings} sizeMin={16} sizeMax={76} />
          <TextStyleControls title="Headline" prefix="headline" settings={settings} updateSettings={updateSettings} sizeMin={42} sizeMax={170} />
          <TextStyleControls title="Georgian title" prefix="geTitle" settings={settings} updateSettings={updateSettings} sizeMin={24} sizeMax={96} />
          <TextStyleControls title="Description" prefix="description" settings={settings} updateSettings={updateSettings} sizeMin={14} sizeMax={60} />
          <TextStyleControls title="CTA" prefix="cta" settings={settings} updateSettings={updateSettings} sizeMin={18} sizeMax={72} />
        </PromoControlGroup>

        <PromoControlGroup title="Prices">
          <TextStyleControls title="Old price" prefix="oldPrice" settings={settings} updateSettings={updateSettings} sizeMin={18} sizeMax={88} />
          <TextStyleControls title="Sale price" prefix="salePrice" settings={settings} updateSettings={updateSettings} sizeMin={42} sizeMax={190} />
        </PromoControlGroup>

        {EFFECT_GROUPS.map((group) => (
          <PromoControlGroup key={group.title} title={group.title}>
            <div className="promo-toggle-list">
              {group.items.map(([key, label]) => <ToggleField key={key} label={label} checked={Boolean(settings.effects?.[key])} onChange={(value) => updateEffect(key, value)} />)}
            </div>
          </PromoControlGroup>
        ))}

        {settings.effects?.gifOverlay ? (
          <PromoControlGroup title="GIF Overlay">
            <GifLibraryControls settings={settings} updateSettings={updateSettings} />
            <label className="image-menu-control">
              <span>Position</span>
              <select value={settings.gifPosition} onChange={(event) => updateSettings({ gifPosition: event.target.value })}>
                <option value="textLeft">Headline left</option>
                <option value="topLeft">Headline left / top</option>
                <option value="topRight">Price right / top</option>
                <option value="bottomLeft">CTA left / bottom</option>
                <option value="bottomRight">Bottom right</option>
              </select>
            </label>
            <RangeControl label="Size" value={settings.gifSize} min={6} max={42} onChange={(gifSize) => updateSettings({ gifSize })} suffix="%" />
            <RangeControl label="Corner radius" value={settings.gifBorderRadius ?? 0} min={0} max={160} onChange={(gifBorderRadius) => updateSettings({ gifBorderRadius })} suffix="px" />
          </PromoControlGroup>
        ) : null}
      </aside>

      <main className="promo-generator-preview-stage">
        <div className="promo-generator-toolbar">
          <div><p>Preview</p><h2>{selectedDish ? getDishTitle(selectedDish) : 'Select dish'}</h2></div>
          <div className="promo-output-pill">{activeFormat.label}</div>
        </div>
        <PromoPreview dish={selectedDish} settings={settings} index={selectedIndex} />
      </main>
    </section>
  );
}
