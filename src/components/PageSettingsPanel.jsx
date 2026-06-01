export function PageSettingsPanel({ page, actions }) {
  const update = (field) => (event) => actions.updateSelectedPage({ [field]: event.target.value });

  return (
    <section className="panel-section" aria-labelledby="page-settings-title">
      <p className="eyebrow">Settings</p>
      <h2 id="page-settings-title">Page settings</h2>
      <label className="field-label">Page name
        <input value={page.name} onChange={update('name')} />
      </label>
      <div className="two-column-fields panel-two-column">
        <SelectField label="Paper size" value={page.paperSize} onChange={update('paperSize')} options={[["A4", "A4"], ["A3", "A3"]]} />
        <SelectField label="Orientation" value={page.orientation} onChange={update('orientation')} options={[["portrait", "Portrait"], ["landscape", "Landscape"]]} />
      </div>
      <SelectField label="Language mode" value={page.languageMode} onChange={update('languageMode')} options={[["en", "English"], ["ge", "Georgian"], ["bilingual", "Bilingual"]]} />
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
