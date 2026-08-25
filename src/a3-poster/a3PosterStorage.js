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
    backgroundColor: '#f4efe8',
    autoBackground: true,
    backgroundTone: 0,
    textColor: '#161616',
    accentColor: '#d83b32',
    headlineSize: 220,
    subheadlineSize: 82,
    priceSize: 150,
    imageScale: 1,
    imageYOffset: 0,
    contentYOffset: 0,
  };
}

const normalizePoster = (poster) => ({
  autoBackground: true,
  backgroundTone: 0,
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
