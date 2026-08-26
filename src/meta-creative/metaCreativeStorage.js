const STORAGE_KEY = 'restaurantMenuStudio:metaCreativeProject:v1';

export const META_FORMATS = Object.freeze([
  { id: 'metaSquare', label: '1:1', width: 1080, height: 1080, previewWidth: 520 },
  { id: 'metaPortrait', label: '4:5', width: 1080, height: 1350, previewWidth: 500 },
  { id: 'metaStory', label: '9:16', width: 1080, height: 1920, previewWidth: 360 },
]);

export const META_ELEMENT_TYPES = Object.freeze([
  'image', 'nameEn', 'nameGe', 'descriptionEn', 'descriptionGe', 'price', 'oldPrice',
]);

export const getMetaFormat = (id) => META_FORMATS.find((format) => format.id === id) ?? META_FORMATS[0];
const createId = () => `meta_${Math.random().toString(36).slice(2, 10)}`;
const elementKey = (dishId, type) => `${dishId}:${type}`;

const DEFAULTS = {
  formatId: 'metaSquare',
  productCount: 1,
  productTransforms: {},
  elementTransforms: {},
  selectedProductId: '',
  selectedElementKey: '',
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
  backgroundScale: 1,
  backgroundX: .5,
  backgroundY: .5,
  textureEnabled: false,
  textureUrl: '',
  textureOpacity: .35,
  textureScale: 1,
  textureX: .5,
  textureY: .5,
  textureBlendMode: 'normal',
  productCutoutEnabled: false,
  productCutoutSensitivity: 38,
  productCutoutSoftness: 2,
  productCutoutExpand: 0,
  productCutoutCleanup: 35,
  productCutoutProtection: 45,
  productCutoutFillHoles: true,
  productCutoutShadow: false,
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
  offerTransform: { x: .2, y: .88, scale: 1, z: 30 },
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

const getDefaultElementTransform = (type, base, index) => {
  const z = 20 + index * 8;
  switch (type) {
    case 'image': return { x: base.x, y: base.y, scale: base.scale, z: base.z ?? z };
    case 'nameEn': return { x: Math.max(.08, base.x - .16), y: Math.min(.92, base.y + .18), scale: 1, z: z + 1 };
    case 'nameGe': return { x: Math.max(.08, base.x - .16), y: Math.min(.96, base.y + .24), scale: 1, z: z + 2 };
    case 'descriptionEn': return { x: Math.max(.08, base.x - .16), y: Math.min(.97, base.y + .3), scale: 1, z: z + 3 };
    case 'descriptionGe': return { x: Math.max(.08, base.x - .16), y: Math.min(.985, base.y + .34), scale: 1, z: z + 4 };
    case 'price': return { x: Math.min(.92, base.x + .17), y: Math.min(.92, base.y + .2), scale: 1, z: z + 5 };
    case 'oldPrice': return { x: Math.min(.92, base.x + .17), y: Math.min(.84, base.y + .12), scale: 1, z: z + 6 };
    default: return { x: base.x, y: base.y, scale: 1, z };
  }
};

export const buildDefaultMetaElementTransforms = (ids = []) => ids.reduce((result, id, index) => {
  const base = getDefaultMetaProductTransform(ids.length || 1, index);
  META_ELEMENT_TYPES.forEach((type) => { result[elementKey(id, type)] = getDefaultElementTransform(type, base, index); });
  return result;
}, {});

export const buildDefaultMetaProductTransforms = (ids = []) => ids.reduce((result, id, index) => {
  result[id] = getDefaultMetaProductTransform(ids.length || 1, index);
  return result;
}, {});

export function createMetaCreative(dishes = [], name = 'Meta Creative') {
  const firstDish = dishes.find((dish) => dish?.imageUrl);
  const selectedDishIds = firstDish ? [firstDish.id] : [];
  const elementTransforms = buildDefaultMetaElementTransforms(selectedDishIds);
  return {
    id: createId(),
    name,
    ...DEFAULTS,
    selectedDishIds,
    elementTransforms,
    selectedProductId: firstDish?.id || '',
    selectedElementKey: firstDish ? elementKey(firstDish.id, 'image') : '',
  };
}

const normalizeCreative = (creative) => {
  const selectedDishIds = creative?.selectedDishIds || [];
  const defaults = buildDefaultMetaElementTransforms(selectedDishIds);
  const legacy = creative?.productTransforms || {};
  selectedDishIds.forEach((id, index) => {
    const legacyTransform = legacy[id];
    if (legacyTransform && !creative?.elementTransforms?.[elementKey(id, 'image')]) {
      defaults[elementKey(id, 'image')] = { ...getDefaultMetaProductTransform(selectedDishIds.length || 1, index), ...legacyTransform };
    }
  });
  return {
    ...DEFAULTS,
    ...creative,
    productTransforms: creative?.productTransforms || {},
    elementTransforms: { ...defaults, ...(creative?.elementTransforms || {}) },
    offerTransform: { ...DEFAULTS.offerTransform, ...(creative?.offerTransform || {}) },
  };
};

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
