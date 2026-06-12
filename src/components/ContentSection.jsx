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

  return (
    <section className="content-section" aria-label="Content management">
      <CategoryList project={project} searchTerm={searchTerm} onSearchChange={onSearchChange} actions={actions} />
      <div className="dish-workspace">
        {selectedCategory ? (
          <DishWorkspace category={selectedCategory} dishes={selectedDishes} allCategoryDishes={categoryDishes} actions={actions} />
        ) : (
          <div className="empty-state">Add a category to start managing menu content.</div>
        )}
      </div>
    </section>
  );
}

function DishWorkspace({ category, dishes, allCategoryDishes, actions }) {
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
                <button type="button" onClick={() => actions.moveDish(dish.id, 'up')} disabled={categoryIndex <= 0}>↑ Up</button>
                <button type="button" onClick={() => actions.moveDish(dish.id, 'down')} disabled={categoryIndex >= allCategoryDishes.length - 1}>↓ Down</button>
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
