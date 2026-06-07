const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';
const ISOLATION_KEY = 'restaurant-menu-studio:tv-promo-generator:format-isolation:v1';

const FORMAT_IDS = ['landscape', 'square', 'portrait', 'story'];
const GLOBAL_KEYS = new Set([
  'selectedDishId',
  'formatId',
  'headline',
  'offerText',
  'ctaText',
  'showOffer',
  'showDescription',
  'showCta',
  'gifUrl',
  'gifLibrary',
  'effects',
]);

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
    console.warn('Could not save promo format isolation state:', error);
  }
};

const getProject = () => readJson(STORAGE_KEY, {});
const getIsolation = () => readJson(ISOLATION_KEY, {});
const isFormatId = (value) => FORMAT_IDS.includes(value);

const pickFormatSettings = (project = {}) => Object.fromEntries(
  Object.entries(project).filter(([key]) => !GLOBAL_KEYS.has(key) && key !== 'formats'),
);

const pickGlobalSettings = (project = {}) => Object.fromEntries(
  Object.entries(project).filter(([key]) => GLOBAL_KEYS.has(key)),
);

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

const persistCurrentFormat = () => {
  const project = getProject();
  const formatId = isFormatId(project.formatId) ? project.formatId : 'landscape';
  const isolation = getIsolation();
  const currentFormatSettings = pickFormatSettings(project);

  writeJson(ISOLATION_KEY, {
    ...isolation,
    [formatId]: {
      ...(isolation[formatId] || {}),
      ...currentFormatSettings,
    },
  });
};

const buildProjectForFormat = (formatId) => {
  const project = getProject();
  const isolation = getIsolation();
  const globalSettings = pickGlobalSettings(project);
  const currentFormatId = isFormatId(project.formatId) ? project.formatId : 'landscape';
  const targetFormatSettings = isolation[formatId] || project.formats?.[formatId] || isolation[currentFormatId] || pickFormatSettings(project);

  const formats = Object.fromEntries(FORMAT_IDS.map((id) => [
    id,
    {
      ...(project.formats?.[id] || {}),
      ...(isolation[id] || {}),
      ...(id === formatId ? targetFormatSettings : {}),
    },
  ]));

  return {
    ...project,
    ...globalSettings,
    ...targetFormatSettings,
    formatId,
    formats,
  };
};

const switchToFormat = (formatId) => {
  if (!isFormatId(formatId)) return;
  persistCurrentFormat();
  const nextProject = buildProjectForFormat(formatId);
  writeJson(STORAGE_KEY, nextProject);
  window.setTimeout(() => window.location.reload(), 40);
};

if (typeof window !== 'undefined') {
  document.addEventListener('input', (event) => {
    if (event.target?.closest?.('.promo-generator-panel')) {
      window.requestAnimationFrame(persistCurrentFormat);
    }
  }, true);

  document.addEventListener('change', (event) => {
    if (event.target?.closest?.('.promo-generator-panel')) {
      window.requestAnimationFrame(persistCurrentFormat);
    }
  }, true);

  document.addEventListener('click', (event) => {
    const formatId = getClickedFormatId(event.target);
    if (!formatId) return;
    const project = getProject();
    if (project.formatId === formatId) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    switchToFormat(formatId);
  }, true);

  window.addEventListener('beforeunload', persistCurrentFormat);
  window.requestAnimationFrame(persistCurrentFormat);
}
