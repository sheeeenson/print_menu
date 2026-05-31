import { CategoryList } from './CategoryList.jsx';
import { DishEditor } from './DishEditor.jsx';

export function ContentSection({ project, searchTerm, onSearchChange, actions }) {
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

  return (
    <section className="content-section" aria-label="Content management">
      <CategoryList project={project} searchTerm={searchTerm} onSearchChange={onSearchChange} actions={actions} />
      <div className="dish-workspace">
        {selectedCategory ? (
          <DishWorkspace category={selectedCategory} dishes={selectedDishes} actions={actions} />
        ) : (
          <div className="empty-state">Add a category to start managing menu content.</div>
        )}
      </div>
    </section>
  );
}

function DishWorkspace({ category, dishes, actions }) {
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
        {dishes.map((dish) => (
          <DishEditor key={dish.id} dish={dish} actions={actions} />
        ))}
      </div>
      {dishes.length === 0 ? <div className="empty-state">No dishes match the current search.</div> : null}
    </>
  );
}
