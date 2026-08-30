const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';

const readLayoutOffsets = () => {
  try {
    const project = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return project.layoutOffsets || {};
  } catch {
    return {};
  }
};

const shouldAutoAlign = () => {
  const offsets = readLayoutOffsets();
  return Number(offsets.priceY || 0) === 0 && Number(offsets.ctaY || 0) === 0;
};

const alignScene = (scene) => {
  if (!(scene instanceof HTMLElement)) return;

  const priceCard = scene.querySelector('.promo-price-card');
  const salePrice = priceCard?.querySelector('strong');
  const cta = scene.querySelector('.promo-cta');
  if (!(priceCard instanceof HTMLElement) || !(salePrice instanceof HTMLElement) || !(cta instanceof HTMLElement)) return;

  if (!shouldAutoAlign()) {
    salePrice.style.removeProperty('--tv-promo-price-baseline-shift');
    return;
  }

  salePrice.style.setProperty('--tv-promo-price-baseline-shift', '0px');

  window.requestAnimationFrame(() => {
    const sceneRect = scene.getBoundingClientRect();
    const sceneWidth = scene.offsetWidth || 1;
    const renderScale = sceneRect.width / sceneWidth || 1;
    const priceRect = salePrice.getBoundingClientRect();
    const ctaRect = cta.getBoundingClientRect();
    const deltaScreenPx = ctaRect.bottom - priceRect.bottom;
    const deltaScenePx = deltaScreenPx / renderScale;
    const safeShift = Math.max(-160, Math.min(160, deltaScenePx));
    salePrice.style.setProperty('--tv-promo-price-baseline-shift', `${safeShift.toFixed(2)}px`);
  });
};

let scheduled = false;
const alignAll = () => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    document.querySelectorAll('.promo-scene').forEach(alignScene);
  });
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', alignAll);
  window.addEventListener('resize', alignAll);
  document.fonts?.ready?.then(alignAll).catch(() => {});

  document.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'range') {
      window.setTimeout(alignAll, 0);
    }
  }, true);

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === 'tv-promo-dish') {
      window.setTimeout(alignAll, 0);
    }
  }, true);

  const observer = new MutationObserver(alignAll);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  window.setTimeout(alignAll, 0);
  window.setTimeout(alignAll, 250);
  window.setTimeout(alignAll, 1000);
}
