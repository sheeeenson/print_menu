import { useState } from 'react';
import { CardStyleControls } from './CardStyleControls.jsx';
import { ColorControls } from './ColorControls.jsx';
import { FONT_PRESETS, FONT_STACKS } from '../utils/typography.js';

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

const fontPresetOptions = [
  ['cleanModern', 'Clean Modern'],
  ['premiumRestaurant', 'Premium Restaurant'],
  ['sushiPromo', 'Sushi Promo'],
  ['minimalGeorgian', 'Minimal Georgian'],
  ['boldDiscount', 'Bold Discount'],
  ['classicMenu', 'Classic Menu'],
  ['custom', 'Custom'],
];

const fontFamilyOptions = [
  [FONT_STACKS.modernSans, 'Modern Sans'],
  [FONT_STACKS.premiumSerif, 'Premium Serif'],
  [FONT_STACKS.georgianClean, 'Georgian Clean'],
  [FONT_STACKS.boldPromo, 'Bold Promo'],
  [FONT_STACKS.classicMenu, 'Classic Menu'],
];

const fontWeightOptions = [400, 500, 600, 700, 800, 850, 900, 950];

export function DesignControls({ page, actions }) {
  return (
    <details className="panel-section collapsible-panel" open>
      <summary>
        <span>
          <span className="eyebrow">Design</span>
          <strong>Page design settings</strong>
        </span>
      </summary>
      <ColorControls page={page} actions={actions} />
      <TypographyControls page={page} actions={actions} />
      <GridBuilderControls page={page} actions={actions} />
      <CardStyleControls page={page} actions={actions} />
      <FitAllControls page={page} actions={actions} />
      <div className="design-subpanel">
        <h3 className="panel-subtitle">Spacing & typography</h3>
        <div className="design-control-list">
          {controls.map(([field, label, min, max, step]) => (
            <DesignSlider key={field} page={page} field={field} label={label} min={min} max={max} step={step} actions={actions} />
          ))}
        </div>
      </div>
    </details>
  );
}


const gridPresetOptions = [
  ['oneColumn', '1 Column'],
  ['twoColumns', '2 Columns'],
  ['threeColumns', '3 Columns'],
  ['fourColumns', '4 Columns'],
  ['fiveColumns', '5 Columns'],
  ['catalogGrid', 'Catalog Grid'],
  ['magazineGrid', 'Magazine Grid'],
  ['heroGrid', 'Hero + Grid'],
  ['bentoGrid', 'Bento Grid'],
  ['textColumns', 'Text Columns'],
];

const heroSpanOptions = [
  ['2x1', '2x1'],
  ['2x2', '2x2'],
  ['3x2', '3x2'],
];

const defaultSpanOptions = [
  ['1x1', '1x1'],
  ['2x1', '2x1'],
];

function GridBuilderControls({ page, actions }) {
  const settings = page.designSettings;
  const customGrid = settings.customGrid;
  const [presetName, setPresetName] = useState('');
  const updateDesign = (field) => (event) => actions.updateSelectedPageDesign(field, event.target.type === 'checkbox' ? event.target.checked : event.target.value);
  const updateCustomGrid = (field) => (event) => actions.updateSelectedPageCustomGrid(field, event.target.type === 'checkbox' ? event.target.checked : Number(event.target.value));
  const savePreset = () => {
    actions.saveSelectedPageCustomGridPreset(presetName);
    setPresetName('');
  };

  return (
    <div className="design-subpanel grid-builder-panel">
      <h3 className="panel-subtitle">Grid builder</h3>
      <SelectControl label="Grid mode" value={settings.gridMode} onChange={updateDesign('gridMode')} options={[['preset', 'Preset grid'], ['custom', 'Custom grid'], ['autoFill', 'Auto-fill']]} />
      {settings.gridMode === 'preset' ? (
        <SelectControl label="Grid preset" value={settings.gridPreset} onChange={updateDesign('gridPreset')} options={gridPresetOptions} />
      ) : null}
      {settings.gridMode === 'custom' ? (
        <>
          <GridNumberControl label="Rows" value={customGrid.rows} min={1} max={12} onChange={updateCustomGrid('rows')} />
          <GridNumberControl label="Columns" value={customGrid.columns} min={1} max={8} onChange={updateCustomGrid('columns')} />
          <GridNumberControl label="Gap" value={customGrid.gap} min={0} max={64} suffix="px" onChange={updateCustomGrid('gap')} />
          <label className="toggle-label"><input type="checkbox" checked={customGrid.autoRows} onChange={updateCustomGrid('autoRows')} />Auto rows</label>
          <label className="toggle-label"><input type="checkbox" checked={customGrid.densePacking} onChange={updateCustomGrid('densePacking')} />Dense packing</label>
          <label className="toggle-label"><input type="checkbox" checked={settings.makeFirstItemHero} onChange={updateDesign('makeFirstItemHero')} />Make first item hero</label>
          <div className="two-column-fields panel-two-column">
            <SelectControl label="Hero item span" value={settings.heroItemSpan} onChange={updateDesign('heroItemSpan')} options={heroSpanOptions} />
            <SelectControl label="Default item span" value={settings.defaultItemSpan} onChange={updateDesign('defaultItemSpan')} options={defaultSpanOptions} />
          </div>
          <div className="saved-grid-card">
            <label className="field-label">Preset name
              <input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Lunch flyer grid" />
            </label>
            <button className="secondary-action compact" type="button" onClick={savePreset}>Save current grid as preset</button>
          </div>
          {settings.customGridPresets.length ? (
            <div className="saved-grid-list">
              <strong>Saved grid presets</strong>
              {settings.customGridPresets.map((preset) => (
                <div className="saved-grid-row" key={preset.id}>
                  <span>{preset.name}</span>
                  <button type="button" onClick={() => actions.applySelectedPageCustomGridPreset(preset.id)}>Apply</button>
                  <button className="danger" type="button" onClick={() => actions.deleteSelectedPageCustomGridPreset(preset.id)}>Delete</button>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {settings.gridMode === 'autoFill' ? <p className="fit-help-text">Auto-fill uses the existing fitting engine to calculate rows, columns, and card sizing.</p> : null}
    </div>
  );
}

function GridNumberControl({ label, value, min, max, suffix = '', onChange }) {
  return (
    <label className="slider-label grid-number-control">
      <span>{label}<strong>{value}{suffix}</strong></span>
      <input type="range" min={min} max={max} step="1" value={value} onChange={onChange} />
      <input type="number" min={min} max={max} value={value} onChange={onChange} />
    </label>
  );
}

function TypographyControls({ page, actions }) {
  const settings = page.designSettings;
  const updateDesign = (field, value) => actions.updateSelectedPageDesign(field, value);
  const applyPreset = (event) => {
    const preset = event.target.value;
    if (preset === 'custom') {
      updateDesign('fontPreset', 'custom');
      return;
    }
    actions.updateSelectedPage({
      designSettings: {
        ...settings,
        fontPreset: preset,
        ...FONT_PRESETS[preset],
      },
    });
  };
  const custom = (field, value) => {
    actions.updateSelectedPage({ designSettings: { ...settings, fontPreset: 'custom', [field]: value } });
  };

  return (
    <div className="design-subpanel">
      <h3 className="panel-subtitle">Font system</h3>
      <SelectControl label="Font pairing" value={settings.fontPreset} onChange={applyPreset} options={fontPresetOptions} />
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

function FitAllControls({ page, actions }) {
  const settings = page.designSettings;
  const strategy = settings.fitStrategy;
  const updateStrategy = (field) => (event) => actions.updateSelectedPageFitStrategy(field, event.target.type === 'checkbox' ? event.target.checked : Number(event.target.value));

  return (
    <div className="design-subpanel">
      <h3 className="panel-subtitle">Guaranteed fit</h3>
      <label className="toggle-label">
        <input type="checkbox" checked={settings.fitAllItems} onChange={(event) => actions.updateSelectedPageDesign('fitAllItems', event.target.checked)} />
        Fit all selected dishes on this page
      </label>
      {settings.fitAllItems ? <p className="fit-help-text">Preview will shrink cards, images, or text only within the limits below and will warn instead of silently clipping.</p> : null}
      <label className="toggle-label"><input type="checkbox" checked={strategy.allowShrinkCards} onChange={updateStrategy('allowShrinkCards')} />Allow shrink cards</label>
      <label className="toggle-label"><input type="checkbox" checked={strategy.allowShrinkImages} onChange={updateStrategy('allowShrinkImages')} />Allow shrink images</label>
      <label className="toggle-label"><input type="checkbox" checked={strategy.allowShrinkText} onChange={updateStrategy('allowShrinkText')} />Allow shrink text</label>
      <label className="toggle-label"><input type="checkbox" checked={strategy.allowHideDescriptions} onChange={updateStrategy('allowHideDescriptions')} />Allow hide descriptions if needed</label>
      <label className="toggle-label"><input type="checkbox" checked={strategy.allowCompactFallback} onChange={updateStrategy('allowCompactFallback')} />Allow compact fallback</label>
      <FitSlider label="Minimum readable font size" value={strategy.minReadableFontSize} min={6} max={16} suffix="px" onChange={updateStrategy('minReadableFontSize')} />
      <FitSlider label="Minimum card height" value={strategy.minCardHeight} min={48} max={220} suffix="px" onChange={updateStrategy('minCardHeight')} />
      <FitSlider label="Minimum image height" value={strategy.minImageHeight} min={0} max={140} suffix="px" onChange={updateStrategy('minImageHeight')} />
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
  return <SelectControl label={label} value={settings[field]} onChange={(event) => onChange(field, event.target.value)} options={fontFamilyOptions} />;
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

function FitSlider({ label, value, min, max, suffix, onChange }) {
  return (
    <label className="slider-label">
      <span>{label}<strong>{value}{suffix}</strong></span>
      <input type="range" min={min} max={max} step="1" value={value} onChange={onChange} />
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
