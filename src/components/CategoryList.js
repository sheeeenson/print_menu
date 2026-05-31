import { escapeHtml } from './dom.js';

export function renderCategoryList(project, searchTerm) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const selectedCategory = project.categories.find((category) => category.id === project.selectedCategoryId);
  const filteredCategories = project.categories.filter(
    (category) =>
      !normalizedSearch ||
      category.nameEn.toLowerCase().includes(normalizedSearch) ||
      category.nameGe.toLowerCase().includes(normalizedSearch),
  );

  return `
    <aside class="category-panel" aria-label="Categories">
      <div class="panel-title-row">
        <div>
          <p class="eyebrow">Content</p>
          <h2>Categories</h2>
        </div>
        <button class="primary-action compact" type="button" data-action="add-category">+ Add</button>
      </div>
      <label class="field-label">
        Search categories and dishes
        <input type="search" placeholder="Search names..." data-action="search" value="${escapeHtml(searchTerm)}" />
      </label>
      <div class="category-list">
        ${filteredCategories
          .map((category) => {
            const dishCount = project.dishes.filter((dish) => dish.categoryId === category.id).length;
            const selected = project.selectedCategoryId === category.id;
            return `
              <button class="category-card ${selected ? 'selected' : ''}" type="button" data-action="select-category" data-category-id="${category.id}">
                <span>${escapeHtml(category.nameEn || 'Untitled category')}</span>
                <small>${escapeHtml(category.nameGe || 'No Georgian name')} · ${dishCount} dishes</small>
              </button>
            `;
          })
          .join('')}
      </div>
      ${selectedCategory ? renderSelectedCategoryEditor(selectedCategory) : ''}
    </aside>
  `;
}

function renderSelectedCategoryEditor(category) {
  return `
    <div class="editor-card selected-category-editor">
      <div class="editor-card-title">
        <h3>Edit category</h3>
        <div class="action-row">
          <button type="button" data-action="duplicate-category" data-category-id="${category.id}">Duplicate</button>
          <button class="danger" type="button" data-action="delete-category" data-category-id="${category.id}">Delete</button>
        </div>
      </div>
      <label class="field-label">English name<input data-action="category-field" data-category-id="${category.id}" data-field="nameEn" value="${escapeHtml(category.nameEn)}" /></label>
      <label class="field-label">Georgian name<input data-action="category-field" data-category-id="${category.id}" data-field="nameGe" value="${escapeHtml(category.nameGe)}" /></label>
      <label class="field-label">English description<textarea rows="3" data-action="category-field" data-category-id="${category.id}" data-field="descriptionEn">${escapeHtml(category.descriptionEn)}</textarea></label>
      <label class="field-label">Georgian description<textarea rows="3" data-action="category-field" data-category-id="${category.id}" data-field="descriptionGe">${escapeHtml(category.descriptionGe)}</textarea></label>
    </div>
  `;
}
