const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';
const WIDE_MOVEMENT_KEY = 'restaurant-menu-studio:tv-promo-generator:wide-movement:v2';
const MOVEMENT_MIN = -2400;
const MOVEMENT_MAX = 2400;

const GROUP_MAP = {
  'Text block': { X: 'copyX', Y: 'copyY' },
  'Dish photo': { X: 'dishX', Y: 'dishY' },
  Price: { X: 'priceX', Y: 'priceY' },
  CTA: { X: 'ctaX', Y: 'ctaY' },
  GIF: { X: 'gifX', Y: 'gifY' },
};

const readJson = (key, fallback = {}) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Could not save promo wide movement state:', error);
  }
};

const clampMovement = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(MOVEMENT_MAX, Math.max(MOVEMENT_MIN, number));
};

const getFormatId = () => {
  const project = readJson(STORAGE_KEY, {});
  return project.formatId || 'landscape';
};

const getControlKey = (input) => {
  const block = input.closest('.promo-style-block');
  const groupTitle = block?.querySelector('h4')?.textContent?.trim();
  const labelText = input.closest('label')?.querySelector('span')?.childNodes?.[0]?.textContent?.trim();
  return GROUP_MAP[groupTitle]?.[labelText] || '';
};

const setNestedLayoutValue = (project, formatId, key, value) => {
  const safeValue = clampMovement(value);
  return {
    ...project,
    layoutOffsets: {
      ...(project.layoutOffsets || {}),
      [key]: safeValue,
    },
    formats: {
      ...(project.formats || {}),
      [formatId]: {
        ...(project.formats?.[formatId] || {}),
        layoutOffsets: {
          ...(project.formats?.[formatId]?.layoutOffsets || {}),
          [key]: safeValue,
        },
      },
    },
  };
};

const saveWideValue = (key, value) => {
  const formatId = getFormatId();
  const safeValue = clampMovement(value);
  const allValues = readJson(WIDE_MOVEMENT_KEY, {});
  writeJson(WIDE_MOVEMENT_KEY, {
    ...allValues,
    [formatId]: {
      ...(allValues[formatId] || {}),
      [key]: safeValue,
    },
  });

  const project = readJson(STORAGE_KEY, {});
  writeJson(STORAGE_KEY, setNestedLayoutValue(project, formatId, key, safeValue));
};

const hydrateWideValuesBeforeReact = () => {
  const formatId = getFormatId();
  const saved = readJson(WIDE_MOVEMENT_KEY, {})[formatId] || {};
  const keys = Object.keys(saved);
  if (!keys.length) return;

  let project = readJson(STORAGE_KEY, {});
  keys.forEach((key) => {
    project = setNestedLayoutValue(project, formatId, key, saved[key]);
  });
  writeJson(STORAGE_KEY, project);
};

const widenLayoutRangeInputs = () => {
  document.querySelectorAll('.promo-style-block input[type="range"]').forEach((input) => {
    const key = getControlKey(input);
    if (!key) return;
    input.min = String(MOVEMENT_MIN);
    input.max = String(MOVEMENT_MAX);
    input.setAttribute('min', String(MOVEMENT_MIN));
    input.setAttribute('max', String(MOVEMENT_MAX));
  });
};

if (typeof window !== 'undefined') {
  hydrateWideValuesBeforeReact();

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'range') return;
    const key = getControlKey(input);
    if (!key) return;
    input.min = String(MOVEMENT_MIN);
    input.max = String(MOVEMENT_MAX);
    saveWideValue(key, input.value);
  }, true);

  window.addEventListener('load', widenLayoutRangeInputs);
  const observer = new MutationObserver(() => window.requestAnimationFrame(widenLayoutRangeInputs));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.requestAnimationFrame(widenLayoutRangeInputs);
  window.setTimeout(widenLayoutRangeInputs, 300);
}
