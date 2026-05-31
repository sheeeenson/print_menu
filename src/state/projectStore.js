import { demoProject } from '../data/demoProject.js';
import { SAVE_STATUSES } from '../models/menu.js';
import { createId } from '../utils/id.js';
import { recalculatePricing } from '../utils/pricing.js';
import { loadProject, saveProject } from '../utils/storage.js';

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const blankCategory = () => ({
  id: createId('cat'),
  nameEn: 'New category',
  nameGe: '',
  descriptionEn: '',
  descriptionGe: '',
});

const blankDish = (categoryId) => ({
  id: createId('dish'),
  categoryId,
  nameEn: 'New dish',
  nameGe: '',
  descriptionEn: '',
  descriptionGe: '',
  weight: '',
  oldPrice: null,
  newPrice: null,
  discountPercent: null,
  imageUrl: '',
  badges: [],
  visible: true,
});

const duplicateDish = (dish, categoryId = dish.categoryId) => ({
  ...dish,
  id: createId('dish'),
  categoryId,
  nameEn: `${dish.nameEn} copy`,
  nameGe: dish.nameGe ? `${dish.nameGe} ასლი` : '',
  badges: dish.badges.map((badge) => ({ ...badge, id: createId('badge') })),
});

const fallbackCategoryId = (categories, preferredId) => {
  if (preferredId && categories.some((category) => category.id === preferredId)) {
    return preferredId;
  }

  return categories[0]?.id ?? null;
};

function createInitialProject() {
  try {
    return loadProject() ?? deepClone(demoProject);
  } catch (error) {
    console.warn('Unable to restore project from localStorage. Loading demo project instead.', error);
    return deepClone(demoProject);
  }
}

export function createProjectStore() {
  let project = createInitialProject();
  let saveStatus = SAVE_STATUSES.SAVED;
  let saveTimer = null;
  const listeners = new Set();

  const notify = () => listeners.forEach((listener) => listener(getSnapshot()));

  const getSnapshot = () => ({ project, saveStatus });

  const setSaveStatus = (status) => {
    saveStatus = status;
    notify();
  };

  const scheduleSave = () => {
    window.clearTimeout(saveTimer);
    setSaveStatus(SAVE_STATUSES.UNSAVED);
    saveTimer = window.setTimeout(() => {
      setSaveStatus(SAVE_STATUSES.SAVING);
      saveProject(project);
      setSaveStatus(SAVE_STATUSES.SAVED);
    }, 350);
  };

  const update = (producer) => {
    project = producer(project);
    notify();
    scheduleSave();
  };

  const actions = {
    setProjectName(name) {
      update((state) => ({ ...state, projectName: name }));
    },
    setSection(section) {
      update((state) => ({ ...state, selectedSection: section }));
    },
    selectCategory(categoryId) {
      update((state) => ({ ...state, selectedCategoryId: categoryId }));
    },
    addCategory() {
      const category = blankCategory();
      update((state) => ({ ...state, categories: [...state.categories, category], selectedCategoryId: category.id }));
    },
    updateCategory(categoryId, changes) {
      update((state) => ({
        ...state,
        categories: state.categories.map((category) =>
          category.id === categoryId ? { ...category, ...changes } : category,
        ),
      }));
    },
    deleteCategory(categoryId) {
      update((state) => {
        const categories = state.categories.filter((category) => category.id !== categoryId);
        return {
          ...state,
          categories,
          dishes: state.dishes.filter((dish) => dish.categoryId !== categoryId),
          pages: state.pages.map((page) => ({
            ...page,
            categoryIds: page.categoryIds.filter((id) => id !== categoryId),
          })),
          selectedCategoryId: fallbackCategoryId(categories, state.selectedCategoryId),
        };
      });
    },
    duplicateCategory(categoryId) {
      update((state) => {
        const source = state.categories.find((category) => category.id === categoryId);
        if (!source) return state;
        const category = {
          ...source,
          id: createId('cat'),
          nameEn: `${source.nameEn} copy`,
          nameGe: source.nameGe ? `${source.nameGe} ასლი` : '',
        };
        const copiedDishes = state.dishes
          .filter((dish) => dish.categoryId === categoryId)
          .map((dish) => duplicateDish(dish, category.id));
        return {
          ...state,
          categories: [...state.categories, category],
          dishes: [...state.dishes, ...copiedDishes],
          pages: state.pages.map((page) => ({ ...page, categoryIds: [...page.categoryIds, category.id] })),
          selectedCategoryId: category.id,
        };
      });
    },
    addDish(categoryId) {
      update((state) => ({ ...state, dishes: [...state.dishes, blankDish(categoryId)] }));
    },
    updateDish(dishId, changes, priceField) {
      update((state) => ({
        ...state,
        dishes: state.dishes.map((dish) => {
          if (dish.id !== dishId) return dish;
          const updated = { ...dish, ...changes };
          return priceField ? recalculatePricing(updated, priceField) : updated;
        }),
      }));
    },
    deleteDish(dishId) {
      update((state) => ({ ...state, dishes: state.dishes.filter((dish) => dish.id !== dishId) }));
    },
    duplicateDish(dishId) {
      update((state) => {
        const source = state.dishes.find((dish) => dish.id === dishId);
        return source ? { ...state, dishes: [...state.dishes, duplicateDish(source)] } : state;
      });
    },
    toggleDishVisibility(dishId) {
      update((state) => ({
        ...state,
        dishes: state.dishes.map((dish) => (dish.id === dishId ? { ...dish, visible: !dish.visible } : dish)),
      }));
    },
    addBadge(dishId) {
      update((state) => ({
        ...state,
        dishes: state.dishes.map((dish) =>
          dish.id === dishId
            ? { ...dish, badges: [...dish.badges, { id: createId('badge'), type: 'New', customText: '', emoji: '' }] }
            : dish,
        ),
      }));
    },
    updateBadge(dishId, badgeId, changes) {
      update((state) => ({
        ...state,
        dishes: state.dishes.map((dish) =>
          dish.id === dishId
            ? {
                ...dish,
                badges: dish.badges.map((badge) => (badge.id === badgeId ? { ...badge, ...changes } : badge)),
              }
            : dish,
        ),
      }));
    },
    deleteBadge(dishId, badgeId) {
      update((state) => ({
        ...state,
        dishes: state.dishes.map((dish) =>
          dish.id === dishId ? { ...dish, badges: dish.badges.filter((badge) => badge.id !== badgeId) } : dish,
        ),
      }));
    },
  };

  return {
    getSnapshot,
    actions,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
