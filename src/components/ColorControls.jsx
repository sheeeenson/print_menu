const colorControls = [
  ['backgroundColor', 'Page background color'],
  ['cardBackgroundColor', 'Card background color'],
  ['textColor', 'Main text color'],
  ['mutedTextColor', 'Muted text color'],
  ['accentColor', 'Accent color'],
  ['priceColor', 'Price color'],
];

export function ColorControls({ page, actions }) {
  return (
    <div className="design-subpanel">
      <h3 className="panel-subtitle">Colors</h3>
      <div className="color-control-grid">
        {colorControls.map(([field, label]) => <ColorInput key={field} page={page} field={field} label={label} actions={actions} />)}
      </div>
    </div>
  );
}

function ColorInput({ page, field, label, actions }) {
  const value = page.designSettings[field];
  const update = (event) => actions.updateSelectedPageDesign(field, event.target.value);

  return (
    <label className="color-label">{label}
      <span>
        <input type="color" value={value} onChange={update} />
        <input value={value} onChange={update} />
      </span>
    </label>
  );
}
