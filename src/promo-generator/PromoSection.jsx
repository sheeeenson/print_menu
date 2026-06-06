import { useEffect, useMemo, useState } from 'react';
import { PromoPreview } from './PromoPreview.jsx';
import { DEFAULT_PROMO_EFFECTS, DEFAULT_PROMO_LAYOUT_OFFSETS, getPromoFormat, loadPromoProject, PROMO_DURATIONS, PROMO_FONT_OPTIONS, PROMO_FORMATS, savePromoProject } from './promoStorage.js';
import './promoGenerator.css';

const VIDEO_FPS = 24;

const EFFECT_GROUPS = [
  {
    title: 'Animation',
    items: [
      ['slowZoom', 'Slow Zoom'],
      ['fastEntrance', 'Fast Entrance'],
      ['stopMotion', 'Stop Motion'],
      ['pricePunch', 'Price Punch'],
    ],
  },
  {
    title: 'Effects',
    items: [
      ['glow', 'Glow'],
      ['lightSweep', 'Light Sweep'],
    ],
  },
  {
    title: 'Media',
    items: [
      ['gifOverlay', 'GIF Overlay'],
    ],
  },
];

const LAYOUT_CONTROL_GROUPS = [
  { title: 'Text block', x: 'copyX', y: 'copyY' },
  { title: 'Dish photo', x: 'dishX', y: 'dishY' },
  { title: 'Price', x: 'priceX', y: 'priceY' },
  { title: 'CTA', x: 'ctaX', y: 'ctaY' },
  { title: 'GIF', x: 'gifX', y: 'gifY' },
];

const getDishTitle = (dish) => dish?.nameEn || dish?.nameGe || 'Untitled dish';
const getActiveFormatSettings = (settings, formatId = settings.formatId) => settings.formats?.[formatId] ?? {};
const getSafeFilename = (value) => String(value || 'promo').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'promo';

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

const getSupportedMp4MimeType = () => {
  if (!window.MediaRecorder?.isTypeSupported) return '';
  return [
    'video/mp4;codecs="avc1.42E01E"',
    'video/mp4;codecs="h264"',
    'video/mp4',
  ].find((type) => window.MediaRecorder.isTypeSupported(type)) || '';
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const pauseCloneAnimationsAt = (scene, clone, seconds = 0) => {
  const sourceElements = [scene, ...scene.querySelectorAll('*')];
  const cloneElements = [clone, ...clone.querySelectorAll('*')];

  sourceElements.forEach((sourceElement, index) => {
    const cloneElement = cloneElements[index];
    if (!cloneElement) return;

    const style = window.getComputedStyle(sourceElement);
    if (!style.animationName || style.animationName === 'none') return;

    const animationCount = style.animationName.split(',').length;
    cloneElement.style.animationPlayState = Array.from({ length: animationCount }, () => 'paused').join(',');
    cloneElement.style.animationDelay = Array.from({ length: animationCount }, () => `-${seconds}s`).join(',');
  });
};

const getPromoSceneHtml = (seconds = 0) => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) return '';

  const clone = scene.cloneNode(true);
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';
  pauseCloneAnimationsAt(scene, clone, seconds);

  return `
    <style>${getDocumentCss()}</style>
    ${clone.outerHTML}
  `;
};

const renderPromoFrameToCanvas = async (format, seconds, canvas) => {
  const html = getPromoSceneHtml(seconds);
  if (!html) throw new Error('Could not find the promo scene.');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${format.width}" height="${format.height}" viewBox="0 0 ${format.width} ${format.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
      </foreignObject>
    </svg>
  `;
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, format.width, format.height);
      context.drawImage(image, 0, 0, format.width, format.height);
      URL.revokeObjectURL(svgUrl);
      resolve();
    };
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Could not render the promo preview frame.'));
    };
    image.src = svgUrl;
  });
};

async function downloadPromoPng(format, selectedDish) {
  const canvas = document.createElement('canvas');
  canvas.width = format.width;
  canvas.height = format.height;
  await renderPromoFrameToCanvas(format, 0, canvas);

  await new Promise((resolve, reject) => {
    const filename = `${getSafeFilename(selectedDish?.nameEn || selectedDish?.nameGe)}-${format.label.replace(':', 'x')}.png`;
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not create PNG file.'));
        return;
      }
      const pngUrl = URL.createObjectURL(blob);
      downloadUrl(pngUrl, filename);
      setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
      resolve();
    }, 'image/png');
  });
}

async function downloadPromoMp4(format, selectedDish, settings) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('MP4 export is not supported in this browser. Try Safari or a Chromium browser with MP4 MediaRecorder support.');
  }

  const mimeType = getSupportedMp4MimeType();
  if (!mimeType) {
    throw new Error('This browser can record WebM only, but the export requires MP4/MPEG. Open this page in a browser with MP4 MediaRecorder support or use the backend renderer.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = format.width;
  canvas.height = format.height;

  const filename = `${getSafeFilename(selectedDish?.nameEn || selectedDish?.nameGe)}-${format.label.replace(':', 'x')}.mp4`;
  const stream = canvas.captureStream(VIDEO_FPS);
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType });
  const frameCount = Math.max(1, Math.round((settings.duration || 8) * VIDEO_FPS));

  const stopped = new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error('MP4 recorder failed.'));
    recorder.onstop = resolve;
  });

  recorder.start();
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    await renderPromoFrameToCanvas(format, frameIndex / VIDEO_FPS, canvas);
    stream.getVideoTracks().forEach((track) => track.requestFrame?.());
    await wait(1000 / VIDEO_FPS);
  }
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  const videoBlob = new Blob(chunks, { type: 'video/mp4' });
  if (!videoBlob.size) throw new Error('Could not create an MP4 file.');

  const videoUrl = URL.createObjectURL(videoBlob);
  downloadUrl(videoUrl, filename);
  setTimeout(() => URL.revokeObjectURL(videoUrl), 1000);
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

export function PromoSection({ project }) {
  const contentCategories = useMemo(() => project.categories ?? [], [project.categories]);
  const contentDishes = useMemo(() => project.dishes ?? [], [project.dishes]);
  const visibleDishes = useMemo(() => contentDishes.filter((dish) => dish.visible !== false), [contentDishes]);
  const dishesWithImages = useMemo(() => visibleDishes.filter((dish) => dish.imageUrl), [visibleDishes]);
  const categoryGroups = useMemo(() => contentCategories.map((category) => ({
    category,
    dishes: dishesWithImages.filter((dish) => dish.categoryId === category.id),
  })), [contentCategories, dishesWithImages]);
  const [openCategoryIds, setOpenCategoryIds] = useState(() => new Set(contentCategories.map((category) => category.id)));
  const [settings, setSettings] = useState(() => loadPromoProject(dishesWithImages));
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    setSettings((current) => ({ ...loadPromoProject(dishesWithImages.length ? dishesWithImages : contentDishes), ...current }));
  }, [contentDishes, dishesWithImages]);

  useEffect(() => {
    savePromoProject(settings);
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
  const activeFormat = getPromoFormat(settings.formatId);

  const updateSettings = (changes) => {
    setSettings((current) => {
      const activeFormatSettings = getActiveFormatSettings(current);
      const nextFormatSettings = { ...activeFormatSettings, ...changes };
      return {
        ...current,
        ...changes,
        formats: {
          ...(current.formats ?? {}),
          [current.formatId]: nextFormatSettings,
        },
      };
    });
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

  const resetLayoutOffsets = () => {
    updateSettings({ layoutOffsets: { ...DEFAULT_PROMO_LAYOUT_OFFSETS } });
  };

  const switchFormat = (formatId) => {
    setSettings((current) => {
      const currentFormatSettings = getActiveFormatSettings(current);
      const nextFormatSettings = getActiveFormatSettings(current, formatId);
      return {
        ...current,
        ...nextFormatSettings,
        formatId,
        formats: {
          ...(current.formats ?? {}),
          [current.formatId]: currentFormatSettings,
        },
      };
    });
  };

  const updateEffect = (key, value) => {
    updateSettings({
      effects: { ...DEFAULT_PROMO_EFFECTS, ...(settings.effects ?? {}), [key]: value },
    });
  };

  const handleDownloadPng = async () => {
    try {
      setExportStatus('Preparing PNG...');
      await downloadPromoPng(activeFormat, selectedDish);
      setExportStatus('PNG downloaded.');
    } catch (error) {
      console.error(error);
      setExportStatus('PNG export failed. Try again after images finish loading.');
    }
  };

  const handleDownloadMp4 = async () => {
    if (!selectedDish) {
      setExportStatus('Select a dish with an image before exporting MP4.');
      return;
    }

    try {
      setExportStatus('Recording MP4...');
      await downloadPromoMp4(activeFormat, selectedDish, settings);
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
          <span>{activeFormat.width} x {activeFormat.height} {activeFormat.name} scene.</span>
        </header>

        <PromoControlGroup title="Export">
          <div className="promo-duration-buttons">
            <button type="button" onClick={handleDownloadPng}>Download PNG</button>
            <button type="button" onClick={handleDownloadMp4}>Download MP4</button>
          </div>
          {exportStatus ? <small className="promo-preview-size">{exportStatus}</small> : null}
        </PromoControlGroup>

        <PromoControlGroup title="Format">
          <div className="promo-format-buttons">
            {PROMO_FORMATS.map((format) => (
              <button
                key={format.id}
                className={settings.formatId === format.id ? 'active' : ''}
                type="button"
                onClick={() => switchFormat(format.id)}
              >
                <strong>{format.label}</strong>
                <small>{format.width}×{format.height}</small>
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
                                <input type="radio" name="tv-promo-dish" checked={selected} onChange={() => setSettings((current) => ({ ...current, selectedDishId: dish.id }))} />
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
              <button
                key={duration}
                className={settings.duration === duration ? 'active' : ''}
                type="button"
                onClick={() => updateSettings({ duration })}
              >
                {duration}s
              </button>
            ))}
          </div>
        </PromoControlGroup>

        <PromoControlGroup title="Offer">
          <ToggleField label="Show offer text" checked={Boolean(settings.showOffer)} onChange={(showOffer) => updateSettings({ showOffer })} />
          <label className="image-menu-control">
            <span>Headline</span>
            <input value={settings.headline} placeholder={selectedDish ? getDishTitle(selectedDish) : 'Promo headline'} onChange={(event) => updateSettings({ headline: event.target.value })} />
          </label>
          <label className="image-menu-control">
            <span>Offer text</span>
            <input value={settings.offerText} placeholder="New, Today only, -20%" onChange={(event) => updateSettings({ offerText: event.target.value })} />
          </label>
          <ToggleField label="Show CTA" checked={Boolean(settings.showCta)} onChange={(showCta) => updateSettings({ showCta })} />
          <label className="image-menu-control">
            <span>CTA</span>
            <input value={settings.ctaText} placeholder="ORDER NOW" onChange={(event) => updateSettings({ ctaText: event.target.value })} />
          </label>
        </PromoControlGroup>

        <PromoControlGroup title="Appearance">
          <RangeControl label="Background tone" value={settings.backgroundTone} min={-40} max={40} onChange={(backgroundTone) => updateSettings({ backgroundTone })} />
          <RangeControl label="Dish size" value={settings.dishSize} min={100} max={650} onChange={(dishSize) => updateSettings({ dishSize })} suffix="px" />
          <ToggleField label="Show description" checked={Boolean(settings.showDescription)} onChange={(showDescription) => updateSettings({ showDescription })} />
          <RangeControl label="Description vertical offset" value={settings.descriptionOffsetY} min={-180} max={180} onChange={(descriptionOffsetY) => updateSettings({ descriptionOffsetY })} suffix="px" />
        </PromoControlGroup>

        <PromoControlGroup title="Layout">
          <LayoutOffsetControls settings={settings} updateLayoutOffset={updateLayoutOffset} resetLayoutOffsets={resetLayoutOffsets} />
        </PromoControlGroup>

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
              {group.items.map(([key, label]) => (
                <ToggleField key={key} label={label} checked={Boolean(settings.effects?.[key])} onChange={(value) => updateEffect(key, value)} />
              ))}
            </div>
          </PromoControlGroup>
        ))}

        {settings.effects?.gifOverlay ? (
          <PromoControlGroup title="GIF Overlay">
            <label className="image-menu-control">
              <span>GIF URL</span>
              <input value={settings.gifUrl} placeholder="Paste GIF URL" onChange={(event) => updateSettings({ gifUrl: event.target.value })} />
            </label>
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
            <label className="image-menu-control">
              <span>Size <strong>{settings.gifSize}%</strong></span>
              <input type="range" min="6" max="42" value={settings.gifSize} onChange={(event) => updateSettings({ gifSize: Number(event.target.value) })} />
            </label>
          </PromoControlGroup>
        ) : null}
      </aside>

      <main className="promo-generator-preview-stage">
        <div className="promo-generator-toolbar">
          <div>
            <p>Preview</p>
            <h2>{selectedDish ? getDishTitle(selectedDish) : 'Select dish'}</h2>
          </div>
          <div className="promo-output-pill">{activeFormat.label} · {activeFormat.width} × {activeFormat.height}</div>
        </div>
        <PromoPreview dish={selectedDish} settings={settings} index={selectedIndex} />
      </main>
    </section>
  );
}
