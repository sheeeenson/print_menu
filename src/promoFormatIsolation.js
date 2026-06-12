const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';
const ISOLATION_KEY = 'restaurant-menu-studio:tv-promo-generator:format-isolation:v3';

const FORMAT_IDS = ['landscape', 'square', 'portrait', 'story'];

const GLOBAL_KEYS = new Set([
  'selectedDishId',
  'formatId',
  'headline',
  'offerText',
  'ctaText',
  'gifUrl',
  'gifLibrary',
  'effects',
]);

const FORMAT_KEYS = [
  'duration',
  'showOffer',
  'showDescription',
  'showCta',
  'showTextShadow',
  'textShadowColor',
  'textShadowOpacity',
  'textShadowBlur',
  'descriptionOffsetY',
  'backgroundTone',
  'dishSize',
  'offerColor',
  'offerFont',
  'offerSize',
  'headlineColor',
  'headlineFont',
  'headlineSize',
  'geTitleColor',
  'geTitleFont',
  'geTitleSize',
  'descriptionColor',
  'descriptionFont',
  'descriptionSize',
  'ctaColor',
  'ctaFont',
  'ctaSize',
  'oldPriceColor',
  'oldPriceFont',
  'oldPriceSize',
  'salePriceColor',
  'salePriceFont',
  'salePriceSize',
  'layoutOffsets',
  'gifPosition',
  'gifSize',
  'gifBorderRadius',
  'gifShape',
  'gifShadow',
  'gifShadowColor',
];

let writingInternally = false;

const readJson = (key, fallback = {}) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeRaw = (key, value) => {
  window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
};

const writeJson = (key, value) => {
  try {
    writingInternally = true;
    writeRaw(key, value);
  } catch (error) {
    console.warn('Could not save promo format isolation state:', error);
  } finally {
    writingInternally = false;
  }
};

const isFormatId = (value) => FORMAT_IDS.includes(value);
const getProject = () => readJson(STORAGE_KEY, {});
const getIsolation = () => readJson(ISOLATION_KEY, {});
const getActiveFormatId = (project = getProject()) => isFormatId(project.formatId) ? project.formatId : 'landscape';

const pickKeys = (source = {}, keys = []) => Object.fromEntries(
  keys
    .filter((key) => source[key] !== undefined)
    .map((key) => [key, source[key]]),
);

const pickGlobalSettings = (project = {}) => pickKeys(project, [...GLOBAL_KEYS]);
const pickFormatSettings = (project = {}, formatId = getActiveFormatId(project)) => ({
  ...(project.formats?.[formatId] || {}),
  ...pickKeys(project, FORMAT_KEYS),
});

const saveFormatSnapshot = (project) => {
  if (!project || typeof project !== 'object') return;
  const formatId = getActiveFormatId(project);
  const isolation = getIsolation();
  const formatSettings = pickFormatSettings(project, formatId);

  writeJson(ISOLATION_KEY, {
    ...isolation,
    [formatId]: {
      ...(isolation[formatId] || {}),
      ...formatSettings,
    },
  });
};

const persistCurrentFormat = () => saveFormatSnapshot(getProject());

const ensureCurrentFormatPersisted = () => {
  const project = getProject();
  const formatId = getActiveFormatId(project);
  const isolation = getIsolation();
  if (isolation[formatId]) return;
  saveFormatSnapshot(project);
};

const getClickedFormatId = (target) => {
  const button = target?.closest?.('.promo-format-buttons button');
  if (!button) return '';
  const label = button.textContent?.trim();
  if (label === '16:9') return 'landscape';
  if (label === '1:1') return 'square';
  if (label === '4:5') return 'portrait';
  if (label === '9:16') return 'story';
  return '';
};

const buildProjectForFormat = (targetFormatId) => {
  const project = getProject();
  const isolation = getIsolation();
  const globalSettings = pickGlobalSettings(project);
  const currentFormatId = getActiveFormatId(project);
  const currentFormatSettings = pickFormatSettings(project, currentFormatId);
  const targetFormatSettings = isolation[targetFormatId]
    || project.formats?.[targetFormatId]
    || currentFormatSettings;

  const nextFormats = Object.fromEntries(FORMAT_IDS.map((formatId) => [
    formatId,
    {
      ...(project.formats?.[formatId] || {}),
      ...(isolation[formatId] || {}),
      ...(formatId === currentFormatId ? currentFormatSettings : {}),
      ...(formatId === targetFormatId ? targetFormatSettings : {}),
    },
  ]));

  return {
    ...project,
    ...globalSettings,
    ...targetFormatSettings,
    formatId: targetFormatId,
    formats: nextFormats,
  };
};

const switchToFormat = (formatId) => {
  if (!isFormatId(formatId)) return;
  persistCurrentFormat();
  const nextProject = buildProjectForFormat(formatId);
  writeJson(STORAGE_KEY, nextProject);
  window.setTimeout(() => window.location.reload(), 40);
};

const installStorageAutosave = () => {
  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = (key, value) => {
    originalSetItem(key, value);
    if (writingInternally || key !== STORAGE_KEY) return;
    try {
      saveFormatSnapshot(JSON.parse(value));
    } catch (error) {
      // Ignore unrelated or partial writes.
    }
  };
};

if (typeof window !== 'undefined') {
  installStorageAutosave();
  ensureCurrentFormatPersisted();

  document.addEventListener('input', (event) => {
    if (event.target?.closest?.('.promo-generator-panel')) {
      window.setTimeout(persistCurrentFormat, 0);
    }
  }, true);

  document.addEventListener('change', (event) => {
    if (event.target?.closest?.('.promo-generator-panel')) {
      window.setTimeout(persistCurrentFormat, 0);
    }
  }, true);

  document.addEventListener('click', (event) => {
    const formatId = getClickedFormatId(event.target);
    if (!formatId) return;
    const project = getProject();
    if (getActiveFormatId(project) === formatId) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    switchToFormat(formatId);
  }, true);

  window.addEventListener('beforeunload', persistCurrentFormat);
}
