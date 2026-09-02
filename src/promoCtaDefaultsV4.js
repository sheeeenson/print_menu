const PROJECT_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';
const WIDE_KEY = 'restaurant-menu-studio:tv-promo-generator:wide-movement:v2';
const MIGRATION_KEY = 'restaurant-menu-studio:tv-promo-generator:cta-defaults:v4';
const CTA_SIZE = 72;

const read = (key, fallback = {}) => {
  try { return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
};
const write = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

if (typeof window !== 'undefined' && !window.localStorage.getItem(MIGRATION_KEY)) {
  const project = read(PROJECT_KEY, {});
  const formats = { ...(project.formats || {}) };
  Object.keys(formats).forEach((formatId) => {
    formats[formatId] = {
      ...formats[formatId],
      ctaSize: CTA_SIZE,
      layoutOffsets: {
        ...(formats[formatId]?.layoutOffsets || {}),
        priceY: 0,
        ctaY: 0,
      },
    };
  });

  write(PROJECT_KEY, {
    ...project,
    ctaSize: CTA_SIZE,
    layoutOffsets: {
      ...(project.layoutOffsets || {}),
      priceY: 0,
      ctaY: 0,
    },
    formats,
  });

  const wide = read(WIDE_KEY, {});
  Object.keys(wide).forEach((formatId) => {
    wide[formatId] = {
      ...wide[formatId],
      priceY: 0,
      ctaY: 0,
    };
  });
  write(WIDE_KEY, wide);
  window.localStorage.setItem(MIGRATION_KEY, '1');
}
