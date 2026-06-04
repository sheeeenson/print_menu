const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';

export const PROMO_DURATIONS = Object.freeze([6, 8, 12, 16]);
export const PROMO_STYLES = Object.freeze(['juicyReveal', 'pricePunch', 'stopMotion']);

export const DEFAULT_PROMO_SETTINGS = Object.freeze({
  selectedDishId: '',
  duration: 8,
  style: 'juicyReveal',
  headline: 'Fresh promo',
  subheadline: 'Today only',
  cta: 'Order now',
  showDescription: false,
});

const normalizeDuration = (value) => PROMO_DURATIONS.includes(Number(value)) ? Number(value) : DEFAULT_PROMO_SETTINGS.duration;
const normalizeStyle = (value) => PROMO_STYLES.includes(value) ? value : DEFAULT_PROMO_SETTINGS.style;

export const normalizePromoProject = (project = {}, dishes = []) => {
  const availableDishIds = new Set(dishes.filter((dish) => dish.visible !== false && dish.imageUrl).map((dish) => dish.id));
  const firstDishId = [...availableDishIds][0] ?? '';
  const selectedDishId = availableDishIds.has(project.selectedDishId) ? project.selectedDishId : firstDishId;

  return {
    ...DEFAULT_PROMO_SETTINGS,
    ...project,
    selectedDishId,
    duration: normalizeDuration(project.duration),
    style: normalizeStyle(project.style),
    headline: project.headline || DEFAULT_PROMO_SETTINGS.headline,
    subheadline: project.subheadline || DEFAULT_PROMO_SETTINGS.subheadline,
    cta: project.cta || DEFAULT_PROMO_SETTINGS.cta,
    showDescription: Boolean(project.showDescription),
  };
};

export const loadPromoProject = (dishes = []) => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    return normalizePromoProject(rawValue ? JSON.parse(rawValue) : {}, dishes);
  } catch (error) {
    console.warn('Unable to restore TV Promo settings. Loading defaults.', error);
    return normalizePromoProject({}, dishes);
  }
};

export const savePromoProject = (project) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
};
