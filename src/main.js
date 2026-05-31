import { APP_SECTIONS } from './models/menu.js';
import { createProjectStore } from './state/projectStore.js';
import { parseOptionalNumber } from './utils/pricing.js';
import { renderContentSection } from './components/ContentSection.js';
import { renderLayoutPrintSection } from './components/LayoutPrintSection.js';
import { renderMainNavigation } from './components/MainNavigation.js';

const root = document.querySelector('#root');
const store = createProjectStore();
let searchTerm = '';
let focusedElement = null;

function render() {
  focusedElement = captureFocus();
  const snapshot = store.getSnapshot();
  const { project } = snapshot;
  const workspace =
    project.selectedSection === APP_SECTIONS.CONTENT
      ? renderContentSection(project, searchTerm)
      : renderLayoutPrintSection(project);

  root.innerHTML = `
    <div class="app-shell">
      ${renderMainNavigation(snapshot)}
      <main class="workspace">${workspace}</main>
    </div>
  `;
  restoreFocus(focusedElement);
}

function captureFocus() {
  const element = document.activeElement;
  if (!element?.dataset?.action) return null;
  return {
    action: element.dataset.action,
    field: element.dataset.field,
    dishId: element.dataset.dishId,
    categoryId: element.dataset.categoryId,
    badgeId: element.dataset.badgeId,
    pageId: element.dataset.pageId,
    control: element.dataset.control,
    selectionStart: element.selectionStart,
    selectionEnd: element.selectionEnd,
  };
}

function restoreFocus(focus) {
  if (!focus) return;
  const selector = Object.entries(focus)
    .filter(([key, value]) => value && !['selectionStart', 'selectionEnd'].includes(key))
    .map(([key, value]) => `[data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${CSS.escape(String(value))}"]`)
    .join('');
  const element = root.querySelector(selector);
  if (!element) return;
  element.focus();
  if (typeof focus.selectionStart === 'number' && 'setSelectionRange' in element) {
    element.setSelectionRange(focus.selectionStart, focus.selectionEnd ?? focus.selectionStart);
  }
}

function handleInput(event) {
  const target = event.target;
  const action = target.dataset.action;

  if (action === 'project-name') {
    store.actions.setProjectName(target.value);
  }

  if (action === 'search') {
    searchTerm = target.value;
    render();
  }

  if (action === 'category-field') {
    store.actions.updateCategory(target.dataset.categoryId, { [target.dataset.field]: target.value });
  }

  if (action === 'dish-field') {
    store.actions.updateDish(target.dataset.dishId, { [target.dataset.field]: target.value });
  }

  if (action === 'price-field') {
    const field = target.dataset.field;
    store.actions.updateDish(target.dataset.dishId, { [field]: parseOptionalNumber(target.value) }, field);
  }

  if (action === 'badge-field') {
    store.actions.updateBadge(target.dataset.dishId, target.dataset.badgeId, { [target.dataset.field]: target.value });
  }

  if (action === 'page-field') {
    store.actions.updateSelectedPage({ [target.dataset.field]: target.value });
  }

  if (action === 'design-setting') {
    store.actions.updateSelectedPageDesign(target.dataset.field, coercePageSettingValue(target));
  }

  if (action === 'header-setting') {
    store.actions.updateSelectedPageHeader(target.dataset.field, coercePageSettingValue(target));
  }

  if (action === 'footer-setting') {
    store.actions.updateSelectedPageFooter(target.dataset.field, coercePageSettingValue(target));
  }

  if (action === 'page-category-toggle') {
    const categoryIds = [...root.querySelectorAll('[data-action="page-category-toggle"]')]
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.dataset.categoryId);
    store.actions.setPageCategories(categoryIds);
  }
}


function coercePageSettingValue(target) {
  if (target.type === 'checkbox') return target.checked;
  if (target.type === 'range' || target.type === 'number') return Number(target.value);
  return target.value;
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const { action } = target.dataset;

  if (action === 'section') store.actions.setSection(target.dataset.section);
  if (action === 'select-category') store.actions.selectCategory(target.dataset.categoryId);
  if (action === 'add-category') store.actions.addCategory();
  if (action === 'duplicate-category') store.actions.duplicateCategory(target.dataset.categoryId);
  if (action === 'delete-category') store.actions.deleteCategory(target.dataset.categoryId);
  if (action === 'add-dish') store.actions.addDish(target.dataset.categoryId);
  if (action === 'toggle-dish') store.actions.toggleDishVisibility(target.dataset.dishId);
  if (action === 'duplicate-dish') store.actions.duplicateDish(target.dataset.dishId);
  if (action === 'delete-dish') store.actions.deleteDish(target.dataset.dishId);
  if (action === 'add-badge') store.actions.addBadge(target.dataset.dishId);
  if (action === 'delete-badge') store.actions.deleteBadge(target.dataset.dishId, target.dataset.badgeId);
  if (action === 'select-page') store.actions.selectPage(target.dataset.pageId);
  if (action === 'add-page') store.actions.addPage();
  if (action === 'duplicate-page') store.actions.duplicateSelectedPage();
  if (action === 'delete-page') store.actions.deleteSelectedPage();
}

root.addEventListener('input', handleInput);
root.addEventListener('change', handleInput);
root.addEventListener('click', handleClick);
store.subscribe(render);
render();
