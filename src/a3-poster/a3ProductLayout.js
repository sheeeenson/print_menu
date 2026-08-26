export const MAX_A3_PRODUCTS = 5;

const clampCount = (value) => Math.max(1, Math.min(MAX_A3_PRODUCTS, Number(value) || 1));

const PRODUCT_LAYOUTS = Object.freeze({
  1: [{ x: 0.5, y: 0.56, scale: 1.2 }],
  2: [{ x: 0.29, y: 0.56, scale: 0.9 }, { x: 0.71, y: 0.56, scale: 0.9 }],
  3: [{ x: 0.27, y: 0.42, scale: 0.72 }, { x: 0.73, y: 0.42, scale: 0.72 }, { x: 0.5, y: 0.72, scale: 0.72 }],
  4: [{ x: 0.28, y: 0.39, scale: 0.64 }, { x: 0.72, y: 0.39, scale: 0.64 }, { x: 0.28, y: 0.7, scale: 0.64 }, { x: 0.72, y: 0.7, scale: 0.64 }],
  5: [{ x: 0.2, y: 0.4, scale: 0.56 }, { x: 0.5, y: 0.4, scale: 0.56 }, { x: 0.8, y: 0.4, scale: 0.56 }, { x: 0.35, y: 0.7, scale: 0.56 }, { x: 0.65, y: 0.7, scale: 0.56 }],
});

export const getDefaultA3ProductTransform = (count, index) => {
  const safeCount = clampCount(count);
  const layout = PRODUCT_LAYOUTS[safeCount] || PRODUCT_LAYOUTS[1];
  const value = layout[Math.max(0, Math.min(layout.length - 1, Number(index) || 0))] || layout[0];
  return { ...value, z: index + 2 };
};

export const buildDefaultA3ProductTransforms = (dishIds = []) => {
  const ids = dishIds.slice(0, MAX_A3_PRODUCTS);
  return ids.reduce((result, dishId, index) => {
    result[dishId] = getDefaultA3ProductTransform(ids.length || 1, index);
    return result;
  }, {});
};

export const getA3ProductCount = (poster) => {
  if (poster?.productCount) return clampCount(poster.productCount);
  const selectedCount = poster?.selectedDishIds?.length || 0;
  if (selectedCount) return clampCount(selectedCount);
  if (poster?.template === 'four') return 4;
  if (poster?.template === 'two') return 2;
  return 1;
};
