export function PageContentSelector({ project, page, actions }) {
  const selectedIds = new Set(page.selectedCategoryIds);
  const selectedDishIds = page.selectedDishIds ?? [];
  const selectedDishSet = new Set(selectedDishIds);

  const toggleCategory = (categoryId, checked) => {
    const nextIds = checked
      ? [...selectedIds, categoryId]
      : page.selectedCategoryIds.filter((id) => id !== categoryId);
    actions.setPageCategories(nextIds);
  };

  const orderedCategoryDishes = (categoryId) => {
    const categoryDishes = project.dishes.filter((dish) => dish.visible && dish.categoryId === categoryId && selectedDishSet.has(dish.id));
    const order = new Map(selectedDishIds.map((dishId, index) => [dishId, index]));
    return categoryDishes.sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
  };

  const moveDish = (dishId, direction) => {
    const currentIndex = selectedDishIds.indexOf(dishId);
    const dish = project.dishes.find((item) => item.id === dishId);
    if (currentIndex < 0 || !dish) return;
    const categoryOrder = orderedCategoryDishes(dish.categoryId).map((item) => item.id);
    const categoryIndex = categoryOrder.indexOf(dishId);
    const targetCategoryDishId = categoryOrder[categoryIndex + direction];
    if (!targetCategoryDishId) return;

    const targetIndex = selectedDishIds.indexOf(targetCategoryDishId);
    if (targetIndex < 0) return;
    const nextSelectedDishIds = [...selectedDishIds];
    [nextSelectedDishIds[currentIndex], nextSelectedDishIds[targetIndex]] = [nextSelectedDishIds[targetIndex], nextSelectedDishIds[currentIndex]];
    actions.updateSelectedPage({ selectedDishIds: nextSelectedDishIds });
  };

  return (
    <section className="panel-section" aria-labelledby="page-content-title">
      <p className="eyebrow">Content</p>
      <h2 id="page-content-title">Content on this page</h2>
      <div className="category-checkbox-list">
        {project.categories.map((category) => {
          const isSelected = selectedIds.has(category.id);
          const dishes = isSelected ? orderedCategoryDishes(category.id) : [];
          return (
            <div className="category-content-card" key={category.id}>
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
              {isSelected && dishes.length ? (
                <div className="page-dish-order-list">
                  {dishes.map((dish, index) => (
                    <div className="page-dish-order-row" key={dish.id}>
                      <span>
                        <strong>{dish.nameEn || 'Untitled dish'}</strong>
                        <small>{dish.nameGe || dish.weight || 'Selected dish'}</small>
                      </span>
                      <div className="page-dish-order-actions">
                        <button type="button" onClick={() => moveDish(dish.id, -1)} disabled={index === 0}>↑</button>
                        <button type="button" onClick={() => moveDish(dish.id, 1)} disabled={index === dishes.length - 1}>↓</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : isSelected ? <p className="muted-text page-dish-empty">No visible dishes in this category.</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
