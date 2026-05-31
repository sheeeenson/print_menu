const PAPER_DIMENSIONS = {
  A4: { portrait: { width: 595, height: 842 }, landscape: { width: 842, height: 595 } },
  A3: { portrait: { width: 842, height: 1191 }, landscape: { width: 1191, height: 842 } },
};

const WARNING = 'Too many dishes for this page with current design settings. Try compact mode, hide descriptions, reduce image size, or split into another page.';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const number = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function paperDimensions(paperSize = 'A4', orientation = 'portrait') {
  const size = paperSize === 'A3' ? 'A3' : 'A4';
  const direction = orientation === 'landscape' ? 'landscape' : 'portrait';
  return PAPER_DIMENSIONS[size][direction];
}

export function calculateFitAllLayout(input = {}) {
  const itemCount = Math.max(0, Math.floor(number(input.itemCount, 0)));
  const pageWidth = number(input.pageWidthPx, input.pageWidth ?? 595);
  const pageHeight = number(input.pageHeightPx, input.pageHeight ?? 842);
  const pageMargin = clamp(number(input.pageMargin, 34), 0, Math.min(pageWidth, pageHeight) / 3);
  const headerHeight = Math.max(0, number(input.headerHeight, 0));
  const footerHeight = Math.max(0, number(input.footerHeight, 0));
  const baseSettings = input.baseDesignSettings ?? {};
  const strategy = input.fitStrategy ?? {};
  const initialGap = Math.max(0, number(input.cardGap, baseSettings.cardGap ?? 16));
  const minCardHeight = Math.max(24, number(strategy.minCardHeight, 72));
  const minImageHeight = Math.max(0, number(strategy.minImageHeight, 32));
  const minReadableFontSize = Math.max(6, number(strategy.minReadableFontSize, 8));
  const contentWidth = Math.max(1, pageWidth - pageMargin * 2);
  const contentHeight = Math.max(1, pageHeight - pageMargin * 2 - headerHeight - footerHeight - initialGap);
  const requestedImageHeight = Math.max(0, number(baseSettings.imageHeight, 118));
  const requestedMinFont = Math.max(
    1,
    Math.min(
      number(baseSettings.dishTitleFontSize, 17),
      number(baseSettings.descriptionFontSize, 12),
      number(baseSettings.badgeFontSize, 10),
      number(baseSettings.weightFontSize, 11),
    ),
  );

  if (itemCount === 0) {
    return emptyResult(contentWidth, contentHeight);
  }

  const preferredColumns = columnsFromPreset(baseSettings.gridPreset, itemCount, contentWidth, contentHeight);
  const candidates = uniqueColumnCandidates(preferredColumns, itemCount, baseSettings.gridPreset);
  const minGap = strategy.allowCompactFallback || strategy.allowShrinkCards ? Math.min(4, initialGap) : initialGap;
  const gaps = uniqueNumbers([initialGap, Math.round(initialGap * 0.75), Math.round(initialGap * 0.5), minGap]);
  const targetCardHeight = estimatedCardHeight(baseSettings);

  let best = null;
  for (const gap of gaps) {
    for (const columns of candidates) {
      const rows = Math.ceil(itemCount / columns);
      const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
      const cardHeight = (contentHeight - gap * (rows - 1)) / rows;
      if (cardWidth <= 0 || cardHeight <= 0) continue;
      const imageCap = imageHeightForWidth(cardWidth, baseSettings, requestedImageHeight);
      const imageHeight = strategy.allowShrinkImages ? clamp(Math.min(imageCap, requestedImageHeight), minImageHeight, Math.max(minImageHeight, cardHeight * 0.48)) : Math.min(imageCap, requestedImageHeight);
      const fontScale = strategy.allowShrinkText ? clamp(cardHeight / targetCardHeight, minReadableFontSize / requestedMinFont, 1) : 1;
      const compactBonus = strategy.allowCompactFallback ? 18 : 0;
      const descriptionAllowance = strategy.allowHideDescriptions ? 26 : 0;
      const shrinkAdjustedHeight = strategy.allowShrinkCards ? targetCardHeight * fontScale - compactBonus - descriptionAllowance : targetCardHeight;
      const requiredHeight = Math.max(minCardHeight, shrinkAdjustedHeight);
      const success = cardHeight + 0.1 >= requiredHeight && cardHeight + 0.1 >= minCardHeight;
      const candidate = buildResult({
        success,
        columns,
        rows,
        cardWidth,
        cardHeight,
        imageHeight,
        fontScale,
        hideDescriptions: !success && Boolean(strategy.allowHideDescriptions),
        fallbackUsed: gap < initialGap || fontScale < 0.999 || imageHeight < requestedImageHeight || baseSettings.gridPreset === 'compactList',
        warning: success ? '' : WARNING,
      });
      if (success) return candidate;
      if (!best || capacityScore(candidate) > capacityScore(best)) best = candidate;
    }
  }

  return best ? { ...best, success: false, warning: WARNING } : {
    ...emptyResult(contentWidth, contentHeight),
    success: false,
    warning: WARNING,
  };
}

function emptyResult(contentWidth, contentHeight) {
  return {
    success: true,
    columns: 0,
    rows: 0,
    cardWidth: 0,
    cardHeight: 0,
    effectiveImageHeight: 0,
    effectiveFontScale: 1,
    hideDescriptions: false,
    fallbackUsed: false,
    warning: '',
    contentWidth: Math.round(contentWidth),
    contentHeight: Math.round(contentHeight),
  };
}

function buildResult(result) {
  return {
    success: result.success,
    columns: result.columns,
    rows: result.rows,
    cardWidth: Math.max(1, Math.floor(result.cardWidth)),
    cardHeight: Math.max(1, Math.floor(result.cardHeight)),
    effectiveImageHeight: Math.max(0, Math.floor(result.imageHeight)),
    effectiveFontScale: Number(clamp(result.fontScale, 0.2, 1.2).toFixed(3)),
    hideDescriptions: result.hideDescriptions,
    fallbackUsed: Boolean(result.fallbackUsed),
    warning: result.warning,
  };
}

function columnsFromPreset(preset, itemCount, width, height) {
  if (preset === 'oneColumn') return 1;
  if (preset === 'twoColumns') return Math.min(2, itemCount);
  if (preset === 'threeColumns') return Math.min(3, itemCount);
  if (preset === 'fourColumns') return Math.min(4, itemCount);
  if (preset === 'compactList') return Math.min(Math.max(2, Math.round(width / 175)), itemCount);
  if (preset === 'heroGrid' || preset === 'magazine') return Math.min(Math.max(2, Math.round(width / 240)), itemCount);
  return smartColumns(itemCount, width, height);
}

function smartColumns(itemCount, width, height) {
  let best = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  const ratio = width / height;
  for (let columns = 1; columns <= itemCount; columns += 1) {
    const rows = Math.ceil(itemCount / columns);
    const score = Math.abs(Math.log((columns / rows) / ratio)) + ((columns * rows - itemCount) / itemCount) * 0.8;
    if (score < bestScore) {
      best = columns;
      bestScore = score;
    }
  }
  return best;
}

function uniqueColumnCandidates(preferred, itemCount, preset) {
  const set = new Set([preferred]);
  if (preset !== 'oneColumn') {
    for (let columns = 1; columns <= itemCount; columns += 1) set.add(columns);
  }
  return [...set].filter((columns) => columns >= 1 && columns <= itemCount).sort((a, b) => a - b);
}

function uniqueNumbers(values) {
  return [...new Set(values.map((value) => Math.max(0, Math.round(value))))];
}

function estimatedCardHeight(settings) {
  const image = settings.showImages === false ? 0 : number(settings.imageHeight, 118);
  const padding = number(settings.cardPadding, 14) * 2;
  const title = number(settings.dishTitleFontSize, 17) * 1.25 * (settings.titleLineClamp ?? 2);
  const description = settings.showDescriptions === false ? 0 : number(settings.descriptionFontSize, 12) * 1.4 * Math.min(settings.descriptionLineClamp ?? 3, 2);
  const meta = Math.max(number(settings.newPriceFontSize, 18), number(settings.weightFontSize, 11)) * 1.2;
  return image + padding + title + description + meta + 28;
}

function imageHeightForWidth(width, settings, fallback) {
  if (settings.showImages === false) return 0;
  if (settings.imageRatio === 'square') return width;
  if (settings.imageRatio === 'fourThree') return width * 0.75;
  if (settings.imageRatio === 'sixteenNine') return width * 0.5625;
  if (settings.imageRatio === 'wide') return width * 0.42;
  return fallback;
}

function capacityScore(result) {
  return result.columns * result.rows * 100000 + result.cardHeight * result.cardWidth;
}
