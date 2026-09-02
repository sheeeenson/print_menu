const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';
const DISH_SIZE_MAX = 2400;

const getStoredDishSize = () => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return null;
    const project = JSON.parse(rawValue);
    const value = Number(project?.dishSize ?? project?.formats?.[project?.formatId]?.dishSize);
    if (!Number.isFinite(value)) return null;
    return Math.min(DISH_SIZE_MAX, Math.max(100, value));
  } catch (error) {
    return null;
  }
};

const findDishSizeInput = () => Array.from(document.querySelectorAll('.image-menu-control'))
  .find((label) => label.textContent?.includes('Dish size'))
  ?.querySelector('input[type="range"]');

const applyDishSize = () => {
  const input = findDishSizeInput();
  if (input) {
    input.max = String(DISH_SIZE_MAX);
    input.setAttribute('max', String(DISH_SIZE_MAX));
  }

  const inputValue = Number(input?.value);
  const size = Number.isFinite(inputValue) && inputValue > 0 ? inputValue : getStoredDishSize();
  if (!size) return;

  document.querySelectorAll('.promo-dish-image').forEach((image) => {
    image.style.width = `${Math.min(DISH_SIZE_MAX, Math.max(100, size))}px`;
    image.style.maxWidth = 'none';
    image.style.maxHeight = 'none';
  });
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', applyDishSize);
  window.addEventListener('input', (event) => {
    if (event.target?.closest?.('.image-menu-control')?.textContent?.includes('Dish size')) {
      window.requestAnimationFrame(applyDishSize);
    }
  }, true);

  const observer = new MutationObserver(() => window.requestAnimationFrame(applyDishSize));
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'max', 'value'] });
  window.requestAnimationFrame(applyDishSize);
}
