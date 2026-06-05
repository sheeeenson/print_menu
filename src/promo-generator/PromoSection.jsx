import { useEffect, useMemo, useState } from 'react';
import { PromoPreview } from './PromoPreview.jsx';
import { DEFAULT_PROMO_EFFECTS, loadPromoProject, PROMO_DURATIONS, savePromoProject } from './promoStorage.js';
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

export function PromoSection({ project }) {
  const dishesWithImages = useMemo(() => project.dishes.filter((dish) => dish.visible !== false && dish.imageUrl), [project.dishes]);
  const [settings, setSettings] = useState(() => loadPromoProject(dishesWithImages));

  useEffect(() => {
    setSettings((current) => ({ ...loadPromoProject(dishesWithImages.length ? dishesWithImages : project.dishes), ...current }));
  }, [dishesWithImages, project.dishes]);

  useEffect(() => {
    savePromoProject(settings);
  }, [settings]);

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

  return (
    <section className="promo-generator-section">
      <aside className="promo-generator-panel">
        <header className="promo-panel-header">
          <p>TV Promo</p>
          <h2>Promo Generator</h2>
          <span>1920 x 1080 Full HD scenes from existing dish photos.</span>
        </header>

        <PromoControlGroup title="Dish">
          <label className="image-menu-control">
            <span>Dish with image</span>
            <select
              value={selectedDish?.id ?? ''}
              onChange={(event) => updateSettings({ selectedDishId: event.target.value })}
              disabled={!dishesWithImages.length}
            >
              {dishesWithImages.length ? dishesWithImages.map((dish) => (
                <option key={dish.id} value={dish.id}>{getDishTitle(dish)}</option>
              )) : <option value="">No dishes with images</option>}
            </select>
          </label>
        </PromoControlGroup>

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
