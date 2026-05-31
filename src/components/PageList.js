import { escapeHtml } from './dom.js';

export function renderPageList(project) {
  return `
    <section class="panel-section" aria-labelledby="page-list-title">
      <div class="subsection-title">
        <div>
          <p class="eyebrow">Pages</p>
          <h2 id="page-list-title">Menu pages</h2>
        </div>
        <button class="primary-action compact" type="button" data-action="add-page">+ Add</button>
      </div>
      <div class="page-list">
        ${project.pages.map((page) => renderPageButton(page, page.id === project.selectedPageId)).join('')}
      </div>
      <div class="action-row page-actions">
        <button type="button" data-action="duplicate-page">Duplicate</button>
        <button class="danger" type="button" data-action="delete-page">Delete</button>
      </div>
    </section>
  `;
}

function renderPageButton(page, selected) {
  return `
    <button class="page-list-item ${selected ? 'selected' : ''}" type="button" data-action="select-page" data-page-id="${page.id}">
      <span>${escapeHtml(page.name)}</span>
      <small>${page.paperSize} · ${page.orientation}</small>
    </button>
  `;
}
