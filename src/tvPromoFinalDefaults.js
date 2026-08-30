const DEFAULT_CTA_SIZE = 72;
const RESET_GROUPS = new Set(['Text block', 'Price', 'CTA']);

const getPanel = () => document.querySelector('.promo-generator-panel');
const getScene = () => document.querySelector('.promo-scene');

const setNativeRangeValue = (input, value) => {
  if (!(input instanceof HTMLInputElement) || input.type !== 'range') return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, String(value));
  else input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const getBlockTitle = (block) => block.querySelector(':scope > h4')?.textContent?.trim() || '';
const getRangeLabel = (input) => input.closest('label')?.querySelector('span')?.childNodes?.[0]?.textContent?.trim() || '';

const findCtaSizeInput = () => {
  const panel = getPanel();
  if (!panel) return null;
  for (const block of panel.querySelectorAll('.promo-style-block')) {
    if (getBlockTitle(block) !== 'CTA') continue;
    for (const input of block.querySelectorAll('input[type="range"]')) {
      if (getRangeLabel(input) === 'Size') return input;
    }
  }
  return null;
};

const resetDefaultAnchors = () => {
  const panel = getPanel();
  if (!panel) return;
  for (const block of panel.querySelectorAll('.promo-style-block')) {
    if (!RESET_GROUPS.has(getBlockTitle(block))) continue;
    for (const input of block.querySelectorAll('input[type="range"]')) {
      const label = getRangeLabel(input);
      if ((label === 'X' || label === 'Y') && Number(input.value) !== 0) setNativeRangeValue(input, 0);
    }
  }
};

const applyCtaSizeToScene = (size) => {
  const scene = getScene();
  if (scene) scene.style.setProperty('--tv-promo-cta-size', `${Number(size) || DEFAULT_CTA_SIZE}px`);
};

const applyDishDefaults = (forceSize = true) => {
  const input = findCtaSizeInput();
  if (!input) return false;
  if (forceSize && Number(input.value) !== DEFAULT_CTA_SIZE) setNativeRangeValue(input, DEFAULT_CTA_SIZE);
  applyCtaSizeToScene(forceSize ? DEFAULT_CTA_SIZE : input.value);
  resetDefaultAnchors();
  return true;
};

const retryApply = (forceSize = true, attempt = 0) => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (applyDishDefaults(forceSize)) return;
    if (attempt < 40) setTimeout(() => retryApply(forceSize, attempt + 1), 100);
  }));
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => retryApply(true));

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type === 'radio' && target.name === 'tv-promo-dish' && target.checked) {
      setTimeout(() => retryApply(true), 0);
    }
  }, true);

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'range') return;
    const block = target.closest('.promo-style-block');
    if (block && getBlockTitle(block) === 'CTA' && getRangeLabel(target) === 'Size') {
      applyCtaSizeToScene(target.value);
    }
  }, true);

  const observer = new MutationObserver(() => {
    const input = findCtaSizeInput();
    if (input) applyCtaSizeToScene(input.value || DEFAULT_CTA_SIZE);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
