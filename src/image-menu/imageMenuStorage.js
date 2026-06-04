const STORAGE_KEY = 'restaurant-menu-studio:image-menu:v1';

const createId = (prefix) => prefix + '_' + Math.random().toString(36).slice(2, 10);

export const DEFAULT_IMAGE_MENU_SETTINGS = Object.freeze({
  imageSize: 68,
  imageX: 0,
  imageY: -8,
  showDescriptions: true,
  enTitleSize: 29,
  geTitleSize: 24,
  descriptionSize: 12,
  titleLanguageGap: 5,
  titleDescriptionGap: 12,
  textBottomOffset: 30,
  textPaddingLeft: 30,
  textPaddingRight: 30,
  textAlign: 'center',
  enTitleFont: 'Inter, Arial, sans-serif',
  geTitleFont: 'Noto Serif Georgian, Noto Serif, serif',
  descriptionFont: 'Inter, Arial, sans-serif',
  textColor: '#050505',
  descriptionColor: '#312b25',
  oldPriceSize: 17,
  salePriceSize: 28,
  oldPriceColor: '#5f564d',
  salePriceColor: '#050505',
  priceGap: 12,
  priceYOffset: 0,
  overlayGradient: 'off',
  backgroundMode: 'auto',
  manualBackgroundColor: '#f3eadf',
  showBadge: false,
  badgeImageUrl: '',
  badgeSize: 18,
  badgeX: 18,
  badgeY: 18,
  badgePosition: 'topRight',
});

const normalizeNumber = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeColor = (value, fallback) => /^#[0-9a-fA-F]{3,8}$/.test(value ?? '') ? value : fallback;
const normalizeGridVariant = (value) => [2, 4, 6].includes(Number(value)) ? Number(value) : 2;
const normalizeBadgePosition = (value) => ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(value) ? value : DEFAULT_IMAGE_MENU_SETTINGS.badgePosition;
const normalizeOverlayGradient = (value) => ['off', 'light', 'medium', 'strong'].includes(value) ? value : DEFAULT_IMAGE_MENU_SETTINGS.overlayGradient;
const normalizeTextAlign = (value) => ['left', 'center', 'right'].includes(value) ? value : DEFAULT_IMAGE_MENU_SETTINGS.textAlign;

export const normalizeImageMenuSettings = (settings = {}) => ({
  ...DEFAULT_IMAGE_MENU_SETTINGS,
  ...settings,
  imageSize: normalizeNumber(settings.imageSize, DEFAULT_IMAGE_MENU_SETTINGS.imageSize, 20, 120),
  imageX: normalizeNumber(settings.imageX, DEFAULT_IMAGE_MENU_SETTINGS.imageX, -50, 50),
  imageY: normalizeNumber(settings.imageY, DEFAULT_IMAGE_MENU_SETTINGS.imageY, -50, 50),
  showDescriptions: settings.showDescriptions === undefined ? DEFAULT_IMAGE_MENU_SETTINGS.showDescriptions : Boolean(settings.showDescriptions),
  enTitleSize: normalizeNumber(settings.enTitleSize, DEFAULT_IMAGE_MENU_SETTINGS.enTitleSize, 12, 72),
  geTitleSize: normalizeNumber(settings.geTitleSize, DEFAULT_IMAGE_MENU_SETTINGS.geTitleSize, 12, 72),
  descriptionSize: normalizeNumber(settings.descriptionSize, DEFAULT_IMAGE_MENU_SETTINGS.descriptionSize, 8, 30),
  titleLanguageGap: normalizeNumber(settings.titleLanguageGap, DEFAULT_IMAGE_MENU_SETTINGS.titleLanguageGap, 0, 48),
  titleDescriptionGap: normalizeNumber(settings.titleDescriptionGap, DEFAULT_IMAGE_MENU_SETTINGS.titleDescriptionGap, 0, 64),
  textBottomOffset: normalizeNumber(settings.textBottomOffset, DEFAULT_IMAGE_MENU_SETTINGS.textBottomOffset, 0, 150),
  textPaddingLeft: normalizeNumber(settings.textPaddingLeft, DEFAULT_IMAGE_MENU_SETTINGS.textPaddingLeft, 0, 120),
  textPaddingRight: normalizeNumber(settings.textPaddingRight, DEFAULT_IMAGE_MENU_SETTINGS.textPaddingRight, 0, 120),
  textAlign: normalizeTextAlign(settings.textAlign),
  enTitleFont: settings.enTitleFont || DEFAULT_IMAGE_MENU_SETTINGS.enTitleFont,
  geTitleFont: settings.geTitleFont || DEFAULT_IMAGE_MENU_SETTINGS.geTitleFont,
  descriptionFont: settings.descriptionFont || DEFAULT_IMAGE_MENU_SETTINGS.descriptionFont,
  textColor: normalizeColor(settings.textColor, DEFAULT_IMAGE_MENU_SETTINGS.textColor),
  descriptionColor: normalizeColor(settings.descriptionColor, DEFAULT_IMAGE_MENU_SETTINGS.descriptionColor),
  oldPriceSize: normalizeNumber(settings.oldPriceSize, DEFAULT_IMAGE_MENU_SETTINGS.oldPriceSize, 8, 48),
  salePriceSize: normalizeNumber(settings.salePriceSize, DEFAULT_IMAGE_MENU_SETTINGS.salePriceSize, 12, 72),
  oldPriceColor: normalizeColor(settings.oldPriceColor, DEFAULT_IMAGE_MENU_SETTINGS.oldPriceColor),
  salePriceColor: normalizeColor(settings.salePriceColor, DEFAULT_IMAGE_MENU_SETTINGS.salePriceColor),
  priceGap: normalizeNumber(settings.priceGap, DEFAULT_IMAGE_MENU_SETTINGS.priceGap, 0, 80),
  priceYOffset: normalizeNumber(settings.priceYOffset, DEFAULT_IMAGE_MENU_SETTINGS.priceYOffset, -80, 80),
  overlayGradient: normalizeOverlayGradient(settings.overlayGradient),
  backgroundMode: ['auto', 'manual', 'blurred'].includes(settings.backgroundMode) ? settings.backgroundMode : DEFAULT_IMAGE_MENU_SETTINGS.backgroundMode,
  manualBackgroundColor: normalizeColor(settings.manualBackgroundColor, DEFAULT_IMAGE_MENU_SETTINGS.manualBackgroundColor),
  showBadge: Boolean(settings.showBadge),
  badgeImageUrl: settings.badgeImageUrl || '',
  badgeSize: normalizeNumber(settings.badgeSize, DEFAULT_IMAGE_MENU_SETTINGS.badgeSize, 6, 60),
  badgeX: normalizeNumber(settings.badgeX, DEFAULT_IMAGE_MENU_SETTINGS.badgeX, 0, 160),
  badgeY: normalizeNumber(settings.badgeY, DEFAULT_IMAGE_MENU_SETTINGS.badgeY, 0, 160),
  badgePosition: normalizeBadgePosition(settings.badgePosition),
});

export const createImageMenuPage = (dishes = [], name = 'Image Page') => ({
  id: createId('imagePage'),
  name,
  gridVariant: 2,
  selectedDishIds: dishes.filter((dish) => dish.visible !== false).slice(0, 2).map((dish) => dish.id),
  settings: { ...DEFAULT_IMAGE_MENU_SETTINGS },
});

const normalizeImageMenuPage = (page = {}, dishes = [], index = 0) => {
  const dishIds = new Set(dishes.map((dish) => dish.id));
  const gridVariant = normalizeGridVariant(page.gridVariant);
  const selectedDishIds = Array.isArray(page.selectedDishIds)
    ? page.selectedDishIds.filter((dishId) => dishIds.has(dishId)).slice(0, gridVariant)
    : [];

  return {
    id: page.id || createId('imagePage'),
    name: page.name || 'Image Page ' + (index + 1),
    gridVariant,
    selectedDishIds,
    settings: normalizeImageMenuSettings(page.settings ?? {}),
  };
};

export const normalizeImageMenuProject = (project = {}, dishes = []) => {
  let pages = Array.isArray(project.pages) ? project.pages.map((page, index) => normalizeImageMenuPage(page, dishes, index)) : [];
  if (pages.length === 0) pages = [createImageMenuPage(dishes, 'Image Page 1')];
  const selectedPageId = pages.some((page) => page.id === project.selectedPageId) ? project.selectedPageId : pages[0].id;
  return { pages, selectedPageId };
};

export const loadImageMenuProject = (dishes = []) => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    return normalizeImageMenuProject(rawValue ? JSON.parse(rawValue) : {}, dishes);
  } catch (error) {
    console.warn('Unable to restore Image Menu settings. Loading defaults.', error);
    return normalizeImageMenuProject({}, dishes);
  }
};

export const saveImageMenuProject = (project) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
};