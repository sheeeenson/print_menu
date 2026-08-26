import { buildDefaultA3ProductTransforms, getA3ProductCount, getDefaultA3ProductTransform } from './a3ProductLayout.js';
import { buildDefaultA3ElementTransforms, getA3ElementKey } from './a3IndependentLayers.js';

const STORAGE_KEY = 'restaurantMenuStudio:a3PosterProject:v1';

export const A3_FORMATS = Object.freeze([
  { id: 'a3Portrait', label: 'A3 Portrait', width: 3508, height: 4961, previewWidth: 520 },
  { id: 'a3Landscape', label: 'A3 Landscape', width: 4961, height: 3508, previewWidth: 720 },
]);

export const getA3Format = (id) => A3_FORMATS.find((format) => format.id === id) ?? A3_FORMATS[0];

const createId = () => `a3_${Math.random().toString(36).slice(2, 10)}`;

export function createA3Poster(dishes = [], name = 'A3 Poster') {
  const firstDish = dishes.find((dish) => dish?.imageUrl);
  const selectedDishIds = firstDish ? [firstDish.id] : [];
  return {
    id: createId(), name, formatId: 'a3Portrait', template: 'free', productCount: 1,
    selectedDishIds,
    productTransforms: buildDefaultA3ProductTransforms(selectedDishIds),
    elementTransforms: buildDefaultA3ElementTransforms(selectedDishIds, getDefaultA3ProductTransform),
    selectedProductId: firstDish?.id ?? '',
    selectedElementKey: firstDish ? getA3ElementKey(firstDish.id, 'image') : '',
    offerTransform: { x: .18, y: .88, scale: 1, z: 70 },
    headline: '', subheadline: '', showPrice: true, showOldPrice: true, showProductNameEn: true, showProductNameGe: true,
    showDescriptionEn: false, showDescriptionGe: false, showOffer: false, offerText: '', backgroundColor: '#f4efe8',
    autoBackground: true, backgroundTone: 0, customBackgroundEnabled: false, customBackgroundUrl: '',
    productCutoutEnabled: false, productCutoutSensitivity: 38, productCutoutSoftness: 2, productCutoutExpand: 0,
    productCutoutCleanup: 35, productCutoutProtection: 45, productCutoutFillHoles: true, productCutoutShadow: false,
    drawingEnabled: false, drawingTool: 'pencil', drawingColor: '#e53935', drawingSize: 18, drawingSmoothing: 72,
    drawingMarkerOpacity: 34, drawingStrokes: [], textColor: '#161616', accentColor: '#d83b32',
    productNameColor: '#161616', productNameGeColor: '#161616', descriptionEnColor: '#161616', descriptionGeColor: '#161616',
    currentPriceColor: '#d83b32', oldPriceColor: '#161616', offerTextColor: '#ffffff', headlineSize: 220, subheadlineSize: 82,
    productNameSize: 86, productNameGeSize: 62, descriptionSize: 48, priceSize: 150, oldPriceSize: 82, offerSize: 78,
    imageScale: 1, imageXOffset: 0, imageYOffset: 0, headlineXOffset: 0, headlineYOffset: 0, subheadlineXOffset: 0,
    subheadlineYOffset: 0, productNameXOffset: 0, productNameYOffset: 0, productNameGeXOffset: 0, productNameGeYOffset: 0,
    descriptionEnXOffset: 0, descriptionEnYOffset: 0, descriptionGeXOffset: 0, descriptionGeYOffset: 0,
    currentPriceXOffset: 0, currentPriceYOffset: 0, oldPriceXOffset: 0, oldPriceYOffset: 0, offerXOffset: 0, offerYOffset: 0,
  };
}

const normalizePoster = (poster) => {
  const selectedDishIds = Array.isArray(poster?.selectedDishIds) ? poster.selectedDishIds.slice(0, 5) : [];
  const productCount = getA3ProductCount({ ...poster, selectedDishIds });
  const defaults = buildDefaultA3ProductTransforms(selectedDishIds);
  const elementDefaults = buildDefaultA3ElementTransforms(selectedDishIds, getDefaultA3ProductTransform);
  const legacy = poster?.productTransforms || {};

  selectedDishIds.forEach((id, index) => {
    const legacyTransform = legacy[id];
    const imageKey = getA3ElementKey(id, 'image');
    if (legacyTransform && !poster?.elementTransforms?.[imageKey]) {
      elementDefaults[imageKey] = {
        ...getDefaultA3ProductTransform(selectedDishIds.length || 1, index),
        ...legacyTransform,
      };
    }
  });

  return {
    autoBackground: true, backgroundTone: 0, customBackgroundEnabled: false, customBackgroundUrl: '',
    productCutoutEnabled: false, productCutoutSensitivity: 38, productCutoutSoftness: 2, productCutoutExpand: 0,
    productCutoutCleanup: 35, productCutoutProtection: 45, productCutoutFillHoles: true, productCutoutShadow: false,
    drawingEnabled: false, drawingTool: 'pencil', drawingColor: '#e53935', drawingSize: 18, drawingSmoothing: 72,
    drawingMarkerOpacity: 34, drawingStrokes: [], showOldPrice: true, showProductNameEn: true, showProductNameGe: true,
    showDescriptionEn: false, showDescriptionGe: false, showOffer: false, offerText: '',
    productNameColor: poster?.textColor ?? '#161616', productNameGeColor: poster?.textColor ?? '#161616',
    descriptionEnColor: poster?.textColor ?? '#161616', descriptionGeColor: poster?.textColor ?? '#161616',
    currentPriceColor: poster?.accentColor ?? '#d83b32', oldPriceColor: poster?.textColor ?? '#161616', offerTextColor: '#ffffff',
    productNameSize: 86, productNameGeSize: 62, descriptionSize: 48, oldPriceSize: 82, offerSize: 78,
    imageXOffset: 0, imageYOffset: 0, headlineXOffset: poster?.contentXOffset ?? 0, headlineYOffset: poster?.contentYOffset ?? 0,
    subheadlineXOffset: poster?.contentXOffset ?? 0, subheadlineYOffset: poster?.contentYOffset ?? 0,
    productNameXOffset: poster?.metaXOffset ?? 0, productNameYOffset: poster?.metaYOffset ?? 0,
    productNameGeXOffset: poster?.metaXOffset ?? 0, productNameGeYOffset: poster?.metaYOffset ?? 0,
    descriptionEnXOffset: poster?.metaXOffset ?? 0, descriptionEnYOffset: poster?.metaYOffset ?? 0,
    descriptionGeXOffset: poster?.metaXOffset ?? 0, descriptionGeYOffset: poster?.metaYOffset ?? 0,
    currentPriceXOffset: poster?.metaXOffset ?? 0, currentPriceYOffset: poster?.metaYOffset ?? 0,
    oldPriceXOffset: poster?.metaXOffset ?? 0, oldPriceYOffset: poster?.metaYOffset ?? 0, offerXOffset: 0, offerYOffset: 0,
    selectedElementKey: '',
    offerTransform: { x: .18, y: .88, scale: 1, z: 70 },
    ...poster,
    template: 'free', productCount, selectedDishIds,
    productTransforms: { ...defaults, ...(poster?.productTransforms || {}) },
    elementTransforms: { ...elementDefaults, ...(poster?.elementTransforms || {}) },
    offerTransform: { x: .18, y: .88, scale: 1, z: 70, ...(poster?.offerTransform || {}) },
    selectedProductId: poster?.selectedProductId || selectedDishIds[0] || '',
    selectedElementKey: poster?.selectedElementKey || (selectedDishIds[0] ? getA3ElementKey(selectedDishIds[0], 'image') : ''),
  };
};

export function loadA3PosterProject(dishes = []) {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed?.posters?.length) return { ...parsed, posters: parsed.posters.map(normalizePoster) };
  } catch {}
  const poster = createA3Poster(dishes);
  return { posters: [poster], selectedPosterId: poster.id };
}

export function saveA3PosterProject(project) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch {}
}
