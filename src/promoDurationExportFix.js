const PROJECT_STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';
const DURATION_STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:export-duration:v1';
const ALLOWED_DURATIONS = [8, 16, 32];

const normalizeDuration = (value) => {
  const number = Number(value);
  return ALLOWED_DURATIONS.includes(number) ? number : 8;
};

const readProject = () => {
  try {
    return JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) || '{}');
  } catch (error) {
    return {};
  }
};

const writeProjectDuration = (duration) => {
  try {
    const project = readProject();
    const formatId = project.formatId || 'landscape';
    const nextProject = {
      ...project,
      duration,
      formats: {
        ...(project.formats || {}),
        [formatId]: {
          ...(project.formats?.[formatId] || {}),
          duration,
        },
      },
    };
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(nextProject));
  } catch (error) {
    // Best-effort storage sync only.
  }
};

const getDurationButton = () => Array.from(document.querySelectorAll('.promo-panel-group'))
  .find((group) => group.querySelector('h3')?.textContent?.trim() === 'Duration')
  ?.querySelector('.promo-duration-buttons button.active');

const getSelectedDuration = () => {
  const buttonText = getDurationButton()?.textContent?.trim() || '';
  const buttonValue = Number(buttonText.replace(/[^0-9]/g, ''));
  if (ALLOWED_DURATIONS.includes(buttonValue)) return buttonValue;

  const storedValue = Number(window.localStorage.getItem(DURATION_STORAGE_KEY));
  if (ALLOWED_DURATIONS.includes(storedValue)) return storedValue;

  const project = readProject();
  const projectDuration = Number(project.duration ?? project.formats?.[project.formatId]?.duration);
  if (ALLOWED_DURATIONS.includes(projectDuration)) return projectDuration;

  return 8;
};

const rememberDurationFromClick = (target) => {
  const button = target?.closest?.('.promo-duration-buttons button');
  if (!button) return;
  const groupTitle = button.closest('.promo-panel-group')?.querySelector('h3')?.textContent?.trim();
  if (groupTitle !== 'Duration') return;

  const duration = normalizeDuration(button.textContent?.replace(/[^0-9]/g, ''));
  window.localStorage.setItem(DURATION_STORAGE_KEY, String(duration));
  writeProjectDuration(duration);
};

const patchHtmlDuration = (html, duration) => {
  const durationCss = `${duration}s`;
  let nextHtml = String(html || '');

  nextHtml = nextHtml.replace(/--promo-duration:\s*[^;"']+/g, `--promo-duration: ${durationCss}`);

  const forceStyle = `<style id="promo-export-duration-fix">.promo-scene{--promo-duration:${durationCss}!important}.promo-scene,.promo-scene *{animation-duration:${durationCss}!important}</style>`;
  if (nextHtml.includes('</style>')) return nextHtml.replace('</style>', `${forceStyle}</style>`);
  return `${forceStyle}${nextHtml}`;
};

const shouldPatchRenderRequest = (url) => {
  if (typeof url !== 'string') return false;
  return url.includes('/api/promo-render')
    || url.endsWith('/jobs')
    || url.includes('localhost:3020/jobs')
    || url.endsWith('/render')
    || url.includes('print-menu.onrender.com/render');
};

const patchFilename = (filename, duration) => {
  const value = String(filename || 'tv-promo.mp4');
  const extensionMatch = value.match(/\.[^.]+$/);
  const extension = extensionMatch?.[0] || '.mp4';
  const base = value.replace(/\.[^.]+$/, '').replace(/-(8|16|32)s$/, '');
  return `${base}-${duration}s${extension}`;
};

const patchPromoRenderFetch = () => {
  if (window.__promoDurationExportFixInstalled) return;
  window.__promoDurationExportFixInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;

    if (!shouldPatchRenderRequest(url) || !init?.body) return originalFetch(input, init);

    try {
      const payload = JSON.parse(init.body);
      const output = payload.output || '';
      if (!['mp4', 'webm'].includes(output)) return originalFetch(input, init);

      const duration = getSelectedDuration();
      window.localStorage.setItem(DURATION_STORAGE_KEY, String(duration));
      writeProjectDuration(duration);

      const nextPayload = {
        ...payload,
        duration,
        filename: patchFilename(payload.filename, duration),
        settings: {
          ...(payload.settings || {}),
          duration,
        },
        html: patchHtmlDuration(payload.html, duration),
      };

      return originalFetch(input, {
        ...init,
        body: JSON.stringify(nextPayload),
      });
    } catch (error) {
      return originalFetch(input, init);
    }
  };
};

if (typeof window !== 'undefined') {
  document.addEventListener('click', (event) => rememberDurationFromClick(event.target), true);
  patchPromoRenderFetch();
}
