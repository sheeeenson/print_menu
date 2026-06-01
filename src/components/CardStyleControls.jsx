export function CardStyleControls({ page, actions }) {
  const settings = page.designSettings;
  const update = (field) => (event) => actions.updateSelectedPageDesign(field, event.target.type === 'checkbox' ? event.target.checked : event.target.value);

  return (
    <div className="design-subpanel">
      <h3 className="panel-subtitle">Cards &amp; badges</h3>
      <label className="field-label">Badge position
        <select value={settings.badgePosition} onChange={update('badgePosition')}>
          <option value="topLeft">Top left</option>
          <option value="topRight">Top right</option>
          <option value="bottomLeft">Bottom left</option>
          <option value="bottomRight">Bottom right</option>
        </select>
      </label>
    </div>
  );
}
