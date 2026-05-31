import { escapeHtml } from './dom.js';

const option = (value, label, selectedValue) => `<option value="${value}" ${value === selectedValue ? 'selected' : ''}>${label}</option>`;

export function renderFooterSettingsPanel(page) {
  const footer = page.footer;
  return `
    <details class="panel-section collapsible-panel" open>
      <summary>
        <span>
          <span class="eyebrow">Builder</span>
          <strong>Footer</strong>
        </span>
      </summary>
      <label class="toggle-label">
        <input type="checkbox" data-action="footer-setting" data-field="enabled" ${footer.enabled ? 'checked' : ''} />
        Enable footer
      </label>
      <div class="design-control-list">
        ${renderSlider(footer, 'height', 'Footer height', 28, 120, 1)}
        ${renderSelect(footer, 'alignment', 'Footer alignment', [
          ['top', 'Top'],
          ['center', 'Center'],
          ['bottom', 'Bottom'],
        ])}
        ${renderSlider(footer, 'fontSize', 'Footer font size', 8, 24, 1)}
      </div>
      ${renderTextInput(footer, 'leftTextEn', 'Left text EN')}
      ${renderTextInput(footer, 'leftTextGe', 'Left text GE')}
      ${renderTextInput(footer, 'centerTextEn', 'Center text EN')}
      ${renderTextInput(footer, 'centerTextGe', 'Center text GE')}
      ${renderTextInput(footer, 'rightTextEn', 'Right text EN')}
      ${renderTextInput(footer, 'rightTextGe', 'Right text GE')}
    </details>
  `;
}

function renderTextInput(footer, field, label) {
  return `
    <label class="field-label">${label}
      <input data-action="footer-setting" data-field="${field}" value="${escapeHtml(footer[field])}" />
    </label>
  `;
}

function renderSelect(footer, field, label, options) {
  return `
    <label class="field-label">${label}
      <select data-action="footer-setting" data-field="${field}">
        ${options.map(([value, labelText]) => option(value, labelText, footer[field])).join('')}
      </select>
    </label>
  `;
}

function renderSlider(footer, field, label, min, max, step) {
  const value = footer[field];
  return `
    <label class="slider-label">
      <span>${label}<strong>${value}px</strong></span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-action="footer-setting" data-field="${field}" />
    </label>
  `;
}
