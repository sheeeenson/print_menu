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

export function renderDesignControls(page) {
  return `
    <section class="panel-section" aria-labelledby="design-controls-title">
      <p class="eyebrow">Design</p>
      <h2 id="design-controls-title">Basic design settings</h2>
      <div class="design-control-list">
        ${controls.map(([field, label, min, max, step]) => renderSlider(page, field, label, min, max, step)).join('')}
      </div>
    </section>
  `;
}

function renderSlider(page, field, label, min, max, step) {
  const value = page.designSettings[field];
  return `
    <label class="slider-label">
      <span>${label}<strong>${value}px</strong></span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-action="design-setting" data-field="${field}" />
    </label>
  `;
}
