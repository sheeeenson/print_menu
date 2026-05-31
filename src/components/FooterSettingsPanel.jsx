export function FooterSettingsPanel({ page, actions }) {
  const footer = page.footer;
  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'range' ? Number(event.target.value) : event.target.value;
    actions.updateSelectedPageFooter(field, value);
  };

  return (
    <details className="panel-section collapsible-panel" open>
      <summary>
        <span>
          <span className="eyebrow">Builder</span>
          <strong>Footer</strong>
        </span>
      </summary>
      <label className="toggle-label">
        <input type="checkbox" checked={footer.enabled} onChange={update('enabled')} />
        Enable footer
      </label>
      <div className="design-control-list">
        <FooterSlider footer={footer} field="height" label="Footer height" min={28} max={120} onChange={update('height')} />
        <FooterSelect footer={footer} field="alignment" label="Footer alignment" onChange={update('alignment')} options={[['top', 'Top'], ['center', 'Center'], ['bottom', 'Bottom']]} />
        <FooterSlider footer={footer} field="fontSize" label="Footer font size" min={8} max={24} onChange={update('fontSize')} />
      </div>
      <FooterTextInput footer={footer} field="leftTextEn" label="Left text EN" onChange={update('leftTextEn')} />
      <FooterTextInput footer={footer} field="leftTextGe" label="Left text GE" onChange={update('leftTextGe')} />
      <FooterTextInput footer={footer} field="centerTextEn" label="Center text EN" onChange={update('centerTextEn')} />
      <FooterTextInput footer={footer} field="centerTextGe" label="Center text GE" onChange={update('centerTextGe')} />
      <FooterTextInput footer={footer} field="rightTextEn" label="Right text EN" onChange={update('rightTextEn')} />
      <FooterTextInput footer={footer} field="rightTextGe" label="Right text GE" onChange={update('rightTextGe')} />
    </details>
  );
}

function FooterTextInput({ footer, field, label, onChange }) {
  return <label className="field-label">{label}<input value={footer[field]} onChange={onChange} /></label>;
}

function FooterSelect({ footer, field, label, options, onChange }) {
  return (
    <label className="field-label">{label}
      <select value={footer[field]} onChange={onChange}>
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function FooterSlider({ footer, field, label, min, max, onChange }) {
  const value = footer[field];
  return (
    <label className="slider-label">
      <span>{label}<strong>{value}px</strong></span>
      <input type="range" min={min} max={max} step="1" value={value} onChange={onChange} />
    </label>
  );
}
