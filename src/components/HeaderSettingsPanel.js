import { escapeHtml } from './dom.js';

const option = (value, label, selectedValue) => `<option value="${value}" ${value === selectedValue ? 'selected' : ''}>${label}</option>`;

export function renderHeaderSettingsPanel(page) {
  const header = page.header;
  return `
    <details class="panel-section collapsible-panel" open>
      <summary>
        <span>
          <span class="eyebrow">Builder</span>
          <strong>Header</strong>
        </span>
      </summary>
      <label class="toggle-label">
        <input type="checkbox" data-action="header-setting" data-field="enabled" ${header.enabled ? 'checked' : ''} />
        Enable header
      </label>
      <div class="design-control-list">
        ${renderSlider(header, 'height', 'Header height', 36, 160, 1)}
        ${renderSelect(header, 'alignment', 'Header alignment', [
          ['top', 'Top'],
          ['center', 'Center'],
          ['bottom', 'Bottom'],
        ])}
        ${renderSlider(header, 'fontSize', 'Header font size', 9, 28, 1)}
      </div>
      <h3 class="panel-subtitle">Left side</h3>
      ${renderSelect(header, 'leftLogoType', 'Left logo type', [
        ['none', 'None'],
        ['url', 'Image URL'],
      ])}
      ${renderTextInput(header, 'leftLogoUrl', 'Left logo URL')}
      ${renderSlider(header, 'leftLogoSize', 'Left logo size', 24, 120, 1)}
      ${renderTextInput(header, 'leftTextEn', 'Left text EN')}
      ${renderTextInput(header, 'leftTextGe', 'Left text GE')}
      <h3 class="panel-subtitle">Right side</h3>
      ${renderTextInput(header, 'rightTextEn', 'Right text EN')}
      ${renderTextInput(header, 'rightTextGe', 'Right text GE')}
      ${renderSelect(header, 'rightImageType', 'Right image type', [
        ['none', 'None'],
        ['url', 'Image URL'],
      ])}
      ${renderTextInput(header, 'rightImageUrl', 'Right image URL')}
      ${renderSlider(header, 'rightImageSize', 'Right image size', 24, 120, 1)}
    </details>
  `;
}

function renderTextInput(header, field, label) {
  return `
    <label class="field-label">${label}
      <input data-action="header-setting" data-field="${field}" value="${escapeHtml(header[field])}" />
    </label>
  `;
}

function renderSelect(header, field, label, options) {
  return `
    <label class="field-label">${label}
      <select data-action="header-setting" data-field="${field}">
        ${options.map(([value, labelText]) => option(value, labelText, header[field])).join('')}
      </select>
    </label>
  `;
}

function renderSlider(header, field, label, min, max, step) {
  const value = header[field];
  return `
    <label class="slider-label">
      <span>${label}<strong>${value}px</strong></span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-action="header-setting" data-field="${field}" />
    </label>
  `;
}
