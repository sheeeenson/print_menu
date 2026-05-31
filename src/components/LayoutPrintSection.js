import { renderDesignControls } from './DesignControls.js';
import { renderFooterSettingsPanel } from './FooterSettingsPanel.js';
import { renderHeaderSettingsPanel } from './HeaderSettingsPanel.js';
import { renderPageContentSelector } from './PageContentSelector.js';
import { renderPageList } from './PageList.js';
import { renderPagePreview } from './PagePreview.js';
import { renderPageSettingsPanel } from './PageSettingsPanel.js';

export function renderLayoutPrintSection(project) {
  const selectedPage = project.pages.find((page) => page.id === project.selectedPageId) ?? project.pages[0];

  return `
    <section class="layout-print-section" aria-label="Layout and print workspace">
      <aside class="layout-admin-panel">
        ${renderPageList(project)}
        ${selectedPage ? renderPageSettingsPanel(selectedPage) : ''}
        ${selectedPage ? renderPageContentSelector(project, selectedPage) : ''}
        ${selectedPage ? renderHeaderSettingsPanel(selectedPage) : ''}
        ${selectedPage ? renderFooterSettingsPanel(selectedPage) : ''}
        ${selectedPage ? renderDesignControls(selectedPage) : ''}
      </aside>
      ${selectedPage ? renderPagePreview(project, selectedPage) : '<div class="empty-state">Add a page to preview your menu.</div>'}
    </section>
  `;
}
