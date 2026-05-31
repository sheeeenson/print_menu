export function CategoryList({ project, searchTerm, onSearchChange, actions }) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const selectedCategory = project.categories.find((category) => category.id === project.selectedCategoryId);
  const filteredCategories = project.categories.filter(
    (category) =>
      !normalizedSearch ||
      category.nameEn.toLowerCase().includes(normalizedSearch) ||
      category.nameGe.toLowerCase().includes(normalizedSearch),
  );

  return (
    <aside className="category-panel" aria-label="Categories">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Content</p>
          <h2>Categories</h2>
        </div>
        <button className="primary-action compact" type="button" onClick={actions.addCategory}>
          + Add
        </button>
      </div>
      <label className="field-label">
        Search categories and dishes
        <input
          type="search"
          placeholder="Search names..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <div className="category-list">
        {filteredCategories.map((category) => {
          const dishCount = project.dishes.filter((dish) => dish.categoryId === category.id).length;
          const selected = project.selectedCategoryId === category.id;
          return (
            <button
              key={category.id}
              className={`category-card ${selected ? 'selected' : ''}`}
              type="button"
              onClick={() => actions.selectCategory(category.id)}
            >
              <span>{category.nameEn || 'Untitled category'}</span>
              <small>{category.nameGe || 'No Georgian name'} · {dishCount} dishes</small>
            </button>
          );
        })}
      </div>
      {selectedCategory ? <SelectedCategoryEditor category={selectedCategory} actions={actions} /> : null}
    </aside>
  );
}

function SelectedCategoryEditor({ category, actions }) {
  const update = (field) => (event) => actions.updateCategory(category.id, { [field]: event.target.value });

  return (
    <div className="editor-card selected-category-editor">
      <div className="editor-card-title">
        <h3>Edit category</h3>
        <div className="action-row">
          <button type="button" onClick={() => actions.duplicateCategory(category.id)}>Duplicate</button>
          <button className="danger" type="button" onClick={() => actions.deleteCategory(category.id)}>Delete</button>
        </div>
      </div>
      <label className="field-label">English name<input value={category.nameEn} onChange={update('nameEn')} /></label>
      <label className="field-label">Georgian name<input value={category.nameGe} onChange={update('nameGe')} /></label>
      <label className="field-label">English description<textarea rows="3" value={category.descriptionEn} onChange={update('descriptionEn')} /></label>
      <label className="field-label">Georgian description<textarea rows="3" value={category.descriptionGe} onChange={update('descriptionGe')} /></label>
    </div>
  );
}
