import { APP_SECTIONS } from '../models/menu.js';
import { escapeHtml } from './dom.js';

export function renderMainNavigation({ project, saveStatus }) {
  return `
    <nav class="main-navigation" aria-label="Main navigation">
      <div class="brand-block">
        <span class="brand-mark">RMS</span>
        <input aria-label="Project name" class="project-name-input" data-action="project-name" value="${escapeHtml(project.projectName)}" />
      </div>
      <div class="section-tabs" role="tablist" aria-label="Application sections">
        <button class="${project.selectedSection === APP_SECTIONS.CONTENT ? 'active' : ''}" type="button" data-action="section" data-section="${APP_SECTIONS.CONTENT}">Content</button>
        <button class="${project.selectedSection === APP_SECTIONS.LAYOUT_PRINT ? 'active' : ''}" type="button" data-action="section" data-section="${APP_SECTIONS.LAYOUT_PRINT}">Layout &amp; Print</button>
      </div>
      <div class="save-status ${saveStatus.toLowerCase()}" aria-live="polite">${saveStatus}</div>
    </nav>
  `;
}
