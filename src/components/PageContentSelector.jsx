import { useState } from 'react';

export function PageContentSelector({ project, page, actions }) {
  const [openCategoryIds, setOpenCategoryIds] = useState(() => new Set(page.selectedCategoryIds ?? []));
  const selectedCategoryIds = page.selectedCategoryIds ?? [];
  const selectedCategorySet = new Set(selectedCategoryIds);
  const selectedDishIds = page.selectedDishIds ?? [];
  const selectedDishSet = new Set(selectedDishIds);
  const categoryOrder = new Map(selectedCategoryIds.map((categoryId, index) => [categoryId, index]));
  const orderedCategories = [...project.categories].sort((a, b) => (categoryOrder.get(a.id) ?? 9999) - (categoryOrder.get(b.id) ?? 9999));

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
    if (checked) setOpenCategoryIds((current) => new Set([...current, categoryId]));
    actions.setPageCategories(nextIds);
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
    if (nextIds !== selectedCategoryIds) actions.updateSelectedPage({ selectedCategoryIds: nextIds });
  };

  const dropDish = (event, targetDishId) => {
    event.preventDefault();
    const draggedDishId = event.dataTransfer.getData('text/dish-id');
    const draggedDish = project.dishes.find((dish) => dish.id === draggedDishId);
    const targetDish = project.dishes.find((dish) => dish.id === targetDishId);
    if (!draggedDish || !targetDish || draggedDish.categoryId !== targetDish.categoryId) return;
    const nextIds = reorderArray(selectedDishIds, draggedDishId, targetDishId);
    if (nextIds !== selectedDishIds) actions.updateSelectedPage({ selectedDishIds: nextIds });
  };

  return (
    <section className="panel-section" aria-labelledby="page-content-title">
      <p className="eyebrow">Content</p>
      <h2 id="page-content-title">Content on this page</h2>
      <p className="muted-text page-content-help">Drag selected categories or dishes to reorder them in the preview.</p>
      <div className="category-checkbox-list page-content-order-list">
        {orderedCategories.map((category) => {
          const isSelected = selectedCategorySet.has(category.id);
          const isOpen = openCategoryIds.has(category.id);
          const dishes = isSelected ? orderedCategoryDishes(category.id) : [];
          return (
            <div
              className={`category-content-card ${isSelected ? 'selected-content-category' : ''}`}
              key={category.id}
              draggable={isSelected}
              onDragStart={(event) => event.dataTransfer.setData('text/category-id', category.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropCategory(event, category.id)}
            >
              <div className="category-content-header">
                <span className="drag-handle" aria-hidden="true">⋮⋮</span>
                <label className="category-checkbox">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => toggleCategory(category.id, event.target.checked)}
                  />
                  <span>
                    <strong>{category.nameEn || 'Untitled category'}</strong>
                    <small>{category.nameGe || 'No Georgian title'}</small>
                  </span>
                </label>
                <button className="accordion-toggle" type="button" onClick={() => toggleOpen(category.id)} disabled={!isSelected} aria-expanded={isOpen}>
                  {isOpen ? 'Hide' : 'Show'} dishes
                </button>
              </div>
              {isSelected && isOpen && dishes.length ? (
                <div className="page-dish-order-list">
                  {dishes.map((dish) => (
                    <div
                      className="page-dish-order-row"
                      key={dish.id}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData('text/dish-id', dish.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => dropDish(event, dish.id)}
                    >
                      <span className="drag-handle" aria-hidden="true">⋮⋮</span>
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
