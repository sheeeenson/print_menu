const MIGRATION_KEY = 'restaurant-menu-studio:tv-promo-generator:stable-defaults:v5';
const DEFAULT_CTA_SIZE = 72;
const RESET_LAYOUT_GROUPS = new Set(['Text block', 'Price', 'CTA']);

const setRangeValue = (input, value) => {
  if (!(input instanceof HTMLInputElement) || input.type !== 'range') return false;
  if (Number(input.value) === Number(value)) return true;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, String(value));
  else input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
};

const getPromoPanel = () => document.querySelector('.promo-generator-panel');

const findCtaSizeInput = (panel) => {
  const blocks = panel?.querySelectorAll('.promo-style-block') || [];
  for (const block of blocks) {
    if (block.querySelector(':scope > h4')?.textContent?.trim() !== 'CTA') continue;
    for (const label of block.querySelectorAll(':scope > label, label')) {
      const input = label.querySelector('input[type="range"]');
      if (!input) continue;
      const labelText = label.querySelector('span')?.childNodes?.[0]?.textContent?.trim();
      if (labelText === 'Size') return input;
    }
  }
  return null;
};

const resetStableLayout = (panel) => {
  let found = false;
  for (const block of panel?.querySelectorAll('.promo-style-block') || []) {
    const title = block.querySelector(':scope > h4')?.textContent?.trim();
    if (!RESET_LAYOUT_GROUPS.has(title)) continue;
    const ranges = block.querySelectorAll(':scope > label input[type="range"]');
    ranges.forEach((input) => {
      const labelText = input.closest('label')?.querySelector('span')?.childNodes?.[0]?.textContent?.trim();
      if (labelText === 'X' || labelText === 'Y') {
        found = true;
        setRangeValue(input, 0);
      }
    });
  }
  return found;
};

const applyStableDefaults = () => {
  const panel = getPromoPanel();
  if (!panel) return false;
  const ctaSizeInput = findCtaSizeInput(panel);
  if (!ctaSizeInput) return false;
  setRangeValue(ctaSizeInput, DEFAULT_CTA_SIZE);
  resetStableLayout(panel);
  return true;
};

const scheduleStableDefaults = (attempt = 0) => {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (applyStableDefaults()) return;
      if (attempt < 30) window.setTimeout(() => scheduleStableDefaults(attempt + 1), 100);
    });
  });
};

if (typeof window !== 'undefined') {
  try {
    if (window.localStorage.getItem(MIGRATION_KEY) !== 'done') {
      scheduleStableDefaults();
      window.localStorage.setItem(MIGRATION_KEY, 'done');
    }
  } catch {
    scheduleStableDefaults();
  }

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== 'radio' || target.name !== 'tv-promo-dish' || !target.checked) return;
    window.setTimeout(() => scheduleStableDefaults(), 0);
  }, true);
}
