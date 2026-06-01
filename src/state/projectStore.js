import { demoProject } from '../data/demoProject.js';
import { APP_SECTIONS, SAVE_STATUSES } from '../models/menu.js';
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

const duplicateDishData = (dish, categoryId = dish.categoryId) => ({
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

const clampNumber = (value, fallback, min, max) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeAlignment = (alignment) => (['top', 'center', 'bottom'].includes(alignment) ? alignment : 'center');
const normalizeImageType = (type) => (type === 'url' ? 'url' : 'none');
const normalizeImageFit = (fit) => (['contain', 'cover', 'fill'].includes(fit) ? fit : 'contain');
const normalizeColor = (color, fallback) => (/^#[0-9a-fA-F]{3,8}$/.test(color ?? '') ? color : fallback);
const normalizeCardStyle = (style) => (['imageTop', 'imageLeft', 'imageRight', 'textOnly'].includes(style) ? style : 'imageTop');
const normalizeResizeMode = (mode) => (['snapToGrid', 'freeResize'].includes(mode) ? mode : 'snapToGrid');
const normalizeGridMode = (mode) => (['preset', 'custom', 'autoFill'].includes(mode) ? mode : 'preset');
const normalizeLayoutMode = (mode) => ['classicColumns', 'smartAutoFit', 'snapGrid', 'fluidGrid', 'manualDesigner'].includes(mode) ? mode : 'classicColumns';
const normalizeImagePosition = (position) => (['center', 'top', 'bottom', 'left', 'right', 'custom'].includes(position) ? position : 'center');
const normalizeBadgePosition = (position) => ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(position) ? position : 'topLeft';
const normalizeBadgeShape = (shape) => ['pill', 'rounded', 'square', 'circle', 'ribbon'].includes(shape) ? shape : DEFAULT_BADGE_STYLE.shape;
const normalizeSpanOption = (value, fallback, allowed) => (allowed.includes(value) ? value : fallback);
const GRID_PRESETS = ['oneColumn', 'twoColumns', 'threeColumns', 'fourColumns', 'fiveColumns', 'catalogGrid', 'magazineGrid', 'heroGrid', 'bentoGrid', 'textColumns'];
const GRID_PRESET_COLUMNS = Object.freeze({ oneColumn: 1, twoColumns: 2, threeColumns: 3, fourColumns: 4, fiveColumns: 5 });
const columnPresetFor = (columns) => ({ 1: 'oneColumn', 2: 'twoColumns', 3: 'threeColumns', 4: 'fourColumns', 5: 'fiveColumns' }[columns] ?? 'twoColumns');

const normalizeGridPreset = (preset) => GRID_PRESETS.includes(preset) ? preset : 'twoColumns';
const normalizeCardContentLayout = (layout) => ['below', 'imageLeft', 'imageRight'].includes(layout) ? layout : 'below';
const normalizeDishType = (type) => ['simple', 'configurable', 'combo'].includes(type) ? type : 'simple';
const fallbackCategoryId = (categories, preferredId) => preferredId && categories.some((category) => category.id === preferredId) ? preferredId : categories[0]?.id ?? null;
const visibleDishIdsForCategories = (dishes, categoryIds) => dishes.filter((dish) => dish.visible && categoryIds.includes(dish.categoryId)).map((dish) => dish.id);

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
    return [dishId, {
      mode: ['free', 'fluid', 'grid'].includes(placement?.mode) ? placement.mode : 'grid',
      widthWeight: clampNumber(placement?.widthWeight, 1, 0.5, 4),
      heightWeight: clampNumber(placement?.heightWeight, 1, 0.5, 4),
      minWidthPercent: clampNumber(placement?.minWidthPercent, 12, 5, 100),
      minHeightPercent: clampNumber(placement?.minHeightPercent, 8, 5, 100),
      maxWidthPercent: clampNumber(placement?.maxWidthPercent, 100, 5, 100),
      maxHeightPercent: clampNumber(placement?.maxHeightPercent, 100, 5, 100),
      order: clampNumber(placement?.order, 0, -9999, 9999),
      colSpan: clampNumber(placement?.colSpan, 1, 1, 8),
      rowSpan: clampNumber(placement?.rowSpan, 1, 1, 12),
      xPercent: clampNumber(placement?.xPercent, 0, 0, 100 - widthPercent),
      yPercent: clampNumber(placement?.yPercent, 0, 0, 100 - heightPercent),
      widthPercent,
      heightPercent,
      zIndex: clampNumber(placement?.zIndex, 1, 1, 999),
      priority: clampNumber(placement?.priority, 0, -999, 999),
    }];
  }),
);

const normalizeBadgeStyle = (style = {}, accentColor = DEFAULT_PAGE_DESIGN_SETTINGS.accentColor) => ({
  backgroundColor: style.backgroundColor === 'accentColor' ? accentColor : normalizeColor(style.backgroundColor, accentColor),
  textColor: normalizeColor(style.textColor, DEFAULT_BADGE_STYLE.textColor),
  borderColor: style.borderColor === 'transparent' ? 'transparent' : normalizeColor(style.borderColor, DEFAULT_BADGE_STYLE.borderColor),
  borderWidth: clampNumber(style.borderWidth, DEFAULT_BADGE_STYLE.borderWidth, 0, 8),
  opacity: clampNumber(style.opacity, DEFAULT_BADGE_STYLE.opacity, 0, 100),
  shape: normalizeBadgeShape(style.shape),
});

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
  const merged = { ...DEFAULT_PAGE_DESIGN_SETTINGS, ...settings, fitStrategy: { ...DEFAULT_FIT_STRATEGY, ...(settings.fitStrategy ?? {}) } };
  const layoutMode = normalizeLayoutMode(merged.layoutMode);
  const classicColumns = clampNumber(merged.classicColumns, DEFAULT_PAGE_DESIGN_SETTINGS.classicColumns, 1, 5);
  const imageFitMode = normalizeImageFit(merged.imageFitMode ?? merged.imageFit);
  const cardStyle = merged.showImages === false ? 'textOnly' : normalizeCardStyle(merged.cardStyle);
  return {
    ...merged,
    layoutMode,
    classicColumns,
    cardStyle,
    resizeMode: normalizeResizeMode(merged.resizeMode),
    gridMode: layoutMode === 'smartAutoFit' ? 'autoFill' : (layoutMode === 'manualDesigner' || layoutMode === 'snapGrid') ? 'custom' : normalizeGridMode(merged.gridMode),
    gridPreset: layoutMode === 'classicColumns' ? columnPresetFor(classicColumns) : normalizeGridPreset(merged.gridPreset),
    customGrid: normalizeCustomGrid(merged.customGrid, merged.cardGap),
    customGridPresets: normalizeGridPresetList(merged.customGridPresets, merged.cardGap),
    cardDensity: ['airy', 'balanced', 'compact'].includes(merged.cardDensity) ? merged.cardDensity : 'balanced',
    categoryTitleStyle: ['plain', 'underline', 'accentBar', 'pill', 'centered'].includes(merged.categoryTitleStyle) ? merged.categoryTitleStyle : 'plain',
    imageRatio: ['square', 'fourThree', 'sixteenNine', 'wide', 'custom'].includes(merged.imageRatio) ? merged.imageRatio : 'custom',
    imageTitleGap: clampNumber(merged.imageTitleGap, DEFAULT_PAGE_DESIGN_SETTINGS.imageTitleGap, 0, 40),
    cardContentLayout: { imageTop: 'below', imageLeft: 'imageLeft', imageRight: 'imageRight', textOnly: normalizeCardContentLayout(merged.cardContentLayout) }[cardStyle] ?? normalizeCardContentLayout(merged.cardContentLayout),
    badgePosition: normalizeBadgePosition(merged.badgePosition),
    badgeStyle: normalizeBadgeStyle(merged.badgeStyle, merged.accentColor),
    configurableDisplayMode: ['compactOptions', 'stepList'].includes(merged.configurableDisplayMode) ? merged.configurableDisplayMode : DEFAULT_PAGE_DESIGN_SETTINGS.configurableDisplayMode,
    cardBorderEnabled: merged.cardBorderEnabled === undefined ? DEFAULT_PAGE_DESIGN_SETTINGS.cardBorderEnabled : Boolean(merged.cardBorderEnabled),
    cardBorderWidth: clampNumber(merged.cardBorderWidth, DEFAULT_PAGE_DESIGN_SETTINGS.cardBorderWidth, 0, 12),
    cardBorderOpacity: clampNumber(merged.cardBorderOpacity, DEFAULT_PAGE_DESIGN_SETTINGS.cardBorderOpacity, 0, 100),
    cardShadowEnabled: merged.cardShadowEnabled === undefined ? DEFAULT_PAGE_DESIGN_SETTINGS.cardShadowEnabled : Boolean(merged.cardShadowEnabled),
    showDescriptions: merged.showDescriptions === undefined ? DEFAULT_PAGE_DESIGN_SETTINGS.showDescriptions : Boolean(merged.showDescriptions),
    showImages: merged.showImages === undefined ? DEFAULT_PAGE_DESIGN_SETTINGS.showImages : Boolean(merged.showImages),
    fitAllItems: merged.fitAllItems === undefined ? DEFAULT_PAGE_DESIGN_SETTINGS.fitAllItems : Boolean(merged.fitAllItems),
    fontPreset: Object.keys(FONT_PRESETS).includes(merged.fontPreset) || merged.fontPreset === 'custom' ? merged.fontPreset : 'custom',
    makeFirstItemHero: Boolean(merged.makeFirstItemHero),
    heroItemSpan: normalizeSpanOption(merged.heroItemSpan, '2x2', ['2x1', '2x2', '3x2']),
    defaultItemSpan: normalizeSpanOption(merged.defaultItemSpan, '1x1', ['1x1', '2x1']),
    imageFit: imageFitMode,
    imageFitMode,
    imagePosition: normalizeImagePosition(merged.imagePosition),
    imageZoom: clampNumber(merged.imageZoom, DEFAULT_PAGE_DESIGN_SETTINGS.imageZoom, 50, 200),
    imagePanX: clampNumber(merged.imagePanX, DEFAULT_PAGE_DESIGN_SETTINGS.imagePanX, -50, 50),
    imagePanY: clampNumber(merged.imagePanY, DEFAULT_PAGE_DESIGN_SETTINGS.imagePanY, -50, 50),
    imageAreaPercent: clampNumber(merged.imageAreaPercent, DEFAULT_PAGE_DESIGN_SETTINGS.imageAreaPercent, 10, 80),
    titleLineClamp: Number(merged.titleLineClamp ?? DEFAULT_PAGE_DESIGN_SETTINGS.titleLineClamp),
    descriptionLineClamp: Number(merged.descriptionLineClamp ?? DEFAULT_PAGE_DESIGN_SETTINGS.descriptionLineClamp),
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
  const selectedCategoryIds = (page.selectedCategoryIds ?? page.categoryIds ?? fallbackCategoryIds).filter((id) => project.categories.some((category) => category.id === id));
  const visibleDishIds = visibleDishIdsForCategories(project.dishes, selectedCategoryIds);
  const selectedDishIds = Array.isArray(page.selectedDishIds) ? page.selectedDishIds.filter((dishId) => visibleDishIds.includes(dishId)) : visibleDishIds;
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

export const normalizeProject = (project) => {
  const categories = (project.categories ?? []).map((category) => ({ ...blankCategory(), ...category }));
  const categoryIds = new Set(categories.map((category) => category.id));
  const fallbackId = categories[0]?.id ?? createId('cat');
  const dishes = (project.dishes ?? []).map((dish) => ({
    ...blankDish(fallbackCategoryId(categories, dish.categoryId) ?? fallbackId),
    ...dish,
    categoryId: fallbackCategoryId(categories, dish.categoryId) ?? fallbackId,
    dishType: normalizeDishType(dish.dishType),
    optionGroups: normalizeOptionGroups(dish.optionGroups),
    badges: dish.badges ?? [],
  }));
  const safeProject = { ...project, categories, dishes, pages: project.pages ?? [] };
  let pages = safeProject.pages.map((page, index) => normalizePage(page, safeProject, index));
  if (pages.length === 0) pages = [buildDefaultPage(safeProject)];
  const selectedPageId = pages.some((page) => page.id === project.selectedPageId) ? project.selectedPageId : pages[0].id;
  const selectedCategoryId = categoryIds.has(project.selectedCategoryId) ? project.selectedCategoryId : categories[0]?.id ?? null;
  const selectedSection = Object.values(APP_SECTIONS).includes(project.selectedSection) ? project.selectedSection : APP_SECTIONS.LAYOUT_PRINT;
  return { ...safeProject, pages, selectedPageId, selectedCategoryId, selectedSection };
};

function createInitialProject() {
  try {
    return normalizeProject(loadProject() ?? deepClone(demoProject));
  } catch (error) {
    console.warn('Unable to restore project from localStorage. Loading demo project instead.', error);
    return normalizeProject(deepClone(demoProject));
  }
}

export function createProjectStore() {
  let project = createInitialProject();
  let saveStatus = SAVE_STATUSES.SAVED;
  let saveTimer = null;
  const listeners = new Set();

  const getSnapshot = () => ({ project, saveStatus });
  const notify = () => listeners.forEach((listener) => listener(getSnapshot()));
  const setSaveStatus = (status) => { saveStatus = status; notify(); };

  const saveImmediately = (status) => {
    window.clearTimeout(saveTimer);
    saveTimer = null;
    saveProject(project);
    setSaveStatus(status ?? SAVE_STATUSES.SAVED);
  };

  const scheduleSave = () => {
    window.clearTimeout(saveTimer);
    setSaveStatus(SAVE_STATUSES.UNSAVED);
    saveTimer = window.setTimeout(() => {
      setSaveStatus(SAVE_STATUSES.SAVING);
      saveProject(project);
      setSaveStatus(SAVE_STATUSES.SAVED);
    }, 350);
  };

  const update = (producer) => {
    project = normalizeProject(producer(project));
    notify();
    scheduleSave();
  };

  const updateSelectedPage = (changesOrUpdater) => {
    update((state) => ({
      ...state,
      pages: state.pages.map((page) => {
        if (page.id !== state.selectedPageId) return page;
        const changes = typeof changesOrUpdater === 'function' ? changesOrUpdater(page, state) : changesOrUpdater;
        return { ...page, ...changes };
      }),
    }));
  };

  const actions = {
    setProjectName(name) { update((state) => ({ ...state, projectName: name })); },
    setSection(section) { update((state) => ({ ...state, selectedSection: section })); },
    saveProjectManually() { saveImmediately(`Saved manually at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`); },
    importProject(importedProject) { project = normalizeProject(deepClone(importedProject)); saveImmediately('Imported project successfully'); },
    resetDemoData() { window.clearTimeout(saveTimer); saveTimer = null; clearProject(); project = normalizeProject(deepClone(demoProject)); saveStatus = SAVE_STATUSES.SAVED; notify(); },
    showProjectImportError(message) { setSaveStatus(message); },
    selectCategory(categoryId) { update((state) => ({ ...state, selectedCategoryId: categoryId })); },
    addCategory() { const category = blankCategory(); update((state) => ({ ...state, categories: [...state.categories, category], selectedCategoryId: category.id })); },
    updateCategory(categoryId, changes) { update((state) => ({ ...state, categories: state.categories.map((category) => category.id === categoryId ? { ...category, ...changes } : category) })); },
    deleteCategory(categoryId) { update((state) => { const categories = state.categories.filter((category) => category.id !== categoryId); const dishes = state.dishes.filter((dish) => dish.categoryId !== categoryId); return { ...state, categories, dishes, selectedCategoryId: fallbackCategoryId(categories, state.selectedCategoryId), pages: state.pages.map((page) => ({ ...page, selectedCategoryIds: page.selectedCategoryIds.filter((id) => id !== categoryId), selectedDishIds: page.selectedDishIds.filter((dishId) => dishes.some((dish) => dish.id === dishId)) })) }; }); },
    duplicateCategory(categoryId) { update((state) => { const source = state.categories.find((category) => category.id === categoryId); if (!source) return state; const category = { ...source, id: createId('cat'), nameEn: `${source.nameEn} copy`, nameGe: source.nameGe ? `${source.nameGe} ასლი` : '' }; const copiedDishes = state.dishes.filter((dish) => dish.categoryId === categoryId).map((dish) => duplicateDishData(dish, category.id)); return { ...state, categories: [...state.categories, category], dishes: [...state.dishes, ...copiedDishes], selectedCategoryId: category.id, pages: state.pages.map((page) => ({ ...page, selectedCategoryIds: [...page.selectedCategoryIds, category.id] })) }; }); },
    addDish(categoryId) { update((state) => ({ ...state, dishes: [...state.dishes, blankDish(categoryId)] })); },
    updateDish(dishId, changes, priceField) { update((state) => ({ ...state, dishes: state.dishes.map((dish) => { if (dish.id !== dishId) return dish; const updated = { ...dish, ...changes }; return priceField ? recalculatePricing(updated, priceField) : updated; }) })); },
    deleteDish(dishId) { update((state) => ({ ...state, dishes: state.dishes.filter((dish) => dish.id !== dishId), pages: state.pages.map((page) => ({ ...page, selectedDishIds: page.selectedDishIds.filter((id) => id !== dishId) })) })); },
    duplicateDish(dishId) { update((state) => { const source = state.dishes.find((dish) => dish.id === dishId); return source ? { ...state, dishes: [...state.dishes, duplicateDishData(source)] } : state; }); },
    toggleDishVisibility(dishId) { update((state) => ({ ...state, dishes: state.dishes.map((dish) => dish.id === dishId ? { ...dish, visible: !dish.visible } : dish) })); },
    addBadge(dishId) { update((state) => ({ ...state, dishes: state.dishes.map((dish) => dish.id === dishId ? { ...dish, badges: [...(dish.badges ?? []), { id: createId('badge'), type: 'New', customText: '', emoji: '' }] } : dish) })); },
    updateBadge(dishId, badgeId, changes) { update((state) => ({ ...state, dishes: state.dishes.map((dish) => dish.id === dishId ? { ...dish, badges: (dish.badges ?? []).map((badge) => badge.id === badgeId ? { ...badge, ...changes } : badge) } : dish) })); },
    deleteBadge(dishId, badgeId) { update((state) => ({ ...state, dishes: state.dishes.map((dish) => dish.id === dishId ? { ...dish, badges: (dish.badges ?? []).filter((badge) => badge.id !== badgeId) } : dish) })); },
    addOptionGroup(dishId) { update((state) => ({ ...state, dishes: state.dishes.map((dish) => dish.id === dishId ? { ...dish, optionGroups: [...(dish.optionGroups ?? []), { id: createId('group'), nameEn: 'Option group', nameGe: '', required: false, minSelect: 0, maxSelect: 1, options: [] }] } : dish) })); },
    updateOptionGroup(dishId, groupId, changes) { update((state) => ({ ...state, dishes: state.dishes.map((dish) => dish.id === dishId ? { ...dish, optionGroups: (dish.optionGroups ?? []).map((group) => group.id === groupId ? { ...group, ...changes } : group) } : dish) })); },
    deleteOptionGroup(dishId, groupId) { update((state) => ({ ...state, dishes: state.dishes.map((dish) => dish.id === dishId ? { ...dish, optionGroups: (dish.optionGroups ?? []).filter((group) => group.id !== groupId) } : dish) })); },
    addOption(dishId, groupId) { update((state) => ({ ...state, dishes: state.dishes.map((dish) => dish.id === dishId ? { ...dish, optionGroups: (dish.optionGroups ?? []).map((group) => group.id === groupId ? { ...group, options: [...(group.options ?? []), { id: createId('option'), nameEn: 'Option', nameGe: '', priceDelta: 0 }] } : group) } : dish) })); },
    updateOption(dishId, groupId, optionId, changes) { update((state) => ({ ...state, dishes: state.dishes.map((dish) => dish.id === dishId ? { ...dish, optionGroups: (dish.optionGroups ?? []).map((group) => group.id === groupId ? { ...group, options: (group.options ?? []).map((option) => option.id === optionId ? { ...option, ...changes } : option) } : group) } : dish) })); },
    deleteOption(dishId, groupId, optionId) { update((state) => ({ ...state, dishes: state.dishes.map((dish) => dish.id === dishId ? { ...dish, optionGroups: (dish.optionGroups ?? []).map((group) => group.id === groupId ? { ...group, options: (group.options ?? []).filter((option) => option.id !== optionId) } : group) } : dish) })); },
    selectPage(pageId) { update((state) => ({ ...state, selectedPageId: pageId })); },
    addPage() { update((state) => { const page = buildDefaultPage(state, `Page ${state.pages.length + 1}`); return { ...state, pages: [...state.pages, page], selectedPageId: page.id }; }); },
    duplicateSelectedPage() { update((state) => { const source = state.pages.find((page) => page.id === state.selectedPageId); if (!source) return state; const page = { ...deepClone(source), id: createId('page'), name: `${source.name} copy` }; return { ...state, pages: [...state.pages, page], selectedPageId: page.id }; }); },
    deleteSelectedPage() { update((state) => { const currentIndex = state.pages.findIndex((page) => page.id === state.selectedPageId); const pages = state.pages.filter((page) => page.id !== state.selectedPageId); if (!pages.length) { const page = buildDefaultPage(state); return { ...state, pages: [page], selectedPageId: page.id }; } return { ...state, pages, selectedPageId: pages[Math.max(0, currentIndex - 1)]?.id ?? pages[0].id }; }); },
    updateSelectedPage(changes) { updateSelectedPage(changes); },
    setPageCategories(categoryIds) { updateSelectedPage((page, state) => ({ selectedCategoryIds: categoryIds, selectedDishIds: visibleDishIdsForCategories(state.dishes, categoryIds) })); },
    updateSelectedPageDesign(setting, value) { updateSelectedPage((page) => ({ designSettings: { ...page.designSettings, [setting]: value } })); },
    updateSelectedPageCustomGrid(setting, value) { updateSelectedPage((page) => ({ designSettings: { ...page.designSettings, customGrid: { ...page.designSettings.customGrid, [setting]: value } } })); },
    updateSelectedPageFitStrategy(setting, value) { updateSelectedPage((page) => ({ designSettings: { ...page.designSettings, fitStrategy: { ...page.designSettings.fitStrategy, [setting]: value } } })); },
    updateSelectedPageHeader(setting, value) { updateSelectedPage((page) => ({ header: { ...page.header, [setting]: value } })); },
    updateSelectedPageFooter(setting, value) { updateSelectedPage((page) => ({ footer: { ...page.footer, [setting]: value } })); },
    updateSelectedPageItemPlacement(dishId, placement) { updateSelectedPage((page) => ({ itemPlacements: { ...(page.itemPlacements ?? {}), [dishId]: { ...(page.itemPlacements?.[dishId] ?? {}), ...placement } } })); },
    resetSelectedPageItemPlacement(dishId) { updateSelectedPage((page) => { const { [dishId]: _removed, ...itemPlacements } = page.itemPlacements ?? {}; return { itemPlacements }; }); },
    resetSelectedPageItemPlacements() { updateSelectedPage({ itemPlacements: {} }); },
    saveSelectedPageCustomGridPreset(name) { updateSelectedPage((page) => { const trimmedName = name.trim() || `Custom grid ${(page.designSettings.customGridPresets?.length ?? 0) + 1}`; const preset = { id: createId('gridPreset'), name: trimmedName, ...page.designSettings.customGrid, itemSpanRules: { makeFirstItemHero: page.designSettings.makeFirstItemHero, heroItemSpan: page.designSettings.heroItemSpan, defaultItemSpan: page.designSettings.defaultItemSpan } }; return { designSettings: { ...page.designSettings, customGridPresets: [...(page.designSettings.customGridPresets ?? []), preset] } }; }); },
    applySelectedPageCustomGridPreset(presetId) { updateSelectedPage((page) => { const preset = page.designSettings.customGridPresets?.find((item) => item.id === presetId); if (!preset) return {}; return { designSettings: { ...page.designSettings, gridMode: 'custom', customGrid: { rows: preset.rows, columns: preset.columns, gap: preset.gap, autoRows: preset.autoRows, densePacking: preset.densePacking }, makeFirstItemHero: preset.itemSpanRules?.makeFirstItemHero ?? page.designSettings.makeFirstItemHero, heroItemSpan: preset.itemSpanRules?.heroItemSpan ?? page.designSettings.heroItemSpan, defaultItemSpan: preset.itemSpanRules?.defaultItemSpan ?? page.designSettings.defaultItemSpan } }; }); },
    deleteSelectedPageCustomGridPreset(presetId) { updateSelectedPage((page) => ({ designSettings: { ...page.designSettings, customGridPresets: (page.designSettings.customGridPresets ?? []).filter((preset) => preset.id !== presetId) } })); },
    updatePageName(pageId, name) { update((state) => ({ ...state, pages: state.pages.map((page) => page.id === pageId ? { ...page, name } : page) })); },
  };

  return {
    getSnapshot,
    actions,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
