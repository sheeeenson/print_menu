const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';

export const PROMO_DURATIONS = Object.freeze([6, 8, 12, 16]);
export const PROMO_STYLES = Object.freeze(['juicyReveal', 'pricePunch', 'stopMotion']);
export const FUN_LEVELS = Object.freeze(['clean', 'normal', 'funny', 'crazy']);

export const DEFAULT_PROMO_SETTINGS = Object.freeze({
  selectedDishId: '',
  duration: 8,
  style: 'juicyReveal',
  headline: '',
  discountText: '-20%',
  showSticker: false,
  stickerUrl: '',
  stickerPosition: 'topRight',
  stickerSize: 18,
  funLevel: 'normal',
});

const normalizeDuration = (value) => PROMO_DURATIONS.includes(Number(value)) ? Number(value) : DEFAULT_PROMO_SETTINGS.duration;
const normalizeStyle = (value) => PROMO_STYLES.includes(value) ? value : DEFAULT_PROMO_SETTINGS.style;
const normalizeFunLevel = (value) => FUN_LEVELS.includes(value) ? value : DEFAULT_PROMO_SETTINGS.funLevel;
const normalizeStickerPosition = (value) => ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(value) ? value : DEFAULT_PROMO_SETTINGS.stickerPosition;
const normalizeNumber = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

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
    headline: project.headline || '',
    discountText: project.discountText || DEFAULT_PROMO_SETTINGS.discountText,
    showSticker: Boolean(project.showSticker),
    stickerUrl: project.stickerUrl || '',
    stickerPosition: normalizeStickerPosition(project.stickerPosition),
    stickerSize: normalizeNumber(project.stickerSize, DEFAULT_PROMO_SETTINGS.stickerSize, 6, 42),
    funLevel: normalizeFunLevel(project.funLevel),
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
