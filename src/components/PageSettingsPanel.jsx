import { PAGE_TYPES, sizePresetsForPageType } from '../models/menu.js';

const PAGE_TYPE_OPTIONS = [
  [PAGE_TYPES.MENU, 'Menu'],
  [PAGE_TYPES.PROMO, 'Promo'],
  [PAGE_TYPES.FLYER, 'Flyer'],
  [PAGE_TYPES.SOCIAL_CREATIVE, 'Social Creative'],
];

export function PageSettingsPanel({ page, actions }) {
  const update = (field) => (event) => actions.updateSelectedPage({ [field]: event.target.value });
  const printOrMenu = page.pageType !== PAGE_TYPES.SOCIAL_CREATIVE;
  const sizePresets = sizePresetsForPageType(page.pageType);
  const selectedSize = sizePresets.find((preset) => preset.id === page.sizePreset);

  const updateCustomSize = (field) => (event) => actions.updateSelectedPage({ [field]: Number(event.target.value) });

  return (
    <section className="panel-section" aria-labelledby="page-settings-title">
      <p className="eyebrow">Settings</p>
      <h2 id="page-settings-title">Page settings</h2>
      <label className="field-label">Page name
        <input value={page.name} onChange={update('name')} />
      </label>
      <SelectField label="Page type" value={page.pageType} onChange={update('pageType')} options={PAGE_TYPE_OPTIONS} />
      <SelectField label="Size preset" value={page.sizePreset} onChange={(event) => actions.updateSelectedPageSize(event.target.value)} options={sizePresets.map((preset) => [preset.id, preset.label])} />
      <div className="two-column-fields panel-two-column">
        <label className="field-label">Width
          <input type="number" min="120" value={page.canvasWidth} onChange={updateCustomSize('canvasWidth')} disabled={selectedSize?.id !== 'customPrint' && selectedSize?.id !== 'customSocial'} />
        </label>
        <label className="field-label">Height
          <input type="number" min="120" value={page.canvasHeight} onChange={updateCustomSize('canvasHeight')} disabled={selectedSize?.id !== 'customPrint' && selectedSize?.id !== 'customSocial'} />
        </label>
      </div>
      {printOrMenu ? (
        <>
          <div className="two-column-fields panel-two-column">
            <SelectField label="Paper size" value={page.paperSize} onChange={update('paperSize')} options={[['A6', 'A6'], ['A5', 'A5'], ['A4', 'A4'], ['A3', 'A3'], ['DL', 'DL'], ['Square', 'Square'], ['Custom', 'Custom']]} />
            <SelectField label="Orientation" value={page.orientation} onChange={update('orientation')} options={[['portrait', 'Portrait'], ['landscape', 'Landscape']]} />
          </div>
          <SelectField label="Language mode" value={page.languageMode} onChange={update('languageMode')} options={[['en', 'English'], ['ge', 'Georgian'], ['bilingual', 'Bilingual']]} />
          <SelectField label="Layout template" value={page.layoutTemplate} onChange={update('layoutTemplate')} options={[['photoCards', 'Photo Cards'], ['classicList', 'Classic List'], ['compact', 'Compact']]} />
          <SelectField label="Fitting mode" value={page.fittingMode} onChange={update('fittingMode')} options={[['fixed', 'Fixed'], ['autoFill', 'Auto-fill'], ['compact', 'Compact']]} />
        </>
      ) : (
        <p className="muted-text">Digital canvas size is stored as exact pixels for export. Use creative controls below for content and layout.</p>
      )}
    </section>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field-label">{label}
      <select value={value} onChange={onChange}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}
