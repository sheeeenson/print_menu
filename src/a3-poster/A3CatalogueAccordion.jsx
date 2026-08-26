import { useEffect, useMemo, useState } from 'react';
import { normalizeGoogleDriveImageUrl } from '../utils/imageUrls.js';

export function A3CatalogueAccordion({ categories, dishes, selectedDishIds, onToggleDish }) {
  const categoryGroups = useMemo(() => categories.map((category) => ({
    category,
    dishes: dishes.filter((dish) => dish.categoryId === category.id),
  })).filter((group) => group.dishes.length), [categories, dishes]);

  const selectedCategoryId = useMemo(() => {
    const selectedDish = dishes.find((dish) => selectedDishIds.includes(dish.id));
    return selectedDish?.categoryId ?? categoryGroups[0]?.category.id ?? null;
  }, [categoryGroups, dishes, selectedDishIds]);

  const [openCategoryId, setOpenCategoryId] = useState(selectedCategoryId);

  useEffect(() => {
    if (selectedCategoryId && !openCategoryId) setOpenCategoryId(selectedCategoryId);
  }, [openCategoryId, selectedCategoryId]);

  return <div className="a3-dish-picker a3-catalogue-accordion">
    {categoryGroups.map(({ category, dishes: categoryDishes }) => {
      const isOpen = openCategoryId === category.id;
      const selectedCount = categoryDishes.filter((dish) => selectedDishIds.includes(dish.id)).length;
      const categoryName = category.nameEn || category.nameGe || 'Category';
      return <section key={category.id} className={`a3-category-accordion ${isOpen ? 'open' : ''}`}>
        <button
          type="button"
          className="a3-category-trigger"
          aria-expanded={isOpen}
          onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
        >
          <span className="a3-category-trigger-copy">
            <strong>{categoryName}</strong>
            <small>{categoryDishes.length} items{selectedCount ? ` · ${selectedCount} selected` : ''}</small>
          </span>
          <span className="a3-category-chevron" aria-hidden="true">⌄</span>
        </button>

        {isOpen ? <div className="a3-category-content">
          {categoryDishes.map((dish) => {
            const selected = selectedDishIds.includes(dish.id);
            const imageUrl = normalizeGoogleDriveImageUrl(dish.imageUrl);
            return <label key={dish.id} className={selected ? 'selected' : ''}>
              <input type="checkbox" checked={selected} onChange={() => onToggleDish(dish.id)} />
              <img src={imageUrl} alt="" />
              <span>
                <strong>{dish.nameEn || dish.nameGe}</strong>
                {dish.nameGe ? <small>{dish.nameGe}</small> : null}
              </span>
            </label>;
          })}
        </div> : null}
      </section>;
    })}
  </div>;
}
