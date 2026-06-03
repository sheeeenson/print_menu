const STORAGE_KEY = 'restaurant-menu-studio:image-menu:v1';

export const DEFAULT_IMAGE_MENU_SETTINGS = Object.freeze({
  gridVariant: 4,
  selectedDishIds: [],
  imageSize: 72,
  imageX: 0,
  imageY: -6,
  showDescriptions: true,
  enTitleSize: 30,
  geTitleSize: 24,
  descriptionSize: 12,
  titleLanguageGap: 6,
  titleDescriptionGap: 10,
  textBottomOffset: 28,
  enTitleFont: 'Inter, Arial, sans-serif',
  geTitleFont: 'Inter, Arial, sans-serif',
  descriptionFont: 'Inter, Arial, sans-serif',
  textColor: '#231f20',
  descriptionColor: '#5d5148',
  backgroundMode: 'auto',
  manualBackgroundColor: '#f3eadf',
});

const normalizeNumber = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeColor = (value, fallback) => /^#[0-9a-fA-F]{3,8}$/.test(value ?? '') ? value : fallback;

export const normalizeImageMenuSettings = (settings = {}, dishes = []) => {
  const dishIds = new Set(dishes.map((dish) => dish.id));
  const selectedDishIds = Array.isArray(settings.selectedDishIds)
    ? settings.selectedDishIds.filter((dishId) => dishIds.has(dishId))
    : [];
  const gridVariant = [2, 4, 6].includes(Number(settings.gridVariant)) ? Number(settings.gridVariant) : DEFAULT_IMAGE_MENU_SETTINGS.gridVariant;

  return {
    ...DEFAULT_IMAGE_MENU_SETTINGS,
    ...settings,
    gridVariant,
    selectedDishIds,
    imageSize: normalizeNumber(settings.imageSize, DEFAULT_IMAGE_MENU_SETTINGS.imageSize, 20, 120),
    imageX: normalizeNumber(settings.imageX, DEFAULT_IMAGE_MENU_SETTINGS.imageX, -50, 50),
    imageY: normalizeNumber(settings.imageY, DEFAULT_IMAGE_MENU_SETTINGS.imageY, -50, 50),
    showDescriptions: settings.showDescriptions === undefined ? DEFAULT_IMAGE_MENU_SETTINGS.showDescriptions : Boolean(settings.showDescriptions),
    enTitleSize: normalizeNumber(settings.enTitleSize, DEFAULT_IMAGE_MENU_SETTINGS.enTitleSize, 12, 72),
    geTitleSize: normalizeNumber(settings.geTitleSize, DEFAULT_IMAGE_MENU_SETTINGS.geTitleSize, 12, 72),
    descriptionSize: normalizeNumber(settings.descriptionSize, DEFAULT_IMAGE_MENU_SETTINGS.descriptionSize, 8, 28),
    titleLanguageGap: normalizeNumber(settings.titleLanguageGap, DEFAULT_IMAGE_MENU_SETTINGS.titleLanguageGap, 0, 48),
    titleDescriptionGap: normalizeNumber(settings.titleDescriptionGap, DEFAULT_IMAGE_MENU_SETTINGS.titleDescriptionGap, 0, 64),
    textBottomOffset: normalizeNumber(settings.textBottomOffset, DEFAULT_IMAGE_MENU_SETTINGS.textBottomOffset, 0, 140),
    enTitleFont: settings.enTitleFont || DEFAULT_IMAGE_MENU_SETTINGS.enTitleFont,
    geTitleFont: settings.geTitleFont || DEFAULT_IMAGE_MENU_SETTINGS.geTitleFont,
    descriptionFont: settings.descriptionFont || DEFAULT_IMAGE_MENU_SETTINGS.descriptionFont,
    textColor: normalizeColor(settings.textColor, DEFAULT_IMAGE_MENU_SETTINGS.textColor),
    descriptionColor: normalizeColor(settings.descriptionColor, DEFAULT_IMAGE_MENU_SETTINGS.descriptionColor),
    backgroundMode: ['auto', 'manual', 'blurred'].includes(settings.backgroundMode) ? settings.backgroundMode : DEFAULT_IMAGE_MENU_SETTINGS.backgroundMode,
    manualBackgroundColor: normalizeColor(settings.manualBackgroundColor, DEFAULT_IMAGE_MENU_SETTINGS.manualBackgroundColor),
  };
};

export const loadImageMenuSettings = (dishes = []) => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    return normalizeImageMenuSettings(rawValue ? JSON.parse(rawValue) : DEFAULT_IMAGE_MENU_SETTINGS, dishes);
  } catch (error) {
    console.warn('Unable to restore Image Menu settings. Loading defaults.', error);
    return normalizeImageMenuSettings(DEFAULT_IMAGE_MENU_SETTINGS, dishes);
  }
};

export const saveImageMenuSettings = (settings) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
