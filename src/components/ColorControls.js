import { escapeHtml } from './dom.js';

const colorControls = [
  ['backgroundColor', 'Page background color'],
  ['cardBackgroundColor', 'Card background color'],
  ['textColor', 'Main text color'],
  ['mutedTextColor', 'Muted text color'],
  ['accentColor', 'Accent color'],
  ['priceColor', 'Price color'],
];

export function renderColorControls(page) {
  return `
    <div class="design-subpanel">
      <h3 class="panel-subtitle">Colors</h3>
      <div class="color-control-grid">
        ${colorControls.map(([field, label]) => renderColorInput(page, field, label)).join('')}
      </div>
    </div>
  `;
}

function renderColorInput(page, field, label) {
  const value = page.designSettings[field];
  return `
    <label class="color-label">${label}
      <span>
        <input type="color" data-control="picker" value="${escapeHtml(value)}" data-action="design-setting" data-field="${field}" />
        <input data-control="text" value="${escapeHtml(value)}" data-action="design-setting" data-field="${field}" />
      </span>
    </label>
  `;
}
