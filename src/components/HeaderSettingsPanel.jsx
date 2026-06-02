export function HeaderSettingsPanel({ page, actions }) {
  const header = page.header;
  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'range' ? Number(event.target.value) : event.target.value;
    actions.updateSelectedPageHeader(field, value);
  };

  return (
    <details className="panel-section collapsible-panel" open>
      <summary>
        <span>
          <span className="eyebrow">Builder</span>
          <strong>Header</strong>
        </span>
      </summary>
      <label className="toggle-label">
        <input type="checkbox" checked={header.enabled} onChange={update('enabled')} />
        Enable header
      </label>
      <div className="design-control-list">
        <HeaderSlider header={header} field="height" label="Header height" min={36} max={160} onChange={update('height')} />
        <HeaderSlider header={header} field="fontSize" label="Header font size" min={9} max={28} onChange={update('fontSize')} />
      </div>
      <h3 className="panel-subtitle">Divider line</h3>
      <label className="toggle-label">
        <input type="checkbox" checked={header.showDivider} onChange={update('showDivider')} />
        Show header divider
      </label>
      <HeaderColorInput header={header} field="dividerColor" label="Divider color" onChange={update('dividerColor')} />
      <HeaderSlider header={header} field="dividerWidth" label="Divider width" min={0} max={12} onChange={update('dividerWidth')} />
      <h3 className="panel-subtitle">Left side</h3>
      <HeaderSelect header={header} field="leftLogoType" label="Left logo type" onChange={update('leftLogoType')} options={[["none", "None"], ["url", "Image URL"]]} />
      <HeaderTextInput header={header} field="leftLogoUrl" label="Left logo URL" onChange={update('leftLogoUrl')} />
      <HeaderSlider header={header} field="leftLogoSize" label="Left logo size" min={24} max={120} onChange={update('leftLogoSize')} />
      <HeaderTextInput header={header} field="leftTextEn" label="Left text EN" onChange={update('leftTextEn')} />
      <HeaderTextInput header={header} field="leftTextGe" label="Left text GE" onChange={update('leftTextGe')} />
      <h3 className="panel-subtitle">Right side</h3>
      <HeaderTextInput header={header} field="rightTextEn" label="Right text EN" onChange={update('rightTextEn')} />
      <HeaderTextInput header={header} field="rightTextGe" label="Right text GE" onChange={update('rightTextGe')} />
      <HeaderSelect header={header} field="rightImageType" label="Right image type" onChange={update('rightImageType')} options={[["none", "None"], ["url", "Image URL"]]} />
      <HeaderTextInput header={header} field="rightImageUrl" label="Right image URL" onChange={update('rightImageUrl')} />
      <HeaderSlider header={header} field="rightImageSize" label="Right image size" min={24} max={120} onChange={update('rightImageSize')} />
    </details>
  );
}

function HeaderTextInput({ header, field, label, onChange }) {
  return <label className="field-label">{label}<input value={header[field]} onChange={onChange} /></label>;
}

function HeaderColorInput({ header, field, label, onChange }) {
  const value = header[field];
  return (
    <label className="color-label">{label}
      <span>
        <input type="color" value={value} onChange={onChange} />
        <input value={value} onChange={onChange} />
      </span>
    </label>
  );
}

function HeaderSelect({ header, field, label, options, onChange }) {
  return (
    <label className="field-label">{label}
      <select value={header[field]} onChange={onChange}>
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function HeaderSlider({ header, field, label, min, max, onChange }) {
  const value = header[field];
  return (
    <label className="slider-label">
      <span>{label}<strong>{value}px</strong></span>
      <input type="range" min={min} max={max} step="1" value={value} onChange={onChange} />
    </label>
  );
}
