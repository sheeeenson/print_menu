import { escapeHtml } from './dom.js';
import { renderCategoryList } from './CategoryList.js';
import { renderDishEditor } from './DishEditor.js';

export function renderContentSection(project, searchTerm) {
  const selectedCategory = project.categories.find((category) => category.id === project.selectedCategoryId);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const selectedDishes = selectedCategory
    ? project.dishes.filter((dish) => {
        const matchesDish =
          !normalizedSearch ||
          dish.nameEn.toLowerCase().includes(normalizedSearch) ||
          dish.nameGe.toLowerCase().includes(normalizedSearch);
        return dish.categoryId === selectedCategory.id && matchesDish;
      })
    : [];

  return `
    <section class="content-section" aria-label="Content management">
      ${renderCategoryList(project, searchTerm)}
      <div class="dish-workspace">
        ${selectedCategory ? renderDishWorkspace(selectedCategory, selectedDishes) : '<div class="empty-state">Add a category to start managing menu content.</div>'}
      </div>
    </section>
  `;
}

function renderDishWorkspace(category, dishes) {
  return `
    <div class="workspace-toolbar">
      <div>
        <p class="eyebrow">Selected category</p>
        <h1>${escapeHtml(category.nameEn || 'Untitled category')}</h1>
        <p>${escapeHtml(category.nameGe)}</p>
      </div>
      <button class="primary-action" type="button" data-action="add-dish" data-category-id="${category.id}">+ Add dish</button>
    </div>
    <div class="dish-grid">
      ${dishes.map(renderDishEditor).join('')}
    </div>
    ${dishes.length === 0 ? '<div class="empty-state">No dishes match the current search.</div>' : ''}
  `;
}
