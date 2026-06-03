const APP_SECTION_VALUES = ['content', 'layoutPrint', 'imageMenu'];

export const APP_SECTIONS = Object.freeze({
  CONTENT: 'content',
  LAYOUT_PRINT: 'layoutPrint',
  IMAGE_MENU: 'imageMenu',
  includes: (section) => APP_SECTION_VALUES.includes(section),
});

export const BADGE_TYPES = Object.freeze(['New', 'Hit', 'Top', 'Promo', 'Spicy', 'Vegan', 'Custom']);

export const SAVE_STATUSES = Object.freeze({
  UNSAVED: 'Unsaved',
  SAVING: 'Saving',
  SAVED: 'Saved',
});
