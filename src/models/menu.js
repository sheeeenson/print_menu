const APP_SECTION_VALUES = ['content', 'layoutPrint', 'imageMenu', 'tvPromo', 'htmlVideo'];

export const APP_SECTIONS = Object.freeze({
  CONTENT: 'content',
  LAYOUT_PRINT: 'layoutPrint',
  IMAGE_MENU: 'imageMenu',
  TV_PROMO: 'tvPromo',
  HTML_VIDEO: 'htmlVideo',
  includes: (section) => APP_SECTION_VALUES.includes(section),
});

export const BADGE_TYPES = Object.freeze(['New', 'Hit', 'Top', 'Promo', 'Spicy', 'Vegan', 'Custom']);

export const SAVE_STATUSES = Object.freeze({
  UNSAVED: 'Unsaved',
  SAVING: 'Saving',
  SAVED: 'Saved',
});
