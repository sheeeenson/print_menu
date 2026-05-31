export function CardStyleControls({ page, actions }) {
  const settings = page.designSettings;
  const update = (field) => (event) => actions.updateSelectedPageDesign(field, event.target.type === 'checkbox' ? event.target.checked : event.target.value);
  const updateNumber = (field) => (event) => actions.updateSelectedPageDesign(field, Number(event.target.value));

  return (
    <div className="design-subpanel">
      <h3 className="panel-subtitle">Cards &amp; images</h3>
      <label className="toggle-label">
        <input type="checkbox" checked={settings.showDescriptions} onChange={update('showDescriptions')} />
        Show descriptions
      </label>
      <label className="toggle-label">
        <input type="checkbox" checked={settings.showImages} onChange={update('showImages')} />
        Show images
      </label>
      <label className="field-label">Card density
        <select value={settings.cardDensity} onChange={update('cardDensity')}>
          <option value="airy">Airy</option>
          <option value="balanced">Balanced</option>
          <option value="compact">Compact</option>
        </select>
      </label>
      <label className="field-label">Category title style
        <select value={settings.categoryTitleStyle} onChange={update('categoryTitleStyle')}>
          <option value="plain">Plain</option>
          <option value="underline">Underline</option>
          <option value="accentBar">Accent bar</option>
          <option value="pill">Pill</option>
          <option value="centered">Centered</option>
        </select>
      </label>
      <label className="field-label">Image ratio
        <select value={settings.imageRatio} onChange={update('imageRatio')} disabled={!settings.showImages}>
          <option value="custom">Custom height slider</option>
          <option value="square">Square</option>
          <option value="fourThree">4:3</option>
          <option value="sixteenNine">16:9</option>
          <option value="wide">Wide</option>
        </select>
      </label>
      <label className="field-label">Card content layout
        <select value={settings.cardContentLayout} onChange={update('cardContentLayout')} disabled={!settings.showImages}>
          <option value="textBelowImage">Text below image</option>
          <option value="textRightOfImage">Text right of image</option>
          <option value="textLeftOfImage">Text left of image</option>
        </select>
      </label>
      <label className="field-label">Badge position
        <select value={settings.badgePosition} onChange={update('badgePosition')}>
          <option value="topLeft">Top left</option>
          <option value="topRight">Top right</option>
          <option value="bottomLeft">Bottom left</option>
          <option value="bottomRight">Bottom right</option>
        </select>
      </label>
      <label className="toggle-label">
        <input type="checkbox" checked={settings.cardBorderEnabled} onChange={update('cardBorderEnabled')} />
        Border enabled
      </label>
      <label className="color-label">Card border color
        <span>
          <input type="color" value={settings.cardBorderColor} onChange={update('cardBorderColor')} disabled={!settings.cardBorderEnabled} />
          <input value={settings.cardBorderColor} onChange={update('cardBorderColor')} disabled={!settings.cardBorderEnabled} />
        </span>
      </label>
      <CardSlider
        value={settings.cardBorderWidth}
        label="Border width"
        suffix="px"
        min={0}
        max={8}
        step={1}
        disabled={!settings.cardBorderEnabled}
        onChange={updateNumber('cardBorderWidth')}
      />
      <CardSlider
        value={settings.cardBorderOpacity}
        label="Border opacity"
        suffix="%"
        min={0}
        max={100}
        step={1}
        disabled={!settings.cardBorderEnabled}
        onChange={updateNumber('cardBorderOpacity')}
      />
      <label className="toggle-label">
        <input type="checkbox" checked={settings.cardShadowEnabled} onChange={update('cardShadowEnabled')} />
        Card shadow
      </label>
      <label className="field-label">Image fit
        <select value={settings.imageFit} onChange={update('imageFit')} disabled={!settings.showImages}>
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
        </select>
      </label>
      <LineClampSlider settings={settings} field="titleLineClamp" label="Title line clamp" max={4} actions={actions} />
      <LineClampSlider settings={settings} field="descriptionLineClamp" label="Description line clamp" max={6} actions={actions} />
    </div>
  );
}

function CardSlider({ value, label, suffix, min, max, step, disabled, onChange }) {
  return (
    <label className="slider-label">
      <span>{label}<strong>{value}{suffix}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={onChange} />
    </label>
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
