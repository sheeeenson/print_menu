import { useState } from 'react';

export function PageContentSelector({ project, page, actions }) {
  const [openCategoryIds, setOpenCategoryIds] = useState(() => new Set());
  const selectedCategoryIds = page.selectedCategoryIds ?? [];
  const selectedCategorySet = new Set(selectedCategoryIds);
  const selectedDishIds = page.selectedDishIds ?? [];
  const selectedDishSet = new Set(selectedDishIds);
  const categoryOrder = new Map(selectedCategoryIds.map((categoryId, index) => [categoryId, index]));
  const orderedCategories = [...project.categories].sort((a, b) => (categoryOrder.get(a.id) ?? 9999) - (categoryOrder.get(b.id) ?? 9999));

  const groupedDishIdsForCategories = (categoryIds) => {
    const dishOrder = new Map(selectedDishIds.map((dishId, index) => [dishId, index]));
    const categorySet = new Set(categoryIds);
    return categoryIds.flatMap((categoryId) => project.dishes
      .filter((dish) => dish.visible && categorySet.has(dish.categoryId) && dish.categoryId === categoryId)
      .sort((a, b) => (dishOrder.get(a.id) ?? 9999) - (dishOrder.get(b.id) ?? 9999))
      .map((dish) => dish.id));
  };

  const applyCategorySelection = (categoryIds) => {
    actions.updateSelectedPage({
      selectedCategoryIds: categoryIds,
      selectedDishIds: groupedDishIdsForCategories(categoryIds),
    });
  };

  const toggleOpen = (categoryId) => {
    setOpenCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const toggleCategory = (categoryId, checked) => {
    const nextIds = checked
      ? [...selectedCategoryIds, categoryId]
      : selectedCategoryIds.filter((id) => id !== categoryId);
    applyCategorySelection(nextIds);
  };

  const orderedCategoryDishes = (categoryId) => {
    const order = new Map(selectedDishIds.map((dishId, index) => [dishId, index]));
    return project.dishes
      .filter((dish) => dish.visible && dish.categoryId === categoryId && selectedDishSet.has(dish.id))
      .sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
  };

  const reorderArray = (items, fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return items;
    const next = [...items];
    const fromIndex = next.indexOf(fromId);
    const toIndex = next.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return items;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const dropCategory = (event, targetCategoryId) => {
    event.preventDefault();
    const draggedCategoryId = event.dataTransfer.getData('text/category-id');
    const nextIds = reorderArray(selectedCategoryIds, draggedCategoryId, targetCategoryId);
    if (nextIds !== selectedCategoryIds) applyCategorySelection(nextIds);
  };

  const dropDish = (event, targetDishId) => {
    event.preventDefault();
    const draggedDishId = event.dataTransfer.getData('text/dish-id');
    const draggedDish = project.dishes.find((dish) => dish.id === draggedDishId);
    const targetDish = project.dishes.find((dish) => dish.id === targetDishId);
    if (!draggedDish || !targetDish || draggedDish.categoryId !== targetDish.categoryId) return;
    const categoryDishIds = orderedCategoryDishes(draggedDish.categoryId).map((dish) => dish.id);
    const reorderedCategoryDishIds = reorderArray(categoryDishIds, draggedDishId, targetDishId);
    const nextIds = selectedCategoryIds.flatMap((categoryId) => (
      categoryId === draggedDish.categoryId
        ? reorderedCategoryDishIds
        : groupedDishIdsForCategories([categoryId])
    ));
    actions.updateSelectedPage({ selectedDishIds: nextIds });
  };

  return (
    <section className="panel-section" aria-labelledby="page-content-title">
      <p className="eyebrow">Content</p>
      <h2 id="page-content-title">Content on this page</h2>
      <p className="muted-text page-content-help">Single click selects a category. Double click opens dishes. Drag ⋮⋮ to reorder categories or dishes.</p>
      <div className="category-checkbox-list page-content-order-list">
        {orderedCategories.map((category) => {
          const isSelected = selectedCategorySet.has(category.id);
          const isOpen = openCategoryIds.has(category.id);
          const dishes = isSelected ? orderedCategoryDishes(category.id) : [];
          return (
            <div
              className={`category-content-card ${isSelected ? 'selected-content-category' : ''} ${isOpen ? 'open-content-category' : ''}`}
              key={category.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropCategory(event, category.id)}
            >
              <button
                className="category-content-header"
                type="button"
                onClick={() => toggleCategory(category.id, !isSelected)}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  if (!isSelected) toggleCategory(category.id, true);
                  toggleOpen(category.id);
                }}
                aria-expanded={isSelected && isOpen}
              >
                <span
                  className="drag-handle"
                  aria-label="Drag category"
                  role="button"
                  tabIndex="0"
                  draggable={isSelected}
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  onDragStart={(event) => {
                    event.stopPropagation();
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/category-id', category.id);
                  }}
                >⋮⋮</span>
                <span className="category-checkbox visual-category-check" aria-hidden="true">
                  <input type="checkbox" checked={isSelected} readOnly tabIndex="-1" />
                  <span>
                    <strong>{category.nameEn || 'Untitled category'}</strong>
                    <small>{category.nameGe || 'No Georgian title'}</small>
                  </span>
                </span>
                <span className="accordion-indicator" aria-hidden="true">{isSelected && isOpen ? '−' : '+'}</span>
              </button>
              {isSelected && isOpen && dishes.length ? (
                <div className="page-dish-order-list">
                  {dishes.map((dish) => (
                    <div
                      className="page-dish-order-row"
                      key={dish.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => dropDish(event, dish.id)}
                    >
                      <span
                        className="drag-handle"
                        aria-label="Drag dish"
                        role="button"
                        tabIndex="0"
                        draggable
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/dish-id', dish.id);
                        }}
                      >⋮⋮</span>
                      <span className="dish-order-copy">
                        <strong>{dish.nameEn || 'Untitled dish'}</strong>
                        <small>{dish.nameGe || dish.weight || 'Selected dish'}</small>
                      </span>
                    </div>
                  ))}
                </div>
              ) : isSelected && isOpen ? <p className="muted-text page-dish-empty">No visible dishes in this category.</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
