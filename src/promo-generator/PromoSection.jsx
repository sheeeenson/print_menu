import { useEffect, useMemo, useState } from 'react';
import { PromoPreview } from './PromoPreview.jsx';
import { DEFAULT_PROMO_EFFECTS, loadPromoProject, PROMO_DURATIONS, PROMO_FONT_OPTIONS, savePromoProject } from './promoStorage.js';
import './promoGenerator.css';

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

const getDishTitle = (dish) => dish?.nameEn || dish?.nameGe || 'Untitled dish';

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

  const updateSettings = (changes) => {
    setSettings((current) => ({ ...current, ...changes }));
  };

  const updateEffect = (key, value) => {
    setSettings((current) => ({
      ...current,
      effects: { ...DEFAULT_PROMO_EFFECTS, ...(current.effects ?? {}), [key]: value },
    }));
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
          <span>1920 x 1080 Full HD scenes from existing dish photos.</span>
        </header>

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
          <label className="image-menu-control">
            <span>Headline</span>
            <input value={settings.headline} placeholder={selectedDish ? getDishTitle(selectedDish) : 'Promo headline'} onChange={(event) => updateSettings({ headline: event.target.value })} />
          </label>
          <label className="image-menu-control">
            <span>Offer text</span>
            <input value={settings.offerText} placeholder="New, Today only, -20%" onChange={(event) => updateSettings({ offerText: event.target.value })} />
          </label>
          <label className="image-menu-control">
            <span>CTA</span>
            <input value={settings.ctaText} placeholder="ORDER NOW" onChange={(event) => updateSettings({ ctaText: event.target.value })} />
          </label>
        </PromoControlGroup>

        <PromoControlGroup title="Appearance">
          <RangeControl label="Background tone" value={settings.backgroundTone} min={-40} max={40} onChange={(backgroundTone) => updateSettings({ backgroundTone })} />
          <RangeControl label="Dish size" value={settings.dishSize} min={100} max={650} onChange={(dishSize) => updateSettings({ dishSize })} suffix="px" />
          <ToggleField label="Show description" checked={Boolean(settings.showDescription)} onChange={(showDescription) => updateSettings({ showDescription })} />
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
                <option value="textLeft">Text left</option>
                <option value="topLeft">Top left</option>
                <option value="topRight">Top right</option>
                <option value="bottomLeft">Bottom left</option>
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
          <div className="promo-output-pill">1920 x 1080</div>
        </div>
        <PromoPreview dish={selectedDish} settings={settings} index={selectedIndex} />
      </main>
    </section>
  );
}
