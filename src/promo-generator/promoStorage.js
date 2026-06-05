const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';

export const PROMO_DURATIONS = Object.freeze([6, 8, 12, 16]);

export const DEFAULT_PROMO_EFFECTS = Object.freeze({
  slowZoom: true,
  fastEntrance: false,
  stopMotion: false,
  pricePunch: true,
  glow: true,
  lightSweep: true,
  gifOverlay: false,
});

export const DEFAULT_PROMO_SETTINGS = Object.freeze({
  selectedDishId: '',
  duration: 8,
  headline: '',
  offerText: '',
  ctaText: 'ORDER NOW',
  gifUrl: '',
  gifPosition: 'topRight',
  gifSize: 18,
  effects: { ...DEFAULT_PROMO_EFFECTS },
});

const normalizeDuration = (value) => PROMO_DURATIONS.includes(Number(value)) ? Number(value) : DEFAULT_PROMO_SETTINGS.duration;
const normalizeGifPosition = (value) => ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(value) ? value : DEFAULT_PROMO_SETTINGS.gifPosition;
const normalizeNumber = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeEffects = (effects = {}) => Object.fromEntries(
  Object.entries(DEFAULT_PROMO_EFFECTS).map(([key, fallback]) => [key, effects[key] === undefined ? fallback : Boolean(effects[key])]),
);

export const normalizePromoProject = (project = {}, dishes = []) => {
  const availableDishIds = new Set(dishes.filter((dish) => dish.visible !== false && dish.imageUrl).map((dish) => dish.id));
  const firstDishId = [...availableDishIds][0] ?? '';
  const selectedDishId = availableDishIds.has(project.selectedDishId) ? project.selectedDishId : firstDishId;

  return {
    ...DEFAULT_PROMO_SETTINGS,
    ...project,
    selectedDishId,
    duration: normalizeDuration(project.duration),
    headline: project.headline || '',
    offerText: project.offerText || project.discountText || '',
    ctaText: project.ctaText || DEFAULT_PROMO_SETTINGS.ctaText,
    gifUrl: project.gifUrl || project.stickerUrl || '',
    gifPosition: normalizeGifPosition(project.gifPosition || project.stickerPosition),
    gifSize: normalizeNumber(project.gifSize ?? project.stickerSize, DEFAULT_PROMO_SETTINGS.gifSize, 6, 42),
    effects: normalizeEffects(project.effects),
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