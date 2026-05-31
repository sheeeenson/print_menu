import { CardStyleControls } from './CardStyleControls.jsx';
import { ColorControls } from './ColorControls.jsx';

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
      <CardStyleControls page={page} actions={actions} />
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
