const PROJECT_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';
const MIGRATION_KEY = 'restaurant-menu-studio:tv-promo-generator:cta-size-default:v1';
const LEGACY_DEFAULT_SIZE = 36;
const NEW_DEFAULT_SIZE = 44;

const readJson = (key, fallback = {}) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

const getFormatId = () => readJson(PROJECT_KEY, {}).formatId || 'landscape';

const findCtaSizeInput = () => {
  for (const block of document.querySelectorAll('.promo-style-block')) {
    const title = block.querySelector(':scope > h4')?.textContent?.trim();
    if (title !== 'CTA') continue;
    for (const label of block.querySelectorAll('label')) {
      const text = label.querySelector('span')?.childNodes?.[0]?.textContent?.trim();
      const input = label.querySelector('input[type="range"]');
      if (text === 'Size' && input) return input;
    }
  }
  return null;
};

const upgradeCurrentFormat = () => {
  const input = findCtaSizeInput();
  if (!input) return;
  const formatId = getFormatId();
  const migrated = readJson(MIGRATION_KEY, {});
  if (migrated[formatId]) return;

  if (Number(input.value) === LEGACY_DEFAULT_SIZE) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(input, String(NEW_DEFAULT_SIZE));
    else input.value = String(NEW_DEFAULT_SIZE);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  writeJson(MIGRATION_KEY, { ...migrated, [formatId]: true });
};

if (typeof window !== 'undefined') {
  const schedule = () => window.requestAnimationFrame(() => window.requestAnimationFrame(upgradeCurrentFormat));
  window.addEventListener('load', schedule);
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('.promo-format-buttons button');
    if (button) window.setTimeout(schedule, 0);
  }, true);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}
