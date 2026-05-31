import { escapeHtml } from './dom.js';

export function renderPageContentSelector(project, page) {
  const selectedIds = new Set(page.selectedCategoryIds);
  return `
    <section class="panel-section" aria-labelledby="page-content-title">
      <p class="eyebrow">Content</p>
      <h2 id="page-content-title">Content on this page</h2>
      <div class="category-checkbox-list">
        ${project.categories.map((category) => `
          <label class="category-checkbox">
            <input type="checkbox" data-action="page-category-toggle" data-category-id="${category.id}" ${selectedIds.has(category.id) ? 'checked' : ''} />
            <span>
              <strong>${escapeHtml(category.nameEn || 'Untitled category')}</strong>
              <small>${escapeHtml(category.nameGe || 'No Georgian title')}</small>
            </span>
          </label>
        `).join('')}
      </div>
    </section>
  `;
}
