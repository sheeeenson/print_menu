const PAPER_DIMENSIONS = {
  A4: { portrait: { width: 595, height: 842 }, landscape: { width: 842, height: 595 } },
  A3: { portrait: { width: 842, height: 1191 }, landscape: { width: 1191, height: 842 } },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const toFiniteNumber = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function calculateAutoFillGrid(input = {}) {
  const paperSize = input.paperSize === 'A3' ? 'A3' : 'A4';
  const orientation = input.orientation === 'landscape' ? 'landscape' : 'portrait';
  const paper = PAPER_DIMENSIONS[paperSize][orientation];
  const pageWidth = toFiniteNumber(input.pageWidth, paper.width);
  const pageHeight = toFiniteNumber(input.pageHeight, paper.height);
  const pageMargin = clamp(toFiniteNumber(input.pageMargin, 0), 0, Math.min(pageWidth, pageHeight) / 3);
  const cardGap = Math.max(0, toFiniteNumber(input.cardGap, 0));
  const itemCount = Math.max(0, Math.floor(toFiniteNumber(input.itemCount, 0)));
  const headerHeight = input.headerEnabled ? Math.max(0, toFiniteNumber(input.headerHeight, 0)) : 0;
  const footerHeight = input.footerEnabled ? Math.max(0, toFiniteNumber(input.footerHeight, 0)) : 0;
  const contentWidth = Math.max(1, pageWidth - pageMargin * 2);
  const contentHeight = Math.max(1, pageHeight - pageMargin * 2 - headerHeight - footerHeight);

  if (itemCount === 0) {
    return {
      columns: 0,
      rows: 0,
      contentWidth,
      contentHeight,
      cardWidth: 0,
      cardHeight: 0,
      imageHeight: 0,
      scale: 1,
      fontScale: 1,
      cardPadding: toFiniteNumber(input.cardPadding, 0),
    };
  }

  const { columns, rows } = chooseGrid({ itemCount, contentWidth, contentHeight });
  const cardWidth = Math.max(1, (contentWidth - cardGap * (columns - 1)) / columns);
  const cardHeight = Math.max(1, (contentHeight - cardGap * (rows - 1)) / rows);
  const scale = clamp(Math.sqrt((cardWidth * cardHeight) / (220 * 260)), 0.62, 1.45);
  const fontScale = clamp(scale, 0.72, 1.25);
  const requestedImageHeight = toFiniteNumber(input.imageHeight, 118) * scale;
  const fillImageHeight = cardHeight * (itemCount <= 2 ? 0.42 : itemCount <= 4 ? 0.36 : 0.28);
  const imageHeight = Math.round(
    clamp(Math.max(requestedImageHeight, fillImageHeight), Math.min(36, cardHeight * 0.45), Math.max(36, cardHeight * 0.52)),
  );

  return {
    columns,
    rows,
    contentWidth: Math.round(contentWidth),
    contentHeight: Math.round(contentHeight),
    cardWidth: Math.round(cardWidth),
    cardHeight: Math.round(cardHeight),
    imageHeight,
    scale: Number(scale.toFixed(3)),
    fontScale: Number(fontScale.toFixed(3)),
    cardPadding: Math.round(clamp(toFiniteNumber(input.cardPadding, 14) * scale, 6, 30)),
  };
}

function chooseGrid({ itemCount, contentWidth, contentHeight }) {
  let best = { columns: 1, rows: itemCount, score: Number.POSITIVE_INFINITY };
  const contentRatio = contentWidth / contentHeight;

  for (let columns = 1; columns <= itemCount; columns += 1) {
    const rows = Math.ceil(itemCount / columns);
    const emptySlots = columns * rows - itemCount;
    const gridRatio = columns / rows;
    const orientationScore = Math.abs(Math.log(gridRatio / contentRatio));
    const emptySlotScore = emptySlots / itemCount;
    const singleAxisScore = rows === 1 || columns === 1 ? 0.04 : 0;
    const score = orientationScore + emptySlotScore * 0.9 + singleAxisScore;

    if (score < best.score) {
      best = { columns, rows, score };
    }
  }

  return { columns: best.columns, rows: best.rows };
}
