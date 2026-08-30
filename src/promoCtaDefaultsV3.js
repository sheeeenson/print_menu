const PROJECT_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';
const MIGRATION_KEY = 'restaurant-menu-studio:tv-promo-generator:cta-defaults:v3';
const NEW_CTA_SIZE = 72;

const migrate = () => {
  try {
    if (window.localStorage.getItem(MIGRATION_KEY) === '1') return;
    const raw = window.localStorage.getItem(PROJECT_KEY);
    if (!raw) {
      window.localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    const project = JSON.parse(raw);
    const resetLayout = (layoutOffsets = {}) => ({
      ...layoutOffsets,
      priceY: 0,
      ctaY: 0,
    });

    project.ctaSize = NEW_CTA_SIZE;
    project.layoutOffsets = resetLayout(project.layoutOffsets);

    if (project.formats && typeof project.formats === 'object') {
      project.formats = Object.fromEntries(Object.entries(project.formats).map(([formatId, settings]) => [
        formatId,
        {
          ...(settings || {}),
          ctaSize: NEW_CTA_SIZE,
          layoutOffsets: resetLayout(settings?.layoutOffsets),
        },
      ]));
    }

    window.localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
    window.localStorage.setItem(MIGRATION_KEY, '1');
  } catch {}
};

if (typeof window !== 'undefined') migrate();
