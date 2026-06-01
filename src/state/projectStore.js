import { demoProject } from '../data/demoProject.js';
import { SAVE_STATUSES } from '../models/menu.js';
import { createId } from '../utils/id.js';
import { recalculatePricing } from '../utils/pricing.js';
import { FONT_PRESETS } from '../utils/typography.js';
import { clearProject, loadProject, saveProject } from '../utils/storage.js';

const deepClone = (value) => JSON.parse(JSON.stringify(value));
const DEFAULT_PAGE_DIVIDER_COLOR = '#9b1c31';

export const DEFAULT_PAGE_HEADER = Object.freeze({
  enabled: true,
  height: 80,
  leftLogoType: 'none',
  leftLogoUrl: '',
  leftLogoSize: 56,
  leftTextEn: 'Restaurant Menu',
  leftTextGe: 'რესტორნის მენიუ',
  rightTextEn: 'Fresh daily',
  rightTextGe: 'ყოველდღე ახალი',
  rightImageType: 'none',
  rightImageUrl: '',
  rightImageSize: 56,
  fontSize: 14,
  alignment: 'center',
  showDivider: true,
  dividerColor: DEFAULT_PAGE_DIVIDER_COLOR,
  dividerWidth: 1,
});

export const DEFAULT_PAGE_FOOTER = Object.freeze({
  enabled: true,
  height: 48,
  leftTextEn: 'Instagram',
  leftTextGe: 'Instagram',
  centerTextEn: 'Thank you',
  centerTextGe: 'გმადლობთ',
  rightTextEn: 'Order now',
  rightTextGe: 'შეუკვეთე ახლა',
  fontSize: 12,
  alignment: 'center',
  showDivider: true,
  dividerColor: DEFAULT_PAGE_DIVIDER_COLOR,
  dividerWidth: 1,
});

export const DEFAULT_FIT_STRATEGY = Object.freeze({
  allowShrinkCards: true,
  allowShrinkImages: true,
  allowShrinkText: true,
  allowHideDescriptions: false,
  allowCompactFallback: true,
  minReadableFontSize: 8,
  minCardHeight: 72,
  minImageHeight: 32,
});

export const DEFAULT_CUSTOM_GRID = Object.freeze({
  rows: 4,
  columns: 3,
  gap: 16,
  autoRows: true,
  densePacking: true,
});

export const DEFAULT_BADGE_STYLE = Object.freeze({
  backgroundColor: 'accentColor',
  textColor: '#ffffff',
  borderColor: 'transparent',
  borderWidth: 0,
  opacity: 100,
  shape: 'pill',
});

export const DEFAULT_PAGE_DESIGN_SETTINGS = Object.freeze({
  pageMargin: 34,
  columns: 'auto',
  layoutMode: 'classicColumns',
  classicColumns: 2,
  cardStyle: 'imageTop',
  resizeMode: 'snapToGrid',
  gridMode: 'preset',
  gridPreset: 'twoColumns',
  cardDensity: 'balanced',
  cardGap: 16,
  customGrid: { ...DEFAULT_CUSTOM_GRID },
  makeFirstItemHero: false,
  heroItemSpan: '2x2',
  defaultItemSpan: '1x1',
  customGridPresets: [],
  cardPadding: 14,
  cardRadius: 18,
  imageHeight: 118,
  imageTitleGap: 1,
  imageRatio: 'custom',
  categoryTitleFontSize: 28,
  dishTitleFontSize: 17,
  descriptionFontSize: 12,
  oldPriceFontSize: 12,
  newPriceFontSize: 18,
  badgeFontSize: 10,
  weightFontSize: 11,
  fontPreset: 'cleanModern',
  ...FONT_PRESETS.cleanModern,
  fitAllItems: false,
  fitStrategy: { ...DEFAULT_FIT_STRATEGY },
  backgroundColor: '#fffdfa',
  cardBackgroundColor: '#ffffff',
  textColor: '#231f20',
  mutedTextColor: '#6a5d53',
  accentColor: '#9b1c31',
  priceColor: '#9b1c31',
  showDescriptions: true,
  showImages: true,
  cardContentLayout: 'below',
  badgePosition: 'topLeft',
  badgeStyle: { ...DEFAULT_BADGE_STYLE },
  configurableDisplayMode: 'compactOptions',
  cardBorderEnabled: true,
  cardBorderColor: '#eadfd4',
  cardBorderWidth: 1,
  cardBorderOpacity: 100,
  cardShadowEnabled: false,
  imageFit: 'contain',
  imageFitMode: 'contain',
  imagePosition: 'center',
  imageZoom: 100,
  imagePanX: 0,
  imagePanY: 0,
  imageAreaPercent: 42,
  titleLineClamp: 2,
  descriptionLineClamp: 3,
});

const blankCategory = () => ({
  id: createId('cat'),
  nameEn: 'New category',
  nameGe: '',
  descriptionEn: '',
  descriptionGe: '',
});

const blankDish = (categoryId) => ({
  id: createId('dish'),
  categoryId,
  nameEn: 'New dish',
  nameGe: '',
  descriptionEn: '',
  descriptionGe: '',
  weight: '',
  oldPrice: null,
  newPrice: null,
  discountPercent: null,
  imageUrl: '',
  badges: [],
  visible: true,
  dishType: 'simple',
  optionGroups: [],
});

const duplicateDish = (dish, categoryId = dish.categoryId) => ({
  ...dish,
  id: createId('dish'),
  categoryId,
  nameEn: `${dish.nameEn} copy`,
  nameGe: dish.nameGe ? `${dish.nameGe} ასლი` : '',
  badges: (dish.badges ?? []).map((badge) => ({ ...badge, id: createId('badge') })),
  optionGroups: (dish.optionGroups ?? []).map((group) => ({
    ...group,
    id: createId('group'),
    options: (group.options ?? []).map((option) => ({ ...option, id: createId('option') })),
  })),
});

const fallbackCategoryId = (categories, preferredId) => {
  if (preferredId && categories.some((category) => category.id === preferredId)) {
    return preferredId;
  }

  return categories[0]?.id ?? null;
};

const visibleDishIdsForCategories = (dishes, categoryIds) =>
  dishes.filter((dish) => dish.visible && categoryIds.includes(dish.categoryId)).map((dish) => dish.id);

const normalizeAlignment = (alignment) => (['top', 'center', 'bottom'].includes(alignment) ? alignment : 'center');
const normalizeImageType = (type) => (type === 'url' ? 'url' : 'none');
const normalizeImageFit = (fit) => (['contain', 'cover', 'fill'].includes(fit) ? fit : 'contain');
const normalizeColor = (color, fallback) => (/^#[0-9a-fA-F]{3,8}$/.test(color ?? '') ? color : fallback);
const LEGACY_CARD_CONTENT_LAYOUTS = Object.freeze({
  textBelowImage: 'below',
  textRightOfImage: 'imageLeft',
  textLeftOfImage: 'imageRight',
});
const normalizeCardContentLayout = (layout) => {
  const normalized = LEGACY_CARD_CONTENT_LAYOUTS[layout] ?? layout;
  return ['below', 'imageLeft', 'imageRight'].includes(normalized) ? normalized : 'below';
};
const GRID_PRESETS = ['oneColumn', 'twoColumns', 'threeColumns', 'fourColumns', 'fiveColumns', 'catalogGrid', 'magazineGrid', 'heroGrid', 'bentoGrid', 'textColumns'];
const LEGACY_GRID_PRESETS = { autoSmart: 'twoColumns', compactList: 'textColumns', magazine: 'magazineGrid' };
const normalizeGridPreset = (preset) => {
  const normalized = LEGACY_GRID_PRESETS[preset] ?? preset;
  return GRID_PRESETS.includes(normalized) ? normalized : 'twoColumns';
};
const normalizeGridMode = (mode) => (['preset', 'custom', 'autoFill'].includes(mode) ? mode : 'preset');
const GRID_PRESET_COLUMNS = Object.freeze({ oneColumn: 1, twoColumns: 2, threeColumns: 3, fourColumns: 4, fiveColumns: 5 });
const columnPresetFor = (columns) => ({ 1: 'oneColumn', 2: 'twoColumns', 3: 'threeColumns', 4: 'fourColumns', 5: 'fiveColumns' }[columns] ?? 'twoColumns');
const normalizeLayoutMode = (mode) => {
  if (mode === 'elasticGrid') return 'fluidGrid';
  return ['classicColumns', 'smartAutoFit', 'snapGrid', 'fluidGrid', 'manualDesigner'].includes(mode) ? mode : 'classicColumns';
};
const normalizeCardStyle = (style) => (['imageTop', 'imageLeft', 'imageRight', 'textOnly'].includes(style) ? style : 'imageTop');
const normalizeResizeMode = (mode) => (['snapToGrid', 'freeResize'].includes(mode) ? mode : 'snapToGrid');
const normalizeImagePosition = (position) => (['center', 'top', 'bottom', 'left', 'right', 'custom'].includes(position) ? position : 'center');
const normalizeSpanOption = (value, fallback, allowed) => (allowed.includes(value) ? value : fallback);
const normalizeCustomGrid = (customGrid = {}, fallbackGap = DEFAULT_PAGE_DESIGN_SETTINGS.cardGap) => ({
  rows: clampNumber(customGrid.rows, DEFAULT_CUSTOM_GRID.rows, 1, 12),
  columns: clampNumber(customGrid.columns, DEFAULT_CUSTOM_GRID.columns, 1, 6),
  gap: clampNumber(customGrid.gap, fallbackGap, 0, 64),
  autoRows: customGrid.autoRows === undefined ? DEFAULT_CUSTOM_GRID.autoRows : Boolean(customGrid.autoRows),
  densePacking: customGrid.densePacking === undefined ? DEFAULT_CUSTOM_GRID.densePacking : Boolean(customGrid.densePacking),
});
const normalizeGridPresetList = (presets = [], fallbackGap = DEFAULT_PAGE_DESIGN_SETTINGS.cardGap) => Array.isArray(presets)
  ? presets.map((preset) => ({
      id: preset.id || createId('gridPreset'),
      name: preset.name || 'Custom grid',
      ...normalizeCustomGrid(preset, fallbackGap),
      itemSpanRules: {
        makeFirstItemHero: Boolean(preset.itemSpanRules?.makeFirstItemHero),
        heroItemSpan: normalizeSpanOption(preset.itemSpanRules?.heroItemSpan, '2x2', ['2x1', '2x2', '3x2']),
        defaultItemSpan: normalizeSpanOption(preset.itemSpanRules?.defaultItemSpan, '1x1', ['1x1', '2x1']),
      },
    })).slice(0, 24)
  : [];
const normalizeItemPlacements = (placements = {}) => Object.fromEntries(
  Object.entries(placements ?? {}).map(([dishId, placement]) => {
    const widthPercent = clampNumber(placement?.widthPercent, 30, 10, 100);
    const heightPercent = clampNumber(placement?.heightPercent, 22, 8, 100);
    const xPercent = clampNumber(placement?.xPercent, 0, 0, 100 - widthPercent);
    const yPercent = clampNumber(placement?.yPercent, 0, 0, 100 - heightPercent);
    return [dishId, {
      mode: ['free', 'fluid'].includes(placement?.mode) ? placement.mode : 'grid',
      widthWeight: clampNumber(placement?.widthWeight, 1, 0.5, 4),
      heightWeight: clampNumber(placement?.heightWeight, 1, 0.5, 4),
      minWidthPercent: clampNumber(placement?.minWidthPercent, 12, 5, 100),
      minHeightPercent: clampNumber(placement?.minHeightPercent, 8, 5, 100),
      maxWidthPercent: clampNumber(placement?.maxWidthPercent, 100, 5, 100),
      maxHeightPercent: clampNumber(placement?.maxHeightPercent, 100, 5, 100),
      order: clampNumber(placement?.order, 0, -9999, 9999),
      colSpan: clampNumber(placement?.colSpan, 1, 1, 8),
      rowSpan: clampNumber(placement?.rowSpan, 1, 1, 12),
      xPercent,
      yPercent,
      widthPercent,
      heightPercent,
      zIndex: clampNumber(placement?.zIndex, 1, 1, 999),
      priority: clampNumber(placement?.priority, 0, -999, 999),
    }];
  }),
);
const normalizeBadgePosition = (position) =>
  ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(position) ? position : 'topLeft';
const normalizeBadgeShape = (shape) => ['pill', 'rounded', 'square', 'circle', 'ribbon'].includes(shape) ? shape : DEFAULT_BADGE_STYLE.shape;
const normalizeBadgeStyle = (style = {}, accentColor = DEFAULT_PAGE_DESIGN_SETTINGS.accentColor) => ({
  backgroundColor: style.backgroundColor === 'accentColor' ? accentColor : (/^#[0-9a-fA-F]{3,8}$/.test(style.backgroundColor ?? '') ? style.backgroundColor : accentColor),
  textColor: /^#[0-9a-fA-F]{3,8}$/.test(style.textColor ?? '') ? style.textColor : DEFAULT_BADGE_STYLE.textColor,
  borderColor: style.borderColor === 'transparent' || /^#[0-9a-fA-F]{3,8}$/.test(style.borderColor ?? '') ? style.borderColor : DEFAULT_BADGE_STYLE.borderColor,
  borderWidth: clampNumber(style.borderWidth, DEFAULT_BADGE_STYLE.borderWidth, 0, 8),
  opacity: clampNumber(style.opacity, DEFAULT_BADGE_STYLE.opacity, 0, 100),
  shape: normalizeBadgeShape(style.shape),
});
const normalizeDishType = (type) => ['simple', 'configurable', 'combo'].includes(type) ? type : 'simple';
const normalizeOptionGroups = (groups = []) => Array.isArray(groups) ? groups.map((group) => ({
  id: group.id || createId('group'),
  nameEn: group.nameEn ?? 'Option group',
  nameGe: group.nameGe ?? '',
  required: Boolean(group.required),
  minSelect: clampNumber(group.minSelect, 0, 0, 12),
  maxSelect: clampNumber(group.maxSelect, 1, 0, 12),
  options: Array.isArray(group.options) ? group.options.map((option) => ({
    id: option.id || createId('option'),
    nameEn: option.nameEn ?? 'Option',
    nameGe: option.nameGe ?? '',
    priceDelta: clampNumber(option.priceDelta, 0, -999, 999),
  })) : [],
})) : [];
const clampNumber = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeHeader = (header = {}, dividerColorFallback = DEFAULT_PAGE_HEADER.dividerColor) => ({
  ...DEFAULT_PAGE_HEADER,
  ...header,
  enabled: header.enabled === undefined ? DEFAULT_PAGE_HEADER.enabled : Boolean(header.enabled),
  height: Number(header.height ?? DEFAULT_PAGE_HEADER.height),
  leftLogoType: normalizeImageType(header.leftLogoType),
  leftLogoSize: Number(header.leftLogoSize ?? DEFAULT_PAGE_HEADER.leftLogoSize),
  rightImageType: normalizeImageType(header.rightImageType),
  rightImageSize: Number(header.rightImageSize ?? DEFAULT_PAGE_HEADER.rightImageSize),
  fontSize: Number(header.fontSize ?? DEFAULT_PAGE_HEADER.fontSize),
  alignment: normalizeAlignment(header.alignment),
  showDivider: header.showDivider === undefined ? DEFAULT_PAGE_HEADER.showDivider : Boolean(header.showDivider),
  dividerColor: normalizeColor(header.dividerColor, dividerColorFallback),
  dividerWidth: clampNumber(header.dividerWidth, DEFAULT_PAGE_HEADER.dividerWidth, 0, 12),
});

const normalizeFooter = (footer = {}, dividerColorFallback = DEFAULT_PAGE_FOOTER.dividerColor) => ({
  ...DEFAULT_PAGE_FOOTER,
  ...footer,
  enabled: footer.enabled === undefined ? DEFAULT_PAGE_FOOTER.enabled : Boolean(footer.enabled),
  height: Number(footer.height ?? DEFAULT_PAGE_FOOTER.height),
  fontSize: Number(footer.fontSize ?? DEFAULT_PAGE_FOOTER.fontSize),
  alignment: normalizeAlignment(footer.alignment),
  showDivider: footer.showDivider === undefined ? DEFAULT_PAGE_FOOTER.showDivider : Boolean(footer.showDivider),
  dividerColor: normalizeColor(footer.dividerColor, dividerColorFallback),
  dividerWidth: clampNumber(footer.dividerWidth, DEFAULT_PAGE_FOOTER.dividerWidth, 0, 12),
});

const normalizeDesignSettings = (settings = {}) => {
  const merged = {
    ...DEFAULT_PAGE_DESIGN_SETTINGS,
    ...settings,
    fitStrategy: { ...DEFAULT_FIT_STRATEGY, ...(settings.fitStrategy ?? {}) },
  };
  const normalizedGridMode = normalizeGridMode(merged.gridMode);
  const normalizedGridPreset = normalizeGridPreset(merged.gridPreset);
  const derivedClassicColumns = GRID_PRESET_COLUMNS[normalizedGridPreset] ?? clampNumber(merged.classicColumns, DEFAULT_PAGE_DESIGN_SETTINGS.classicColumns, 1, 5);
  const derivedLayoutMode = settings.layoutMode
    ? normalizeLayoutMode(settings.layoutMode)
    : (normalizedGridMode === 'autoFill' || settings.fittingMode === 'autoFill')
      ? 'smartAutoFit'
      : normalizedGridMode === 'custom'
        ? 'manualDesigner'
        : 'classicColumns';
  const classicColumns = clampNumber(merged.classicColumns ?? derivedClassicColumns, derivedClassicColumns, 1, 5);
  const derivedCardStyle = settings.showImages === false
    ? 'textOnly'
    : normalizeCardStyle(settings.cardStyle ?? ({ below: 'imageTop', imageLeft: 'imageLeft', imageRight: 'imageRight' }[normalizeCardContentLayout(settings.cardContentLayout)]));
  const imageFitMode = normalizeImageFit(settings.imageFitMode ?? settings.imageFit);

  return {
    ...merged,
    showDescriptions:
      settings.showDescriptions === undefined ? DEFAULT_PAGE_DESIGN_SETTINGS.showDescriptions : Boolean(settings.showDescriptions),
    showImages: settings.showImages === undefined ? DEFAULT_PAGE_DESIGN_SETTINGS.showImages : Boolean(settings.showImages),
    fitAllItems: settings.fitAllItems === undefined ? DEFAULT_PAGE_DESIGN_SETTINGS.fitAllItems : Boolean(settings.fitAllItems),
    fontPreset: Object.keys(FONT_PRESETS).includes(merged.fontPreset) || merged.fontPreset === 'custom' ? merged.fontPreset : 'custom',
    layoutMode: derivedLayoutMode,
    classicColumns,
    cardStyle: derivedCardStyle,
    resizeMode: normalizeResizeMode(merged.resizeMode),
    gridMode: derivedLayoutMode === 'smartAutoFit' ? 'autoFill' : (derivedLayoutMode === 'manualDesigner' || derivedLayoutMode === 'snapGrid') ? 'custom' : 'preset',
    gridPreset: derivedLayoutMode === 'classicColumns' ? columnPresetFor(classicColumns) : normalizedGridPreset,
    customGrid: normalizeCustomGrid(merged.customGrid, merged.cardGap),
    makeFirstItemHero: Boolean(merged.makeFirstItemHero),
    heroItemSpan: normalizeSpanOption(merged.heroItemSpan, '2x2', ['2x1', '2x2', '3x2']),
    defaultItemSpan: normalizeSpanOption(merged.defaultItemSpan, '1x1', ['1x1', '2x1']),
    customGridPresets: normalizeGridPresetList(merged.customGridPresets, merged.cardGap),
    cardDensity: ['airy', 'balanced', 'compact'].includes(merged.cardDensity) ? merged.cardDensity : 'balanced',
    categoryTitleStyle: ['plain', 'underline', 'accentBar', 'pill', 'centered'].includes(merged.categoryTitleStyle) ? merged.categoryTitleStyle : 'plain',
    imageRatio: ['square', 'fourThree', 'sixteenNine', 'wide', 'custom'].includes(merged.imageRatio) ? merged.imageRatio : 'custom',
    imageTitleGap: clampNumber(settings.imageTitleGap, DEFAULT_PAGE_DESIGN_SETTINGS.imageTitleGap, 0, 40),
    cardContentLayout: { imageTop: 'below', imageLeft: 'imageLeft', imageRight: 'imageRight', textOnly: normalizeCardContentLayout(settings.cardContentLayout) }[derivedCardStyle] ?? normalizeCardContentLayout(settings.cardContentLayout),
    badgePosition: normalizeBadgePosition(settings.badgePosition),
    badgeStyle: normalizeBadgeStyle(settings.badgeStyle ?? merged.badgeStyle, merged.accentColor),
    configurableDisplayMode: ['compactOptions', 'stepList'].includes(settings.configurableDisplayMode) ? settings.configurableDisplayMode : DEFAULT_PAGE_DESIGN_SETTINGS.configurableDisplayMode,
    cardBorderEnabled:
      settings.cardBorderEnabled === undefined ? DEFAULT_PAGE_DESIGN_SETTINGS.cardBorderEnabled : Boolean(settings.cardBorderEnabled),
    cardBorderWidth: clampNumber(settings.cardBorderWidth, DEFAULT_PAGE_DESIGN_SETTINGS.cardBorderWidth, 0, 12),
    cardBorderOpacity: clampNumber(settings.cardBorderOpacity, DEFAULT_PAGE_DESIGN_SETTINGS.cardBorderOpacity, 0, 100),
    cardShadowEnabled:
      settings.cardShadowEnabled === undefined ? DEFAULT_PAGE_DESIGN_SETTINGS.cardShadowEnabled : Boolean(settings.cardShadowEnabled),
    imageFit: imageFitMode,
    imageFitMode,
    imagePosition: normalizeImagePosition(settings.imagePosition),
    imageZoom: clampNumber(settings.imageZoom, DEFAULT_PAGE_DESIGN_SETTINGS.imageZoom, 50, 200),
    imagePanX: clampNumber(settings.imagePanX, DEFAULT_PAGE_DESIGN_SETTINGS.imagePanX, -50, 50),
    imagePanY: clampNumber(settings.imagePanY, DEFAULT_PAGE_DESIGN_SETTINGS.imagePanY, -50, 50),
    imageAreaPercent: clampNumber(settings.imageAreaPercent, DEFAULT_PAGE_DESIGN_SETTINGS.imageAreaPercent, 10, 80),
    titleLineClamp: Number(settings.titleLineClamp ?? DEFAULT_PAGE_DESIGN_SETTINGS.titleLineClamp),
    descriptionLineClamp: Number(settings.descriptionLineClamp ?? DEFAULT_PAGE_DESIGN_SETTINGS.descriptionLineClamp),
    fitStrategy: {
      allowShrinkCards: Boolean(merged.fitStrategy.allowShrinkCards),
      allowShrinkImages: Boolean(merged.fitStrategy.allowShrinkImages),
      allowShrinkText: Boolean(merged.fitStrategy.allowShrinkText),
      allowHideDescriptions: Boolean(merged.fitStrategy.allowHideDescriptions),
      allowCompactFallback: Boolean(merged.fitStrategy.allowCompactFallback),
      minReadableFontSize: clampNumber(merged.fitStrategy.minReadableFontSize, DEFAULT_FIT_STRATEGY.minReadableFontSize, 6, 16),
      minCardHeight: clampNumber(merged.fitStrategy.minCardHeight, DEFAULT_FIT_STRATEGY.minCardHeight, 48, 220),
      minImageHeight: clampNumber(merged.fitStrategy.minImageHeight, DEFAULT_FIT_STRATEGY.minImageHeight, 0, 140),
    },
  };
};

const buildDefaultPage = (project, name = 'Page 1') => {
  const selectedCategoryIds = project.categories.map((category) => category.id);
  return {
    id: createId('page'),
    name,
    paperSize: 'A4',
    orientation: 'portrait',
    languageMode: 'bilingual',
    selectedCategoryIds,
    selectedDishIds: visibleDishIdsForCategories(project.dishes, selectedCategoryIds),
    layoutTemplate: 'photoCards',
    fittingMode: 'fixed',
    header: { ...DEFAULT_PAGE_HEADER },
    footer: { ...DEFAULT_PAGE_FOOTER },
    designSettings: { ...DEFAULT_PAGE_DESIGN_SETTINGS, customGrid: { ...DEFAULT_CUSTOM_GRID }, customGridPresets: [] },
    itemPlacements: {},
  };
};

const normalizePage = (page, project, index) => {
  const fallbackCategoryIds = project.categories.map((category) => category.id);
  const selectedCategoryIds = (page.selectedCategoryIds ?? page.categoryIds ?? fallbackCategoryIds).filter((id) =>
    project.categories.some((category) => category.id === id),
  );
  const visibleDishIds = visibleDishIdsForCategories(project.dishes, selectedCategoryIds);
  const selectedDishIds = Array.isArray(page.selectedDishIds)
    ? page.selectedDishIds.filter((dishId) => visibleDishIds.includes(dishId))
    : visibleDishIds;

  const designSettings = normalizeDesignSettings({ ...(page.designSettings ?? {}), fittingMode: page.fittingMode });
  const dividerColorFallback = normalizeColor(designSettings.accentColor, DEFAULT_PAGE_DIVIDER_COLOR);

  return {
    id: page.id ?? createId('page'),
    name: page.name || `Page ${index + 1}`,
    paperSize: page.paperSize === 'A3' ? 'A3' : 'A4',
    orientation: page.orientation === 'landscape' ? 'landscape' : 'portrait',
    languageMode: ['en', 'ge', 'bilingual'].includes(page.languageMode) ? page.languageMode : 'bilingual',
    selectedCategoryIds,
    selectedDishIds,
    layoutTemplate: ['photoCards', 'classicList', 'compact'].includes(page.layoutTemplate) ? page.layoutTemplate : 'photoCards',
    fittingMode: ['fixed', 'autoFill', 'compact'].includes(page.fittingMode) ? page.fittingMode : 'fixed',
    header: normalizeHeader(page.header, dividerColorFallback),
    footer: normalizeFooter(page.footer, dividerColorFallback),
    designSettings,
    itemPlacements: normalizeItemPlacements(page.itemPlacements),
  };
};

const normalizeProject = (project) => {
  const categories = (project.categories ?? []).map((category) => ({ ...blankCategory(), ...category }));
  const categoryIds = new Set(categories.map((category) => category.id));
  const fallbackId = categories[0]?.id ?? createId('cat');
  const dishes = (project.dishes ?? []).map((dish) => ({
    ...blankDish(fallbackCategoryId(categories, dish.categoryId) ?? fallbackId),
    ...dish,
    categoryId: fallbackCategoryId(categories, dish.categoryId) ?? fallbackId,
    dishType: normalizeDishType(dish.dishType),
    optionGroups: normalizeOptionGroups(dish.optionGroups),
  }));
  const safeProject = { ...project, categories, dishes };
  return {
    ...safeProject,
    activeSection: APP_SECTIONS.includes(project.activeSection) ? project.activeSection : 'dishes',
    pages: (project.pages ?? []).map((page, index) => normalizePage(page, safeProject, index)),
  };
};

export function createProjectStore() {
  let project = normalizeProject(loadProject() ?? demoProject);
  let listeners = new Set();
  let saveStatus = SAVE_STATUSES.SAVED;
  let saveTimer = null;
  let lastError = '';

  const notify = () => listeners.forEach((listener) => listener());
  const setStatus = (status, error = '') => {
    saveStatus = status;
    lastError = error;
    notify();
  };

  const persist = () => {
    try {
      saveProject(project);
      setStatus(SAVE_STATUSES.SAVED);
    } catch (error) {
      setStatus(SAVE_STATUSES.ERROR, error.message);
    }
  };

  const scheduleSave = () => {
    window.clearTimeout(saveTimer);
    setStatus(SAVE_STATUSES.SAVING);
    saveTimer = window.setTimeout(persist, 250);
  };

  const updateProject = (updater) => {
    project = normalizeProject(typeof updater === 'function' ? updater(project) : updater);
    notify();
    scheduleSave();
  };

  const updateSelectedPage = (updates) => {
    updateProject((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === current.selectedPageId
          ? { ...page, ...updates }
          : page,
      ),
    }));
  };

  const updateSelectedPageDesign = (field, value) => {
    updateProject((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === current.selectedPageId
          ? {
              ...page,
              designSettings: {
                ...page.designSettings,
                [field]: value,
              },
            }
          : page,
      ),
    }));
  };

  const updateSelectedPageFitStrategy = (field, value) => {
    updateProject((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === current.selectedPageId
          ? {
              ...page,
              designSettings: {
                ...page.designSettings,
                fitStrategy: {
                  ...page.designSettings.fitStrategy,
                  [field]: value,
                },
              },
            }
          : page,
      ),
    }));
  };

  const updateSelectedPageCustomGrid = (field, value) => {
    updateProject((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === current.selectedPageId
          ? {
              ...page,
              designSettings: {
                ...page.designSettings,
                customGrid: {
                  ...page.designSettings.customGrid,
                  [field]: value,
                },
              },
            }
          : page,
      ),
    }));
  };

  const saveSelectedPageCustomGridPreset = (name) => {
    const safeName = name.trim();
    if (!safeName) return;
    updateProject((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === current.selectedPageId
        ? {
            ...page,
            designSettings: {
              ...page.designSettings,
              customGridPresets: [
                ...page.designSettings.customGridPresets,
                {
                  id: createId('gridPreset'),
                  name: safeName,
                  ...page.designSettings.customGrid,
                  itemSpanRules: {
                    makeFirstItemHero: page.designSettings.makeFirstItemHero,
                    heroItemSpan: page.designSettings.heroItemSpan,
                    defaultItemSpan: page.designSettings.defaultItemSpan,
                  },
                },
              ],
            },
          }
        : page),
    }));
  };

  const applySelectedPageCustomGridPreset = (presetId) => {
    updateProject((current) => ({
      ...current,
      pages: current.pages.map((page) => {
        if (page.id !== current.selectedPageId) return page;
        const preset = page.designSettings.customGridPresets.find((item) => item.id === presetId);
        if (!preset) return page;
        return {
          ...page,
          designSettings: {
            ...page.designSettings,
            customGrid: {
              rows: preset.rows,
              columns: preset.columns,
              gap: preset.gap,
              autoRows: preset.autoRows,
              densePacking: preset.densePacking,
            },
            makeFirstItemHero: preset.itemSpanRules?.makeFirstItemHero ?? page.designSettings.makeFirstItemHero,
            heroItemSpan: preset.itemSpanRules?.heroItemSpan ?? page.designSettings.heroItemSpan,
            defaultItemSpan: preset.itemSpanRules?.defaultItemSpan ?? page.designSettings.defaultItemSpan,
          },
        };
      }),
    }));
  };

  const deleteSelectedPageCustomGridPreset = (presetId) => {
    updateProject((current) => ({
      ...current,
      pages: current.pages.map((page) => page.id === current.selectedPageId
        ? {
            ...page,
            designSettings: {
              ...page.designSettings,
              customGridPresets: page.designSettings.customGridPresets.filter((preset) => preset.id !== presetId),
            },
          }
        : page),
    }));
  };

  const updatePreviewPlacement = (dishId, placement) => {
    updateSelectedPage({
      itemPlacements: {
        ...project.pages.find((page) => page.id === project.selectedPageId)?.itemPlacements,
        [dishId]: placement,
      },
    });
  };

  return {
    getSnapshot: () => ({ project, saveStatus, lastError }),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    actions: {
      updateProject,
      updateSelectedPage,
      updateSelectedPageDesign,
      updateSelectedPageFitStrategy,
      updateSelectedPageCustomGrid,
      saveSelectedPageCustomGridPreset,
      applySelectedPageCustomGridPreset,
      deleteSelectedPageCustomGridPreset,
      updatePreviewPlacement,
      clearProject: () => {
        clearProject();
        project = normalizeProject(demoProject);
        setStatus(SAVE_STATUSES.SAVED);
        notify();
      },
      resetDemoProject: () => {
        project = normalizeProject(demoProject);
        persist();
        notify();
      },
    },
  };
}
