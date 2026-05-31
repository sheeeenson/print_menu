import { escapeHtml } from './dom.js';
const option = (value, label, selectedValue) => `<option value="${value}" ${value === selectedValue ? 'selected' : ''}>${label}</option>`;

export function renderCardStyleControls(page) {
  const settings = page.designSettings;
  return `
    <div class="design-subpanel">
      <h3 class="panel-subtitle">Cards & images</h3>
      <label class="toggle-label">
        <input type="checkbox" data-action="design-setting" data-field="cardBorderEnabled" ${settings.cardBorderEnabled ? 'checked' : ''} />
        Card border
      </label>
      <label class="color-label">Card border color
        <span>
          <input type="color" data-control="picker" value="${escapeHtml(settings.cardBorderColor)}" data-action="design-setting" data-field="cardBorderColor" />
          <input data-control="text" value="${escapeHtml(settings.cardBorderColor)}" data-action="design-setting" data-field="cardBorderColor" />
        </span>
      </label>
      <label class="toggle-label">
        <input type="checkbox" data-action="design-setting" data-field="cardShadowEnabled" ${settings.cardShadowEnabled ? 'checked' : ''} />
        Card shadow
      </label>
      <label class="field-label">Image fit
        <select data-action="design-setting" data-field="imageFit">
          ${option('cover', 'Cover', settings.imageFit)}
          ${option('contain', 'Contain', settings.imageFit)}
        </select>
      </label>
      ${renderSlider(settings, 'titleLineClamp', 'Title line clamp', 1, 4, 1, 'lines')}
      ${renderSlider(settings, 'descriptionLineClamp', 'Description line clamp', 1, 6, 1, 'lines')}
    </div>
  `;
}

function renderSlider(settings, field, label, min, max, step, unit) {
  const value = settings[field];
  return `
    <label class="slider-label">
      <span>${label}<strong>${value} ${unit}</strong></span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-action="design-setting" data-field="${field}" />
    </label>
  `;
}
