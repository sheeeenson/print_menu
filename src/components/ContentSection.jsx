import { CategoryList } from './CategoryList.jsx';
import { DishEditor } from './DishEditor.jsx';

export function ContentSection({ project, searchTerm, onSearchChange, actions }) {
  const selectedCategory = project.categories.find((category) => category.id === project.selectedCategoryId);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const categoryDishes = selectedCategory
    ? project.dishes.filter((dish) => dish.categoryId === selectedCategory.id)
    : [];
  const selectedDishes = categoryDishes.filter((dish) => {
    const matchesDish =
      !normalizedSearch ||
      dish.nameEn.toLowerCase().includes(normalizedSearch) ||
      dish.nameGe.toLowerCase().includes(normalizedSearch);
    return matchesDish;
  });
  const moveDishWithinCategory = (dishId, direction) => {
    if (!selectedCategory) return;
    const categoryDishIds = categoryDishes.map((dish) => dish.id);
    const index = categoryDishIds.indexOf(dishId);
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= categoryDishIds.length) return;
    const reorderedCategoryDishIds = [...categoryDishIds];
    [reorderedCategoryDishIds[index], reorderedCategoryDishIds[nextIndex]] = [reorderedCategoryDishIds[nextIndex], reorderedCategoryDishIds[index]];
    const dishById = new Map(project.dishes.map((dish) => [dish.id, dish]));
    const otherDishes = project.dishes.filter((dish) => dish.categoryId !== selectedCategory.id);
    const nextCategoryDishes = reorderedCategoryDishIds.map((id) => dishById.get(id)).filter(Boolean);
    actions.importProject({
      ...project,
      dishes: [...otherDishes, ...nextCategoryDishes],
      pages: project.pages.map((page) => ({
        ...page,
        selectedDishIds: page.selectedDishIds?.length
          ? [...page.selectedDishIds].sort((a, b) => {
              const aIndex = reorderedCategoryDishIds.indexOf(a);
              const bIndex = reorderedCategoryDishIds.indexOf(b);
              if (aIndex === -1 && bIndex === -1) return 0;
              if (aIndex === -1) return -1;
              if (bIndex === -1) return 1;
              return aIndex - bIndex;
            })
          : page.selectedDishIds,
      })),
    });
  };

  return (
    <section className="content-section" aria-label="Content management">
      <CategoryList project={project} searchTerm={searchTerm} onSearchChange={onSearchChange} actions={actions} />
      <div className="dish-workspace">
        {selectedCategory ? (
          <DishWorkspace category={selectedCategory} dishes={selectedDishes} allCategoryDishes={categoryDishes} actions={actions} onMoveDish={moveDishWithinCategory} />
        ) : (
          <div className="empty-state">Add a category to start managing menu content.</div>
        )}
      </div>
    </section>
  );
}

function DishWorkspace({ category, dishes, allCategoryDishes, actions, onMoveDish }) {
  const categoryIndexByDishId = new Map(allCategoryDishes.map((dish, index) => [dish.id, index]));
  return (
    <>
      <div className="workspace-toolbar">
        <div>
          <p className="eyebrow">Selected category</p>
          <h1>{category.nameEn || 'Untitled category'}</h1>
          <p>{category.nameGe}</p>
        </div>
        <button className="primary-action" type="button" onClick={() => actions.addDish(category.id)}>
          + Add dish
        </button>
      </div>
      <div className="dish-grid">
        {dishes.map((dish) => {
          const categoryIndex = categoryIndexByDishId.get(dish.id) ?? 0;
          return (
            <div className="dish-order-shell" key={dish.id}>
              <div className="dish-order-controls" aria-label={`Move ${dish.nameEn || 'dish'} within category`}>
                <span className="dish-order-index">#{categoryIndex + 1}</span>
                <button type="button" onClick={() => onMoveDish(dish.id, 'up')} disabled={categoryIndex <= 0}>↑ Up</button>
                <button type="button" onClick={() => onMoveDish(dish.id, 'down')} disabled={categoryIndex >= allCategoryDishes.length - 1}>↓ Down</button>
              </div>
              <DishEditor dish={dish} actions={actions} />
            </div>
          );
        })}
      </div>
      {dishes.length === 0 ? <div className="empty-state">No dishes match the current search.</div> : null}
    </>
  );
}
