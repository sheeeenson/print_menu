const STORAGE_KEY = 'restaurantMenuStudio:a3PosterProject:v1';

export const A3_FORMATS = Object.freeze([
  { id: 'a3Portrait', label: 'A3 Portrait', width: 3508, height: 4961, previewWidth: 520 },
  { id: 'a3Landscape', label: 'A3 Landscape', width: 4961, height: 3508, previewWidth: 720 },
]);

export const getA3Format = (id) => A3_FORMATS.find((format) => format.id === id) ?? A3_FORMATS[0];

const createId = () => `a3_${Math.random().toString(36).slice(2, 10)}`;

export function createA3Poster(dishes = [], name = 'A3 Poster') {
  const firstDish = dishes.find((dish) => dish?.imageUrl);
  return {
    id: createId(),
    name,
    formatId: 'a3Portrait',
    template: 'single',
    selectedDishIds: firstDish ? [firstDish.id] : [],
    headline: '',
    subheadline: '',
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
    productCutoutFillHoles: true,
    productCutoutShadow: false,
    drawingEnabled: false,
    drawingTool: 'pencil',
    drawingColor: '#e53935',
    drawingSize: 18,
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
    headlineSize: 220,
    subheadlineSize: 82,
    productNameSize: 86,
    productNameGeSize: 62,
    descriptionSize: 48,
    priceSize: 150,
    oldPriceSize: 82,
    offerSize: 78,
    imageScale: 1,
    imageXOffset: 0,
    imageYOffset: 0,
    headlineXOffset: 0,
    headlineYOffset: 0,
    subheadlineXOffset: 0,
    subheadlineYOffset: 0,
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
}

const normalizePoster = (poster) => ({
  autoBackground: true,
  backgroundTone: 0,
  customBackgroundEnabled: false,
  customBackgroundUrl: '',
  productCutoutEnabled: false,
  productCutoutSensitivity: 38,
  productCutoutSoftness: 2,
  productCutoutExpand: 0,
  productCutoutCleanup: 35,
  productCutoutFillHoles: true,
  productCutoutShadow: false,
  drawingEnabled: false,
  drawingTool: 'pencil',
  drawingColor: '#e53935',
  drawingSize: 18,
  drawingStrokes: [],
  showOldPrice: true,
  showProductNameEn: true,
  showProductNameGe: true,
  showDescriptionEn: false,
  showDescriptionGe: false,
  showOffer: false,
  offerText: '',
  productNameColor: poster?.textColor ?? '#161616',
  productNameGeColor: poster?.textColor ?? '#161616',
  descriptionEnColor: poster?.textColor ?? '#161616',
  descriptionGeColor: poster?.textColor ?? '#161616',
  currentPriceColor: poster?.accentColor ?? '#d83b32',
  oldPriceColor: poster?.textColor ?? '#161616',
  offerTextColor: '#ffffff',
  productNameSize: 86,
  productNameGeSize: 62,
  descriptionSize: 48,
  oldPriceSize: 82,
  offerSize: 78,
  imageXOffset: 0,
  imageYOffset: 0,
  headlineXOffset: poster?.contentXOffset ?? 0,
  headlineYOffset: poster?.contentYOffset ?? 0,
  subheadlineXOffset: poster?.contentXOffset ?? 0,
  subheadlineYOffset: poster?.contentYOffset ?? 0,
  productNameXOffset: poster?.metaXOffset ?? 0,
  productNameYOffset: poster?.metaYOffset ?? 0,
  productNameGeXOffset: poster?.metaXOffset ?? 0,
  productNameGeYOffset: poster?.metaYOffset ?? 0,
  descriptionEnXOffset: poster?.metaXOffset ?? 0,
  descriptionEnYOffset: poster?.metaYOffset ?? 0,
  descriptionGeXOffset: poster?.metaXOffset ?? 0,
  descriptionGeYOffset: poster?.metaYOffset ?? 0,
  currentPriceXOffset: poster?.metaXOffset ?? 0,
  currentPriceYOffset: poster?.metaYOffset ?? 0,
  oldPriceXOffset: poster?.metaXOffset ?? 0,
  oldPriceYOffset: poster?.metaYOffset ?? 0,
  offerXOffset: 0,
  offerYOffset: 0,
  ...poster,
});

export function loadA3PosterProject(dishes = []) {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed?.posters?.length) {
      return {
        ...parsed,
        posters: parsed.posters.map(normalizePoster),
      };
    }
  } catch {
    // Ignore malformed local data and use defaults.
  }
  const poster = createA3Poster(dishes);
  return { posters: [poster], selectedPosterId: poster.id };
}

export function saveA3PosterProject(project) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    // Local storage can be unavailable in private browser modes.
  }
}
