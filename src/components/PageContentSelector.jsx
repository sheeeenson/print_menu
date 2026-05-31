export function PageContentSelector({ project, page, actions }) {
  const selectedIds = new Set(page.selectedCategoryIds);
  const toggleCategory = (categoryId, checked) => {
    const nextIds = checked
      ? [...selectedIds, categoryId]
      : page.selectedCategoryIds.filter((id) => id !== categoryId);
    actions.setPageCategories(nextIds);
  };

  return (
    <section className="panel-section" aria-labelledby="page-content-title">
      <p className="eyebrow">Content</p>
      <h2 id="page-content-title">Content on this page</h2>
      <div className="category-checkbox-list">
        {project.categories.map((category) => (
          <label className="category-checkbox" key={category.id}>
            <input
              type="checkbox"
              checked={selectedIds.has(category.id)}
              onChange={(event) => toggleCategory(category.id, event.target.checked)}
            />
            <span>
              <strong>{category.nameEn || 'Untitled category'}</strong>
              <small>{category.nameGe || 'No Georgian title'}</small>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
