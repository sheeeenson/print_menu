import { escapeHtml } from './dom.js';

const option = (value, label, selectedValue) => `<option value="${value}" ${value === selectedValue ? 'selected' : ''}>${label}</option>`;

export function renderPageSettingsPanel(page) {
  return `
    <section class="panel-section" aria-labelledby="page-settings-title">
      <p class="eyebrow">Settings</p>
      <h2 id="page-settings-title">Page settings</h2>
      <label class="field-label">Page name
        <input data-action="page-field" data-field="name" value="${escapeHtml(page.name)}" />
      </label>
      <div class="two-column-fields panel-two-column">
        <label class="field-label">Paper size
          <select data-action="page-field" data-field="paperSize">
            ${option('A4', 'A4', page.paperSize)}
            ${option('A3', 'A3', page.paperSize)}
          </select>
        </label>
        <label class="field-label">Orientation
          <select data-action="page-field" data-field="orientation">
            ${option('portrait', 'Portrait', page.orientation)}
            ${option('landscape', 'Landscape', page.orientation)}
          </select>
        </label>
      </div>
      <label class="field-label">Language mode
        <select data-action="page-field" data-field="languageMode">
          ${option('en', 'English', page.languageMode)}
          ${option('ge', 'Georgian', page.languageMode)}
          ${option('bilingual', 'Bilingual', page.languageMode)}
        </select>
      </label>
      <label class="field-label">Layout template
        <select data-action="page-field" data-field="layoutTemplate">
          ${option('photoCards', 'Photo Cards', page.layoutTemplate)}
          ${option('classicList', 'Classic List', page.layoutTemplate)}
          ${option('compact', 'Compact', page.layoutTemplate)}
        </select>
      </label>
      <label class="field-label">Fitting mode
        <select data-action="page-field" data-field="fittingMode">
          ${option('fixed', 'Fixed', page.fittingMode)}
          ${option('autoFill', 'Auto-fill', page.fittingMode)}
          ${option('compact', 'Compact', page.fittingMode)}
        </select>
      </label>
    </section>
  `;
}
