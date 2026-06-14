const STORAGE_KEY = 'restaurant-menu-studio:site-banner-generator:v1';

export const SITE_BANNER_FORMATS = Object.freeze([
  {
    id: 'sushiwokiWebsite2048x900',
    label: 'Sushiwoki 2048x900',
    name: 'Website Banner',
    width: 2048,
    height: 900,
    previewWidth: 1180,
  },
  {
    id: 'sushiwokiWebsite1800x600',
    label: 'Sushiwoki 1800x600',
    name: 'Website Banner Wide',
    width: 1800,
    height: 600,
    previewWidth: 1180,
  },
]);

export const SITE_BANNER_FORMAT = SITE_BANNER_FORMATS[0];
export const DEFAULT_SITE_BANNER_FORMAT_ID = SITE_BANNER_FORMAT.id;
export const getSiteBannerFormat = (formatId) => SITE_BANNER_FORMATS.find((format) => format.id === formatId) ?? SITE_BANNER_FORMAT;

export const SITE_BANNER_SAFE_ZONES_BY_FORMAT = Object.freeze({
  sushiwokiWebsite2048x900: {
    general: { left: 120, top: 70, right: 120, bottom: 70 },
    text: { x: 300, y: 120, width: 580, height: 620, label: 'text 300-880' },
    product: { x: 920, y: 100, width: 930, height: 720, label: 'product 920-1850' },
  },
  sushiwokiWebsite1800x600: {
    general: { left: 110, top: 55, right: 110, bottom: 55 },
    text: { x: 250, y: 80, width: 540, height: 420, label: 'text 250-790' },
    product: { x: 840, y: 45, width: 790, height: 510, label: 'product 840-1630' },
  },
});

export const SITE_BANNER_SAFE_ZONES = SITE_BANNER_SAFE_ZONES_BY_FORMAT[DEFAULT_SITE_BANNER_FORMAT_ID];
export const getSiteBannerSafeZones = (formatId) => SITE_BANNER_SAFE_ZONES_BY_FORMAT[getSiteBannerFormat(formatId).id] ?? SITE_BANNER_SAFE_ZONES;

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

export const DEFAULT_PRODUCT_SIZE_BY_FORMAT = Object.freeze({
  sushiwokiWebsite2048x900: 680,
  sushiwokiWebsite1800x600: 500,
});

export const DEFAULT_SITE_BANNER_SETTINGS = Object.freeze({
  formatId: DEFAULT_SITE_BANNER_FORMAT_ID,
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
  productSize: DEFAULT_PRODUCT_SIZE_BY_FORMAT[DEFAULT_SITE_BANNER_FORMAT_ID],
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
  textShadowEnabled: true,
  textShadowColor: '#000000',
  textShadowBlur: 38,
  accentColor: '#9b1c31',
  icons: [],
  layoutOffsets: { ...DEFAULT_SITE_BANNER_LAYOUT },
});

const normalizeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
const normalizeFont = (value, fallback) => SITE_BANNER_FONT_OPTIONS.includes(value) ? value : fallback;
const normalizeFormatId = (value) => getSiteBannerFormat(value).id;
const normalizeBackgroundMode = (value) => ['auto', 'custom'].includes(value) ? value : DEFAULT_SITE_BANNER_SETTINGS.backgroundMode;
const normalizeNumber = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeLayoutOffsets = (layoutOffsets = {}) => Object.fromEntries(
  Object.entries(DEFAULT_SITE_BANNER_LAYOUT).map(([key, fallback]) => [key, normalizeNumber(layoutOffsets[key], fallback, -900, 900)]),
);

const normalizeIcons = (icons = []) => Array.isArray(icons) ? icons
  .filter((icon) => icon && typeof icon === 'object')
  .map((icon, index) => ({
    id: String(icon.id || `icon-${Date.now()}-${index}`),
    url: String(icon.url || ''),
    x: normalizeNumber(icon.x, 420 + index * 90, -400, SITE_BANNER_FORMAT.width + 400),
    y: normalizeNumber(icon.y, 420, -400, SITE_BANNER_FORMAT.height + 400),
    size: normalizeNumber(icon.size, 140, 10, 700),
    opacity: normalizeNumber(icon.opacity, 1, 0, 1),
    rotation: normalizeNumber(icon.rotation, 0, -180, 180),
    visible: icon.visible === undefined ? true : Boolean(icon.visible),
  })) : [];

export const normalizeSiteBannerProject = (project = {}, dishes = []) => {
  const formatId = normalizeFormatId(project.formatId);
  const availableDishIds = new Set(dishes.filter((dish) => dish.visible !== false && dish.imageUrl).map((dish) => dish.id));
  const firstDishId = [...availableDishIds][0] ?? '';
  const selectedDishId = availableDishIds.has(project.selectedDishId) ? project.selectedDishId : firstDishId;

  return {
    ...DEFAULT_SITE_BANNER_SETTINGS,
    formatId,
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
    productSize: normalizeNumber(project.productSize, DEFAULT_PRODUCT_SIZE_BY_FORMAT[formatId] ?? DEFAULT_SITE_BANNER_SETTINGS.productSize, 260, 980),
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
    textShadowEnabled: project.textShadowEnabled === undefined ? DEFAULT_SITE_BANNER_SETTINGS.textShadowEnabled : Boolean(project.textShadowEnabled),
    textShadowColor: normalizeColor(project.textShadowColor, DEFAULT_SITE_BANNER_SETTINGS.textShadowColor),
    textShadowBlur: normalizeNumber(project.textShadowBlur, DEFAULT_SITE_BANNER_SETTINGS.textShadowBlur, 0, 100),
    accentColor: normalizeColor(project.accentColor, DEFAULT_SITE_BANNER_SETTINGS.accentColor),
    icons: normalizeIcons(project.icons),
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