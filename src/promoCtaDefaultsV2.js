const PROJECT_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';
const MIGRATION_KEY = 'restaurant-menu-studio:tv-promo-generator:cta-defaults:v2';
const DEFAULT_CTA_SIZE = 58;

const migrateLayout = (layoutOffsets = {}) => ({
  ...layoutOffsets,
  priceY: 0,
  ctaY: 0,
});

if (typeof window !== 'undefined' && !window.localStorage.getItem(MIGRATION_KEY)) {
  try {
    const raw = window.localStorage.getItem(PROJECT_KEY);
    if (raw) {
      const project = JSON.parse(raw);
      project.ctaSize = DEFAULT_CTA_SIZE;
      project.layoutOffsets = migrateLayout(project.layoutOffsets);

      if (project.formats && typeof project.formats === 'object') {
        project.formats = Object.fromEntries(
          Object.entries(project.formats).map(([formatId, formatSettings]) => [
            formatId,
            {
              ...(formatSettings || {}),
              ctaSize: DEFAULT_CTA_SIZE,
              layoutOffsets: migrateLayout(formatSettings?.layoutOffsets),
            },
          ]),
        );
      }

      window.localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
    }
    window.localStorage.setItem(MIGRATION_KEY, '1');
  } catch {
    // Leave the saved project untouched if it cannot be parsed.
  }
}
