export function CardStyleControls({ page, actions }) {
  const settings = page.designSettings;
  const update = (field) => (event) => actions.updateSelectedPageDesign(field, event.target.type === 'checkbox' ? event.target.checked : event.target.value);

  return (
    <div className="design-subpanel">
      <h3 className="panel-subtitle">Cards & images</h3>
      <label className="toggle-label">
        <input type="checkbox" checked={settings.cardBorderEnabled} onChange={update('cardBorderEnabled')} />
        Card border
      </label>
      <label className="color-label">Card border color
        <span>
          <input type="color" value={settings.cardBorderColor} onChange={update('cardBorderColor')} />
          <input value={settings.cardBorderColor} onChange={update('cardBorderColor')} />
        </span>
      </label>
      <label className="toggle-label">
        <input type="checkbox" checked={settings.cardShadowEnabled} onChange={update('cardShadowEnabled')} />
        Card shadow
      </label>
      <label className="field-label">Image fit
        <select value={settings.imageFit} onChange={update('imageFit')}>
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
        </select>
      </label>
      <LineClampSlider settings={settings} field="titleLineClamp" label="Title line clamp" max={4} actions={actions} />
      <LineClampSlider settings={settings} field="descriptionLineClamp" label="Description line clamp" max={6} actions={actions} />
    </div>
  );
}

function LineClampSlider({ settings, field, label, max, actions }) {
  const value = settings[field];
  return (
    <label className="slider-label">
      <span>{label}<strong>{value} lines</strong></span>
      <input
        type="range"
        min="1"
        max={max}
        step="1"
        value={value}
        onChange={(event) => actions.updateSelectedPageDesign(field, Number(event.target.value))}
      />
    </label>
  );
}
