const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';

export const PROMO_DURATIONS = Object.freeze([6, 8, 12, 16]);

export const PROMO_FORMATS = Object.freeze([
  { id: 'landscape', label: '16:9', name: 'Full HD', width: 1920, height: 1080, previewWidth: 1180 },
  { id: 'square', label: '1:1', name: 'Square', width: 1080, height: 1080, previewWidth: 720 },
  { id: 'portrait', label: '4:5', name: 'Feed', width: 1080, height: 1350, previewWidth: 620 },
  { id: 'story', label: '9:16', name: 'Story/Reels', width: 1080, height: 1920, previewWidth: 460 },
]);

export const getPromoFormat = (formatId) => PROMO_FORMATS.find((format) => format.id === formatId) ?? PROMO_FORMATS[0];

export const PROMO_FONT_OPTIONS = Object.freeze([
  'Inter, Arial, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  'Noto Serif Georgian, Noto Serif, serif',
  'Times New Roman, serif',
]);

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
  formatId: 'landscape',
  duration: 8,
  headline: '',
  offerText: '',
  ctaText: 'ORDER NOW',
  showOffer: true,
  showDescription: true,
  showCta: true,
  descriptionOffsetY: 0,
  backgroundTone: 0,
  dishSize: 650,
  offerColor: '#231f20',
  offerFont: PROMO_FONT_OPTIONS[0],
  offerSize: 34,
  headlineColor: '#fffaf2',
  headlineFont: PROMO_FONT_OPTIONS[0],
  headlineSize: 112,
  geTitleColor: '#fffaf2',
  geTitleFont: PROMO_FONT_OPTIONS[0],
  geTitleSize: 54,
  descriptionColor: '#fffaf2',
  descriptionFont: PROMO_FONT_OPTIONS[0],
  descriptionSize: 30,
  ctaColor: '#fffaf2',
  ctaFont: PROMO_FONT_OPTIONS[0],
  ctaSize: 36,
  oldPriceColor: '#fffaf2',
  oldPriceFont: PROMO_FONT_OPTIONS[0],
  oldPriceSize: 46,
  salePriceColor: '#fffaf2',
  salePriceFont: PROMO_FONT_OPTIONS[0],
  salePriceSize: 132,
  gifUrl: '',
  gifPosition: 'textLeft',
  gifSize: 18,
  effects: { ...DEFAULT_PROMO_EFFECTS },
});

const normalizeDuration = (value) => PROMO_DURATIONS.includes(Number(value)) ? Number(value) : DEFAULT_PROMO_SETTINGS.duration;
const normalizeFormatId = (value) => PROMO_FORMATS.some((format) => format.id === value) ? value : DEFAULT_PROMO_SETTINGS.formatId;
const normalizeGifPosition = (value) => ['textLeft', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(value) ? value : DEFAULT_PROMO_SETTINGS.gifPosition;
const normalizeFont = (value, fallback) => PROMO_FONT_OPTIONS.includes(value) ? value : fallback;
const normalizeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
const normalizeNumber = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeEffects = (effects = {}) => Object.fromEntries(
  Object.entries(DEFAULT_PROMO_EFFECTS).map(([key, fallback]) => [key, effects[key] === undefined ? fallback : Boolean(effects[key])]),
);

const normalizeDishSize = (value) => {
  const raw = Number(value ?? DEFAULT_PROMO_SETTINGS.dishSize);
  if (!Number.isFinite(raw)) return DEFAULT_PROMO_SETTINGS.dishSize;
  const migratedFromPercent = raw <= 180 ? Math.round((raw / 100) * 650) : raw;
  return normalizeNumber(migratedFromPercent, DEFAULT_PROMO_SETTINGS.dishSize, 100, 650);
};

export const normalizePromoProject = (project = {}, dishes = []) => {
  const availableDishIds = new Set(dishes.filter((dish) => dish.visible !== false && dish.imageUrl).map((dish) => dish.id));
  const firstDishId = [...availableDishIds][0] ?? '';
  const selectedDishId = availableDishIds.has(project.selectedDishId) ? project.selectedDishId : firstDishId;

  return {
    ...DEFAULT_PROMO_SETTINGS,
    ...project,
    selectedDishId,
    formatId: normalizeFormatId(project.formatId),
    duration: normalizeDuration(project.duration),
    headline: project.headline || '',
    offerText: project.offerText || project.discountText || '',
    ctaText: project.ctaText || DEFAULT_PROMO_SETTINGS.ctaText,
    showOffer: project.showOffer === undefined ? DEFAULT_PROMO_SETTINGS.showOffer : Boolean(project.showOffer),
    showDescription: project.showDescription === undefined ? DEFAULT_PROMO_SETTINGS.showDescription : Boolean(project.showDescription),
    showCta: project.showCta === undefined ? DEFAULT_PROMO_SETTINGS.showCta : Boolean(project.showCta),
    descriptionOffsetY: normalizeNumber(project.descriptionOffsetY, DEFAULT_PROMO_SETTINGS.descriptionOffsetY, -180, 180),
    backgroundTone: normalizeNumber(project.backgroundTone, DEFAULT_PROMO_SETTINGS.backgroundTone, -40, 40),
    dishSize: normalizeDishSize(project.dishSize),
    offerColor: normalizeColor(project.offerColor, DEFAULT_PROMO_SETTINGS.offerColor),
    offerFont: normalizeFont(project.offerFont, DEFAULT_PROMO_SETTINGS.offerFont),
    offerSize: normalizeNumber(project.offerSize, DEFAULT_PROMO_SETTINGS.offerSize, 16, 76),
    headlineColor: normalizeColor(project.headlineColor, DEFAULT_PROMO_SETTINGS.headlineColor),
    headlineFont: normalizeFont(project.headlineFont, DEFAULT_PROMO_SETTINGS.headlineFont),
    headlineSize: normalizeNumber(project.headlineSize, DEFAULT_PROMO_SETTINGS.headlineSize, 42, 170),
    geTitleColor: normalizeColor(project.geTitleColor, DEFAULT_PROMO_SETTINGS.geTitleColor),
    geTitleFont: normalizeFont(project.geTitleFont, DEFAULT_PROMO_SETTINGS.geTitleFont),
    geTitleSize: normalizeNumber(project.geTitleSize, DEFAULT_PROMO_SETTINGS.geTitleSize, 24, 96),
    descriptionColor: normalizeColor(project.descriptionColor, DEFAULT_PROMO_SETTINGS.descriptionColor),
    descriptionFont: normalizeFont(project.descriptionFont, DEFAULT_PROMO_SETTINGS.descriptionFont),
    descriptionSize: normalizeNumber(project.descriptionSize, DEFAULT_PROMO_SETTINGS.descriptionSize, 14, 60),
    ctaColor: normalizeColor(project.ctaColor, DEFAULT_PROMO_SETTINGS.ctaColor),
    ctaFont: normalizeFont(project.ctaFont, DEFAULT_PROMO_SETTINGS.ctaFont),
    ctaSize: normalizeNumber(project.ctaSize, DEFAULT_PROMO_SETTINGS.ctaSize, 18, 72),
    oldPriceColor: normalizeColor(project.oldPriceColor, DEFAULT_PROMO_SETTINGS.oldPriceColor),
    oldPriceFont: normalizeFont(project.oldPriceFont, DEFAULT_PROMO_SETTINGS.oldPriceFont),
    oldPriceSize: normalizeNumber(project.oldPriceSize, DEFAULT_PROMO_SETTINGS.oldPriceSize, 18, 88),
    salePriceColor: normalizeColor(project.salePriceColor, DEFAULT_PROMO_SETTINGS.salePriceColor),
    salePriceFont: normalizeFont(project.salePriceFont, DEFAULT_PROMO_SETTINGS.salePriceFont),
    salePriceSize: normalizeNumber(project.salePriceSize, DEFAULT_PROMO_SETTINGS.salePriceSize, 42, 190),
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