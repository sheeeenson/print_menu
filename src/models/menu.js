export const APP_SECTIONS = Object.freeze({
  CONTENT: 'content',
  LAYOUT_PRINT: 'layoutPrint',
});

export const BADGE_TYPES = Object.freeze(['New', 'Hit', 'Top', 'Promo', 'Spicy', 'Vegan', 'Custom']);

export const SAVE_STATUSES = Object.freeze({
  UNSAVED: 'Unsaved',
  SAVING: 'Saving',
  SAVED: 'Saved',
});


export const PAGE_TYPES = Object.freeze({
  MENU: 'menu',
  PROMO: 'promo',
  FLYER: 'flyer',
  SOCIAL_CREATIVE: 'socialCreative',
});

export const PRINT_PAGE_TYPES = Object.freeze([PAGE_TYPES.MENU, PAGE_TYPES.PROMO, PAGE_TYPES.FLYER]);

export const PRINT_SIZE_PRESETS = Object.freeze([
  { id: 'a6Portrait', label: 'A6 portrait', paperSize: 'A6', orientation: 'portrait', width: 298, height: 420, cssWidth: '105mm', cssHeight: '148mm' },
  { id: 'a6Landscape', label: 'A6 landscape', paperSize: 'A6', orientation: 'landscape', width: 420, height: 298, cssWidth: '148mm', cssHeight: '105mm' },
  { id: 'a5Portrait', label: 'A5 portrait', paperSize: 'A5', orientation: 'portrait', width: 420, height: 595, cssWidth: '148mm', cssHeight: '210mm' },
  { id: 'a5Landscape', label: 'A5 landscape', paperSize: 'A5', orientation: 'landscape', width: 595, height: 420, cssWidth: '210mm', cssHeight: '148mm' },
  { id: 'a4Portrait', label: 'A4 portrait', paperSize: 'A4', orientation: 'portrait', width: 595, height: 842, cssWidth: '210mm', cssHeight: '297mm' },
  { id: 'a4Landscape', label: 'A4 landscape', paperSize: 'A4', orientation: 'landscape', width: 842, height: 595, cssWidth: '297mm', cssHeight: '210mm' },
  { id: 'a3Portrait', label: 'A3 portrait', paperSize: 'A3', orientation: 'portrait', width: 842, height: 1191, cssWidth: '297mm', cssHeight: '420mm' },
  { id: 'a3Landscape', label: 'A3 landscape', paperSize: 'A3', orientation: 'landscape', width: 1191, height: 842, cssWidth: '420mm', cssHeight: '297mm' },
  { id: 'dlFlyer', label: 'DL flyer', paperSize: 'DL', orientation: 'portrait', width: 312, height: 624, cssWidth: '99mm', cssHeight: '210mm' },
  { id: 'squareFlyer', label: 'Square flyer', paperSize: 'Square', orientation: 'portrait', width: 595, height: 595, cssWidth: '210mm', cssHeight: '210mm' },
  { id: 'customPrint', label: 'Custom size', paperSize: 'Custom', orientation: 'portrait', width: 595, height: 842, cssWidth: '210mm', cssHeight: '297mm' },
]);

export const SOCIAL_SIZE_PRESETS = Object.freeze([
  { id: 'socialSquare', label: '1:1 (1080×1080)', ratioLabel: '1:1', width: 1080, height: 1080 },
  { id: 'socialPortrait', label: '4:5 (1080×1350)', ratioLabel: '4:5', width: 1080, height: 1350 },
  { id: 'socialStory', label: '9:16 (1080×1920)', ratioLabel: '9:16', width: 1080, height: 1920 },
  { id: 'socialWide', label: '16:9 (1920×1080)', ratioLabel: '16:9', width: 1920, height: 1080 },
  { id: 'customSocial', label: 'Custom size', ratioLabel: 'Custom', width: 1080, height: 1080 },
]);

export const SOCIAL_CREATIVE_PRESETS = Object.freeze([
  { id: 'sushiSetCreative', label: 'Sushi Set Creative' },
]);

export const findPrintSizePreset = (id) => PRINT_SIZE_PRESETS.find((preset) => preset.id === id) ?? PRINT_SIZE_PRESETS.find((preset) => preset.id === 'a4Portrait');
export const findSocialSizePreset = (id) => SOCIAL_SIZE_PRESETS.find((preset) => preset.id === id) ?? SOCIAL_SIZE_PRESETS[0];
export const sizePresetsForPageType = (pageType) => pageType === PAGE_TYPES.SOCIAL_CREATIVE ? SOCIAL_SIZE_PRESETS : PRINT_SIZE_PRESETS;
export const isPrintPageType = (pageType) => PRINT_PAGE_TYPES.includes(pageType || PAGE_TYPES.MENU);
