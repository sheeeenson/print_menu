const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';

export const PROMO_DURATIONS = Object.freeze([8, 16, 32]);

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

export const PROMO_GIF_SHAPES = Object.freeze([
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'circle', label: 'Circle' },
  { id: 'star', label: 'Star' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'blob', label: 'Blob' },
]);

export const DEFAULT_PROMO_EFFECTS = Object.freeze({
  slowZoom: true,
  fastEntrance: false,
  stopMotion: false,
  pricePunch: true,
  glow: true,
  lightSweep: true,
  textRise: false,
  dishPulse: false,
  priceShake: false,
  backgroundOrbit: false,
  spotlightPulse: false,
  headlineSplit: false,
  textWave: false,
  textGlitch: false,
  dishSlide: false,
  dishRotate: false,
  priceFlip: false,
  priceGlow: false,
  backgroundPulse: false,
  confetti: false,
  vignette: false,
  gifSpin: false,
  gifBounce: false,
  gifOverlay: false,
});

export const DEFAULT_PROMO_LAYOUT_OFFSETS = Object.freeze({
  copyX: 0,
  copyY: 0,
  dishX: 0,
  dishY: 0,
  priceX: 0,
  priceY: 0,
  ctaX: 0,
  ctaY: 0,
  gifX: 0,
  gifY: 0,
});

export const DEFAULT_PROMO_FORMAT_SETTINGS = Object.freeze({
  duration: 8,
  headline: '',
  offerText: '',
  ctaText: 'ORDER NOW',
  showOffer: true,
  showDescription: true,
  showCta: true,
  showTextShadow: true,
  textShadowColor: '#000000',
  textShadowOpacity: 34,
  textShadowBlur: 38,
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
  layoutOffsets: { ...DEFAULT_PROMO_LAYOUT_OFFSETS },
  effects: { ...DEFAULT_PROMO_EFFECTS },
});

export const DEFAULT_PROMO_GLOBAL_SETTINGS = Object.freeze({
  gifUrl: '',
  gifPosition: 'textLeft',
  gifSize: 18,
  gifBorderRadius: 0,
  gifShape: 'rectangle',
  gifShadow: false,
  gifShadowColor: '#000000',
  gifLibrary: [],
});

export const DEFAULT_PROMO_SETTINGS = Object.freeze({
  selectedDishId: '',
  formatId: 'landscape',
  ...DEFAULT_PROMO_FORMAT_SETTINGS,
  ...DEFAULT_PROMO_GLOBAL_SETTINGS,
  formats: {},
});

export const PROMO_FORMAT_SETTING_KEYS = Object.freeze(Object.keys(DEFAULT_PROMO_FORMAT_SETTINGS));

const normalizeDuration = (value) => PROMO_DURATIONS.includes(Number(value)) ? Number(value) : DEFAULT_PROMO_FORMAT_SETTINGS.duration;
const normalizeFormatId = (value) => PROMO_FORMATS.some((format) => format.id === value) ? value : DEFAULT_PROMO_SETTINGS.formatId;
const normalizeGifPosition = (value) => ['textLeft', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(value) ? value : DEFAULT_PROMO_GLOBAL_SETTINGS.gifPosition;
const normalizeGifShape = (value) => PROMO_GIF_SHAPES.some((shape) => shape.id === value) ? value : DEFAULT_PROMO_GLOBAL_SETTINGS.gifShape;
const normalizeFont = (value, fallback) => PROMO_FONT_OPTIONS.includes(value) ? value : fallback;
const normalizeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
const normalizeUrl = (value) => String(value || '').trim();
const normalizeNumber = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeGifLibrary = (items = []) => {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      id: String(item?.id || item?.url || `gif_${Math.random().toString(36).slice(2, 10)}`),
      name: String(item?.name || 'Saved GIF').trim() || 'Saved GIF',
      url: normalizeUrl(item?.url),
    }))
    .filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .slice(0, 60);
};

const normalizeEffects = (effects = {}) => Object.fromEntries(
  Object.entries(DEFAULT_PROMO_EFFECTS).map(([key, fallback]) => [key, effects[key] === undefined ? fallback : Boolean(effects[key])]),
);

const normalizeLayoutOffsets = (layoutOffsets = {}) => Object.fromEntries(
  Object.entries(DEFAULT_PROMO_LAYOUT_OFFSETS).map(([key, fallback]) => [key, normalizeNumber(layoutOffsets[key], fallback, -2400, 2400)]),
);

const normalizeDishSize = (value) => {
  const raw = Number(value ?? DEFAULT_PROMO_FORMAT_SETTINGS.dishSize);
  if (!Number.isFinite(raw)) return DEFAULT_PROMO_FORMAT_SETTINGS.dishSize;
  const migratedFromPercent = raw <= 180 ? Math.round((raw / 100) * 650) : raw;
  return normalizeNumber(migratedFromPercent, DEFAULT_PROMO_FORMAT_SETTINGS.dishSize, 100, 2400);
};

const pickFormatSettings = (project = {}) => Object.fromEntries(
  PROMO_FORMAT_SETTING_KEYS
    .filter((key) => project[key] !== undefined)
    .map((key) => [key, project[key]]),
);

const normalizePromoFormatSettings = (project = {}) => ({
  ...DEFAULT_PROMO_FORMAT_SETTINGS,
  duration: normalizeDuration(project.duration),
  headline: project.headline || '',
  offerText: project.offerText || project.discountText || '',
  ctaText: project.ctaText || DEFAULT_PROMO_FORMAT_SETTINGS.ctaText,
  showOffer: project.showOffer === undefined ? DEFAULT_PROMO_FORMAT_SETTINGS.showOffer : Boolean(project.showOffer),
  showDescription: project.showDescription === undefined ? DEFAULT_PROMO_FORMAT_SETTINGS.showDescription : Boolean(project.showDescription),
  showCta: project.showCta === undefined ? DEFAULT_PROMO_FORMAT_SETTINGS.showCta : Boolean(project.showCta),
  showTextShadow: project.showTextShadow === undefined ? DEFAULT_PROMO_FORMAT_SETTINGS.showTextShadow : Boolean(project.showTextShadow),
  textShadowColor: normalizeColor(project.textShadowColor, DEFAULT_PROMO_FORMAT_SETTINGS.textShadowColor),
  textShadowOpacity: normalizeNumber(project.textShadowOpacity, DEFAULT_PROMO_FORMAT_SETTINGS.textShadowOpacity, 0, 100),
  textShadowBlur: normalizeNumber(project.textShadowBlur, DEFAULT_PROMO_FORMAT_SETTINGS.textShadowBlur, 0, 90),
  descriptionOffsetY: normalizeNumber(project.descriptionOffsetY, DEFAULT_PROMO_FORMAT_SETTINGS.descriptionOffsetY, -180, 180),
  backgroundTone: normalizeNumber(project.backgroundTone, DEFAULT_PROMO_FORMAT_SETTINGS.backgroundTone, -40, 40),
  dishSize: normalizeDishSize(project.dishSize),
  offerColor: normalizeColor(project.offerColor, DEFAULT_PROMO_FORMAT_SETTINGS.offerColor),
  offerFont: normalizeFont(project.offerFont, DEFAULT_PROMO_FORMAT_SETTINGS.offerFont),
  offerSize: normalizeNumber(project.offerSize, DEFAULT_PROMO_FORMAT_SETTINGS.offerSize, 16, 76),
  headlineColor: normalizeColor(project.headlineColor, DEFAULT_PROMO_FORMAT_SETTINGS.headlineColor),
  headlineFont: normalizeFont(project.headlineFont, DEFAULT_PROMO_FORMAT_SETTINGS.headlineFont),
  headlineSize: normalizeNumber(project.headlineSize, DEFAULT_PROMO_FORMAT_SETTINGS.headlineSize, 42, 170),
  geTitleColor: normalizeColor(project.geTitleColor, DEFAULT_PROMO_FORMAT_SETTINGS.geTitleColor),
  geTitleFont: normalizeFont(project.geTitleFont, DEFAULT_PROMO_FORMAT_SETTINGS.geTitleFont),
  geTitleSize: normalizeNumber(project.geTitleSize, DEFAULT_PROMO_FORMAT_SETTINGS.geTitleSize, 24, 96),
  descriptionColor: normalizeColor(project.descriptionColor, DEFAULT_PROMO_FORMAT_SETTINGS.descriptionColor),
  descriptionFont: normalizeFont(project.descriptionFont, DEFAULT_PROMO_FORMAT_SETTINGS.descriptionFont),
  descriptionSize: normalizeNumber(project.descriptionSize, DEFAULT_PROMO_FORMAT_SETTINGS.descriptionSize, 14, 60),
  ctaColor: normalizeColor(project.ctaColor, DEFAULT_PROMO_FORMAT_SETTINGS.ctaColor),
  ctaFont: normalizeFont(project.ctaFont, DEFAULT_PROMO_FORMAT_SETTINGS.ctaFont),
  ctaSize: normalizeNumber(project.ctaSize, DEFAULT_PROMO_FORMAT_SETTINGS.ctaSize, 18, 72),
  oldPriceColor: normalizeColor(project.oldPriceColor, DEFAULT_PROMO_FORMAT_SETTINGS.oldPriceColor),
  oldPriceFont: normalizeFont(project.oldPriceFont, DEFAULT_PROMO_FORMAT_SETTINGS.oldPriceFont),
  oldPriceSize: normalizeNumber(project.oldPriceSize, DEFAULT_PROMO_FORMAT_SETTINGS.oldPriceSize, 18, 88),
  salePriceColor: normalizeColor(project.salePriceColor, DEFAULT_PROMO_FORMAT_SETTINGS.salePriceColor),
  salePriceFont: normalizeFont(project.salePriceFont, DEFAULT_PROMO_FORMAT_SETTINGS.salePriceFont),
  salePriceSize: normalizeNumber(project.salePriceSize, DEFAULT_PROMO_FORMAT_SETTINGS.salePriceSize, 42, 190),
  layoutOffsets: normalizeLayoutOffsets(project.layoutOffsets),
  effects: normalizeEffects(project.effects),
});

export const normalizePromoProject = (project = {}, dishes = []) => {
  const availableDishIds = new Set(dishes.filter((dish) => dish.visible !== false && dish.imageUrl).map((dish) => dish.id));
  const firstDishId = [...availableDishIds][0] ?? '';
  const selectedDishId = availableDishIds.has(project.selectedDishId) ? project.selectedDishId : firstDishId;
  const formatId = normalizeFormatId(project.formatId);
  const legacyFormatSettings = pickFormatSettings(project);
  const legacyGifUrl = normalizeUrl(project.gifUrl || project.stickerUrl || project.formats?.[formatId]?.gifUrl || project.formats?.[formatId]?.stickerUrl);
  const gifLibrary = normalizeGifLibrary(project.gifLibrary);

  const formats = Object.fromEntries(PROMO_FORMATS.map((format) => {
    const source = {
      ...DEFAULT_PROMO_FORMAT_SETTINGS,
      ...(project.formats?.[format.id] ?? {}),
      ...(format.id === formatId ? legacyFormatSettings : {}),
    };
    return [format.id, normalizePromoFormatSettings(source)];
  }));
  const activeFormatSettings = formats[formatId] ?? normalizePromoFormatSettings(legacyFormatSettings);

  return {
    ...DEFAULT_PROMO_SETTINGS,
    ...activeFormatSettings,
    selectedDishId,
    formatId,
    gifUrl: legacyGifUrl,
    gifPosition: normalizeGifPosition(project.gifPosition || project.stickerPosition || project.formats?.[formatId]?.gifPosition),
    gifSize: normalizeNumber(project.gifSize ?? project.stickerSize ?? project.formats?.[formatId]?.gifSize, DEFAULT_PROMO_GLOBAL_SETTINGS.gifSize, 6, 42),
    gifBorderRadius: normalizeNumber(project.gifBorderRadius ?? project.formats?.[formatId]?.gifBorderRadius, DEFAULT_PROMO_GLOBAL_SETTINGS.gifBorderRadius, 0, 500),
    gifShape: normalizeGifShape(project.gifShape || project.formats?.[formatId]?.gifShape),
    gifShadow: project.gifShadow === undefined ? DEFAULT_PROMO_GLOBAL_SETTINGS.gifShadow : Boolean(project.gifShadow),
    gifShadowColor: normalizeColor(project.gifShadowColor || project.formats?.[formatId]?.gifShadowColor, DEFAULT_PROMO_GLOBAL_SETTINGS.gifShadowColor),
    gifLibrary: legacyGifUrl && !gifLibrary.some((item) => item.url === legacyGifUrl)
      ? [{ id: `gif_${Date.now()}`, name: 'Current GIF', url: legacyGifUrl }, ...gifLibrary]
      : gifLibrary,
    formats,
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
