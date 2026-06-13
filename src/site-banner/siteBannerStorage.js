const STORAGE_KEY = 'restaurant-menu-studio:site-banner-generator:v1';

export const SITE_BANNER_FORMAT = Object.freeze({
  id: 'sushiwokiWebsite',
  label: 'Sushiwoki 2048x900',
  name: 'Website Banner',
  width: 2048,
  height: 900,
  previewWidth: 1180,
});

export const SITE_BANNER_SAFE_ZONES = Object.freeze({
  general: { left: 120, top: 70, right: 120, bottom: 70 },
  text: { x: 300, y: 120, width: 580, height: 620 },
  product: { x: 920, y: 100, width: 930, height: 720 },
});

export const SITE_BANNER_FONT_OPTIONS = Object.freeze([
  'Inter, Arial, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  'Noto Serif Georgian, Noto Serif, serif',
  'Times New Roman, serif',
]);

export const DEFAULT_SITE_BANNER_LAYOUT = Object.freeze({
  textX: 0,
  textY: 0,
  productX: 0,
  productY: 0,
  ctaX: 0,
  ctaY: 0,
  priceX: 0,
  priceY: 0,
});

export const DEFAULT_SITE_BANNER_SETTINGS = Object.freeze({
  selectedDishId: '',
  offerText: 'SUSHIWOKI',
  headline: '',
  subheadline: 'Fresh sushi, rolls and wok delivery',
  ctaText: 'ORDER NOW',
  customBackgroundUrl: '',
  backgroundMode: 'auto',
  backgroundTone: 0,
  showSafeZones: true,
  showOffer: true,
  showSubheadline: true,
  showCta: true,
  showPrice: true,
  showGeneralSafeZone: true,
  showRecommendedZones: true,
  productSize: 680,
  offerColor: '#231f20',
  offerFont: SITE_BANNER_FONT_OPTIONS[0],
  offerSize: 34,
  headlineColor: '#fffaf2',
  headlineFont: SITE_BANNER_FONT_OPTIONS[0],
  headlineSize: 126,
  subheadlineColor: '#fffaf2',
  subheadlineFont: SITE_BANNER_FONT_OPTIONS[0],
  subheadlineSize: 40,
  ctaColor: '#231f20',
  ctaFont: SITE_BANNER_FONT_OPTIONS[0],
  ctaSize: 34,
  priceColor: '#fffaf2',
  priceFont: SITE_BANNER_FONT_OPTIONS[0],
  priceSize: 78,
  accentColor: '#9b1c31',
  layoutOffsets: { ...DEFAULT_SITE_BANNER_LAYOUT },
});

const normalizeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
const normalizeFont = (value, fallback) => SITE_BANNER_FONT_OPTIONS.includes(value) ? value : fallback;
const normalizeBackgroundMode = (value) => ['auto', 'custom'].includes(value) ? value : DEFAULT_SITE_BANNER_SETTINGS.backgroundMode;
const normalizeNumber = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeLayoutOffsets = (layoutOffsets = {}) => Object.fromEntries(
  Object.entries(DEFAULT_SITE_BANNER_LAYOUT).map(([key, fallback]) => [key, normalizeNumber(layoutOffsets[key], fallback, -900, 900)]),
);

export const normalizeSiteBannerProject = (project = {}, dishes = []) => {
  const availableDishIds = new Set(dishes.filter((dish) => dish.visible !== false && dish.imageUrl).map((dish) => dish.id));
  const firstDishId = [...availableDishIds][0] ?? '';
  const selectedDishId = availableDishIds.has(project.selectedDishId) ? project.selectedDishId : firstDishId;

  return {
    ...DEFAULT_SITE_BANNER_SETTINGS,
    selectedDishId,
    offerText: project.offerText || DEFAULT_SITE_BANNER_SETTINGS.offerText,
    headline: project.headline || '',
    subheadline: project.subheadline || DEFAULT_SITE_BANNER_SETTINGS.subheadline,
    ctaText: project.ctaText || DEFAULT_SITE_BANNER_SETTINGS.ctaText,
    customBackgroundUrl: project.customBackgroundUrl || '',
    backgroundMode: normalizeBackgroundMode(project.backgroundMode),
    backgroundTone: normalizeNumber(project.backgroundTone, DEFAULT_SITE_BANNER_SETTINGS.backgroundTone, -50, 50),
    showSafeZones: project.showSafeZones === undefined ? DEFAULT_SITE_BANNER_SETTINGS.showSafeZones : Boolean(project.showSafeZones),
    showOffer: project.showOffer === undefined ? DEFAULT_SITE_BANNER_SETTINGS.showOffer : Boolean(project.showOffer),
    showSubheadline: project.showSubheadline === undefined ? DEFAULT_SITE_BANNER_SETTINGS.showSubheadline : Boolean(project.showSubheadline),
    showCta: project.showCta === undefined ? DEFAULT_SITE_BANNER_SETTINGS.showCta : Boolean(project.showCta),
    showPrice: project.showPrice === undefined ? DEFAULT_SITE_BANNER_SETTINGS.showPrice : Boolean(project.showPrice),
    showGeneralSafeZone: project.showGeneralSafeZone === undefined ? DEFAULT_SITE_BANNER_SETTINGS.showGeneralSafeZone : Boolean(project.showGeneralSafeZone),
    showRecommendedZones: project.showRecommendedZones === undefined ? DEFAULT_SITE_BANNER_SETTINGS.showRecommendedZones : Boolean(project.showRecommendedZones),
    productSize: normalizeNumber(project.productSize, DEFAULT_SITE_BANNER_SETTINGS.productSize, 260, 980),
    offerColor: normalizeColor(project.offerColor, DEFAULT_SITE_BANNER_SETTINGS.offerColor),
    offerFont: normalizeFont(project.offerFont, DEFAULT_SITE_BANNER_SETTINGS.offerFont),
    offerSize: normalizeNumber(project.offerSize, DEFAULT_SITE_BANNER_SETTINGS.offerSize, 18, 60),
    headlineColor: normalizeColor(project.headlineColor, DEFAULT_SITE_BANNER_SETTINGS.headlineColor),
    headlineFont: normalizeFont(project.headlineFont, DEFAULT_SITE_BANNER_SETTINGS.headlineFont),
    headlineSize: normalizeNumber(project.headlineSize, DEFAULT_SITE_BANNER_SETTINGS.headlineSize, 54, 180),
    subheadlineColor: normalizeColor(project.subheadlineColor, DEFAULT_SITE_BANNER_SETTINGS.subheadlineColor),
    subheadlineFont: normalizeFont(project.subheadlineFont, DEFAULT_SITE_BANNER_SETTINGS.subheadlineFont),
    subheadlineSize: normalizeNumber(project.subheadlineSize, DEFAULT_SITE_BANNER_SETTINGS.subheadlineSize, 20, 76),
    ctaColor: normalizeColor(project.ctaColor, DEFAULT_SITE_BANNER_SETTINGS.ctaColor),
    ctaFont: normalizeFont(project.ctaFont, DEFAULT_SITE_BANNER_SETTINGS.ctaFont),
    ctaSize: normalizeNumber(project.ctaSize, DEFAULT_SITE_BANNER_SETTINGS.ctaSize, 18, 60),
    priceColor: normalizeColor(project.priceColor, DEFAULT_SITE_BANNER_SETTINGS.priceColor),
    priceFont: normalizeFont(project.priceFont, DEFAULT_SITE_BANNER_SETTINGS.priceFont),
    priceSize: normalizeNumber(project.priceSize, DEFAULT_SITE_BANNER_SETTINGS.priceSize, 34, 130),
    accentColor: normalizeColor(project.accentColor, DEFAULT_SITE_BANNER_SETTINGS.accentColor),
    layoutOffsets: normalizeLayoutOffsets(project.layoutOffsets),
  };
};

export const loadSiteBannerProject = (dishes = []) => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    return normalizeSiteBannerProject(rawValue ? JSON.parse(rawValue) : {}, dishes);
  } catch (error) {
    console.warn('Unable to restore website banner settings. Loading defaults.', error);
    return normalizeSiteBannerProject({}, dishes);
  }
};

export const saveSiteBannerProject = (project) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
};
