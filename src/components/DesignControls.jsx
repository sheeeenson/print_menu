import { useEffect } from 'react';
import { ColorControls } from './ColorControls.jsx';
import { GOOGLE_FONT_OPTIONS } from '../utils/typography.js';

const controls = [
  ['pageMargin', 'Page margin', 12, 80, 1],
  ['cardGap', 'Card gap', 4, 40, 1],
  ['uniformCardHeight', 'Card height', 160, 360, 1, 230],
  ['cardPadding', 'Card padding', 6, 32, 1],
  ['cardRadius', 'Card radius', 0, 32, 1],
  ['imageHeight', 'Image height', 60, 260, 1],
  ['imageToTitleGap', 'Image to title gap', 0, 40, 0.5, 1.5],
  ['imageTitleGap', 'Title/content gap', 0, 40, 0.5, 1.5],
  ['categoryTitleFontSize', 'Category title', 18, 44, 1],
  ['dishTitleFontSize', 'Dish title', 12, 34, 1],
  ['descriptionFontSize', 'Description', 9, 20, 1],
  ['oldPriceFontSize', 'Old price', 9, 22, 1],
  ['newPriceFontSize', 'New price', 12, 32, 1],
  ['badgeFontSize', 'Badge', 8, 18, 1],
  ['weightFontSize', 'Weight', 8, 18, 1],
];

const fontWeightOptions = [400, 500, 600, 700, 800, 850, 900, 950];

export function DesignControls({ page, actions }) {
  useEffect(() => {
    const imageToTitleGap = Number(page.designSettings.imageToTitleGap ?? 1.5);
    const titleContentGap = Number(page.designSettings.imageTitleGap ?? 1.5);
    const uniformCardHeight = Number(page.designSettings.uniformCardHeight ?? 230);
    document.documentElement.style.setProperty('--image-to-title-gap', `${imageToTitleGap}px`);
    document.documentElement.style.setProperty('--image-title-gap', `${titleContentGap}px`);
    document.documentElement.style.setProperty('--uniform-card-height', `${uniformCardHeight}px`);
  }, [page.designSettings.imageToTitleGap, page.designSettings.imageTitleGap, page.designSettings.uniformCardHeight]);

  return (
    <details className="panel-section collapsible-panel" open>
      <summary>
        <span>
          <span className="eyebrow">Design</span>
          <strong>Visual design settings</strong>
        </span>
      </summary>
      <ColorControls page={page} actions={actions} />
      <TypographyControls page={page} actions={actions} />
      <div className="design-subpanel">
        <h3 className="panel-subtitle">Spacing & typography</h3>
        <p className="muted-text">Card gap controls both horizontal and vertical spacing. Card height keeps names and prices aligned across cards in non-designer layouts.</p>
        <div className="design-control-list">
          {controls.map(([field, label, min, max, step, fallback]) => (
            <DesignSlider key={field} page={page} field={field} label={label} min={min} max={max} step={step} fallback={fallback} actions={actions} />
          ))}
        </div>
      </div>
    </details>
  );
}

function TypographyControls({ page, actions }) {
  const settings = page.designSettings;
  const custom = (field, value) => {
    actions.updateSelectedPage({ designSettings: { ...settings, fontPreset: 'custom', [field]: value } });
  };

  return (
    <div className="design-subpanel">
      <h3 className="panel-subtitle">Font system</h3>
      <FontPairControl label="Category" familyField="categoryFontFamily" weightField="categoryFontWeight" settings={settings} onChange={custom} />
      <FontPairControl label="Dish title" familyField="dishTitleFontFamily" weightField="dishTitleFontWeight" settings={settings} onChange={custom} />
      <FontPairControl label="Description" familyField="descriptionFontFamily" weightField="descriptionFontWeight" settings={settings} onChange={custom} />
      <FontPairControl label="Price" familyField="priceFontFamily" weightField="priceFontWeight" settings={settings} onChange={custom} />
      <FontPairControl label="Badge" familyField="badgeFontFamily" weightField="badgeFontWeight" settings={settings} onChange={custom} />
      <FontFamilyControl label="Header/footer font" field="headerFooterFontFamily" settings={settings} onChange={custom} />
      <LetterSpacingControl label="Category spacing" field="categoryLetterSpacing" settings={settings} onChange={custom} />
      <LetterSpacingControl label="Dish title spacing" field="dishTitleLetterSpacing" settings={settings} onChange={custom} />
      <LetterSpacingControl label="Price spacing" field="priceLetterSpacing" settings={settings} onChange={custom} />
      <label className="toggle-label">
        <input type="checkbox" checked={settings.categoryUppercase} onChange={(event) => custom('categoryUppercase', event.target.checked)} />
        Uppercase category titles
      </label>
      <label className="toggle-label">
        <input type="checkbox" checked={settings.dishTitleUppercase} onChange={(event) => custom('dishTitleUppercase', event.target.checked)} />
        Uppercase dish titles
      </label>
    </div>
  );
}

function SelectControl({ label, value, onChange, options }) {
  return (
    <label className="field-label">{label}
      <select value={value} onChange={onChange}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function FontPairControl({ label, familyField, weightField, settings, onChange }) {
  return (
    <div className="font-pair-control">
      <FontFamilyControl label={`${label} font`} field={familyField} settings={settings} onChange={onChange} />
      <WeightControl label={`${label} weight`} field={weightField} settings={settings} onChange={onChange} />
    </div>
  );
}

function FontFamilyControl({ label, field, settings, onChange }) {
  return <SelectControl label={label} value={settings[field]} onChange={(event) => onChange(field, event.target.value)} options={GOOGLE_FONT_OPTIONS} />;
}

function WeightControl({ label, field, settings, onChange }) {
  return <SelectControl label={label} value={settings[field]} onChange={(event) => onChange(field, Number(event.target.value))} options={fontWeightOptions.map((weight) => [weight, String(weight)])} />;
}

function LetterSpacingControl({ label, field, settings, onChange }) {
  const value = Number(settings[field] ?? 0);
  return (
    <label className="slider-label">
      <span>{label}<strong>{value.toFixed(2)}em</strong></span>
      <input type="range" min="-0.06" max="0.12" step="0.01" value={value} onChange={(event) => onChange(field, Number(event.target.value))} />
    </label>
  );
}

function DesignSlider({ page, field, label, min, max, step, fallback = 0, actions }) {
  const value = page.designSettings[field] ?? fallback;
  return (
    <label className="slider-label">
      <span>{label}<strong>{value}px</strong></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => actions.updateSelectedPageDesign(field, Number(event.target.value))}
      />
    </label>
  );
}
