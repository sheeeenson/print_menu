const STORAGE_KEY = 'restaurantMenuStudio:metaCreativeProject:v1';

export const META_FORMATS = Object.freeze([
  { id: 'metaSquare', label: '1:1', width: 1080, height: 1080, previewWidth: 520 },
  { id: 'metaPortrait', label: '4:5', width: 1080, height: 1350, previewWidth: 500 },
  { id: 'metaStory', label: '9:16', width: 1080, height: 1920, previewWidth: 360 },
]);

export const getMetaFormat = (id) => META_FORMATS.find((format) => format.id === id) ?? META_FORMATS[0];
const createId = () => `meta_${Math.random().toString(36).slice(2, 10)}`;

const DEFAULTS = {
  formatId: 'metaSquare',
  productCount: 1,
  productTransforms: {},
  selectedProductId: '',
  showPrice: true,
  showOldPrice: true,
  showProductNameEn: true,
  showProductNameGe: true,
  showDescriptionEn: false,
  showDescriptionGe: false,
  showOffer: false,
  offerText: '',
  backgroundColor: '#f4efe8',
  autoBackground: true,
  backgroundTone: 0,
  customBackgroundEnabled: false,
  customBackgroundUrl: '',
  productCutoutEnabled: false,
  productCutoutSensitivity: 38,
  productCutoutSoftness: 2,
  productCutoutExpand: 0,
  productCutoutCleanup: 35,
  productCutoutProtection: 45,
  productCutoutFillHoles: true,
  productCutoutShadow: false,
  drawingEnabled: false,
  drawingTool: 'pencil',
  drawingColor: '#e53935',
  drawingSize: 18,
  drawingSmoothing: 72,
  drawingMarkerOpacity: 34,
  drawingStrokes: [],
  textColor: '#161616',
  accentColor: '#d83b32',
  productNameColor: '#161616',
  productNameGeColor: '#161616',
  descriptionEnColor: '#161616',
  descriptionGeColor: '#161616',
  currentPriceColor: '#d83b32',
  oldPriceColor: '#161616',
  offerTextColor: '#ffffff',
  productNameSize: 68,
  productNameGeSize: 48,
  descriptionSize: 28,
  priceSize: 88,
  oldPriceSize: 44,
  offerSize: 46,
  imageScale: 1,
  productNameXOffset: 0,
  productNameYOffset: 0,
  productNameGeXOffset: 0,
  productNameGeYOffset: 0,
  descriptionEnXOffset: 0,
  descriptionEnYOffset: 0,
  descriptionGeXOffset: 0,
  descriptionGeYOffset: 0,
  currentPriceXOffset: 0,
  currentPriceYOffset: 0,
  oldPriceXOffset: 0,
  oldPriceYOffset: 0,
  offerXOffset: 0,
  offerYOffset: 0,
};

export const getDefaultMetaProductTransform = (count, index) => {
  const layouts = {
    1: [{ x: .5, y: .54, scale: 1.05 }],
    2: [{ x: .3, y: .54, scale: .74 }, { x: .7, y: .54, scale: .74 }],
    3: [{ x: .28, y: .38, scale: .62 }, { x: .72, y: .38, scale: .62 }, { x: .5, y: .7, scale: .62 }],
    4: [{ x: .28, y: .34, scale: .56 }, { x: .72, y: .34, scale: .56 }, { x: .28, y: .68, scale: .56 }, { x: .72, y: .68, scale: .56 }],
    5: [{ x: .2, y: .35, scale: .46 }, { x: .5, y: .35, scale: .46 }, { x: .8, y: .35, scale: .46 }, { x: .34, y: .7, scale: .46 }, { x: .66, y: .7, scale: .46 }],
  };
  const safeCount = Math.max(1, Math.min(5, Number(count) || 1));
  const layout = layouts[safeCount] || layouts[1];
  return { ...(layout[Math.min(index, layout.length - 1)] || layout[0]), z: index + 2 };
};

export const buildDefaultMetaProductTransforms = (ids = []) => ids.reduce((result, id, index) => {
  result[id] = getDefaultMetaProductTransform(ids.length || 1, index);
  return result;
}, {});

export function createMetaCreative(dishes = [], name = 'Meta Creative') {
  const firstDish = dishes.find((dish) => dish?.imageUrl);
  return {
    id: createId(),
    name,
    ...DEFAULTS,
    selectedDishIds: firstDish ? [firstDish.id] : [],
    selectedProductId: firstDish?.id || '',
  };
}

const normalizeCreative = (creative) => ({ ...DEFAULTS, ...creative, productTransforms: creative?.productTransforms || {} });

export function loadMetaCreativeProject(dishes = []) {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed?.creatives?.length) return { ...parsed, creatives: parsed.creatives.map(normalizeCreative) };
  } catch {}
  const creative = createMetaCreative(dishes);
  return { creatives: [creative], selectedCreativeId: creative.id };
}

export function saveMetaCreativeProject(project) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch {}
}
