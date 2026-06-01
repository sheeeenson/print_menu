import { CardStyleControls } from './CardStyleControls.jsx';
import { ColorControls } from './ColorControls.jsx';
import { GOOGLE_FONT_OPTIONS } from '../utils/typography.js';

const controls = [
  ['pageMargin', 'Page margin', 12, 80, 1],
  ['cardGap', 'Card gap', 4, 40, 1],
  ['cardPadding', 'Card padding', 6, 32, 1],
  ['cardRadius', 'Card radius', 0, 32, 1],
  ['imageHeight', 'Image height', 60, 220, 1],
  ['categoryTitleFontSize', 'Category title', 18, 44, 1],
  ['dishTitleFontSize', 'Dish title', 12, 28, 1],
  ['descriptionFontSize', 'Description', 9, 18, 1],
  ['oldPriceFontSize', 'Old price', 9, 20, 1],
  ['newPriceFontSize', 'New price', 12, 28, 1],
  ['badgeFontSize', 'Badge', 8, 18, 1],
  ['weightFontSize', 'Weight', 8, 18, 1],
];

const fontWeightOptions = [400, 500, 600, 700, 800, 850, 900, 950];

export function DesignControls({ page, actions }) {
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
      <CardStyleControls page={page} actions={actions} />
      <div className="design-subpanel">
        <h3 className="panel-subtitle">Spacing & typography</h3>
        <p className="muted-text">Layout-specific grid controls live in the main Layout panel above. This section only changes visual spacing, type sizes, and card styling.</p>
        <div className="design-control-list">
          {controls.map(([field, label, min, max, step]) => (
            <DesignSlider key={field} page={page} field={field} label={label} min={min} max={max} step={step} actions={actions} />
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
      <FontFamilyControl label="Category font" field="categoryFontFamily" settings={settings} onChange={custom} />
      <FontFamilyControl label="Dish title font" field="dishTitleFontFamily" settings={settings} onChange={custom} />
      <FontFamilyControl label="Description font" field="descriptionFontFamily" settings={settings} onChange={custom} />
      <FontFamilyControl label="Price font" field="priceFontFamily" settings={settings} onChange={custom} />
      <FontFamilyControl label="Badge font" field="badgeFontFamily" settings={settings} onChange={custom} />
      <FontFamilyControl label="Header/footer font" field="headerFooterFontFamily" settings={settings} onChange={custom} />
      <div className="two-column-fields panel-two-column">
        <WeightControl label="Category weight" field="categoryFontWeight" settings={settings} onChange={custom} />
        <WeightControl label="Dish weight" field="dishTitleFontWeight" settings={settings} onChange={custom} />
        <WeightControl label="Description weight" field="descriptionFontWeight" settings={settings} onChange={custom} />
        <WeightControl label="Price weight" field="priceFontWeight" settings={settings} onChange={custom} />
        <WeightControl label="Badge weight" field="badgeFontWeight" settings={settings} onChange={custom} />
      </div>
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

function DesignSlider({ page, field, label, min, max, step, actions }) {
  const value = page.designSettings[field];
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
